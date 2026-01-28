#!/usr/bin/env bash
# Exports DevStride credentials for the current shell session from .env file.
set -a
source "$(dirname "$0")/../.env"
set +a

echo "DevStride environment variables exported for this shell session."
