"""
Model routing for completion requests.

Centralizes the resolution of a client-facing model id into the upstream Grok
parameters a completion service needs (grok model name, model mode, whether the
model is a video model). Model metadata still lives in
:class:`app.services.grok.model.ModelService`; this module is the single place
that turns a request's ``model`` into a :class:`RoutingDecision`.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.exceptions import ValidationException
from app.services.grok.model import ModelService


@dataclass
class RoutingDecision:
    """Resolved upstream parameters for a completion request."""

    model_id: str
    model_mode: str
    is_video: bool


def resolve_routing(model: str, *, has_tools: bool = False) -> RoutingDecision:
    """
    Resolve a client-facing model id into upstream routing parameters.

    Raises:
        ValidationException: if the model id is unknown.
    """
    model_info = ModelService.get(model, has_tools=has_tools)
    if not model_info:
        raise ValidationException(f"Unknown model: {model}")

    return RoutingDecision(
        model_id=model_info.grok_model,
        model_mode=model_info.model_mode,
        is_video=model_info.is_video,
    )


__all__ = ["RoutingDecision", "resolve_routing"]
