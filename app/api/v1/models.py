"""
Models API 路由
"""

import time

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from app.services.grok.model import ModelService


router = APIRouter(tags=["Models"])

_NO_STORE = {"Cache-Control": "no-store"}


@router.get("/models")
async def list_models():
    """OpenAI 兼容 models 列表接口"""
    ts = int(time.time())
    data = [
        {
            "id": m.model_id,
            "object": "model",
            "created": ts,
            "owned_by": "grok2api",
            "display_name": m.display_name,
            "description": m.description,
        }
        for m in ModelService.list()
    ]
    return JSONResponse(content={"object": "list", "data": data}, headers=_NO_STORE)


@router.get("/models/{model_id}")
async def get_model(model_id: str):
    """OpenAI compatible: single model detail."""
    m = ModelService.get(model_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found")

    ts = int(time.time())
    return JSONResponse(
        content={
            "id": m.model_id,
            "object": "model",
            "created": ts,
            "owned_by": "grok2api",
            "display_name": m.display_name,
            "description": m.description,
        },
        headers=_NO_STORE,
    )


__all__ = ["router"]
