# Melvin Beddow Big Band website

Static HTML, CSS and JavaScript website maintained by Dunmow Computer Services.
Repository: https://github.com/joroho73/mbbb-website

Updated 10 November 2026. This describes the migration stage, not a completed production cutover.

## Environments and branches

| Branch | Website | Hosting |
| --- | --- | --- |
| main | https://mbbb.dcsmail.uk | Existing Mythic Beasts VPS |
| migration/mythic-web-hosting | https://mbbb-preview.dcsmail.uk | Mythic Beasts Web 25, Bobcat |

The real domain has not yet been switched. Pages CMS edits whichever branch is selected;
changes do not automatically cross branches. During preview tests select the migration branch.
The image-filename spaces fix currently belongs to the migration branch; main may reject
published photo records with spaces until that fix is separately applied or migration completes.

The historical tag `vps-before-hosting-migration` marks the pre-migration code. Git history
is not a backup of server-only credentials, configuration or received emails.

## Working features

- Shared header/footer loaded by js/includes.js; menu styles in css/menu-styles.css.
- Gigs and testimonials are individual YAML records, with generated JSON manifests.
- Homepage shows up to three upcoming gigs and one featured testimonial without rotation.
- Gallery order is randomised; selected published photographs can be chosen for the homepage.
- Pages CMS commits trigger content validation, packaging, SSH publication and HTTPS verification.
- Immutable content releases are switched together using a current symlink.
- Old releases are cleaned up only after successful verification.
- Bobcat contact form uses PHP 8.4 and PHPMailer SMTP; email receipt has been confirmed.

## Content and code

