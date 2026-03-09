#!/usr/bin/env bash
# Setup PowerSync worker and WASM files for local development
# These pre-built UMD files are excluded from git (too large, pnpm-built)
# Run this after `bun install` before starting the dev server

set -e

WORKER_SRC="node_modules/.bun/@powersync+web@1.35.0+44819fd16f51ff95/node_modules/@powersync/web/dist/worker"
PUBLIC_WORKER="apps/web/public/worker"

if [ ! -d "$WORKER_SRC" ]; then
  echo "ERROR: PowerSync worker source not found. Run 'bun install' first."
  exit 1
fi

mkdir -p "$PUBLIC_WORKER"
cp "$WORKER_SRC"/*.umd.js "$PUBLIC_WORKER/"
cp "$WORKER_SRC"/*.wasm "$PUBLIC_WORKER/" 2>/dev/null || true

# Copy WASM from parent dist dir too
cp "node_modules/.bun/@powersync+web@1.35.0+44819fd16f51ff95/node_modules/@powersync/web/dist/"*.wasm "$PUBLIC_WORKER/" 2>/dev/null || true

echo "✅ PowerSync workers ready: $(ls $PUBLIC_WORKER | wc -l | tr -d ' ') files copied to $PUBLIC_WORKER/"
