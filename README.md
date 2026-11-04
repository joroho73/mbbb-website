# Melvin Beddow Big Band website

Static website for the Melvin Beddow Big Band (MBBB), developed by Dunmow Computer Services (DCS). The site promotes performances, shares audience testimonials and invites booking enquiries.

Last updated: 21 October 2026.

## Project details

| Item | Details |
| --- | --- |
| Repository | https://github.com/joroho73/mbbb-website |
| Working branch | `main` — currently maintained by one developer |
| Demo website | https://mbbb.dcsmail.uk |
| Demo hosting | Mythic Beasts VPS, Ubuntu 24.04, Caddy |
| Website root on VPS | `/srv/www/mbbb/` |
| Website deployment user | `websites` (non-sudo) |
| SSH alias | `mbbb` |
| Demo mailbox | `mbbb@dcsmail.uk` |
| Production hosting | Not yet decided |

This README records the implementation and decisions discussed during development. It is not an audit of the current deployed files. Local edits, GitHub and the demo may temporarily differ.

## Approach and status

The website uses HTML, CSS and browser JavaScript. Preserve its existing logo, photographs and visual identity; no WordPress, database or frontend framework is planned.

- Shared header and footer are loaded from HTML includes.
- The default design uses the pink accent with generic CSS class names. Gold remains an optional alternative design.
- Gigs and testimonials are read from individual YAML files through JSON filename manifests.
- The gigs page separates upcoming and past performances; the homepage displays up to three upcoming gigs.
- The homepage rotates featured testimonials and links to individual testimonials on the full page.
- A reusable page template provides consistent introductions and content styling.
- Privacy and website terms content has been drafted; outstanding placeholders and operating details need confirmation before production.
- A Pages CMS account has been created. CMS configuration, editor invitations and automated publication remain planned.
- The contact form currently uses `mailto:`. Its server-side replacement has been prepared and locally tested; VPS installation and live delivery testing remain outstanding. See `server/contact/INSTALL.md`.

## Key files

The following are the relevant paths used in the development work, rather than an exhaustive repository listing:

| Path | Purpose |
| --- | --- |
| `index.html` | Homepage |
| `page-template.html` | Starting point for additional pages |
| `privacy.html`, `terms.html` | Privacy notice and website terms |
| `includes/header.html`, `includes/footer.html` | Shared site navigation and footer |
| `css/styles.css` | Main styles, typography, components and page layouts |
| `css/menu-styles.css` | Desktop and mobile menu styles |
| `assets/` | Logo, photographs and other assets |
| `js/includes.js` | Loads includes and initialises the mobile menu |
| `js/gigs.js` | Shared YAML loading, validation and gig rendering |
| `js/featured-testimonials.js` | Featured homepage testimonial rotation |
| `gigs/index.html` | Upcoming and historical gig listings |
| `gigs/gigs.json` | List of gig YAML filenames |
| `gigs/*.yml` | Individual gig records |
| `testimonials/index.html` | Full testimonial listings |
| `testimonials/testimonials.json` | List of testimonial YAML filenames |
| `testimonials/*.yml` | Individual testimonial records |
| `deploy.sh` | Manual static website deployment |

The testimonials page also loads its full-list rendering JavaScript; retain the script path used in that page.

## Local development

1. Open the repository folder in VS Code.
2. Start Live Server from the repository root.
3. Browse the homepage and `/gigs/` and `/testimonials/` pages.
4. Check the browser console and Network tab when content fails to load.

Use HTTP through Live Server, not `file://`: the includes, JSON manifests and YAML records are fetched by JavaScript. Root-relative paths such as `/css/styles.css`, `/assets/logo.png` and `/includes/header.html` allow pages in subfolders to load the same resources.

The YAML-based pages load js-yaml before their rendering scripts:

```html
<script defer src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.1/dist/js-yaml.min.js"></script>
<script defer src="/js/gigs.js"></script>
```

Load the parser only once on a page. If a script produces a MIME-type error mentioning HTML, check that its path points to an actual JavaScript file rather than a missing-file response.

