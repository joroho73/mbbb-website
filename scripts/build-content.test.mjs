import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildContent } from './build-content.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mbbb-content-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const folder of ['gigs', 'testimonials']) {
    await fs.mkdir(path.join(root, folder));
    await fs.writeFile(path.join(root, folder, `${folder}.json`), '["previous.yml"]\n');
  }
  await fs.writeFile(path.join(root, 'gigs', '2027-03-21-concert.yml'),
    'title: Concert\ndate: 2027-03-21\nstart_time: 15:00\nvenue: Theatre\npublished: true\n');
  await fs.writeFile(path.join(root, 'testimonials', '2026-08-01-mr-&-mrs-test.yml'),
    'reviewer: Test\nreview_text: |-\n  First paragraph.\n\n  Second paragraph.\ndate: 2026-08-01\nfeatured: true\npublished: true\n');
  return root;
}

test('CMS unquoted dates/times, paragraphs and existing ampersand filenames work; drafts omitted', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, 'gigs/draft.yml'), 'published: false\n');
  const result = await buildContent(root);
  assert.equal(result.gigs.files[0].record.start_time, '15:00');
  assert.equal(result.gigs.files[0].record.date, '2027-03-21');
  assert.equal(result.gigs.drafts, 1);
  assert.match(result.testimonials.files[0].record.review_text, /First paragraph\.\n\nSecond paragraph/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'gigs/gigs.json'), 'utf8')), ['2027-03-21-concert.yml']);
});

test('an invalid published testimonial leaves BOTH old manifests intact', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, 'testimonials/broken.yml'), 'published: true\nreviewer: Test\nfeatured: false\n');
  await assert.rejects(buildContent(root), /review_text/);
  for (const c of ['gigs', 'testimonials']) assert.equal(await fs.readFile(path.join(root, c, `${c}.json`), 'utf8'), '["previous.yml"]\n');
});

test('invalid calendar dates, unsafe URLs and duplicate YAML fields are rejected', async t => {
  const root = await fixture(t);
  const file = path.join(root, 'gigs/2027-03-21-concert.yml');
  const original = await fs.readFile(file, 'utf8');
  for (const source of [original.replace('2027-03-21', '2027-02-30'), original + 'ticket_url: javascript:alert(1)\n', original + 'title: Duplicate\n']) {
    await fs.writeFile(file, source);
    await assert.rejects(buildContent(root), /Content validation failed/);
  }
});

test('check mode does not write; staging copies only published YAML and manifests unchanged', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, 'gigs/draft.yml'), 'published: false\n');
  await fs.writeFile(path.join(root, 'gigs/index.html'), 'Keep this page');
  await buildContent(root, { check: true });
  assert.equal(await fs.readFile(path.join(root, 'gigs/gigs.json'), 'utf8'), '["previous.yml"]\n');
  await buildContent(root, { stage: 'output' });
  assert.deepEqual((await fs.readdir(path.join(root, 'output/gigs'))).sort(), ['2027-03-21-concert.yml', 'gigs.json']);
  assert.equal(await fs.readFile(path.join(root, 'output/gigs/2027-03-21-concert.yml'), 'utf8'), await fs.readFile(path.join(root, 'gigs/2027-03-21-concert.yml'), 'utf8'));
  await assert.rejects(buildContent(root, { stage: 'output' }), /EEXIST/);
});

test('newest testimonials first, deletion is reflected, empty collections allowed', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root, 'testimonials/new.yml'), 'reviewer: New\nreview_text: Great\ndate: 2026-11-04\nfeatured: false\npublished: true\n');
  let result = await buildContent(root);
  assert.equal(result.testimonials.files[0].name, 'new.yml');
  await fs.unlink(path.join(root, 'gigs/2027-03-21-concert.yml'));
  result = await buildContent(root);
  assert.equal(result.gigs.files.length, 0);
  assert.equal(await fs.readFile(path.join(root, 'gigs/gigs.json'), 'utf8'), '[]\n');
});
