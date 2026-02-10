#!/usr/bin/env bash
set -euo pipefail

REPO="basedafdev/agent-mana"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="agent-mana"

error() {
    echo "Error: $1" >&2
    exit 1
}

detect_platform() {
    local OS ARCH
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    case "$OS" in
        linux)
            case "$ARCH" in
                x86_64)  echo "linux amd64" ;;
                aarch64) echo "linux aarch64" ;;
                *)       error "Unsupported architecture: $ARCH" ;;
            esac
            ;;
        darwin)
            case "$ARCH" in
                x86_64) echo "darwin x64" ;;
                arm64)  echo "darwin aarch64" ;;
                *)      error "Unsupported architecture: $ARCH" ;;
            esac
            ;;
        *)
            error "Unsupported operating system: $OS"
            ;;
    esac
}

get_latest_release() {
    local VERSION="${AGENT_MANA_VERSION:-}"
    if [ -n "$VERSION" ]; then
        echo "$VERSION"
        return
    fi

    local RESPONSE
    RESPONSE=$(curl -s "https://api.github.com/repos/${REPO}/releases/latest")

    if echo "$RESPONSE" | grep -q '"message":'; then
        local MSG
        MSG=$(echo "$RESPONSE" | grep '"message":' | sed -E 's/.*"message": *"([^"]+)".*/\1/')
        error "GitHub API: ${MSG} — set AGENT_MANA_VERSION=vX.Y.Z to install a specific version"
    fi

    local TAG
    TAG=$(echo "$RESPONSE" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

    if [ -z "$TAG" ]; then
        error "No releases found for ${REPO}"
    fi

    echo "$TAG"
}

find_download_url() {
    local RESPONSE="$1"
    local PATTERN="$2"

    echo "$RESPONSE" | grep "browser_download_url" | grep -i "$PATTERN" | head -1 | sed -E 's/.*"(https[^"]+)".*/\1/'
}

install_linux() {
    local RELEASE_JSON="$1"
    local ARCH="$2"

    local URL
    URL=$(find_download_url "$RELEASE_JSON" "${ARCH}\.AppImage")

    if [ -z "$URL" ]; then
        error "No AppImage found for Linux ${ARCH}"
    fi

    echo "Downloading ${URL}..."
    local TEMP_FILE
    TEMP_FILE=$(mktemp)

    if ! curl -fsSL -o "$TEMP_FILE" "$URL"; then
        rm -f "$TEMP_FILE"
        error "Failed to download AppImage"
    fi

    mkdir -p "$INSTALL_DIR"
    chmod +x "$TEMP_FILE"
    mv "$TEMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"

    echo ""
    echo "Agent Mana installed to ${INSTALL_DIR}/${BINARY_NAME}"
    echo ""
    if [[ ":$PATH:" != *":${INSTALL_DIR}:"* ]]; then
        echo "Add ${INSTALL_DIR} to your PATH:"
        echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
        echo ""
    fi
    echo "Run '${BINARY_NAME}' to start."
}

install_macos() {
    local RELEASE_JSON="$1"
    local ARCH="$2"

    local URL
    URL=$(find_download_url "$RELEASE_JSON" "${ARCH}\.dmg")

    if [ -z "$URL" ]; then
        error "No .dmg found for macOS ${ARCH}"
    fi

    echo "Downloading ${URL}..."
    local TEMP_DMG
    TEMP_DMG=$(mktemp /tmp/agent-mana-XXXXXX.dmg)

    if ! curl -fsSL -o "$TEMP_DMG" "$URL"; then
        rm -f "$TEMP_DMG"
        error "Failed to download .dmg"
    fi

    echo "Installing to /Applications..."
    local MOUNT_POINT
    MOUNT_POINT=$(mktemp -d /tmp/agent-mana-mount-XXXXXX)

    hdiutil attach "$TEMP_DMG" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

    local APP_NAME
    local APP_PATH
    APP_PATH=$(find "$MOUNT_POINT" -maxdepth 1 -name '*.app' -print -quit)
    APP_NAME=$(basename "$APP_PATH")

    if [ -z "$APP_NAME" ]; then
        hdiutil detach "$MOUNT_POINT" -quiet
        rm -f "$TEMP_DMG"
        error "No .app found in .dmg"
    fi

    rm -rf "/Applications/${APP_NAME}"
    cp -R "${MOUNT_POINT}/${APP_NAME}" "/Applications/"

    hdiutil detach "$MOUNT_POINT" -quiet
    rm -f "$TEMP_DMG"
    rmdir "$MOUNT_POINT" 2>/dev/null || true

    echo ""
    echo "Agent Mana installed to /Applications/${APP_NAME}"
    echo "Launch it from Spotlight or the Applications folder."
}

main() {
    local PLATFORM
    PLATFORM=$(detect_platform)
    local OS ARCH
    OS=$(echo "$PLATFORM" | cut -d' ' -f1)
    ARCH=$(echo "$PLATFORM" | cut -d' ' -f2)

    local VERSION
    VERSION=$(get_latest_release)
    echo "Installing Agent Mana ${VERSION} for ${OS} ${ARCH}..."

    local RELEASE_JSON
    RELEASE_JSON=$(curl -s "https://api.github.com/repos/${REPO}/releases/tags/${VERSION}")

    case "$OS" in
        linux)  install_linux "$RELEASE_JSON" "$ARCH" ;;
        darwin) install_macos "$RELEASE_JSON" "$ARCH" ;;
    esac
}

main