Live Server previews the static website. It will not run the planned Python contact endpoint; testing that endpoint will need the backend and a suitable same-origin route.

## Shared page layout

Use the shared include placeholders:

```html
<body id="top">
  <div id="site-header"></div>
  <main>
    <!-- Page content -->
  </main>
  <div id="site-footer"></div>
  <script src="/js/includes.js"></script>
</body>
```

Initialise menu event listeners after the header include has loaded. The mobile menu keeps the booking link visible and closes when a navigation link is selected.

Inner pages use `.page-header`, `.eyebrow`, `.page-intro`, `.page-divider` and `.page-content`. The shared page introduction uses a pink eyebrow and a wide, thin pink divider. The earlier short decorative line above the eyebrow was removed.

Use `href="#top"` for the current page's back-to-top link and `href="/#about"` for a homepage section from another page. IDs must be unique within each page. Footer links to legal pages should be root-relative (`/privacy.html` and `/terms.html`).

## Gig content

Store one gig per YAML file in `gigs/`, preferably named `YYYY-MM-DD-gig-name.yml`. Add its exact filename to `gigs/gigs.json`. The manifest is currently maintained manually; folder contents are not discovered automatically by the browser.

### Fields

| Field | Required for publication | Format |
| --- | --- | --- |
| `title` | Yes | Text |
| `date` | Yes | Quoted valid date: `"YYYY-MM-DD"` |
| `start_time` | Yes | Text, including wording such as doors and performance times |
| `venue` | Yes | Text |
| `location` | No | Address or location text |
| `running_time` | No | Text |
| `description` | No | Plain text; blank lines separate paragraphs |
| `ticket_url` | No | Full HTTP/HTTPS URL, without Markdown link syntax |
| `ticket_price` | No | Text, including any fees or door prices |
| `published` | Yes | Boolean `true` or `false`, without quotes |

Example structure (illustrative, not a real listing):

```yaml
title: "Example concert"
date: "2027-06-12"
start_time: "Doors open at 19.15, music at 19.45"
venue: "Example Hall"
location: "Example Hall, Example Town"
running_time: "Approximately 2 hours including an interval"
description: |-
  The first paragraph of the event description.

  A second paragraph with more details.
ticket_url: ""
ticket_price: "To be confirmed"
published: false
```

Keep the block text indented using spaces, starting on the line after `description: |-`. Descriptions are rendered as plain text, so Markdown asterisks are not converted to emphasis.

### Display rules

- YAML values are the source of truth, not filenames or old HTML cards.
- Only records with `published: true` are displayed. Unpublished drafts can be incomplete.
- Dates are compared against today's calendar date in `Europe/London`.
- Today's gigs remain upcoming until the end of the day.
- Upcoming gigs are ordered by date ascending; historical gigs by date descending.
- The homepage takes the first three upcoming gigs and shows title, venue and start-time information.
- Homepage title and arrow links point to the individual gig on `/gigs/` using a filename-derived anchor.
- The full page includes optional details only when present and preserves description paragraphs.
- Upcoming gigs without a ticket URL display “Tickets coming soon”. This currently applies to all upcoming gigs without a URL, including free or pay-on-the-door events; refine the rule if needed.
- Past gigs retain their details but do not show a ticket-purchase link or “Tickets coming soon”.

Renaming a YAML file changes its anchor and can break previously shared links. Keep historical records for the archive rather than deleting them when the date passes.

### Validation and failures

The shared loader checks required fields, real dates, optional field types, URLs, Boolean publication flags and the filename manifest. It uses text nodes to render content rather than interpreting YAML values as HTML.

The current browser loader treats a missing or malformed published record as a failed load and displays an error message. It does not retain a previous successful content snapshot. Inspect the browser console for details. Build-time validation and preserving the last successful deployment are planned for automatic publishing.

## Testimonial content

Store individual records in `testimonials/` and list their filenames in `testimonials/testimonials.json`. Use readable date-and-name filenames and avoid renaming published files unnecessarily because individual testimonial links use filename-derived anchors.

