#!/bin/bash

# Simple Stripe CLI installer
ARCH=$(uname -m)

if [ "$ARCH" = "arm64" ]; then
    FILE="stripe_Darwin_arm64.tar.gz"
elif [ "$ARCH" = "x86_64" ]; then
    FILE="stripe_Darwin_x86_64.tar.gz"
else
    echo "Unsupported architecture"
    exit 1
fi

echo "Getting latest version..."
VERSION=$(curl -s https://api.github.com/repos/stripe/stripe-cli/releases/latest | grep '"tag_name":' | sed 's/.*"tag_name": "\(.*\)".*/\1/')

echo "Downloading Stripe CLI v$VERSION..."
curl -L "https://github.com/stripe/stripe-cli/releases/download/$VERSION/$FILE" -o /tmp/stripe.tar.gz

echo "Extracting..."
cd /tmp && tar -xzf stripe.tar.gz

echo "Installing to /usr/local/bin (requires password)..."
sudo mv /tmp/stripe /usr/local/bin/stripe
sudo chmod +x /usr/local/bin/stripe

rm /tmp/stripe.tar.gz

echo "✅ Stripe CLI installed!"
echo "Run: stripe --version"









