"""Admin 配置写操作服务层。

将原本散落在 admin 路由中的敏感配置脱敏、配置更新、改密等写操作收敛到此处，
路由层只负责校验入参与 HTTP 语义，不再直接操作 config / session。
"""

import copy
from typing import Any

from app.core.config import config
from app.core import sessions
from app.core.admin_db import verify_admin, set_password
from app.core.logger import logger


# 配置中需要脱敏的字段（点分路径）
SENSITIVE_KEYS = {
    "app.app_key",
    "app.api_key",
    "grok.cf_clearance",
    "register.admin_password",
    "register.yescaptcha_key",
}


class AdminConfigError(Exception):
    """配置写操作的领域异常，携带建议的 HTTP 状态码。"""

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _mask_value(value: Any) -> str:
    s = str(value or "")
    return "********" if s else ""


def mask_config(cfg: dict) -> dict:
    """返回配置的深拷贝，敏感字段脱敏。"""
    masked = copy.deepcopy(cfg) if isinstance(cfg, dict) else {}
    for path in SENSITIVE_KEYS:
        section, key = path.split(".", 1)
        if isinstance(masked.get(section), dict) and key in masked[section]:
            masked[section][key] = _mask_value(masked[section][key])
    return masked


def strip_masked_secrets(data: dict) -> dict:
    """移除值为脱敏占位符的敏感字段，避免把 '********' 写回配置。"""
    cleaned = copy.deepcopy(data) if isinstance(data, dict) else {}
    for path in SENSITIVE_KEYS:
        section, key = path.split(".", 1)
        if isinstance(cleaned.get(section), dict) and cleaned[section].get(key) == "********":
            del cleaned[section][key]
            if not cleaned[section]:
                del cleaned[section]
    return cleaned


async def update_admin_config(data: dict) -> dict:
    """更新配置（脱敏占位符字段会被忽略，避免覆盖真实密钥）。"""
    data = data or {}
    cleaned = strip_masked_secrets(data)
    await config.update(cleaned)
    return {"status": "success", "message": "配置已更新"}


async def change_admin_password(username: str, old_pwd: str, new_pwd: str) -> dict:
    """修改后台密码（数据库模式）：校验旧密码 -> 写入新哈希 -> 失效所有会话。"""
    username = str(username or "").strip()
    old_pwd = str(old_pwd or "").strip()
    new_pwd = str(new_pwd or "").strip()

    if not username:
        raise AdminConfigError(400, "Missing username")

    if not await verify_admin(username, old_pwd):
        raise AdminConfigError(400, "Current password is incorrect")

    if len(new_pwd) < 8:
        raise AdminConfigError(400, "New password must be at least 8 characters")

    await set_password(username, new_pwd)
    # 同步关闭「强制改密」标记，并保持 app.app_key 与数据库口令一致（静态恢复 Token）。
    try:
        await config.update(
            {"app": {"app_key": new_pwd, "force_password_change": False}}
        )
    except Exception:
        pass
    await sessions.invalidate_all_sessions()
    logger.info(f"Admin password changed for {username}; all sessions invalidated.")
    return {"status": "success", "message": "Password updated"}


__all__ = [
    "SENSITIVE_KEYS",
    "AdminConfigError",
    "mask_config",
    "strip_masked_secrets",
    "update_admin_config",
    "change_admin_password",
]
