from app.services.grok.model import ModelService

# 仅支持 15 个源头原始 ID，无别名
EXPECTED_MODEL_IDS = {
    "grok-3",
    "grok-3-mini",
    "grok-4.20-multi-agent-beta-0309",
    "grok-4.20-beta-0309-reasoning",
    "grok-4.20-beta-0309-non-reasoning",
    "grok-code-fast-1",
    "grok-4-fast-reasoning",
    "grok-4-fast-non-reasoning",
    "grok-4-1-fast-reasoning",
    "grok-4-1-fast-non-reasoningeu-west-1",
    "grok-4-1-fast-non-reasoningus-east-4",
    "grok-4-0709",
    "grok-imagine-image-pro",
    "grok-imagine-image",
    "grok-imagine-video",
}


def test_model_catalog_contains_latest_models():
    model_ids = {m.model_id for m in ModelService.list()}
    assert EXPECTED_MODEL_IDS == model_ids


def test_removed_models_are_not_exposed():
    model_ids = {m.model_id for m in ModelService.list()}
    removed = {"grok-3-fast", "grok-4-fast", "grok-4.1", "grok-4.20-beta", "grok-4.2-thinking", "grok-imagine-1.0", "grok-imagine-1.0-fast", "grok-imagine-1.0-edit", "grok-imagine-1.0-video"}
    assert model_ids.isdisjoint(removed)


def test_no_alias_grok_model_equals_model_id():
    """源头原始 ID：grok_model 与 model_id 一致，无映射。"""
    for m in ModelService.list():
        assert m.grok_model == m.model_id, f"{m.model_id}: grok_model should equal model_id"
