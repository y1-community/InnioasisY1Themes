#!/bin/sh
# Cloudflare Worker Git: set Deploy command to:
#   sh scripts/deploy-upload-worker.sh
set -e
cd "$(dirname "$0")/.."
exec npx wrangler deploy --config cloudflare-worker-upload.toml
