#!/usr/bin/env bash
set -euo pipefail

msg=${1:-"update game"}

git checkout main >/dev/null 2>&1 || true
git add -A
if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 0
fi

git commit -m "$msg"
if git remote get-url origin >/dev/null 2>&1; then
  git push origin main
  echo "Pushed to origin/main"
else
  echo "Committed locally on main. No origin remote configured."
fi
