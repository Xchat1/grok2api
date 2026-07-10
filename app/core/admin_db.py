"""后台管理员账号 —— 数据库模式（SQLite）。

将后台账号从「配置文件明文 app_key」迁移为数据库存储 + 哈希口令，
避免明文比对，并消除口令在配置 / 环境变量 / 浏览器之间不同步导致的
「用户名或密码错误」。支持多账号、改密、重置。

默认库文件：<项目>/data/admin.db
口令哈希：PBKDF2-HMAC-SHA256（Python 标准库 hashlib，无需额外依赖）。
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import os
import secrets
import time
from pathlib import Path
from typing import List, Optional

from app.core.config import get_config
from app.core.logger import logger

_DB_PATH = Path(__file__).parent.parent.parent / "data" / "admin.db"
_PBKDF2_ITERATIONS = 200_000

_SCHEMA = """
CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
);
"""

_conn = None
_lock = asyncio.Lock()


def _get_conn():
    """懒加载 SQLite 连接（进程内单例，check_same_thread=False + 锁串行化）。"""
    global _conn
    if _conn is None:
        import sqlite3

        _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
        _conn.execute("PRAGMA journal_mode=WAL;")
        _conn.execute("PRAGMA busy_timeout=5000;")
        _conn.execute(_SCHEMA)
        _conn.commit()
    return _conn


def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    if not stored or "$" not in stored:
        return False
    try:
        algo, iter_s, salt_hex, hash_hex = stored.split("$", 3)
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    try:
        iters = int(iter_s)
        salt = bytes.fromhex(salt_hex)
    except ValueError:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iters)
    return hmac.compare_digest(dk.hex(), hash_hex)


# ---- 同步底层实现（在 asyncio.to_thread 中执行，避免阻塞事件循环） ----


def _seed_initial_admin() -> None:
    """若库中无账号，则按配置播种一个初始管理员。

    优先使用环境变量 ADMIN_USERNAME / ADMIN_PASSWORD（便于容器部署），
    回退到配置 app.admin_username / app.app_key。app.app_key 由 main.py
    在启动时保证为强口令（弱口令会自动替换为随机值并记录到日志）。
    """
    conn = _get_conn()
    cur = conn.execute("SELECT COUNT(*) FROM admins")
    if cur.fetchone()[0] > 0:
        return

    username = (
        os.getenv("ADMIN_USERNAME") or get_config("app.admin_username", "admin") or "admin"
    ).strip() or "admin"
    password = (os.getenv("ADMIN_PASSWORD") or get_config("app.app_key", "") or "").strip()

    if not password:
        password = secrets.token_urlsafe(24)
        logger.warning(
            "=" * 60
            + "\n[数据库模式] 未检测到后台口令，已自动生成随机口令（请妥善保存）：\n    {}\n"
            + "首次登录后可在「配置管理」中修改。\n"
            + "=" * 60,
            password,
        )

    now = int(time.time())
    conn.execute(
        "INSERT INTO admins (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
        (username, _hash_password(password), now, now),
    )
    conn.commit()
    logger.info(f"[数据库模式] 已播种初始管理员账号：{username}")


def _verify_admin_sync(username: str, password: str) -> bool:
    conn = _get_conn()
    cur = conn.execute("SELECT password_hash FROM admins WHERE username = ?", (username,))
    row = cur.fetchone()
    if not row:
        # 故意执行一次哈希以均衡响应时间，降低用户名枚举风险
        _hash_password("dummy")
        return False
    return _verify_password(password, row[0])


def _set_password_sync(username: str, new_password: str) -> bool:
    conn = _get_conn()
    cur = conn.execute(
        "UPDATE admins SET password_hash = ?, updated_at = ? WHERE username = ?",
        (_hash_password(new_password), int(time.time()), username),
    )
    conn.commit()
    return cur.rowcount > 0


def _create_admin_sync(username: str, password: str) -> bool:
    conn = _get_conn()
    try:
        conn.execute(
            "INSERT INTO admins (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (username, _hash_password(password), int(time.time()), int(time.time())),
        )
        conn.commit()
        return True
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        return False


def _delete_admin_sync(username: str) -> bool:
    conn = _get_conn()
    cur = conn.execute("DELETE FROM admins WHERE username = ?", (username,))
    conn.commit()
    return cur.rowcount > 0


def _count_admins_sync() -> int:
    conn = _get_conn()
    return conn.execute("SELECT COUNT(*) FROM admins").fetchone()[0]


def _list_admins_sync() -> List[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, username, created_at, updated_at FROM admins ORDER BY id"
    ).fetchall()
    return [
        {"id": r[0], "username": r[1], "created_at": r[2], "updated_at": r[3]}
        for r in rows
    ]


# ---- 异步公开接口 ----


async def ensure_initial_admin() -> None:
    """确保至少有一个管理员账号（启动时调用）。"""
    async with _lock:
        await asyncio.to_thread(_seed_initial_admin)


async def verify_admin(username: str, password: str) -> bool:
    async with _lock:
        return await asyncio.to_thread(_verify_admin_sync, username, password)


async def set_password(username: str, new_password: str) -> bool:
    async with _lock:
        return await asyncio.to_thread(_set_password_sync, username, new_password)


async def create_admin(username: str, password: str) -> bool:
    async with _lock:
        return await asyncio.to_thread(_create_admin_sync, username, password)


async def delete_admin(username: str) -> bool:
    async with _lock:
        return await asyncio.to_thread(_delete_admin_sync, username)


async def count_admins() -> int:
    async with _lock:
        return await asyncio.to_thread(_count_admins_sync)


async def list_admins() -> List[dict]:
    async with _lock:
        return await asyncio.to_thread(_list_admins_sync)


__all__ = [
    "ensure_initial_admin",
    "verify_admin",
    "set_password",
    "create_admin",
    "delete_admin",
    "count_admins",
    "list_admins",
]
