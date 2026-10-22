"""Export the project CA profile to later GitHub Actions steps, never credentials."""
import os
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parent.parent
profile = runpy.run_path(str(ROOT / "security/security_ca.py"))["configure_environment"](ROOT)
lines = []
for name, value in profile.items():
    if "\n" in value or "\r" in value:
        raise SystemExit("Invalid multiline CA profile value")
    lines.append(name + "=" + value + "\n")
with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as stream:
    stream.writelines(lines)
