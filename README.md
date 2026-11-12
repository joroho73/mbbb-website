# Melvin Beddow Big Band website

Static HTML, CSS and JavaScript website maintained by Dunmow Computer Services.

Repository: https://github.com/joroho73/mbbb-website

Updated 12 November 2026.

## Hosting and source control

The maintained branch is `main`. Select `main` in Pages CMS.

Hosting: Mythic Beasts Web 25, Bobcat  
Current website: https://mbbb-preview.dcsmail.uk  
SSH account: `dcshosting@bobcat.mythic-beasts.com`  
Document root: `/home/dcshosting/www/mbbb-preview.dcsmail.uk/`

The migration has been consolidated into `main`. Public-domain cutover and retirement
of the old MBBB VPS services are separate tasks.

The tag `vps-before-hosting-migration` preserves the earlier implementation.
Git does not back up server-only credentials or configuration.

## Website and content

- Shared header and footer are loaded by `js/includes.js`.
- Gigs and testimonials use individual YAML records and generated JSON manifests.
- The homepage displays upcoming gigs and a featured testimonial.
- Published gallery photographs can be selected for random homepage use.
- The contact form submits to `/api/contact.php`, using a private PHP handler and SMTP.
- No database is required.

| Path | Purpose |
| --- | --- |
| `.pages.yml` | Pages CMS configuration |
| `gigs/` | Gig records and generated manifest |
| `testimonials/` | Testimonial records and generated manifest |
| `gallery/photos/` | Photo metadata |
| `assets/gallery/` | Uploaded photographs |
| `gallery/photos.json` | Generated gallery manifest |
| `scripts/build-content.mjs` | Gig/testimonial validation and generation |
| `scripts/build-gallery.mjs` | Gallery validation and generation |
| `scripts/package-content.py` | Publication package builder |
| `server/mbbb-publish-content` | Content receiver and release cleanup |
| `.github/workflows/deploy-content.yml` | Automatic content publication |
| `api/contact.php` | Public contact endpoint |
| `server/contact-php/` | Private PHP source and Composer dependencies |
| `deploy.sh` | Manual static deployment |

## Pull and rebuild locally

Start with a clean working tree:

```bash
git switch main
git pull --ff-only
npm ci --ignore-scripts
npm run content:test
npm run content:build
node scripts/build-gallery.mjs
```

Use Node 24 to match the build configuration.

Pages CMS commits YAML and images. Actions builds manifests for deployment without
committing them back to GitHub. Rebuild locally after pulling CMS changes.

Generated manifests are tracked, so rebuilding may produce local changes.
Review these before committing. Do not edit the manifests manually.

If Git reports divergent branches, review the local and remote commits before
merging or rebasing. Do not force-push to resolve CMS changes.

Start VS Code Live Server from the repository root. Live Server cannot execute PHP;
test the contact form on Bobcat.

## Editing content

Use Pages CMS on `main`. Consult `.pages.yml` for current fields and validation.

Photo Description is stored in the required `title` field. Legacy photo records may
also contain `caption` or `alt`; the builder uses its fallback rules to generate
captions and alternative text.

Both `published` and `use_on_homepage` must be true for homepage image selection.

Upload JPG/JPEG, PNG or WebP images through the configured gallery field.
Safe filename renaming applies to new uploads, not existing files.

Published images are limited to 5 MiB each, and the encoded publication package to
32 MiB. Resize large originals before uploading.

Unreferenced images are omitted from the publication package. Draft content remains
in the public Git repository even though it is omitted from the website.
Never store confidential information in this repository.

## Static deployment

Run locally:

```bash
./deploy.sh --dry-run
./deploy.sh
```

Review the dry run before uploading.

Static deployment uploads website code and static assets. CMS content is published
separately by Actions. Private PHP configuration, dependencies, receiver code and
development files must remain excluded.

Changes to HTML, CSS or JavaScript require static deployment; content publication
alone does not deploy them.

## Automatic content publication

Changes on `main` trigger `.github/workflows/deploy-content.yml`.

The workflow tests and validates content, builds a package, checks whether the commit
is still current, publishes through restricted SSH, verifies text over HTTPS, and
then cleans up old releases.

HTTPS image verification is intentionally skipped. Check new photographs visually
on the website.

The workflow uses these GitHub secrets:

