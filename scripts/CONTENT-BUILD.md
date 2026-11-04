# MBBB content manifests

Install the package.json, package-lock.json and scripts directory at the project root.
Node.js 22 or later and npm are required locally and on the future CI runner, not on the VPS.

One-time setup: `npm ci`

Before the first build, change `published: true` to `published: false` in
`gigs/gig-template.yml`. Empty template fields cannot be published.

## Local use

- `npm run content:check`: validate only; change no files.
- `npm run content:build`: validate both collections, then update their manifests.
- `npm run content:test`: run isolated tests; does not change your site content.

Run the build after pulling CMS changes, and before using Live Server or deploying.
The existing browser scripts still read the YAML files. No frontend changes needed.
The manifests contain published filenames only. Past gigs remain included.
Gigs sort by date ascending; testimonials sort by date descending with filename
as the tie-breaker. The homepage still selects three upcoming gigs itself.

Missing collection directories, invalid YAML, duplicate YAML keys, invalid published
fields, duplicate anchors or unsupported filenames stop the build with a nonzero
exit code. Both collections are validated before either manifest is written.
Individual manifest replacements are atomic; the pair is not a filesystem transaction.
This script is not a live deployment mechanism.

Dates use js-yaml CORE_SCHEMA, matching the current frontend, so unquoted dates and
15:00 remain strings. Optional gig fields can be omitted. Published testimonials
require reviewer, review_text and a boolean featured flag. Legacy absent or month-only
review dates remain supported. Drafts must be valid YAML with published: false;
other fields can be incomplete. Drafts are excluded from manifests and staged output,
but that does not make them private in the public GitHub repository or a full manual upload.

The script reads top-level .yml/.yaml files only and does not rewrite YAML records.
It preserves existing filenames and their link anchors. Newlines in text remain intact.

## Preparing content for later CI deployment

`npm run content:build -- --stage .content-build`

This creates a NEW .content-build directory containing gigs/ and testimonials/,
with published YAML files and generated manifests. Source manifests are not changed
in staging mode. The destination must not already exist: use a fresh build directory
for another staging run. Never point it at the live website. If staging fails, do not
publish the incomplete output. No SSH, upload, deletion or deployment is performed.
The future deployment workflow must activate staged content safely and coordinate
with manual deployment; this script alone does not protect the remote website.

## Git and manual deployment

Add these to .gitignore:

```
node_modules/
.content-build/
```

Keep package.json, package-lock.json, scripts and the two source manifests tracked.
For this phase, commit changed manifests with local content/code changes.
Do not ignore the manifests yet: Live Server and the existing deployment use them.

In deploy.sh, immediately after `cd "$SCRIPT_DIR"`, add:

```
npm run content:build
```

The existing `set -euo pipefail` stops deployment if validation fails.
Add the following exclusion arguments to the existing rsync command (before its
source and destination). Keep all existing exclusions:

```
    --exclude 'node_modules/' \
    --exclude 'scripts/' \
    --exclude '.content-build/' \
    --exclude 'package.json' \
    --exclude 'package-lock.json' \
    --exclude '.pages.yml' \
    --exclude '.github/' \
```

Pull current CMS commits before local work and deployment. Automatic publishing
and protection against stale manual deployments will be implemented separately.
