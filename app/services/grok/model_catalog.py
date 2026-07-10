"""Shared Grok model catalog definitions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Literal, Tuple

CostLevel = Literal["low", "high"]


@dataclass(frozen=True)
class ModelSpec:
    model_id: str
    description: str = ""
    cost: CostLevel = "low"
    is_image: bool = False
    is_video: bool = False
    is_coding: bool = False


def display_name(model_id: str) -> str:
    return model_id.replace("grok-", "Grok ").replace("-", " ")


MODEL_SPECS: Tuple[ModelSpec, ...] = (
    # Grok 4.20 family
    ModelSpec("grok-4.20-0309-multi-agent", "4.20 multi-agent", cost="high"),
    ModelSpec("grok-4.20-0309-console", "4.20 0309 console"),
    ModelSpec("grok-4.20-0309-non-reasoning", "4.20 0309 non-reasoning"),
    ModelSpec("grok-4.20-0309-non-reasoning-console", "4.20 0309 non-reasoning console"),
    ModelSpec("grok-4.20-0309-reasoning-console", "4.20 0309 reasoning console"),
    ModelSpec("grok-4.20-fast", "4.20 fast"),
    ModelSpec("grok-4.20-multi-agent-console", "4.20 multi-agent console", cost="high"),
    ModelSpec("grok-4.20-multi-agent-low", "4.20 multi-agent low", cost="high"),
    ModelSpec("grok-4.20-multi-agent-medium", "4.20 multi-agent medium", cost="high"),
    ModelSpec("grok-4.20-multi-agent-high", "4.20 multi-agent high", cost="high"),
    ModelSpec("grok-4.20-multi-agent-xhigh", "4.20 multi-agent xhigh", cost="high"),
    # Grok 4.5 / 4.3
    ModelSpec("grok-4.5", "Grok 4.5 flagship"),
    ModelSpec("grok-4.3", "Grok 4.3 flagship"),
    ModelSpec("grok-4.3-fast", "Grok 4.3 fast"),
    ModelSpec("grok-4.3-console", "Grok 4.3 console"),
    ModelSpec("grok-4.3-low", "Grok 4.3 low"),
    ModelSpec("grok-4.3-medium", "Grok 4.3 medium"),
    ModelSpec("grok-4.3-high", "Grok 4.3 high"),
    # Coding
    ModelSpec("grok-build-0.1", "Coding model", is_coding=True),
    ModelSpec("grok-build-console", "Build console", is_coding=True),
    ModelSpec("grok-code-fast-1", "Code model", is_coding=True),
    # Imagine
    ModelSpec(
        "grok-imagine-image-pro",
        "Image generation model pro",
        cost="high",
        is_image=True,
    ),
    ModelSpec(
        "grok-imagine-image",
        "Image generation model",
        cost="high",
        is_image=True,
    ),
    ModelSpec(
        "grok-imagine-image-lite",
        "Image generation model lite",
        cost="high",
        is_image=True,
    ),
    ModelSpec(
        "grok-imagine-video",
        "Video generation model",
        cost="high",
        is_video=True,
    ),
)


def coding_model_ids() -> frozenset[str]:
    return frozenset(spec.model_id for spec in MODEL_SPECS if spec.is_coding)


def model_ids() -> frozenset[str]:
    return frozenset(spec.model_id for spec in MODEL_SPECS)


def iter_model_specs() -> Iterable[ModelSpec]:
    return iter(MODEL_SPECS)
