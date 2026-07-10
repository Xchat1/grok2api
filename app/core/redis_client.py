"""
共享 Redis 客户端（多 worker 状态外置的基础）。

仅当通过环境变量 SERVER_STORAGE_TYPE=redis 并配置了 SERVER_STORAGE_URL 时返回
客户端；否则返回 None，调用方应回退到内存实现，并给出「多 worker 需 Redis」的告警。

复用与存储层相同的连接 URL，避免重复配置与额外连接池。客户端为懒加载单例，
首次访问时创建（redis-py 自带连接池，连接在使用时才建立）。
"""

from __future__ import annotations

import os
from typing import Optional

from app.core.logger import logger

_redis_client: Optional[object] = None
_initialized: bool = False


def get_redis_client():
    """返回共享的 redis.asyncio 客户端；未配置 Redis 时返回 None。"""
    global _redis_client, _initialized
    if _initialized:
        return _redis_client
    _initialized = True

    if os.getenv("SERVER_STORAGE_TYPE", "local").lower() != "redis":
        return None

    url = os.getenv("SERVER_STORAGE_URL", "")
    if not url:
        logger.warning(
            "SERVER_STORAGE_TYPE=redis 但未设置 SERVER_STORAGE_URL；"
            "多 worker 状态（会话/限流）将回退到内存实现。"
        )
        return None

    try:
        from redis import asyncio as aioredis

        _redis_client = aioredis.from_url(
            url,
            decode_responses=True,
            health_check_interval=30,
        )
    except Exception as e:
        logger.warning(f"无法创建 Redis 客户端，回退到内存实现: {e}")
        _redis_client = None

    return _redis_client


__all__ = ["get_redis_client"]
