# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main`  | Yes       |

## Reporting a Vulnerability

If you discover a security issue, **please do not open a public GitHub issue** with exploit details.

1. Open a [private security advisory](https://github.com/Xchat1/grok2api/security/advisories/new) on GitHub, or
2. Contact the maintainer via GitHub: [@Xchat1](https://github.com/Xchat1)

Include:

- Description and impact
- Steps to reproduce
- Affected version / commit (if known)

We aim to acknowledge reports within **72 hours**.

## Secrets You Must Never Commit

This project stores sensitive runtime data **outside git** (see `.gitignore`):

| Path | Contents |
|------|----------|
| `data/token.json` | Grok SSO / JWT token pool |
| `data/config.toml` | `api_key`, `cf_clearance`, admin password |
| `data/api_keys.json` | Per-client API keys |
| `.env` / `.dev.vars` | Deployment secrets |
| `logs/` | May contain request traces |

Before pushing:

```bash
git ls-files | rg -i 'data/|logs/|\.env$'   # should print nothing
git diff | rg -i 'sk-[A-Za-z0-9]{20,}|eyJhbGci'  # should print nothing
```

## Deployment Hardening

- Change default admin credentials (`admin` / `admin`) immediately after install.
- Set a strong `app.api_key` or use **API Key 管理** with per-key quotas.
- Do not expose the admin panel to the public internet without authentication and TLS.
- For Cloudflare Workers: keep `CLOUDFLARE_API_TOKEN` in GitHub Secrets only; use `wrangler.ci.toml` (gitignored) for local deploys with real resource IDs.

## Automated Checks

CI runs [Gitleaks](https://github.com/gitleaks/gitleaks) on pull requests and pushes to `main` to help prevent accidental secret commits.
