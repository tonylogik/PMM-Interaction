#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
NEXT_APP_DIR="$REPO_ROOT/next-pmm-app"

if [[ ! -d "$NEXT_APP_DIR" ]]; then
  echo "error: next-pmm-app directory not found relative to repo root" >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  cat >&2 <<USAGE
Usage: $0 /path/to/new/repo

Copies the Next.js companion app into the provided directory, preserving
TypeScript sources while skipping build artifacts (node_modules, .next).
USAGE
  exit 1
fi

TARGET_DIR="$1"
mkdir -p "$TARGET_DIR"

rsync -a --delete \
  --exclude '.next' \
  --exclude 'node_modules' \
  --exclude '.turbo' \
  "$NEXT_APP_DIR/" "$TARGET_DIR/"

echo "Next.js app exported to $TARGET_DIR"

echo "Tip: run 'git init' inside the target directory and add a remote before pushing." >&2
