"""
Shared completion/streaming plumbing for Grok upstream calls.

Both chat and (eventually) other completion-style services POST to a Grok
endpoint, read an SSE stream, and must rebuild the connection on retry. The
boilerplate for that (proxies, headers, non-200 handling, session cleanup,
stream wrapper) is identical, so it lives here in :class:`BaseCompletionsService`.
"""

from __future__ import annotations

from typing import Any, Dict, Optional, Tuple

from curl_cffi.requests import AsyncSession

from app.core.config import get_config
from app.core.exceptions import UpstreamException
from app.core.logger import logger
from app.core.constants import BROWSER_IMPERSONATE
from app.services.grok.headers import build_grok_headers


class BaseCompletionsService:
    """Common connection + streaming helpers for Grok completions services."""

    # Subclasses may override to label log lines (e.g. "Chat", "Responses").
    _log_tag: str = "Completions"

    def __init__(self, proxy: str | None = None):
        self.proxy = proxy or get_config("grok.base_proxy_url", "")

    def _build_proxies(self) -> Optional[dict]:
        return {"http": self.proxy, "https": self.proxy} if self.proxy else None

    @staticmethod
    def _build_headers(token: str, **kwargs) -> Dict[str, str]:
        return build_grok_headers(token, **kwargs)

    @staticmethod
    def _extract_status(e: Exception) -> Optional[int]:
        if isinstance(e, UpstreamException) and e.details:
            return e.details.get("status")
        return None

    async def _establish_connection(
        self,
        token: str,
        headers: Dict[str, str],
        payload: dict,
        api_url: str,
        timeout: int,
    ) -> Tuple[AsyncSession, Any]:
        """
        POST ``payload`` to ``api_url`` and return ``(session, response)``.

        Raises :class:`UpstreamException` on a non-200 status or any transport
        error, closing the session first. The caller owns the returned session
        and must close it (``_wrap_stream`` does this for streams).
        """
        proxies = self._build_proxies()
        session = AsyncSession(impersonate=BROWSER_IMPERSONATE)
        try:
            response = await session.post(
                api_url,
                headers=headers,
                data=_dumps(payload),
                timeout=timeout,
                stream=True,
                proxies=proxies,
            )
            if response.status_code != 200:
                try:
                    content = await response.text()
                    content = content[:1000]
                except Exception:
                    content = "Unable to read response content"
                logger.error(
                    f"{self._log_tag} failed: {response.status_code}, {content}",
                    extra={"status": response.status_code, "token": token[:10] + "..."},
                )
                try:
                    await session.close()
                except Exception:
                    pass
                raise UpstreamException(
                    message=f"Grok API request failed: {response.status_code}",
                    details={"status": response.status_code},
                )
            return session, response
        except UpstreamException:
            raise
        except Exception as e:
            logger.error(f"{self._log_tag} connection error: {e}")
            try:
                await session.close()
            except Exception:
                pass
            raise UpstreamException(
                message=f"Connection failed: {str(e)}",
                details={"error": str(e)},
            )

    def _wrap_stream(self, session: AsyncSession, response: Any):
        """Wrap an SSE response into an async generator that closes the session."""
        async def stream_response():
            try:
                async for line in response.aiter_lines():
                    yield line
            finally:
                if session:
                    await session.close()
        return stream_response()


def _dumps(payload: dict) -> bytes:
    """Serialize a payload to JSON bytes (orjson if available)."""
    import orjson

    return orjson.dumps(payload)
