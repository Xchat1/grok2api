"""
Base service abstraction.

Provides an async-safe lazy singleton via :meth:`BaseService.get`. Subclasses
may define an async ``_load`` hook that runs once after instance creation and
before the instance is returned to callers. Creation is guarded by a
per-class lock so concurrent first-time access does not build two instances.
"""

from __future__ import annotations

import asyncio
from typing import Dict, Optional, Type, TypeVar

T = TypeVar("T", bound="BaseService")

# Per-class creation lock. Keyed by the concrete subclass so different services
# do not serialize each other's instantiation.
_CLASS_LOCKS: Dict[type, asyncio.Lock] = {}


class BaseService:
    _instance: Optional["BaseService"] = None

    @classmethod
    async def get(cls: Type[T]) -> T:
        lock = _CLASS_LOCKS.get(cls)
        if lock is None:
            lock = asyncio.Lock()
            _CLASS_LOCKS[cls] = lock

        if cls._instance is None:
            async with lock:
                if cls._instance is None:
                    instance = cls()
                    loader = getattr(instance, "_load", None)
                    if callable(loader):
                        await loader()
                    cls._instance = instance
        return cls._instance  # type: ignore[return-value]
