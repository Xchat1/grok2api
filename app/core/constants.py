"""
集中存放跨服务复用的常量与基础时间工具，避免散落重复。

这些常量此前在 app/services/grok/* 多处重复定义（如 CHAT_API、BROWSER 等）。
"""

from __future__ import annotations

import time

# Grok 上游 API
GROK_CHAT_API = "https://grok.com/rest/app-chat/conversations/new"

# curl_cffi 浏览器伪装
BROWSER_IMPERSONATE = "chrome136"

# 通用默认参数
DEFAULT_TIMEOUT = 120
DEFAULT_MAX_CONCURRENT = 25
DEFAULT_DELETE_BATCH_SIZE = 10


def now_ms() -> int:
    """当前时间（毫秒），统一替换散落的 int(time.time() * 1000)。"""
    return int(time.time() * 1000)


__all__ = [
    "GROK_CHAT_API",
    "BROWSER_IMPERSONATE",
    "DEFAULT_TIMEOUT",
    "DEFAULT_MAX_CONCURRENT",
    "DEFAULT_DELETE_BATCH_SIZE",
    "now_ms",
]
