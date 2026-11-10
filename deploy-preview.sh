#!/usr/bin/env bash

set -euo pipefail

REMOTE="dcshosting@bobcat.mythic-beasts.com"
REMOTE_DIR="/home/dcshosting/www/mbbb-preview.dcsmail.uk/"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building gigs and testimonials content..."
npm run content:build

echo "Deploying Melvin Beddow Big Band demo website..."

rsync -avz \
    --dry-run \
    --itemize-changes \
    --exclude '*.bak' \
    --exclude '*.env' \
    --exclude '*:Zone.Identifier' \
    --exclude '.content-build/' \
    --exclude '.git/' \
    --exclude '.github/' \
    --exclude '.gitignore' \
    --exclude '.pages.yml' \
    --exclude '.vscode/' \
    --exclude '/assets/gallery/' \
    --exclude '/content/' \
    --exclude '/gallery/photos/' \
    --exclude '/gallery/photos.json' \
    --exclude '/gallery/photos.generated.json' \
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
    --exclude 'deploy-preview.sh' \
    --exclude 'node_modules/' \
    --exclude 'package-lock.json' \
    --exclude 'package.json' \
    --exclude 'page-template.html' \
    --exclude 'scripts/' \
    --exclude 'server/' \
    ./ "$REMOTE:$REMOTE_DIR"

echo
echo "Deployment complete."
echo "https://mbbb-preview.dcsmail.uk"