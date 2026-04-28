#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== v2.12 local release test =="
npm install
npm run lint -w admin-portal
npm run lint -w portal
npx tsc --noEmit -p admin-portal/tsconfig.json
npx tsc --noEmit -p portal/tsconfig.json
npm run build -w admin-portal
npm run build -w portal
npm test -w admin-portal
echo "== v2.12 local release test passed =="