The content model uses `reviewer`, `review_text`, `date`, `source`, `featured` and `published`. The `source` field is currently used for event type or source information. Keep dates valid; do not use a day of `00`. If the original review date is unknown, an agreed creation date can be used, but do not present it as a known event date.

Use a YAML literal block for paragraphs:

```yaml
reviewer: "Example reviewer"
review_text: |-
  First paragraph of the testimonial.

  Second paragraph of the testimonial.
date: "2026-10-21"
source: "Wedding"
featured: true
published: false
```

The full page displays published testimonials with paragraphs, attribution and metadata. The homepage selects published, featured testimonials and displays their first paragraph, attribution, a link to the exact testimonial and a link to all testimonials.

The agreed rotation interval is five seconds, with pause controls and hover/focus pausing. Keep an explicit pause control available for touch and keyboard users. The later presentation decision removed the added ellipsis from the excerpt.

Only public-facing content belongs in this public repository. Keep private correspondence and testimonial permission records elsewhere.

## Manual deployment

Run these commands from the local repository directory:

```bash
ssh -MNf mbbb
./deploy.sh
```

The first command opens the SSH multiplexed connection required by the current deployment script. The script deploys static files using rsync to `/srv/www/mbbb/` as the non-sudo `websites` user.

The script uses `rsync --delete`: destination files absent from the deployment source may be removed. Check the destination and exclusions before changing the script. Keep runtime services and secrets outside the website root. Review exclusions so repository metadata, private configuration and future server-side source files are not inadvertently published.

GitHub commits do not currently replace this manual publishing step. Check the deployed pages after running the script, including nested-page assets, navigation, content loading and ticket links.

## Planned Pages CMS and automatic publishing

Use the hosted Pages CMS service at https://app.pagescms.org/ rather than self-hosting a CMS. An account has been created.

Initial scope:

- Gigs and Testimonials collections with structured fields.
- One DCS administrator and up to three band editors.
- No layout editing, WYSIWYG page editing or collection-level role restrictions.
- Editors' saved changes should publish automatically without administrator approval.

Still to implement:

1. Add `.pages.yml` matching the agreed fields and existing content paths.
2. Test creating, updating, unpublishing and deleting records.
3. Generate filename manifests automatically as part of publication.
4. Validate all publishable content before deploying.
5. Configure GitHub Actions and narrowly scoped deployment credentials stored as GitHub secrets.
6. Design content-only deployment so it cannot delete unrelated site files or conflict with manual deployment.
7. Ensure validation or deployment failure leaves the last successful published content available.
8. Invite editors and document the editing workflow.

The final workflow and deployment strategy remain to be implemented and tested. Do not assume a `.pages.yml` file or GitHub Actions publishing workflow already exists.

## Contact form implementation

Status: source files prepared and locally tested with mocked SMTP. Not yet installed on the VPS or tested for real delivery. Follow `server/contact/INSTALL.md`.

Replace the current `mailto:` form with a small Python handler using built-in SMTP support. No database or additional email service is planned.

Browser JavaScript will submit to `/api/contact`. Caddy will forward that route to a handler listening on loopback only, running under an unprivileged account as a systemd service. The proposed local port is 8011; check it is free before installation.

## Demo email behaviour

Use the existing dedicated Mythic Beasts mailbox for both sending and receiving demo enquiries:

```text
From: MBBB Website <mbbb@dcsmail.uk>
To: mbbb@dcsmail.uk
Reply-To: the visitor's validated email address
Subject prefix: MBBB Demo Enquiry
```

Do not send demo enquiries to the band's production enquiries address. The recipient and sender must come from server configuration, not browser-submitted fields.

### Proposed VPS files

| File | Purpose |
| --- | --- |
| `/opt/mbbb-contact/contact.py` | Python form handler |
| `/etc/mbbb-contact.env` | Private email configuration |
| `/etc/systemd/system/mbbb-contact.service` | Service definition |

These paths are outside the static website root and therefore outside its current `rsync --delete` deployment target. The handler and its service will need a separate installation/update step.