| Path | Purpose |
| --- | --- |
| .pages.yml | CMS collection and media configuration |
| gigs/*.yml | Gig records |
| testimonials/*.yml | Testimonial records |
| gallery/photos/*.yml | Photo metadata |
| assets/gallery/ | Uploaded photographs |
| gigs/gigs.json | Generated gig filename manifest |
| testimonials/testimonials.json | Generated testimonial filename manifest |
| gallery/photos.json | Generated photo records |
| js/content-source.js | Local paths versus published release selection |
| scripts/build-content.mjs | Validate gigs/testimonials and generate or stage manifests |
| scripts/build-gallery.mjs | Validate photo records and generate or stage gallery |
| scripts/package-content.py | Package staged text and image files |
| server/mbbb-publish-content | Restricted receiver and release cleanup |
| .github/workflows/deploy-content.yml | Branch-specific automatic content publication |
| api/contact.php | Public PHP entry point on Bobcat |
| server/contact-php/ | Private PHP handler, Composer files and placeholder configuration |
| js/contact.js | JSON submission to the form action |
| deploy-preview.sh | Manual static deployment to Bobcat |
| deploy.sh | Legacy VPS static deployment; retain during migration |

## Local development

Use Node 24 to match Actions. From the repository root:

```bash
npm ci --ignore-scripts
npm run content:test
npm run content:build
node scripts/build-gallery.mjs
```

Start VS Code Live Server from this root. Use localhost or 127.0.0.1; do not use file://.
The local content loader uses the local manifests. A git pull downloads CMS YAML/images;
rerun the builders to refresh local manifests. Manifest changes may then appear in git status.
Do not manually maintain filename lists.

Live Server cannot execute PHP. Test the contact endpoint on Bobcat. Never copy real SMTP
credentials into the repository or public website directory.

## Content rules

Gigs require title, date, start_time, venue and a boolean published flag. Optional fields are
location, running_time, description, ticket_url and ticket_price. Dates must be real calendar
dates. Descriptions and testimonial review_text support blank-line-separated paragraphs using
YAML literal blocks. Ticket URLs are plain HTTP/HTTPS URLs, not Markdown links.

Testimonials use reviewer, review_text, date/source metadata, featured and published; consult
.pages.yml for the current full form. Homepage excerpts link to filename-derived anchors.
Renaming a record can break its previously shared anchor links.

Photo records use title, image, caption (CMS Description), optional photographer,
use_on_homepage and published. The generated alternative text uses description, then legacy
alt text, then title. Choose descriptions that meaningfully describe the photograph.
Both published and use_on_homepage must be true for homepage selection.

Photos must be JPG/JPEG, PNG or WebP directly inside assets/gallery. The migration branch
accepts letters, digits, underscores, dots, hyphens and ordinary spaces, starting with a letter
or digit. Each published image is limited to 5 MiB; the encoded publication bundle to 32 MiB.
Resize/compress large originals before uploading. Uploaded but unreferenced images are not
included in the published bundle. Unpublished content is omitted from publication but remains
visible in this public Git repository: never store confidential material here.

## Git and Pages CMS

Before editing locally:

```bash
git fetch origin
git status
```

With a clean working tree and no local-only commits, use git pull --ff-only. If local and
remote commits have diverged, review them, then rebase local unpublished commits onto the
remote branch. Stop and resolve conflicts explicitly. Do not force-push to solve CMS divergence.

To bring main content into the migration branch, fetch and merge origin/main while on the
migration branch, review conflicts, rebuild content and commit generated manifest changes.
Review test records and preserve Bobcat-specific deployment settings. Do not merge the
migration branch into main until the workflow trigger and production destination are prepared.

## Manual static deployment to Bobcat

From the local repository on the migration branch:

```bash
./deploy-preview.sh --dry-run
./deploy-preview.sh
```

Target: dcshosting@bobcat.mythic-beasts.com
Document root: /home/dcshosting/www/mbbb-preview.dcsmail.uk/

This script uploads HTML, CSS, JavaScript, the public PHP entry point and static assets.
It neither generates manifests nor deploys CMS records, CMS images, private server code or
credentials. It deliberately does not delete remote files during migration. Remove obsolete
remote files only after reviewing explicit paths. Actions does not deploy these static files.

The legacy deploy.sh targets /srv/www/mbbb on the VPS and requires ssh -MNf mbbb. It uses
rsync --delete; do not retarget it casually. Consolidate deployment scripts at cutover.

## Bobcat content publication

| Server path | Purpose |
| --- | --- |
| /home/dcshosting/bin/mbbb-publish-content | Installed receiver, mode 700 |
| /home/dcshosting/mbbb-content/releases/ | Complete immutable content releases |
| /home/dcshosting/mbbb-content/current | Symlink to active release |
| /home/dcshosting/mbbb-content/current.json | Symlink to current/release.json |
| /home/dcshosting/mbbb-content/.htaccess | Cache-Control: no-store for release pointer |
| /home/dcshosting/www/mbbb-preview.dcsmail.uk/content | Symlink to private-parent content directory |

Content in mbbb-content is publicly served through that link; it must contain no secrets.
The receiver is outside that directory. A forced-command SSH key restricts automated access.

Migration Actions uses BOBCAT_SSH_HOST, BOBCAT_SSH_PORT, BOBCAT_SSH_USER,
BOBCAT_SSH_PRIVATE_KEY and BOBCAT_SSH_KNOWN_HOSTS. Existing MBBB_SSH_* secrets support
main/VPS. Never replace host-key verification with StrictHostKeyChecking=no.

Workflow: test, stage, package, check latest branch commit, publish, verify every text/image
file over HTTPS, then cleanup. Validation failures leave the old release active. HTTPS
verification happens after activation; a verification failure does not automatically roll back.

Cleanup retains the active release, five newest releases by sequence, and everything less than
seven days old. It shares the publication lock. Deleted releases are listed in the Actions log.
Run a non-deleting preview on Bobcat with:

```bash
SSH_ORIGINAL_COMMAND=cleanup-preview ~/bin/mbbb-publish-content
```

Older releases aid recovery but are not an off-host backup. To restore older content normally,
revert the relevant content changes in Git and publish a new higher-sequence release. Do not
reset sequence numbering or point current at an older release casually.

Receiver changes require a separate upload/install into ~/bin; neither static deployment nor
content Actions installs receiver code. Back up the installed receiver before replacing it.

## PHP contact handler

Public endpoint: /api/contact.php. JavaScript reads form.action. The private installation is
/home/dcshosting/mbbb-contact/ and contains handler.php, config.json, composer.json,
composer.lock, vendor/ and state/. The directory and state directory are mode 700;
config.json is mode 600. The actual config is never committed. Commit composer.lock for
reproducible dependency versions; do not commit vendor or state.

Bobcat's default CLI PHP is 7.4; always use /usr/bin/php8.4 for this application.
Composer is installed at /home/dcshosting/bin/composer.phar. After updating dependency files:

```bash
cd ~/mbbb-contact
/usr/bin/php8.4 ~/bin/composer.phar install --no-dev --prefer-dist --no-interaction --no-plugins --no-scripts --optimize-autoloader
/usr/bin/php8.4 ~/bin/composer.phar check-platform-reqs --no-dev
/usr/bin/php8.4 -l handler.php
```

Private configuration keys: PUBLIC_ORIGIN, SMTP_HOST, SMTP_PORT, SMTP_USERNAME,
SMTP_PASSWORD, MAIL_FROM, MAIL_TO, MAIL_SUBJECT_PREFIX and RATE_LIMIT_SECRET.
The current preview origin is https://mbbb-preview.dcsmail.uk. MAIL_TO is the configured
recipient; confirm it before production. The subject prefix is Website Enquiry from.
SMTP uses authenticated STARTTLS; visitor email is Reply-To, never From.

The handler validates fields, limits the body to 24,000 bytes, allows five attempts/IP per
15 minutes and at most three simultaneous SMTP sends. Rate state uses hashed client keys
and file locks. A filled honeypot returns an error rather than claiming an email was sent.
Errors preserve form values; SMTP acceptance yields the pink success message and clears
form fields. Acceptance does not itself guarantee inbox delivery. No database or queue is used.

Private handler changes are not included by deploy-preview.sh. Upload handler.php separately,
lint with PHP 8.4 and replace the installed file only after a successful lint. No systemd
restart is needed on Bobcat. Keep the existing VPS service until migration is accepted.

## Troubleshooting

- Wrong endpoint /api/contact on Bobcat: check form action, JavaScript and browser cache.
- GET /api/contact.php returning 405 JSON is expected; it does not test SMTP/configuration.
- A 503 contact response indicates configuration, dependency, storage or availability issues;
  inspect hosting error logs. Never expose SMTP debugging or private settings in responses.
- Gallery validation failure: inspect image path, extension, filename characters and sizes.
- Missing content: inspect /content/current.json and the release-prefixed manifest/image URLs.
- Successful CMS run but unchanged HTML/JS: static code needs manual deployment.
- CMS edit goes to wrong host: inspect selected CMS branch and Actions run branch.

## Remaining before launch

- Remove test gigs and temporary link-test.txt; reconcile latest content from both branches.
- Decide final hostname and redirects; prepare domain/TLS hosting without altering mail DNS
  unless a separate email migration is agreed.
- Update private PUBLIC_ORIGIN and verify sender/recipient, Reply-To and actual delivery.
- Update workflow branch trigger AND job branch condition for main, production verification
  URL and destination. Simply merging the current migration-only workflow will not enable main.
- Consolidate deployment scripts and document separate private-code updates.
- Review cache behaviour and homepage image failure fallback.
- Review privacy/terms, image permissions, mobile/keyboard behaviour and production links.
- Make independent backups of server-only configuration securely; do not rely on releases alone.
- Merge migration when ready; test main publication and production delivery before retiring VPS.
- Keep Pages CMS editors on one production branch, then remove the temporary migration branch.
