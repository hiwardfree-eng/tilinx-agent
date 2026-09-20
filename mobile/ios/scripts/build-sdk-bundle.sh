#!/bin/sh
# Xcode pre-build phase (1): build the @tilinx/sdk native-bridge bundle and
# stage it into TilinX/Generated/ so it is bundled as an app resource.
#
# The bundle (dist/tilinx-sdk.bridge.js) is a self-contained IIFE exposing the
# global `TilinXSdkBridge` that runs inside JavaScriptCore (see
# packages/sdk/BRIDGE.md). dist/ is gitignored, so we rebuild it here.
#
# Incremental builds skip this whole phase via the input/output file lists in
# project.yml — it only runs when the dist bundle is newer than the staged copy.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib.sh"
tilinx_repair_path
tilinx_require_pnpm

REPO_ROOT=$(tilinx_repo_root "$0")

echo "[build-sdk-bundle] building @tilinx/sdk bridge bundle..."
( cd "$REPO_ROOT" && pnpm --filter @tilinx/sdk build:bridge )

SRC="$REPO_ROOT/packages/sdk/dist/tilinx-sdk.bridge.js"
DEST_DIR="$SCRIPT_DIR/../TilinX/Generated"
DEST="$DEST_DIR/tilinx-sdk.bridge.js"

if [ ! -f "$SRC" ]; then
  echo "error: expected bundle not found at $SRC after build:bridge." >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
echo "[build-sdk-bundle] staged $DEST"
