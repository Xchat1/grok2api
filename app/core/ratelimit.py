"""
固定窗口限流器（按 key，通常为客户端 IP）。

用于登录防爆破与 admin 接口限流。阶段二 H-A3 起支持多 worker：
- 配置了 Redis（SERVER_STORAGE_TYPE=redis）时使用 Redis 后端，计数在 worker 间共享；
- 否则回退到进程内存实现，并在启动时告警。

所有函数均为 async（Redis 客户端为异步），调用方需 await。
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Dict, Optional, Tuple

from app.core.redis_client import get_redis_client
from app.core.logger import logger


class _MemoryRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Tuple[float, int]] = defaultdict(lambda: (0.0, 0))

    async def allow(self, key: str) -> bool:
        now = time.time()
        start, count = self._hits[key]
        if now - start >= self.window_seconds:
            self._hits[key] = (now, 1)
            return True
        if count >= self.max_requests:
            return False
        self._hits[key] = (start, count + 1)
        return True

    async def reset(self, key: str) -> None:
        self._hits.pop(key, None)


class _RedisRateLimiter:
    def __init__(self, redis, max_requests: int, window_seconds: int, name: str) -> None:
        self._redis = redis
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._name = name

    def _key(self, key: str) -> str:
        return f"grok2api:ratelimit:{self._name}:{key}"

    async def allow(self, key: str) -> bool:
        rkey = self._key(key)
        try:
            count = await self._redis.incr(rkey)
            if count == 1:
                await self._redis.expire(rkey, self.window_seconds)
            return count <= self.max_requests
        except Exception as e:
            # Redis 不可用时失败开放（放行），避免把全部请求挡在门外。
            logger.warning(f"Redis 限流失败，放行请求: {e}")
            return True

    async def reset(self, key: str) -> None:
        try:
            await self._redis.delete(self._key(key))
        except Exception:
            pass


_login_limiter = None
_admin_limiter = None


def _get_limiters():
    """解析限流器实现（懒加载、进程内单例）。"""
    global _login_limiter, _admin_limiter
    if _login_limiter is not None:
        return _login_limiter, _admin_limiter

    redis = get_redis_client()
    if redis is not None:
        _login_limiter = _RedisRateLimiter(redis, 10, 60, "login")
        _admin_limiter = _RedisRateLimiter(redis, 120, 60, "admin")
        logger.info("Rate limiter: 使用 Redis 后端（多 worker 安全）。")
    else:
        _login_limiter = _MemoryRateLimiter(10, 60)   # 登录：10 次/分钟/IP
        _admin_limiter = _MemoryRateLimiter(120, 60)  # admin 接口：120 次/分钟/IP
        logger.warning(
            "Rate limiter: 进程内存后端。多 worker 部署应配置 Redis，"
            "否则各 worker 独立计数，限流强度随 worker 数线性放大。"
        )
    return _login_limiter, _admin_limiter


async def allow_login(ip: str) -> bool:
    login, _ = _get_limiters()
    return await login.allow(ip)


async def allow_admin(ip: str) -> bool:
    _, admin = _get_limiters()
    return await admin.allow(ip)


__all__ = ["allow_login", "allow_admin"]
