#!/usr/bin/env bash
set -euo pipefail

# Push Arcade Dock to GitHub (rifaul833/arcade-dock)
# Run once after: gh auth login

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Install GitHub CLI: https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Log in first: gh auth login"
  exit 1
fi

if ! gh repo view rifaul833/arcade-dock >/dev/null 2>&1; then
  gh repo create arcade-dock \
    --public \
    --description "Local HTML5 game launcher with 10 browser games" \
    --source=. \
    --remote=origin
else
  git remote get-url origin >/dev/null 2>&1 || \
    git remote add origin https://github.com/rifaul833/arcade-dock.git
fi

git push -u origin main
echo "Done: https://github.com/rifaul833/arcade-dock"
