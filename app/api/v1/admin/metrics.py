from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import verify_admin_or_api_key
from app.services.metrics.request_stats import request_stats
from app.services.token.manager import get_token_manager
from app.services.token.models import TokenStatus
from app.services.grok.assets import DownloadService

router = APIRouter()


@router.get("/api/v1/admin/metrics", dependencies=[Depends(verify_admin_or_api_key)])
async def get_metrics_api():
    """数据中心：聚合常用指标（token/cache/request_stats）。"""
    try:
        mgr = await get_token_manager()
        await mgr.reload_if_stale()

        total = 0
        active = 0
        cooling = 0
        expired = 0
        disabled = 0
        chat_quota = 0
        total_calls = 0

        for pool in mgr.pools.values():
            for info in pool.list():
                total += 1
                total_calls += int(getattr(info, "use_count", 0) or 0)
                if info.status == TokenStatus.ACTIVE:
                    active += 1
                    chat_quota += int(getattr(info, "quota", 0) or 0)
                elif info.status == TokenStatus.COOLING:
                    cooling += 1
                elif info.status == TokenStatus.EXPIRED:
                    expired += 1
                elif info.status == TokenStatus.DISABLED:
                    disabled += 1

        dl = DownloadService()
        local_image = dl.get_stats("image")
        local_video = dl.get_stats("video")

        await request_stats.init()
        stats = request_stats.get_stats(hours=24, days=7)

        return {
            "tokens": {
                "total": total,
                "active": active,
                "cooling": cooling,
                "expired": expired,
                "disabled": disabled,
                "chat_quota": chat_quota,
                "image_quota": int(chat_quota // 2),
                "total_calls": total_calls,
            },
            "cache": {
                "local_image": local_image,
                "local_video": local_video,
            },
            "request_stats": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/admin/metrics/clear", dependencies=[Depends(verify_admin_or_api_key)])
async def clear_metrics_api():
    """清空本地常用指标记录（request_stats）。"""
    try:
        await request_stats.init()
        await request_stats.reset()
        return {"success": True, "message": "常用指标已清空"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]
