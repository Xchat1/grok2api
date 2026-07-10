from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.core.auth import verify_admin_or_api_key
from app.core.config import get_config
from app.core import sessions
from app.core.admin_db import ensure_initial_admin, verify_admin
from app.services.admin.config import change_admin_password, AdminConfigError

router = APIRouter()


class AdminLoginBody(BaseModel):
    username: str | None = None
    password: str | None = None


@router.post("/api/v1/admin/login")
async def admin_login_api(request: Request, body: AdminLoginBody | None = Body(default=None)):
    """管理后台登录验证（用户名+密码，数据库模式）

    - 账号存储在数据库（SQLite，默认 data/admin.db），口令以哈希形式保存。
    - 默认账号：admin；默认密码为首次启动时随机生成的强口令（见启动日志）。
    - 兼容旧版本：允许 Authorization: Bearer <password> 仅密码登录（用户名默认为 admin）。
    - 成功后签发随机会话 token（不再返回静态后台密码）。
    """
    # 确保库中存在至少一个管理员（首启按配置播种）。
    await ensure_initial_admin()

    username = (body.username.strip() if body and isinstance(body.username, str) else "").strip()
    password = (body.password.strip() if body and isinstance(body.password, str) else "").strip()

    # Legacy: password-only via Bearer token.
    if not password:
        auth = request.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            password = auth[7:].strip()
            if not username:
                username = "admin"

    if not username or not password:
        raise HTTPException(status_code=400, detail="Missing username or password")

    if not await verify_admin(username, password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # 签发随机会话 token（区分 admin 会话）；前端以 Bearer 发送。
    session_token = await sessions.create_admin_session(username)
    force_change = bool(get_config("app.force_password_change", False))

    return {
        "status": "success",
        "api_key": session_token,
        "force_change": force_change,
    }


@router.post("/api/v1/admin/change-password")
async def change_password_api(request: Request, token: str = Depends(verify_admin_or_api_key), body: dict = Body(default={})):
    """修改后台密码（需先登录）。成功后清除「强制改密」标记并失效所有会话。

    用户名取自当前登录会话；若使用静态 Token（app_key / api_key）登录，则无法
    定位到数据库账号，需改用账号密码会话后修改。
    """
    session = await sessions.get_session(token)
    username = (session or {}).get("username") if session else None
    if not username:
        raise HTTPException(status_code=401, detail="请使用账号密码登录后再修改口令")

    old_pwd = str(body.get("old_password") or "").strip()
    new_pwd = str(body.get("new_password") or "").strip()

    try:
        return await change_admin_password(username, old_pwd, new_pwd)
    except AdminConfigError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)


__all__ = ["router"]
