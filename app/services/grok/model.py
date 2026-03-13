"""
Grok 模型管理服务
"""

from __future__ import annotations

from enum import Enum
from typing import Optional, Tuple
from pydantic import BaseModel, Field

from app.core.exceptions import ValidationException


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


class ModelService:
    """模型管理服务：仅支持源头原始 ID，无别名映射。"""

    MODELS = [
        ModelInfo(
            model_id="grok-3",
            grok_model="grok-3",
            rate_limit_model="grok-3",
            model_mode="MODEL_MODE_GROK_3",
            cost=Cost.LOW,
            display_name="Grok 3",
        ),
        ModelInfo(
            model_id="grok-3-mini",
            grok_model="grok-3-mini",
            rate_limit_model="grok-3-mini",
            model_mode="MODEL_MODE_GROK_3_MINI_THINKING",
            cost=Cost.LOW,
            display_name="Grok 3 Mini",
        ),
        ModelInfo(
            model_id="grok-4.20-multi-agent-beta-0309",
            grok_model="grok-4.20-multi-agent-beta-0309",
            rate_limit_model="grok-4.20-multi-agent-beta-0309",
            model_mode="MODEL_MODE_GROK_420",
            cost=Cost.HIGH,
            display_name="Grok 4.20 Multi-Agent Beta 0309",
        ),
        ModelInfo(
            model_id="grok-4.20-beta-0309-reasoning",
            grok_model="grok-4.20-beta-0309-reasoning",
            rate_limit_model="grok-4.20-beta-0309-reasoning",
            model_mode="MODEL_MODE_GROK_420",
            cost=Cost.HIGH,
            display_name="Grok 4.20 Beta 0309 Reasoning",
        ),
        ModelInfo(
            model_id="grok-4.20-beta-0309-non-reasoning",
            grok_model="grok-4.20-beta-0309-non-reasoning",
            rate_limit_model="grok-4.20-beta-0309-non-reasoning",
            model_mode="MODEL_MODE_GROK_420",
            cost=Cost.LOW,
            display_name="Grok 4.20 Beta 0309 Non-Reasoning",
        ),
        ModelInfo(
            model_id="grok-code-fast-1",
            grok_model="grok-code-fast-1",
            rate_limit_model="grok-code-fast-1",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok Code Fast 1",
        ),
        ModelInfo(
            model_id="grok-4-fast-reasoning",
            grok_model="grok-4-fast-reasoning",
            rate_limit_model="grok-4-fast-reasoning",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok 4 Fast Reasoning",
        ),
        ModelInfo(
            model_id="grok-4-fast-non-reasoning",
            grok_model="grok-4-fast-non-reasoning",
            rate_limit_model="grok-4-fast-non-reasoning",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok 4 Fast Non-Reasoning",
        ),
        ModelInfo(
            model_id="grok-4-1-fast-reasoning",
            grok_model="grok-4-1-fast-reasoning",
            rate_limit_model="grok-4-1-fast-reasoning",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok 4.1 Fast Reasoning",
        ),
        ModelInfo(
            model_id="grok-4-1-fast-non-reasoningeu-west-1",
            grok_model="grok-4-1-fast-non-reasoningeu-west-1",
            rate_limit_model="grok-4-1-fast-non-reasoningeu-west-1",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok 4.1 Fast Non-Reasoning EU West 1",
        ),
        ModelInfo(
            model_id="grok-4-1-fast-non-reasoningus-east-4",
            grok_model="grok-4-1-fast-non-reasoningus-east-4",
            rate_limit_model="grok-4-1-fast-non-reasoningus-east-4",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok 4.1 Fast Non-Reasoning US East 4",
        ),
        ModelInfo(
            model_id="grok-4-0709",
            grok_model="grok-4-0709",
            rate_limit_model="grok-4-0709",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.LOW,
            display_name="Grok 4 0709",
        ),
        ModelInfo(
            model_id="grok-imagine-image-pro",
            grok_model="grok-imagine-image-pro",
            rate_limit_model="grok-imagine-image-pro",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.HIGH,
            display_name="Grok Imagine Image Pro",
            is_image=True,
        ),
        ModelInfo(
            model_id="grok-imagine-image",
            grok_model="grok-imagine-image",
            rate_limit_model="grok-imagine-image",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.HIGH,
            display_name="Grok Imagine Image",
            is_image=True,
        ),
        ModelInfo(
            model_id="grok-imagine-video",
            grok_model="grok-imagine-video",
            rate_limit_model="grok-imagine-video",
            model_mode="MODEL_MODE_FAST",
            cost=Cost.HIGH,
            display_name="Grok Imagine Video",
            is_video=True,
        ),
    ]
    
    _map = {m.model_id: m for m in MODELS}
    
    @classmethod
    def get(cls, model_id: str) -> Optional[ModelInfo]:
        """获取模型信息"""
        return cls._map.get(model_id)
    
    @classmethod
    def list(cls) -> list[ModelInfo]:
        """获取所有模型"""
        return list(cls._map.values())
    
    @classmethod
    def valid(cls, model_id: str) -> bool:
        """模型是否有效"""
        return model_id in cls._map

    @classmethod
    def to_grok(cls, model_id: str) -> Tuple[str, str]:
        """转换为 Grok 参数"""
        model = cls.get(model_id)
        if not model:
            raise ValidationException(f"Invalid model ID: {model_id}")
        return model.grok_model, model.model_mode

    @classmethod
    def rate_limit_model_for(cls, model_id: str) -> str:
        """用于 /rest/rate-limits 的 modelName 映射。"""
        model = cls.get(model_id)
        return model.rate_limit_model if model else model_id

    @classmethod
    def is_heavy_bucket_model(cls, model_id: str) -> bool:
        """是否使用 heavy 配额桶（当前无）。"""
        return False

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


__all__ = ["ModelService"]
