# Install the MBBB contact form

The code is prepared and locally tested with mocked SMTP. It has not been installed on the VPS or tested against the real mailbox. No email has been sent during preparation.

## 1. Copy the files into the local repository

Copy `js/contact.js` and the `server/contact/` folder from this package into the matching locations in the repository. Do not overwrite unrelated files.

Add these patterns to `.gitignore`:

```gitignore
*.env
__pycache__/
```

In `deploy.sh`, add these options to the existing rsync command (preserve its existing source, destination and other options):

```bash
--exclude='/server/' \
--exclude='*.env' \
--exclude='__pycache__/' \
```

Keep the backslashes only where another command line follows. Do not deploy `server/` into the static web root. Never create the real credentials file inside the repository.

## 2. Stage the server files

From the local repository directory, using the existing websites SSH alias:

```bash
ssh -MNf mbbb
rsync -av server/contact/ mbbb:mbbb-contact-stage/
```

This copies files to the websites user's home directory, not the web root. It does not delete remote files. The commands below assume that home directory is `/home/websites`; check `getent passwd websites` if needed.

## 3. Install on the VPS as the sudo administrator

Log in using the `john` sudo account, not the non-sudo `websites` account. If the existing alias supports your admin SSH key:

```bash
ssh -l john mbbb
```

Otherwise use your established administrator SSH connection.

Confirm Python 3 is available and port 8011 is unused:

```bash
python3 --version
sudo ss -ltnp 'sport = :8011'
```

If another service is listening there, choose another free port in both the environment file and Caddy route. Do not stop the existing service.

Install the code and service:

```bash
sudo install -d -m 755 /opt/mbbb-contact
sudo install -m 644 /home/websites/mbbb-contact-stage/contact.py /opt/mbbb-contact/contact.py
sudo install -m 644 /home/websites/mbbb-contact-stage/mbbb-contact.service /etc/systemd/system/mbbb-contact.service
```

For the first installation only, create the credentials file:

```bash
sudo install -m 600 /home/websites/mbbb-contact-stage/mbbb-contact.env.example /etc/mbbb-contact.env
sudo nano /etc/mbbb-contact.env
```

Replace `REPLACE_ON_VPS` with the real mailbox password. Keep it out of chat, command history and Git. The file uses systemd EnvironmentFile syntax; double-quote a password containing spaces or special characters, escaping embedded double quotes and backslashes as appropriate. Do not re-copy the example over an already configured file during updates.

Start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mbbb-contact
sudo systemctl status mbbb-contact --no-pager
```

The service uses a systemd-managed unprivileged dynamic user. It binds only to `127.0.0.1`; no new public firewall port is needed.

## 4. Add the Caddy route

Back up `/etc/caddy/Caddyfile` to a new backup filename before editing. Change only the existing `mbbb.dcsmail.uk` block; preserve other sites and existing site-specific settings.

Add this within that site's block:

```caddyfile
handle /api/contact {
    reverse_proxy 127.0.0.1:8011 {
        header_up X-Contact-IP {http.request.remote.host}
    }
}
```

Keep the existing static file handling. For a simple site block, the resulting structure is:

```caddyfile
mbbb.dcsmail.uk {
    handle /api/contact {
        reverse_proxy 127.0.0.1:8011 {
            header_up X-Contact-IP {http.request.remote.host}
        }
    }

    handle {
        root * /srv/www/mbbb
        file_server
    }
}
```

Use `handle`, not `handle_path`: the Python handler expects the full `/api/contact` path. Caddy overwrites the client-IP header so a visitor cannot choose a rate-limit identity. This assumes Caddy is directly internet-facing; review trusted client addressing if a CDN or other proxy is introduced.

Validate first:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Only if validation succeeds:

```bash
sudo systemctl reload caddy
```

Official references: https://caddyserver.com/docs/caddyfile/directives/handle and https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

## 5. Update the homepage locally

Replace only the existing `<form>...</form>` with `server/contact/form.html`. Keep the surrounding enquiries section and its introduction.

Append `server/contact/contact.css` to `css/styles.css`.

Add this to the homepage `<head>`:

```html
<script defer src="/js/contact.js"></script>
```

The submit button starts disabled and the script enables it after initialisation. This avoids a broken native form submission if JavaScript does not load. The email link remains usable.

The demo form sends and receives as `mbbb@dcsmail.uk`. Update the adjacent enquiry email link to that address too if it still points to the band's live mailbox. Do not change other production contact links unless intended.

Deploy using the existing manual workflow, after adding the exclusions above:

```bash
ssh -MNf mbbb
./deploy.sh
```

## 6. Verify on the demo website

1. Open https://mbbb.dcsmail.uk and submit one clearly labelled test enquiry.
2. Check success appears and the fields clear.
3. Confirm the message arrives at `mbbb@dcsmail.uk`, including spam folders.
4. Confirm From/To use the demo mailbox and Reply-To uses the submitted address.
5. Check an invalid email or missing required field is rejected.
6. To test browser failure behaviour, switch the browser's DevTools network setting offline and submit. Confirm entered details remain and an error appears; restore networking afterwards. Do not send repeated live test emails unnecessarily.

Live Server alone cannot serve `/api/contact`, and its Origin is deliberately rejected by the demo backend. Preview layout locally, then test delivery through the HTTPS demo site. No cross-origin access is enabled.

## Maintenance and troubleshooting

```bash
sudo systemctl status mbbb-contact --no-pager
sudo journalctl -u mbbb-contact -n 50 --no-pager
sudo systemctl restart mbbb-contact
```

After changing the environment file or Python code, restart the service. After changing the service definition, run `sudo systemctl daemon-reload` before restarting. Logs record acceptance or exception type, not message contents or passwords.

The limiter allows five attempts per client IP per fifteen minutes and resets on restart. Visitors sharing an IP share that allowance. The honeypot and limiter are basic spam controls, not protection against determined distributed abuse.

No message database, durable queue or automatic retry is provided. SMTP acceptance is not guaranteed inbox delivery. An interrupted SMTP exchange can occasionally leave delivery uncertain, so a manual retry may duplicate a message. A recipient rejection or SMTP error is shown as a failure and the browser preserves the entered details.

## Production switch

Set `PUBLIC_ORIGIN` to the production site's exact origin (scheme and hostname, no trailing slash), and update SMTP credentials, MAIL_FROM, MAIL_TO and MAIL_SUBJECT_PREFIX. Restart the service, configure the production Caddy route and test delivery and Reply-To. Update visible email links and the privacy notice as necessary.

SMTP credentials, sender and destination are configured only on the server. Browser code continues to use `/api/contact`.

## Local checks

From `server/contact/`:

```bash
python3 -m unittest -v test_contact.py
```

Tests mock SMTP and do not send mail. They cover SMTP TLS/authentication and email headers, invalid input, honeypot handling, rate limiting, oversized requests and SMTP failure responses.
