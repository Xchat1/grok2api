"""
Dynamic semaphore helpers.

Concurrency limits are read from config and may change at runtime. Each named
semaphore is (re)created only when its configured value actually changes, so we
avoid churning asyncio.Semaphore objects on every call.
"""

from __future__ import annotations

import asyncio
from typing import Dict

from app.core.config import get_config

# name -> current semaphore / configured value
_SEMAPHORES: Dict[str, asyncio.Semaphore] = {}
_SEMAPHORE_VALUES: Dict[str, int] = {}


def get_dynamic_semaphore(name: str, default: int = 25) -> asyncio.Semaphore:
    """
    Return a shared asyncio.Semaphore for ``name``.

    The concurrency value is read from ``performance.{name}_max_concurrent``
    (falling back to ``default``). If the value differs from the previously
    applied one, the semaphore is recreated with the new bound.
    """
    value = get_config(f"performance.{name}_max_concurrent", default)
    try:
        value = int(value)
    except Exception:
        value = default
    value = max(1, value)

    if _SEMAPHORE_VALUES.get(name) != value:
        _SEMAPHORE_VALUES[name] = value
        _SEMAPHORES[name] = asyncio.Semaphore(value)

    return _SEMAPHORES[name]
