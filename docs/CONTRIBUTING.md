# 贡献指南

仓库：<https://github.com/Xchat1/grok2api>

## 开发环境

```bash
uv sync
uv run main.py
```

## 提交前检查

```bash
npm run typecheck
python scripts/check_model_catalog_sync.py
```

推送前请确认未提交 `data/`、`.env` 等运行时文件；详见 [SECURITY.md](../SECURITY.md)。CI 会对 PR / `main` 运行 Gitleaks 密钥扫描。

## 目录约定

| 路径 | 说明 |
|------|------|
| `app/services/grok/model_catalog.py` | 模型目录单一数据源（Python） |
| `src/grok/models.ts` | Workers 侧模型列表，需与 catalog 同步 |
| `app/static/config/config.js` | 管理页静态模型列表 |
| `app/static/` | 管理后台 UI，FastAPI 与 Workers 共用 |

模型增删改后请运行 `python scripts/check_model_catalog_sync.py`。

## 变更记录

用户可见变更写入 [CHANGELOG.md](../CHANGELOG.md)；upstream 同步细节可记于 [work.md](../work.md)。
