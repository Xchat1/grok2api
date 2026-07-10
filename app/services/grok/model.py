"""
Grok 模型管理服务
"""

from __future__ import annotations

from enum import Enum
from typing import FrozenSet, Optional, Tuple

from pydantic import BaseModel, Field

from app.core.exceptions import ValidationException
from app.services.grok.model_catalog import (
    MODEL_SPECS,
    coding_model_ids,
    display_name,
    model_ids,
)


class Tier(str, Enum):
    """模型档位"""
    BASIC = "basic"
    SUPER = "super"


class Cost(str, Enum):
    """计费类型"""
    LOW = "low"
    HIGH = "high"


class ModelInfo(BaseModel):
    """模型信息"""
    model_id: str
    grok_model: str
    rate_limit_model: str
    model_mode: str
    tier: Tier = Field(default=Tier.BASIC)
    cost: Cost = Field(default=Cost.LOW)
    display_name: str
    description: str = ""
    is_video: bool = False
    is_image: bool = False
    is_image_edit: bool = False


def _spec_to_model(spec) -> ModelInfo:
    return ModelInfo(
        model_id=spec.model_id,
        grok_model=spec.model_id,
        rate_limit_model=spec.model_id,
        model_mode="MODEL_MODE_FAST",
        tier=Tier.BASIC,
        cost=Cost.HIGH if spec.cost == "high" else Cost.LOW,
        display_name=display_name(spec.model_id),
        description=spec.description or display_name(spec.model_id),
        is_image=spec.is_image,
        is_video=spec.is_video,
    )


def build_models() -> list[ModelInfo]:
    return [_spec_to_model(spec) for spec in MODEL_SPECS]


class ModelService:
    """模型管理服务：仅支持源头原始 ID，别名通过 resolve_model_id 处理。"""

    GPT55_ALIAS = "gpt-5.5"
    GPT55_CODING_MODEL = "grok-code-fast-1"
    GPT55_GENERAL_MODEL = "grok-4.5"

    CODING_MODEL_IDS: FrozenSet[str] = coding_model_ids()

    MODELS = build_models()
    _map = {m.model_id: m for m in MODELS}
    _catalog_ids = model_ids()

    @classmethod
    def resolve_gpt55(cls, *, has_tools: bool = False) -> str:
        """Pick the best Grok backend for Codex gpt-5.5 requests."""
        return cls.GPT55_CODING_MODEL if has_tools else cls.GPT55_GENERAL_MODEL

    @classmethod
    def resolve_model_id(cls, model_id: str, *, has_tools: bool = False) -> str:
        """Resolve client-facing model aliases to upstream Grok model ids."""
        if model_id == cls.GPT55_ALIAS:
            return cls.resolve_gpt55(has_tools=has_tools)
        return model_id

    @classmethod
    def is_coding_model(cls, model_id: str) -> bool:
        """Whether upstream chat payload should disable image generation."""
        return cls.resolve_model_id(model_id) in cls.CODING_MODEL_IDS

    @classmethod
    def get(cls, model_id: str, *, has_tools: bool = False) -> Optional[ModelInfo]:
        """获取模型信息"""
        return cls._map.get(cls.resolve_model_id(model_id, has_tools=has_tools))

    @classmethod
    def list(cls) -> list[ModelInfo]:
        """获取所有模型"""
        return list(cls._map.values())

    @classmethod
    def valid(cls, model_id: str) -> bool:
        """模型是否有效"""
        if model_id == cls.GPT55_ALIAS:
            return True
        return model_id in cls._map

    @classmethod
    def to_grok(cls, model_id: str, *, has_tools: bool = False) -> Tuple[str, str]:
        """转换为 Grok 参数"""
        model = cls.get(model_id, has_tools=has_tools)
        if not model:
            raise ValidationException(f"Invalid model ID: {model_id}")
        return model.grok_model, model.model_mode

    @classmethod
    def rate_limit_model_for(cls, model_id: str, *, has_tools: bool = False) -> str:
        """用于 /rest/rate-limits 的 modelName 映射。"""
        model = cls.get(model_id, has_tools=has_tools)
        return model.rate_limit_model if model else model_id

    @classmethod
    def pool_for_model(cls, model_id: str) -> str:
        """根据模型选择 Token 池"""
        model = cls.get(model_id)
        if model and model.tier == Tier.SUPER:
            return "ssoSuper"
        return "ssoBasic"

    @classmethod
    def pool_candidates_for_model(cls, model_id: str) -> list[str]:
        """按优先级返回可用 Token 池列表。"""
        model = cls.get(model_id)
        if model and model.tier == Tier.SUPER:
            return ["ssoSuper"]
        return ["ssoBasic", "ssoSuper"]


__all__ = ["ModelService", "ModelInfo", "Tier", "Cost"]
