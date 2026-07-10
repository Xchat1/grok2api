"""admin 路由包内共享的纯函数辅助方法（无副作用、无服务层依赖）。"""

from typing import Any


def _display_key(key: str) -> str:
    k = str(key or "")
    if len(k) <= 12:
        return k
    return f"{k[:6]}...{k[-4:]}"


def _normalize_limit(v: Any) -> int:
    if v is None or v == "":
        return -1
    try:
        return max(-1, int(v))
    except (ValueError, TypeError):
        return -1


def _pool_to_token_type(pool_name: str) -> str:
    return "ssoSuper" if str(pool_name or "").strip() == "ssoSuper" else "sso"


def _parse_quota_value(v: Any) -> tuple[int, bool]:
    if v is None or v == "":
        return -1, False
    try:
        n = int(v)
    except (ValueError, TypeError):
        return -1, False
    if n < 0:
        return -1, False
    return n, True


def _safe_int(v: Any, default: int = 0) -> int:
    try:
        return int(v)
    except (ValueError, TypeError):
        return default


def _normalize_token_status(raw_status: Any) -> str:
    s = str(raw_status or "active").strip().lower()
    if s == "expired":
        return "invalid"
    if s in ("active", "cooling", "invalid", "disabled"):
        return s
    return "active"


def _normalize_admin_token_item(pool_name: str, item: Any) -> dict | None:
    token_type = _pool_to_token_type(pool_name)

    if isinstance(item, str):
        token = item.strip()
        if not token:
            return None
        if token.startswith("sso="):
            token = token[4:]
        return {
            "token": token,
            "status": "active",
            "quota": 0,
            "quota_known": False,
            "heavy_quota": -1,
            "heavy_quota_known": False,
            "token_type": token_type,
            "note": "",
            "fail_count": 0,
            "use_count": 0,
        }

    if not isinstance(item, dict):
        return None

    token = str(item.get("token") or "").strip()
    if not token:
        return None
    if token.startswith("sso="):
        token = token[4:]

    quota, quota_known = _parse_quota_value(item.get("quota"))
    heavy_quota, heavy_quota_known = _parse_quota_value(item.get("heavy_quota"))

    return {
        "token": token,
        "status": _normalize_token_status(item.get("status")),
        "quota": quota if quota_known else 0,
        "quota_known": quota_known,
        "heavy_quota": heavy_quota,
        "heavy_quota_known": heavy_quota_known,
        "token_type": token_type,
        "note": str(item.get("note") or ""),
        "fail_count": _safe_int(item.get("fail_count") or 0, 0),
        "use_count": _safe_int(item.get("use_count") or 0, 0),
    }


__all__ = [
    "_display_key",
    "_normalize_limit",
    "_pool_to_token_type",
    "_parse_quota_value",
    "_safe_int",
    "_normalize_token_status",
    "_normalize_admin_token_item",
]
