#!/usr/bin/env bash
# WP-LOC-3 local distribution channel: build dist/ and produce a versioned tarball via
# `npm pack`. The tarball is the ONLY way a site consumes this package locally — a
# `file:` install with an exact version pin, never a workspace path. The GitHub Packages
# publish (.github/workflows/publish.yml) is authored but deferred to cutover (WP-INF-7).
set -euo pipefail
cd "$(dirname "$0")/.."

DEST="${1:-$PWD/.pack}"
mkdir -p "$DEST"

echo "[pack-local] clean + build"
npm run clean >/dev/null 2>&1 || rm -rf dist
npm run build >/dev/null

echo "[pack-local] npm pack -> $DEST"
TARBALL_NAME="$(npm pack --pack-destination "$DEST" --silent | tail -1)"
TARBALL_PATH="$DEST/$TARBALL_NAME"

if [ ! -f "$TARBALL_PATH" ]; then
  echo "[pack-local] ERROR: expected tarball not found at $TARBALL_PATH" >&2
  exit 1
fi

echo "[pack-local] OK"
echo "TARBALL: $TARBALL_PATH"
