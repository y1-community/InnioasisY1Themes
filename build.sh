#!/usr/bin/env bash
# Cloudflare Pages build step: static site + Pages Functions (./functions/).
# Do NOT replace this with `wrangler deploy` — that targets Workers + assets and
# will try to upload the whole repo including .git (fails the 25 MiB asset limit).
set -euo pipefail
exit 0
