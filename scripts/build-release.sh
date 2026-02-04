#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

VERSION="${1:-$(git describe --tags --always)}"
TARGET="${2:-}"

echo "Building Agent Mana ${VERSION}..."

npm install
npm run build

if [ -z "$TARGET" ]; then
    npm run tauri build
else
    npm run tauri build -- --target "$TARGET"
fi

echo ""
echo "Build completed! Artifacts are in src-tauri/target/release/bundle/"
