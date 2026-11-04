#!/usr/bin/env bash

set -euo pipefail

REMOTE="mbbb"
REMOTE_DIR="/srv/www/mbbb/"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building gigs and testimonials content..."
npm run content:build

if ! ssh -O check "$REMOTE" >/dev/null 2>&1; then
    echo "No active SSH connection for '$REMOTE'."
    echo
    echo "Open one with:"
    echo "  ssh -MNf $REMOTE"
    exit 1
fi

echo "Deploying Melvin Beddow Big Band demo website..."

rsync -avz \
    --delete \
    --exclude '*.bak' \
    --exclude '*.env' \
    --exclude '*:Zone.Identifier' \
    --exclude '.content-build/' \
    --exclude '.git/' \
    --exclude '.github/' \
    --exclude '.gitignore' \
    --exclude '.pages.yml' \
    --exclude '.vscode/' \
    --exclude '/gigs/*.yaml' \
    --exclude '/gigs/*.yml' \
    --exclude '/gigs/gigs.json' \
    --exclude '/testimonials/*.yaml' \
    --exclude '/testimonials/*.yml' \
    --exclude '/testimonials/testimonials.json' \
    --exclude 'README.md' \
    --exclude '__pycache__/' \
    --exclude 'deploy-command.txt' \
    --exclude 'deploy.sh' \
    --exclude 'node_modules/' \
    --exclude 'package-lock.json' \
    --exclude 'package.json' \
    --exclude 'page-template.html' \
    --exclude 'scripts/' \
    --exclude 'server/' \
    ./ "$REMOTE:$REMOTE_DIR"

echo
echo "Deployment complete."
echo "https://mbbb.dcsmail.uk"