from fastapi import APIRouter, Request, WebSocket
from fastapi.responses import HTMLResponse, RedirectResponse
import aiofiles
import asyncio
from pathlib import Path

from starlette.websockets import WebSocketDisconnect
from app.core.logger import logger

router = APIRouter()

TEMPLATE_DIR = Path(__file__).parent.parent.parent.parent / "static"


async def render_template(filename: str):
    """渲染指定模板"""
    template_path = TEMPLATE_DIR / filename
    if not template_path.exists():
        return HTMLResponse(f"Template {filename} not found.", status_code=404)

    async with aiofiles.open(template_path, "r", encoding="utf-8") as f:
        content = await f.read()
    return HTMLResponse(content)


@router.get("/", include_in_schema=False)
async def root_redirect():
    """Default entry -> /login (consistent with Workers/Pages)."""
    return RedirectResponse(url="/login", status_code=302)


@router.get("/login", response_class=HTMLResponse, include_in_schema=False)
async def login_page():
    """Login page (default)."""
    return await render_template("login/login.html")


@router.get("/admin", response_class=HTMLResponse, include_in_schema=False)
async def admin_login_page():
    """Legacy login entry (redirect to /login)."""
    return RedirectResponse(url="/login", status_code=302)


@router.get("/admin/config", response_class=HTMLResponse, include_in_schema=False)
async def admin_config_page():
    """配置管理页"""
    return await render_template("config/config.html")


@router.get("/admin/token", response_class=HTMLResponse, include_in_schema=False)
async def admin_token_page():
    """Token 管理页"""
    return await render_template("token/token.html")


@router.get("/admin/datacenter", response_class=HTMLResponse, include_in_schema=False)
async def admin_datacenter_page():
    """数据中心页"""
    return await render_template("datacenter/datacenter.html")


@router.get("/admin/keys", response_class=HTMLResponse, include_in_schema=False)
async def admin_keys_page():
    """API Key 管理页"""
    return await render_template("keys/keys.html")


@router.get("/admin/skills", response_class=HTMLResponse, include_in_schema=False)
async def admin_skills_page():
    """技能中心页（按能力维度展示 API 技能目录）"""
    return await render_template("skills/skills.html")


@router.get("/admin/docs", response_class=HTMLResponse, include_in_schema=False)
async def admin_docs_page():
    """接口文档页"""
    return await render_template("docs/docs.html")


@router.get("/admin/cache", response_class=HTMLResponse, include_in_schema=False)
async def admin_cache_page():
    """缓存管理页"""
    return await render_template("cache/cache.html")


@router.websocket("/admin/dev-reload")
async def dev_reload_ws(websocket: WebSocket):
    """Dev hot-reload WebSocket connection."""
    await websocket.accept()
    try:
        while True:
            await asyncio.sleep(5)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass


__all__ = ["router"]
