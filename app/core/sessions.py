"""
服务端会话存储。

用于后台登录后签发的随机会话 token。接口在阶段一即设计为可替换的抽象：
- 配置了 Redis（SERVER_STORAGE_TYPE=redis）时使用 Redis 后端，多 worker 共享；
- 否则回退到进程内存实现，并在启动时告警「多 worker 需 Redis」。

所有公开函数均为 async（Redis 客户端为异步），调用方需 await。
"""

from __future__ import annotations

import json
import secrets
import time
from typing import Dict, Optional

from app.core.redis_client import get_redis_client
from app.core.logger import logger

SESSION_TTL_SECONDS = 60 * 60 * 12  # 12 小时
SESSION_KEY_PREFIX = "grok2api:session:"
SESSION_INDEX_KEY = "grok2api:sessions"  # SET: 活跃 token 集合，用于 invalidate_all


class _MemorySessionStore:
    """进程内存会话存储（单 worker / 无 Redis 时的回退）。"""

    def __init__(self) -> None:
        self._sessions: Dict[str, dict] = {}

    async def create(self, username: str, kind: str = "admin") -> str:
        token = secrets.token_urlsafe(32)
        self._sessions[token] = {
            "username": username,
            "kind": kind,
            "created_at": time.time(),
        }
        return token

    async def get(self, token: Optional[str]) -> Optional[dict]:
        if not token:
            return None
        session = self._sessions.get(token)
        if session is None:
            return None
        if time.time() - session.get("created_at", 0) > SESSION_TTL_SECONDS:
            self._sessions.pop(token, None)
            return None
        return session

    async def delete(self, token: Optional[str]) -> None:
        if token:
            self._sessions.pop(token, None)

    async def invalidate_all(self) -> None:
        self._sessions.clear()

    async def is_valid(self, token: Optional[str]) -> bool:
        return await self.get(token) is not None


class _RedisSessionStore:
    """Redis 会话存储（多 worker 安全）。token 比较使用 timing-safe 比较由调用方负责。"""

    def __init__(self, redis) -> None:
        self._redis = redis

    async def create(self, username: str, kind: str = "admin") -> str:
        token = secrets.token_urlsafe(32)
        payload = json.dumps({
            "username": username,
            "kind": kind,
            "created_at": time.time(),
        })
        await self._redis.set(SESSION_KEY_PREFIX + token, payload, ex=SESSION_TTL_SECONDS)
        await self._redis.sadd(SESSION_INDEX_KEY, token)
        return token

    async def get(self, token: Optional[str]) -> Optional[dict]:
        if not token:
            return None
        raw = await self._redis.get(SESSION_KEY_PREFIX + token)
        if not raw:
            return None
        try:
            data = json.loads(raw)
        except (ValueError, TypeError):
            return None
        if time.time() - data.get("created_at", 0) > SESSION_TTL_SECONDS:
            await self.delete(token)
            return None
        return data

    async def delete(self, token: Optional[str]) -> None:
        if not token:
            return
        await self._redis.delete(SESSION_KEY_PREFIX + token)
        await self._redis.srem(SESSION_INDEX_KEY, token)

    async def invalidate_all(self) -> None:
        tokens = await self._redis.smembers(SESSION_INDEX_KEY)
        if tokens:
            await self._redis.delete(*(SESSION_KEY_PREFIX + t for t in tokens))
        await self._redis.delete(SESSION_INDEX_KEY)

    async def is_valid(self, token: Optional[str]) -> bool:
        return await self.get(token) is not None


_store = None


def _get_store():
    """解析会话存储实现（懒加载、进程内单例）。"""
    global _store
    if _store is not None:
        return _store

    redis = get_redis_client()
    if redis is not None:
        _store = _RedisSessionStore(redis)
        logger.info("Sessions: 使用 Redis 后端（多 worker 安全）。")
    else:
        _store = _MemorySessionStore()
        logger.warning(
            "Sessions: 使用进程内存后端。多 worker 部署必须配置 Redis"
            "（SERVER_STORAGE_TYPE=redis + SERVER_STORAGE_URL），否则会话无法在 worker 间共享。"
        )
    return _store


async def create_admin_session(username: str) -> str:
    """签发一个 admin 会话 token。"""
    return await _get_store().create(username, kind="admin")


async def get_session(token: Optional[str]) -> Optional[dict]:
    return await _get_store().get(token)


async def delete_session(token: Optional[str]) -> None:
    await _get_store().delete(token)


async def invalidate_all_sessions() -> None:
    await _get_store().invalidate_all()


async def verify_session_token(token: Optional[str]) -> bool:
    """判断 token 是否为有效会话。"""
    return await _get_store().is_valid(token)


__all__ = [
    "create_admin_session",
    "get_session",
    "delete_session",
    "invalidate_all_sessions",
    "verify_session_token",
    "SESSION_TTL_SECONDS",
]
