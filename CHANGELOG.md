# Changelog

本文件记录 [@Xchat1/grok2api](https://github.com/Xchat1/grok2api) 的重要变更。历史同步细节见 `work.md`。

## [Unreleased]

### Added
- 技能中心：模型列表、Responses API（Codex）、高清视频生成说明
- 模型目录统一源 `app/services/grok/model_catalog.py`（25 个模型）
- `gpt-5.5` 别名路由（有 tools → `grok-code-fast-1`，否则 → `grok-4.5`）
- Codex / Responses API 工具调用桥接（扁平 tools、`inputSchema`、流式解析）

### Changed
- 页脚署名：`Grok2API Created By @Xchat1 © 2026`
- 数据中心：移除后台日志查看，保留指标与趋势；清空接口改为 `POST /api/v1/admin/metrics/clear`
- 侧栏导航：hash 子项命中时父级不高亮

### Fixed
- Token 页导入失败回滚、重复跳过计数
- Codex 工具名为空（扁平 tools 未归一化）
- 流式路径 `<tool_call>` 未解析、`modelResponse.message` 漏发
