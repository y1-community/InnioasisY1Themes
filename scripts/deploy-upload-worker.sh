#!/bin/sh
set -eu
ROOT="$(CDPATH= cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec node scripts/deploy-upload-worker.mjs
