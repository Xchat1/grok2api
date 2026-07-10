from fastapi import APIRouter, Depends, HTTPException
from typing import Any

from app.core.auth import verify_admin_or_api_key
from app.core.config import config
from app.services.admin.config import mask_config, update_admin_config

router = APIRouter()


@router.get("/api/v1/admin/config", dependencies=[Depends(verify_admin_or_api_key)])
async def get_config_api():
    """获取当前配置（敏感字段已脱敏）"""
    return mask_config(config._config)


@router.post("/api/v1/admin/config", dependencies=[Depends(verify_admin_or_api_key)])
async def update_config_api(data: dict):
    """更新配置（提交脱敏占位符的字段将被忽略，避免覆盖真实密钥）"""
    try:
        return await update_admin_config(data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


__all__ = ["router"]
