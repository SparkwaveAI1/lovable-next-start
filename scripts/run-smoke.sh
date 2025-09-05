#!/usr/bin/env bash
set -euo pipefail

# Ensure we're at repo root (where package.json lives)
if [ ! -f "package.json" ]; then
  echo "✖ Run this from the project root (where package.json is)."
  exit 1
fi

# Require GAME_API_KEY
if [ "${GAME_API_KEY:-}" = "" ]; then
  echo "✖ GAME_API_KEY is not set. Use: GAME_API_KEY=gam_xxx bash scripts/run-smoke.sh"
  exit 1
fi

echo "▶ Running GAME SDK smoke test..."
npx -y tsx scripts/game/smoke.ts