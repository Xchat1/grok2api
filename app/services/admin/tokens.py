"""Token 管理后台写操作服务层。

将原本内联在 admin 路由中的 Token 保存逻辑（加锁 -> 持久化 -> 重载 -> 收集新增
Token -> 后台触发 NSFW 刷新）收敛到此处，路由层只做参数校验与 HTTP 语义。
"""

import asyncio
from typing import Any, List

from app.core.config import get_config
from app.core.storage import get_storage
from app.core.logger import logger
from app.services.token.manager import get_token_manager
from app.services.register.account_settings_refresh import (
    refresh_account_settings_for_tokens,
    normalize_sso_token as normalize_refresh_token,
)


def _collect_tokens_from_pool_payload(payload: Any) -> List[str]:
    if not isinstance(payload, dict):
        return []

    collected: List[str] = []
    seen: set[str] = set()
    for raw_items in payload.values():
        if not isinstance(raw_items, list):
            continue
        for item in raw_items:
            token_raw = item if isinstance(item, str) else (item.get("token") if isinstance(item, dict) else "")
            token = normalize_refresh_token(str(token_raw or "").strip())
            if not token or token in seen:
                continue
            seen.add(token)
            collected.append(token)
    return collected


def _resolve_nsfw_refresh_concurrency(override: Any = None) -> int:
    source = override if override is not None else get_config("token.nsfw_refresh_concurrency", 10)
    try:
        value = int(source)
    except (ValueError, TypeError):
        value = 10
    return max(1, value)


def _resolve_nsfw_refresh_retries(override: Any = None) -> int:
    source = override if override is not None else get_config("token.nsfw_refresh_retries", 3)
    try:
        value = int(source)
    except (ValueError, TypeError):
        value = 3
    return max(0, value)


def _trigger_account_settings_refresh_background(
    tokens: List[str],
    concurrency: int,
    retries: int,
) -> None:
    if not tokens:
        return

    async def _run() -> None:
        try:
            result = await refresh_account_settings_for_tokens(
                tokens=tokens,
                concurrency=concurrency,
                retries=retries,
            )
            summary = result.get("summary") or {}
            logger.info(
                "Background account-settings refresh finished: total={} success={} failed={} invalidated={}",
                summary.get("total", 0),
                summary.get("success", 0),
                summary.get("failed", 0),
                summary.get("invalidated", 0),
            )
        except Exception as exc:
            logger.warning("Background account-settings refresh failed: {}", exc)

    asyncio.create_task(_run())


async def save_tokens_admin(payload: dict) -> dict:
    """保存 Token 配置并触发新增 Token 的后台 NSFW 刷新。"""
    storage = get_storage()
    posted_data = payload if isinstance(payload, dict) else {}

    existing_tokens: List[str] = []
    added_tokens: List[str] = []

    async with storage.acquire_lock("tokens_save", timeout=10):
        old_data = await storage.load_tokens()
        existing_tokens = _collect_tokens_from_pool_payload(
            old_data if isinstance(old_data, dict) else {}
        )

        await storage.save_tokens(posted_data)
        mgr = await get_token_manager()
        await mgr.reload()

        new_tokens = _collect_tokens_from_pool_payload(posted_data)
        existing_set = set(existing_tokens)
        added_tokens = [token for token in new_tokens if token not in existing_set]

    concurrency = _resolve_nsfw_refresh_concurrency()
    retries = _resolve_nsfw_refresh_retries()
    _trigger_account_settings_refresh_background(
        tokens=added_tokens,
        concurrency=concurrency,
        retries=retries,
    )

    return {
        "status": "success",
        "message": "Token updated",
        "nsfw_refresh": {
            "mode": "background",
            "triggered": len(added_tokens),
            "concurrency": concurrency,
            "retries": retries,
        },
    }


__all__ = [
    "save_tokens_admin",
    "collect_tokens_from_pool_payload",
]
