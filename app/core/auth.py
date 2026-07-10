"""
API 认证模块
"""

from __future__ import annotations

import asyncio
import hmac
import json
from pathlib import Path
from typing import Optional, Set

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_config
from app.core import sessions

# 定义 Bearer Scheme
security = HTTPBearer(
    auto_error=False,
    scheme_name="API Key",
    description="Enter your API Key in the format: Bearer <key>",
)

LEGACY_API_KEYS_FILE = Path(__file__).parent.parent.parent / "data" / "api_keys.json"
_legacy_api_keys_cache: Set[str] | None = None
_legacy_api_keys_mtime: float | None = None
_legacy_api_keys_lock = asyncio.Lock()


async def _load_legacy_api_keys() -> Set[str]:
    """
    Backward-compatible API keys loader.

    Older versions stored multiple API keys in `data/api_keys.json` with a shape like:
    [{"key": "...", "is_active": true, ...}, ...]
    """
    global _legacy_api_keys_cache, _legacy_api_keys_mtime

    if not LEGACY_API_KEYS_FILE.exists():
        _legacy_api_keys_cache = set()
        _legacy_api_keys_mtime = None
        return set()

    try:
        stat = LEGACY_API_KEYS_FILE.stat()
        mtime = stat.st_mtime
    except Exception:
        mtime = None

    if _legacy_api_keys_cache is not None and mtime is not None and _legacy_api_keys_mtime == mtime:
        return _legacy_api_keys_cache

    async with _legacy_api_keys_lock:
        # Re-check in lock
        if not LEGACY_API_KEYS_FILE.exists():
            _legacy_api_keys_cache = set()
            _legacy_api_keys_mtime = None
            return set()

        try:
            stat = LEGACY_API_KEYS_FILE.stat()
            mtime = stat.st_mtime
        except Exception:
            mtime = None

        if _legacy_api_keys_cache is not None and mtime is not None and _legacy_api_keys_mtime == mtime:
            return _legacy_api_keys_cache

        try:
            raw = await asyncio.to_thread(LEGACY_API_KEYS_FILE.read_text, "utf-8")
            data = json.loads(raw) if raw.strip() else []
        except Exception:
            data = []

        keys: Set[str] = set()
        if isinstance(data, list):
            for item in data:
                if not isinstance(item, dict):
                    continue
                key = item.get("key")
                is_active = item.get("is_active", True)
                if isinstance(key, str) and key.strip() and is_active is not False:
                    keys.add(key.strip())

        _legacy_api_keys_cache = keys
        _legacy_api_keys_mtime = mtime
        return keys


async def verify_api_key(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """
    验证 Bearer Token（用于 /v1 业务接口，仅接受 API Key）。

    始终要求提供有效的 Authorization: Bearer <key>。不再支持「未配置即放行」。
    """
    api_key = str(get_config("app.api_key", "") or "").strip()
    legacy_keys = await _load_legacy_api_keys()

    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth.credentials
    if api_key and hmac.compare_digest(token, api_key):
        return token
    if token in legacy_keys:
        return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_admin_or_api_key(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """
    后台接口认证：接受「登录会话 token」或「API Key」（配置或已创建的 Key）。

    区分 admin 会话与 API Key：登录签发的随机会话 token 由 sessions 模块管理，
    API Key 用于外部调用。两者均通过 timing-safe 比较。
    """
    if auth:
        token = auth.credentials
        # 1) 登录会话 token
        if await sessions.verify_session_token(token):
            return token
        # 2) 后台密码（app_key）
        app_key = str(get_config("app.app_key", "") or "").strip()
        if app_key and hmac.compare_digest(token, app_key):
            return token
        # 3) API Key（配置或 legacy）
        api_key = str(get_config("app.api_key", "") or "").strip()
        if api_key and hmac.compare_digest(token, api_key):
            return token
        legacy_keys = await _load_legacy_api_keys()
        if token in legacy_keys:
            return token

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_app_key(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """
    验证后台登录密钥（app_key）。

    如果未配置 app_key，则跳过验证。
    """
    app_key = str(get_config("app.app_key", "") or "").strip()

    if not app_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="App key is not configured",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not hmac.compare_digest(auth.credentials, app_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return auth.credentials


__all__ = ["verify_api_key", "verify_admin_or_api_key", "verify_app_key"]