### Email configuration

Proposed contents of `/etc/mbbb-contact.env`:

```ini
SMTP_HOST=smtp-auth.mythic-beasts.com
SMTP_PORT=587
SMTP_USERNAME=mbbb@dcsmail.uk
SMTP_PASSWORD=replace-with-mailbox-password

MAIL_FROM=mbbb@dcsmail.uk
MAIL_TO=mbbb@dcsmail.uk
MAIL_SUBJECT_PREFIX="MBBB Demo Enquiry"
PUBLIC_ORIGIN=https://mbbb.dcsmail.uk
CONTACT_PORT=8011
```

The service will load this file using systemd's `EnvironmentFile` setting. The Python handler will read the resulting environment variables. Use systemd-compatible quoting for values where needed; this is not a shell script.

SMTP uses STARTTLS with certificate verification. The authenticated mailbox must be authorised to send from the configured From address.

Keep the real configuration outside GitHub and the web root. Restrict access, for example by making it root-owned with mode `0600` when systemd loads it. Never put the password in HTML, browser JavaScript, logs or this README. A placeholder-only configuration example may be kept in the repository.

Mythic Beasts documentation:

- SMTP settings: https://www.mythic-beasts.com/support/hosting/mail/client
- Sender restrictions: https://www.mythic-beasts.com/support/hosting/mail/sender-restrictions

### Form behaviour

Retain the existing enquiry fields: first name, last name, email address, event date, event type and message.

The planned handler will:

- Validate required fields and email addresses on the server.
- Limit request and field sizes and reject invalid input.
- Check a hidden honeypot field and apply basic rate limiting.
- Send plain-text email through the configured SMTP server with a finite timeout.
- Return a clear success or error response without exposing credentials or internal exceptions.
- Avoid logging enquiry bodies or other unnecessary personal information.

The browser will prevent duplicate submissions while a request is in progress. It will show success only after SMTP accepts the message. SMTP acceptance does not guarantee final inbox delivery.

On failure, preserve the entered details and offer an email link. Keep a visible direct-contact option for visitors who cannot use the scripted form.

There is no planned persistent message queue. A failed submission will need to be retried by the visitor.

### Switching to production

1. Confirm production hosting supports the handler and `/api/contact` route.
2. Choose the production sending mailbox and receiving address.
3. Update SMTP credentials, sender, recipient and subject prefix in the private configuration file.
4. Check sender authorisation and the sending domain's email authentication configuration.
5. Restart `mbbb-contact.service` to load the new settings.
6. Test a submission, delivery to the correct inbox and Reply-To behaviour.
7. Update any visible demo contact links and the privacy notice to match the production arrangements.

The browser endpoint remains `/api/contact`, so no hostname or SMTP credentials need to be embedded in the JavaScript.

### Implementation checklist

- [x] Prepare the Python handler and automated local checks.
- [ ] Install the private configuration file on the VPS.
- [ ] Select a free loopback port and create the systemd service.
- [ ] Add the Caddy route without affecting other hosted sites.
- [ ] Replace the form's mailto submission with JavaScript submission.
- [ ] Test successful delivery and Reply-To.
- [ ] Test validation, honeypot, rate limiting and sending failures.
- [ ] Confirm errors preserve form contents and no secrets are exposed.
- [ ] Record final installation, restart and troubleshooting commands here.

Prepared files are supplied in `server/contact/` and `js/contact.js`. Six backend tests and browser-script success/failure checks passed locally with mocked SMTP. The service, Caddy route and form changes still need installation; no live email has been sent.


## Before production

- Confirm the production domain, hosting and mail delivery arrangements.
- Complete and review the privacy notice and website terms with the band.
- Check the live site's external resources, privacy disclosures and any analytics or cookie behaviour.
- Verify gig details, ticket links and testimonial publication permissions.
- Test mobile navigation, keyboard use, pause controls and anchor links.
- Complete contact-form delivery and failure tests.
- Complete CMS/editor testing and safe automatic deployment before relying on it.
