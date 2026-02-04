#!/usr/bin/env bash
set -euo pipefail

REPO="basedafdev/agent-mana"
INSTALL_DIR="${HOME}/.local/bin"
BINARY_NAME="agent-mana"

detect_platform() {
    local OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    local ARCH=$(uname -m)

    case "$OS" in
        linux)
            case "$ARCH" in
                x86_64) echo "x86_64-unknown-linux-gnu" ;;
                aarch64) echo "aarch64-unknown-linux-gnu" ;;
                *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
            esac
            ;;
        darwin)
            case "$ARCH" in
                x86_64) echo "x86_64-apple-darwin" ;;
                arm64) echo "aarch64-apple-darwin" ;;
                *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
            esac
            ;;
        *)
            echo "Unsupported operating system: $OS" >&2
            exit 1
            ;;
    esac
}

get_latest_release() {
    curl -s "https://api.github.com/repos/${REPO}/releases/latest" | \
        grep '"tag_name":' | \
        sed -E 's/.*"([^"]+)".*/\1/'
}

download_and_install() {
    local PLATFORM=$(detect_platform)
    local VERSION=$(get_latest_release)
    
    if [ -z "$VERSION" ]; then
        echo "Error: Could not determine latest version" >&2
        exit 1
    fi

    echo "Installing Agent Mana ${VERSION} for ${PLATFORM}..."

    local DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${VERSION}/${BINARY_NAME}-${PLATFORM}"
    local TEMP_FILE=$(mktemp)

    echo "Downloading from ${DOWNLOAD_URL}..."
    if ! curl -fsSL -o "$TEMP_FILE" "$DOWNLOAD_URL"; then
        echo "Error: Failed to download binary" >&2
        rm -f "$TEMP_FILE"
        exit 1
    fi

    mkdir -p "$INSTALL_DIR"
    chmod +x "$TEMP_FILE"
    mv "$TEMP_FILE" "${INSTALL_DIR}/${BINARY_NAME}"

    echo ""
    echo "Agent Mana installed successfully to ${INSTALL_DIR}/${BINARY_NAME}"
    echo ""
    echo "To use it, make sure ${INSTALL_DIR} is in your PATH:"
    echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
    echo "Run 'agent-mana' to start the application."
}

main() {
    download_and_install
}

main
