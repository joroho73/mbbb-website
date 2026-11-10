#!/usr/bin/env bash

set -euo pipefail

REMOTE="dcshosting@bobcat.mythic-beasts.com"
REMOTE_DIR="/home/dcshosting/www/mbbb-preview.dcsmail.uk/"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-}" in
    "") RSYNC_OPTIONS=() ;;
    --dry-run) RSYNC_OPTIONS=(--dry-run) ;;
    *) echo "Usage: ./deploy-preview.sh [--dry-run]" >&2; exit 2 ;;
esac
if (( $# > 1 )); then
    echo "Usage: ./deploy-preview.sh [--dry-run]" >&2
    exit 2
fi

echo "Deploying static website files to Bobcat preview..."
echo "CMS content and private PHP configuration are deployed separately."

rsync -avz "${RSYNC_OPTIONS[@]}" \
    --itemize-changes \
    --exclude '*.bak' \
    --exclude '*.tmp' \
    --exclude '*~' \
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
    --exclude '/INSTALL.md' \
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
if [[ "${1:-}" == "--dry-run" ]]; then
    echo "Preview complete. No files uploaded."
else
    echo "Static website deployment complete."
fi
echo "https://mbbb-preview.dcsmail.uk"
