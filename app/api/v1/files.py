"""
文件服务 API 路由
"""

import aiofiles.os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.logger import logger

router = APIRouter(tags=["Files"])

# 缓存根目录
BASE_DIR = Path(__file__).parent.parent.parent.parent / "data" / "tmp"
IMAGE_DIR = BASE_DIR / "image"
VIDEO_DIR = BASE_DIR / "video"


@router.get("/image/{filename:path}")
async def get_image(filename: str):
    """
    获取图片文件（支持嵌套路径，兼容旧版用 - 扁平化存储的文件名）
    """
    # 优先按嵌套目录解析，防止路径穿越
    try:
        nested_path = (IMAGE_DIR / filename).resolve()
        nested_path.relative_to(IMAGE_DIR)
    except Exception:
        nested_path = None

    file_path = None
    if nested_path and await aiofiles.os.path.exists(nested_path) and await aiofiles.os.path.isfile(nested_path):
        file_path = nested_path
    else:
        # 兼容旧版: 将路径中的 / 扁平化为 -
        legacy_name = filename.replace("/", "-")
        legacy_path = IMAGE_DIR / legacy_name
        if await aiofiles.os.path.exists(legacy_path) and await aiofiles.os.path.isfile(legacy_path):
            file_path = legacy_path

    if not file_path:
        logger.warning(f"Image not found: {filename}")
        raise HTTPException(status_code=404, detail="Image not found")

    content_type = "image/jpeg"
    suffix = file_path.suffix.lower()
    if suffix == ".png":
        content_type = "image/png"
    elif suffix == ".webp":
        content_type = "image/webp"

    # 增加缓存头，支持高并发场景下的浏览器/CDN缓存
    return FileResponse(
        file_path,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable"
        },
    )


@router.get("/video/{filename:path}")
async def get_video(filename: str):
    """
    获取视频文件（支持嵌套路径，兼容旧版用 - 扁平化存储的文件名）
    """
    # 优先按嵌套目录解析，防止路径穿越
    try:
        nested_path = (VIDEO_DIR / filename).resolve()
        nested_path.relative_to(VIDEO_DIR)
    except Exception:
        nested_path = None

    file_path = None
    if nested_path and await aiofiles.os.path.exists(nested_path) and await aiofiles.os.path.isfile(nested_path):
        file_path = nested_path
    else:
        # 兼容旧版: 将路径中的 / 扁平化为 -
        legacy_name = filename.replace("/", "-")
        legacy_path = VIDEO_DIR / legacy_name
        if await aiofiles.os.path.exists(legacy_path) and await aiofiles.os.path.isfile(legacy_path):
            file_path = legacy_path

    if not file_path:
        logger.warning(f"Video not found: {filename}")
        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(
        file_path,
        media_type="video/mp4",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable"
        },
    )
