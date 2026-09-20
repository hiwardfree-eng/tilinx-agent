#!/bin/sh
# Xcode pre-build phase (2): sync the generated SwiftUI design tokens into
# TilinX/Generated/ so the DesignSystem sources compile against them.
#
# packages/design-tokens emits dist/swift/TilinXTokens.swift (gitignored). Its
# `prepare` script regenerates it on `pnpm install`; if it is missing we build
# it here so a fresh checkout still works. The file is copied (not symlinked) so
# Xcode's dependency analysis can track it as a source input.
#
# Incremental builds skip this whole phase via the input/output file lists in
# project.yml — it only runs when the token file changes.
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
. "$SCRIPT_DIR/lib.sh"

REPO_ROOT=$(tilinx_repo_root "$0")
SRC="$REPO_ROOT/packages/design-tokens/dist/swift/TilinXTokens.swift"

if [ ! -f "$SRC" ]; then
  echo "[sync-design-tokens] token file missing; building @tilinx/design-tokens..."
  tilinx_repair_path
  tilinx_require_pnpm
  ( cd "$REPO_ROOT" && pnpm --filter @tilinx/design-tokens build )
fi

if [ ! -f "$SRC" ]; then
  echo "error: $SRC still missing after build. Run 'pnpm --filter @tilinx/design-tokens build'." >&2
  exit 1
fi

DEST_DIR="$SCRIPT_DIR/../TilinX/Generated"
DEST="$DEST_DIR/TilinXTokens.swift"
mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
echo "[sync-design-tokens] staged $DEST"
