import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import verify_admin_or_api_key
from app.core.config import get_config
from app.core.logger import logger
from app.core.storage import get_storage
from app.services.token.manager import get_token_manager
from app.services.admin.tokens import (
    save_tokens_admin,
    _resolve_nsfw_refresh_concurrency,
    _resolve_nsfw_refresh_retries,
)
from app.services.register.account_settings_refresh import (
    refresh_account_settings_for_tokens,
    normalize_sso_token as normalize_refresh_token,
)
from app.services.register import get_auto_register_manager
from .helpers import _normalize_admin_token_item

router = APIRouter()


@router.get("/api/v1/admin/tokens", dependencies=[Depends(verify_admin_or_api_key)])
async def get_tokens_api():
    """获取所有 Token"""
    storage = get_storage()
    tokens = await storage.load_tokens()
    data = tokens if isinstance(tokens, dict) else {}
    out: dict[str, list[dict]] = {}
    for pool_name, raw_items in data.items():
        arr = raw_items if isinstance(raw_items, list) else []
        normalized: list[dict] = []
        for item in arr:
            obj = _normalize_admin_token_item(pool_name, item)
            if obj:
                normalized.append(obj)
        out[str(pool_name)] = normalized
    return out


@router.post("/api/v1/admin/tokens", dependencies=[Depends(verify_admin_or_api_key)])
async def update_tokens_api(data: dict):
    """Update token payload and trigger background account-settings refresh for new tokens."""
    try:
        return await save_tokens_admin(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/admin/tokens/refresh", dependencies=[Depends(verify_admin_or_api_key)])
async def refresh_tokens_api(data: dict):
    """刷新 Token 状态"""
    try:
        mgr = await get_token_manager()
        tokens = []
        if "token" in data:
            tokens.append(data["token"])
        if "tokens" in data and isinstance(data["tokens"], list):
            tokens.extend(data["tokens"])

        if not tokens:
            raise HTTPException(status_code=400, detail="No tokens provided")

        unique_tokens = list(set(tokens))

        sem = asyncio.Semaphore(10)

        async def _refresh_one(t):
            async with sem:
                return t, await mgr.sync_usage(t, "grok-3", consume_on_fail=False, is_usage=False)

        results_list = await asyncio.gather(*[_refresh_one(t) for t in unique_tokens])
        results = dict(results_list)

        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/admin/tokens/nsfw/refresh", dependencies=[Depends(verify_admin_or_api_key)])
async def refresh_tokens_nsfw_api(data: dict):
    """Refresh account settings (TOS + birth date + NSFW) for selected/all tokens."""
    payload = data if isinstance(data, dict) else {}
    mgr = await get_token_manager()

    tokens: list[str] = []
    seen: set[str] = set()

    if bool(payload.get("all")):
        for pool in mgr.pools.values():
            for info in pool.list():
                token = normalize_refresh_token(str(info.token or "").strip())
                if not token or token in seen:
                    continue
                seen.add(token)
                tokens.append(token)
    else:
        candidates: list[str] = []
        single = payload.get("token")
        if isinstance(single, str):
            candidates.append(single)
        batch = payload.get("tokens")
        if isinstance(batch, list):
            candidates.extend([item for item in batch if isinstance(item, str)])

        for raw in candidates:
            token = normalize_refresh_token(str(raw or "").strip())
            if not token or token in seen:
                continue
            seen.add(token)
            tokens.append(token)

    if not tokens:
        raise HTTPException(status_code=400, detail="No tokens provided")

    concurrency = _resolve_nsfw_refresh_concurrency(payload.get("concurrency"))
    retries = _resolve_nsfw_refresh_retries(payload.get("retries"))
    result = await refresh_account_settings_for_tokens(
        tokens=tokens,
        concurrency=concurrency,
        retries=retries,
    )
    return {
        "status": "success",
        "summary": result.get("summary") or {},
        "failed": result.get("failed") or [],
    }


@router.post("/api/v1/admin/tokens/auto-register", dependencies=[Depends(verify_admin_or_api_key)])
async def auto_register_tokens_api(data: dict):
    """Start auto registration."""
    try:
        data = data or {}
        count = data.get("count")
        concurrency = data.get("concurrency")
        pool = (data.get("pool") or "ssoBasic").strip() or "ssoBasic"

        try:
            count_val = int(count)
        except (ValueError, TypeError):
            count_val = int(get_config("register.default_count", 100) or 100)

        if count_val <= 0:
            count_val = int(get_config("register.default_count", 100) or 100)

        try:
            concurrency_val = int(concurrency)
        except (ValueError, TypeError):
            concurrency_val = None
        if concurrency_val is not None and concurrency_val <= 0:
            concurrency_val = None

        manager = await get_auto_register_manager()
        job = await manager.start_job(count=count_val, pool=pool, concurrency=concurrency_val)
        return {"status": "started", "job": job.to_dict()}
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/admin/tokens/auto-register/status", dependencies=[Depends(verify_admin_or_api_key)])
async def auto_register_status_api(job_id: str | None = None):
    """Get auto registration status."""
    manager = await get_auto_register_manager()
    status = manager.get_status(job_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@router.post("/api/v1/admin/tokens/auto-register/stop", dependencies=[Depends(verify_admin_or_api_key)])
async def auto_register_stop_api(job_id: str | None = None):
    """Stop auto registration (best-effort)."""
    manager = await get_auto_register_manager()
    status = manager.get_status(job_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")
    await manager.stop_job()
    return {"status": "stopping"}


__all__ = ["router"]
