import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import yaml from 'js-yaml';

const collections = ['gigs', 'testimonials'];
const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) { throw new Error(message); }

function textField(record, field, required = false) {
  const value = record[field];
  if (value == null && !required) return;
  if (typeof value !== 'string' || (required && !value.trim())) {
    fail(`${field} must be ${required ? 'non-empty ' : ''}text.`);
  }
}

function validDate(value, allowMonth = false) {
  if (typeof value !== 'string') return false;
  if (allowMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validate(record, collection) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    fail('Expected one YAML record (a mapping of fields to values).');
  }
  if (typeof record.published !== 'boolean') fail('published must be true or false.');
  // Drafts must parse but need not have complete fields. They are never staged.
  if (!record.published) return false;

  if (collection === 'gigs') {
    for (const field of ['title', 'date', 'start_time', 'venue']) textField(record, field, true);
    if (!validDate(record.date.trim())) fail('date must be a real date in YYYY-MM-DD format.');
    for (const field of ['location', 'running_time', 'description', 'ticket_url', 'ticket_price']) {
      textField(record, field);
    }
    if (record.ticket_url?.trim()) {
      let url;
      try { url = new URL(record.ticket_url.trim()); }
      catch { fail('ticket_url must be a complete http:// or https:// URL.'); }
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
        fail('ticket_url must be an HTTP(S) URL without embedded credentials.');
      }
    }
  } else {
    for (const field of ['reviewer', 'review_text']) textField(record, field, true);
    textField(record, 'source');
    if (typeof record.featured !== 'boolean') fail('featured must be true or false.');
    // Support older records with no date or a month-only date, as the website does.
    if (record.date != null && record.date !== '' && !validDate(record.date, true)) {
      fail('date must be YYYY-MM-DD or YYYY-MM, or omitted when unknown.');
    }
  }
  return true;
}

export async function prepareContent(root) {
  const result = {};
  const errors = [];
  for (const collection of collections) {
    const folder = path.join(root, collection);
    const entries = await fs.readdir(folder, { withFileTypes: true });
    const files = [];
    const anchors = new Set();
    let drafts = 0;
    for (const entry of entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (!/\.ya?ml$/i.test(entry.name)) continue;
      try {
        if (!entry.isFile()) fail('YAML entries must be regular files, not directories or symlinks.');
        // Match the current gig loader; preserve existing testimonial names containing &.
        const allowed = collection === 'gigs'
          ? /^[a-zA-Z0-9][a-zA-Z0-9_-]*\.ya?ml$/i
          : /^[a-zA-Z0-9][a-zA-Z0-9_& -]*\.ya?ml$/i;
        if (!allowed.test(entry.name)) fail('Unsupported filename. Use a date and a hyphenated name.');
        const anchor = entry.name.replace(/\.ya?ml$/i, '');
        if (anchors.has(anchor)) fail('Duplicate page anchor: .yml and .yaml files have the same base name.');
        anchors.add(anchor);
        const source = await fs.readFile(path.join(folder, entry.name), 'utf8');
        const record = yaml.load(source, { schema: yaml.CORE_SCHEMA });
        if (validate(record, collection)) files.push({ name: entry.name, source, record });
        else drafts++;
      } catch (error) {
        errors.push(`${collection}/${entry.name}: ${error.message}`);
      }
    }
    // The gig renderer sorts independently; testimonials follow manifest order.
    files.sort((a, b) => {
      const dates = (a.record.date || '').localeCompare(b.record.date || '');
      return (collection === 'gigs' ? dates : -dates) || a.name.localeCompare(b.name, 'en');
    });
    result[collection] = {
      files,
      drafts,
      manifest: JSON.stringify(files.map(file => file.name), null, 2) + '\n'
    };
  }
  if (errors.length) fail(`Content validation failed:\n\n${errors.join('\n\n')}\n\nNo manifests were written.`);
  return result;
}

export async function buildContent(root, { check = false, stage } = {}) {
  const prepared = await prepareContent(root);
  if (check) return prepared;

  if (stage) {
    // A fresh directory avoids stale records surviving from an earlier build.
    // Never use this option directly against the live web root.
    const destination = path.resolve(root, stage);
    await fs.mkdir(destination); // Deliberately fails if it already exists.
    for (const collection of collections) {
      const folder = path.join(destination, collection);
      await fs.mkdir(folder);
      for (const file of prepared[collection].files) {
        await fs.writeFile(path.join(folder, file.name), file.source, { flag: 'wx' });
      }
      await fs.writeFile(path.join(folder, `${collection}.json`), prepared[collection].manifest, { flag: 'wx' });
    }
    return prepared;
  }

  // Validate both collections first; prepare both temporary files before replacement.
  // Each rename is atomic, but the two manifests are not a single transaction.
  const pending = [];
  try {
    for (const collection of collections) {
      const destination = path.join(root, collection, `${collection}.json`);
      const temporary = `${destination}.${randomUUID()}.tmp`;
      pending.push({ temporary, destination });
      await fs.writeFile(temporary, prepared[collection].manifest, { flag: 'wx' });
    }
    for (const item of pending) await fs.rename(item.temporary, item.destination);
  } finally {
    for (const item of pending) await fs.rm(item.temporary, { force: true });
  }
  return prepared;
}

async function main() {
  const args = process.argv.slice(2);
  let check = false;
  let stage;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--stage' && args[i + 1] && !args[i + 1].startsWith('--')) stage = args[++i];
    else fail('Usage: node scripts/build-content.mjs [--check | --stage NEW_DIRECTORY]');
  }
  if (check && stage) fail('Use either --check or --stage, not both.');
  const result = await buildContent(scriptRoot, { check, stage });
  for (const collection of collections) {
    console.log(`${collection}: ${result[collection].files.length} published, ${result[collection].drafts} drafts omitted.`);
  }
  console.log(check ? 'Validation passed. No files changed.' : stage
    ? `Content staged in ${stage}. Nothing deployed.`
    : 'Both JSON manifests updated. No YAML files changed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
