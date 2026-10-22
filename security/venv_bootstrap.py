# Project venv only. Resolve the enclosing project after moves; never alter base Python.
import os as _os
try:
    import pathlib as _pathlib, runpy as _runpy, sys as _sys
    _prefix = _pathlib.Path(_sys.prefix).resolve()
    if _sys.prefix == _sys.base_prefix:
        raise RuntimeError("Project CA hook cannot run in a shared base Python")
    _project = next(p for p in (_prefix,) + tuple(_prefix.parents)
                    if (p / "security/ca/blocked-spki.json").is_file()
                    and (p / "security/security_ca.py").is_file())
    _runpy.run_path(str(_project / "security/security_ca.py"))["configure_environment"](_project)
except BaseException:
    _os.write(2, b"Project CA profile unavailable; refusing unsafe fallback\n")
    _os._exit(78)
