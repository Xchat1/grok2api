#!/usr/bin/env python3
"""
清空本地常用指标与后台日志记录。

直接清空 data/logs.json（请求日志）和 data/stats.json（请求统计），
无需启动服务。适用于本地开发或运维一键清空。
"""
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
LOGS_JSON = DATA_DIR / "logs.json"
STATS_JSON = DATA_DIR / "stats.json"


def main() -> None:
    cleared = []
    for path in (LOGS_JSON, STATS_JSON):
        if path.exists():
            path.write_text("[]" if path == LOGS_JSON else '{"hourly":{},"daily":{},"models":{}}')
            cleared.append(path.name)
    if cleared:
        print("已清空:", ", ".join(cleared))
    else:
        print("无需清空: data/logs.json 与 data/stats.json 不存在或已为空。")


if __name__ == "__main__":
    main()
