"""Grok 请求 Cookie 构造工具。"""

from __future__ import annotations

from app.core.config import get_config


def parse_sso_pair(raw_token: str) -> tuple[str, str]:
    raw = str(raw_token or "").strip()
    if not raw:
        return "", ""

    if raw.lower().startswith("cookie:"):
        raw = raw[7:].strip()

    if ";" in raw:
        sso = None
        sso_rw = None
        for part in raw.split(";"):
            part = part.strip()
            if part.startswith("sso="):
                sso = part[4:].strip()
            elif part.startswith("sso-rw="):
                sso_rw = part[7:].strip()
        resolved_sso = sso or sso_rw or ""
        resolved_sso_rw = sso_rw or sso or ""
        return resolved_sso, resolved_sso_rw

    if raw.startswith("sso="):
        val = raw[4:].strip()
        return val, val
    if raw.startswith("sso-rw="):
        val = raw[7:].strip()
        return val, val

    return raw, raw


def normalize_sso_token(token: str) -> str:
    sso, _ = parse_sso_pair(token)
    return sso


def normalize_cf_clearance(value: str | None) -> str:
    raw = str(value if value is not None else get_config("grok.cf_clearance", "") or "").strip()
    if not raw:
        return ""
    return raw[len("cf_clearance=") :] if raw.startswith("cf_clearance=") else raw


def build_grok_cookie(token: str, cf_clearance: str | None = None) -> str:
    """
    构造 Grok 上游请求 Cookie。

    与 Cloudflare Workers 版本保持一致：sso-rw + sso + cf_clearance。
    """
    sso = normalize_sso_token(token)
    if not sso:
        return ""

    cf = normalize_cf_clearance(cf_clearance)
    base = f"sso-rw={sso};sso={sso}"
    return f"{base};cf_clearance={cf}" if cf else base


__all__ = ["normalize_sso_token", "normalize_cf_clearance", "build_grok_cookie", "parse_sso_pair"]