- `BOBCAT_SSH_HOST`
- `BOBCAT_SSH_PORT`
- `BOBCAT_SSH_USER`
- `BOBCAT_SSH_PRIVATE_KEY`
- `BOBCAT_SSH_KNOWN_HOSTS`

Keep SSH host-key verification enabled.

| Bobcat path | Purpose |
| --- | --- |
| `~/bin/mbbb-publish-content` | Installed restricted receiver |
| `~/mbbb-content/releases/` | Immutable content releases |
| `~/mbbb-content/current` | Active-release symlink |
| `~/mbbb-content/current.json` | Link to active release metadata |
| `~/www/mbbb-preview.dcsmail.uk/content` | Public content symlink |

The content directory is publicly accessible through the website. Store no secrets
there.

Validation failures prevent publication. HTTPS verification takes place after
activation: a verification failure does not automatically roll back published content.

A failed workflow can therefore leave the new content visible. Inspect the failed
step before retrying. If a newer publication succeeds, an older failed run normally
does not need rerunning.

## Release cleanup and recovery

Cleanup runs after successful verification. It retains:

- The active release.
- The five newest releases by sequence.
- All releases less than seven days old.

Removed releases are listed in the Actions log.

Preview cleanup on Bobcat without deleting anything:

```bash
SSH_ORIGINAL_COMMAND=cleanup-preview ~/bin/mbbb-publish-content
```

To restore previous content, revert the relevant content changes in Git and publish
a new release. Preserve publication sequence numbering.

For static-code recovery, restore the desired version from Git and redeploy it.

Keep secure, independent backups of private configuration and installed server code.
Old releases and Git history do not replace those backups.

Receiver updates require a separate installation into `~/bin/mbbb-publish-content`.
Neither static deployment nor content publication installs receiver changes.

## PHP contact handler

Public endpoint: `/api/contact.php`

Private installation: `/home/dcshosting/mbbb-contact/`

This contains:

- `handler.php`
- `config.json`
- `composer.json` and `composer.lock`
- `vendor/`
- `state/`

The private directory and state directory use mode `700`; `config.json` uses `600`.
Never commit real configuration, `vendor/` or rate-limit state.

`composer.lock` is committed for reproducible dependency installation.

After copying updated Composer files into the private directory, run on Bobcat:

```bash
cd ~/mbbb-contact
/usr/bin/php8.4 ~/bin/composer.phar install --no-dev --prefer-dist --no-interaction --no-plugins --no-scripts --optimize-autoloader
/usr/bin/php8.4 ~/bin/composer.phar check-platform-reqs --no-dev
/usr/bin/php8.4 -l handler.php
```

Use `/usr/bin/php8.4` explicitly; the default CLI PHP may differ from the website's
configured version.

Private settings include the permitted website origin, SMTP credentials, sender,
recipient and rate-limit secret. Use `config.example.json` as the reference.

The handler validates submissions, applies rate limits and sends through authenticated
SMTP. The visitor's address is Reply-To, not From.

Private handler updates require a separate upload and PHP syntax check before replacing
the installed handler. No systemd restart is required on Bobcat.

Confirm actual email receipt after contact configuration changes.

## Troubleshooting

- Local content missing: pull and rebuild both sets of manifests.
- Gallery validation fails: inspect the YAML fields, image path, filename and size.
- Published content missing: inspect `/content/current.json` and its release URLs.
- HTML or JavaScript unchanged: deploy static files and refresh the browser cache.
- Contact request goes to `/api/contact`: check form action and cached JavaScript.
- GET `/api/contact.php` returns 405: expected; this does not test SMTP.
- Contact returns 503: inspect hosting error logs without exposing private settings.
- HTTPS verification reports a network error: inspect whether publication succeeded
  and whether a newer run has already completed successfully.

## Remaining launch and retirement work

- Confirm the final public hostname and configure hosting, DNS, TLS and redirects.
- Preserve email DNS unless an email migration is separately agreed.
- Update the private contact origin and workflow verification URL for the final hostname.
- Check production links, contact delivery, mobile behaviour and image permissions.
- Back up server-only configuration securely.
- Retire only MBBB's VPS site, contact service and publishing access.
- Remove obsolete VPS publishing secrets after confirming they are unused.
- Leave StayYNA and other VPS sites untouched.