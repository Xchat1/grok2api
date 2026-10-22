# TLS security profile — 2026-10-22

This project uses certifi 2026.10.19 and pip 26.2.2. Existing project virtual environments
also load the project-local CA profile through a relocatable startup hook.

For a newly created or restored virtual environment (Python >=3.10), use a verified
uv >=0.13.4 to install `requirements-security.txt`, then install the normal application
dependencies and run the bootstrap with that environment's Python:

```sh
uv pip install --python .venv/bin/python -r requirements-security.txt
.venv/bin/python -m pip install -r requirements.txt  # use the project's normal manifest
.venv/bin/python security/bootstrap.py
```

If the environment is named `venv` or is under `backend/`, use its actual Python path.
For projects using pyproject.toml, replace the normal manifest command with the existing
project installation command. No new environment is created by the bootstrap.

For direct execution without a venv, wrap the existing command:
`python3 security/security_ca.py --exec python3 YOUR_EXISTING_SCRIPT.py`.
This also works for tool commands. The wrapper preserves explicit enterprise CA sources,
removes the blocked public keys, copies public certificates only, and refuses unavailable
explicit CA paths. It does not alter macOS or a shared Python installation.

Use `.nvmrc` where present for Node. Rebuild packaged executables, desktop bundles, and
Docker images from these sources before distributing them. Existing running processes
must be restarted separately to load the new trust profile. Do not disable TLS checks.
