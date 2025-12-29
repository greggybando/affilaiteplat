#!/bin/bash

# Install Stripe CLI script
# This script downloads and installs Stripe CLI locally in the project

set -e

ARCH=$(uname -m)
OS=$(uname -s)

echo "Detected: $OS $ARCH"

# Check if Homebrew is available
if command -v brew &> /dev/null; then
    echo "Homebrew detected. Installing Stripe CLI via Homebrew..."
    brew install stripe/stripe-cli/stripe
    echo "✅ Stripe CLI installed via Homebrew"
    echo "Run: stripe --version"
    exit 0
fi

# Determine the correct binary name
if [ "$ARCH" = "arm64" ]; then
    BINARY_NAME="stripe_Darwin_arm64.tar.gz"
elif [ "$ARCH" = "x86_64" ]; then
    BINARY_NAME="stripe_Darwin_x86_64.tar.gz"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

echo "Homebrew not found. Downloading Stripe CLI directly..."

# Get the latest version tag
echo "Fetching latest version..."
LATEST_VERSION=$(curl -s https://api.github.com/repos/stripe/stripe-cli/releases/latest | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')

if [ -z "$LATEST_VERSION" ]; then
    echo "Error: Could not fetch latest version"
    exit 1
fi

echo "Latest version: $LATEST_VERSION"

# Construct download URL with version
DOWNLOAD_URL="https://github.com/stripe/stripe-cli/releases/download/$LATEST_VERSION/$BINARY_NAME"

echo "Downloading from: $DOWNLOAD_URL"
curl -L -f "$DOWNLOAD_URL" -o stripe_cli.tar.gz

# Check if download was successful
if [ ! -f stripe_cli.tar.gz ] || [ ! -s stripe_cli.tar.gz ]; then
    echo "Error: Download failed"
    exit 1
fi

# Check if it's actually a tar.gz file
if ! file stripe_cli.tar.gz | grep -qE "(gzip|tar|compressed)"; then
    echo "Error: Downloaded file is not a valid archive"
    echo "File type: $(file stripe_cli.tar.gz)"
    echo "First 100 bytes:"
    head -c 100 stripe_cli.tar.gz
    rm -f stripe_cli.tar.gz
    exit 1
fi

echo "Extracting..."
tar -xzf stripe_cli.tar.gz

echo "Moving to project bin directory..."
mkdir -p bin
if [ -f stripe ]; then
    mv stripe bin/
else
    echo "Error: stripe binary not found after extraction"
    ls -la
    exit 1
fi

echo "Cleaning up..."
rm -f stripe_cli.tar.gz

echo "✅ Stripe CLI installed to ./bin/stripe"
echo ""
echo "To use it, run: ./bin/stripe --version"
echo "Or add to PATH: export PATH=\"\$(pwd)/bin:\$PATH\""

