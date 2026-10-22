"""Install this project's CA hook into the currently selected, existing project venv.
No network access and no creation of virtual environments.
"""
import importlib.metadata as metadata
import os
from pathlib import Path
import runpy
import sys
import sysconfig

ROOT = Path(__file__).resolve().parent.parent
PREFIX = Path(sys.prefix).resolve()
if sys.prefix == sys.base_prefix or not PREFIX.is_relative_to(ROOT):
    raise SystemExit("Activate an existing virtual environment inside this project first.")
for name, minimum in (("certifi", (2026, 10, 19)), ("pip", (26, 2, 2))):
    try:
        installed = tuple(int(part) for part in metadata.version(name).split("."))
    except (metadata.PackageNotFoundError, ValueError):
        raise SystemExit("Install requirements-security.txt using uv >=0.13.4 first.")
    if installed < minimum:
        raise SystemExit("Install requirements-security.txt using uv >=0.13.4 first.")
runpy.run_path(str(ROOT / "security/security_ca.py"))["configure_environment"](ROOT)
LIB = Path(sysconfig.get_path("purelib")).resolve()
if not LIB.is_relative_to(PREFIX):
    raise SystemExit("Virtual environment package directory leaves its prefix.")
for name, content in (("_personal_project_security_ca_bootstrap.py", (ROOT / "security/venv_bootstrap.py").read_bytes()),
                      ("00_personal_project_security_ca.pth", b"import _personal_project_security_ca_bootstrap\n")):
    target = LIB / name
    if target.is_symlink() or (target.exists() and target.stat().st_nlink != 1):
        raise SystemExit("Refusing an aliased CA hook file.")
    if not target.exists() or target.read_bytes() != content:
        target.write_bytes(content)
print("Project venv CA hook ready.")
