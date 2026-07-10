"""
Grok 上游请求头构建（统一入口）。

此前 chat/media/imagine_experimental 各自内联或复制了一份几乎相同的请求头；
此处抽取为单一函数，供各服务复用，仅允许通过参数覆盖 Referer/Origin。
"""

from __future__ import annotations

import uuid
from typing import Dict

from app.core.constants import BROWSER_IMPERSONATE  # noqa: F401  (便于复用同一伪装标识)
from app.services.grok.cookies import build_grok_cookie
from app.services.grok.statsig import StatsigService


def build_grok_headers(
    token: str,
    *,
    referer: str = "https://grok.com/",
    origin: str = "https://grok.com",
) -> Dict[str, str]:
    """构造发往 Grok 上游的请求头。

    Args:
        token: 用于生成 Cookie 的认证 token。
        referer: 覆盖 Referer（imagine 等接口使用不同页面）。
        origin: 覆盖 Origin。
    """
    headers = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Baggage": "sentry-environment=production,sentry-release=d6add6fb0460641fd482d767a335ef72b9b6abb8,sentry-public_key=b311e0f2690c81f25e2c4cf6d4f7ce1c",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "Origin": origin,
        "Pragma": "no-cache",
        "Priority": "u=1, i",
        "Referer": referer,
        "Sec-Ch-Ua": '"Google Chrome";v="136", "Chromium";v="136", "Not(A:Brand";v="24"',
        "Sec-Ch-Ua-Arch": "arm",
        "Sec-Ch-Ua-Bitness": "64",
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Model": "",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    }

    # Statsig / request id
    headers["x-statsig-id"] = StatsigService.gen_id()
    headers["x-xai-request-id"] = str(uuid.uuid4())

    # Cookie
    headers["Cookie"] = build_grok_cookie(token)

    return headers


__all__ = ["build_grok_headers"]
