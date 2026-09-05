const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { buildSite } = require('../scripts/build-site.cjs');

const repository = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'vtuber-conventions-test-'));
try {
  const output = buildSite(path.join(temporary, 'site'));
  const slug = 'vexpo-2026';
  const rootHTML = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert(rootHTML.includes(`href="conventions/${slug}/"`));
  const convention = path.join(output, 'conventions', slug);
  const html = fs.readFileSync(path.join(convention, 'index.html'), 'utf8');
  assert(html.includes('href="../../"'));
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (/^https?:/.test(match[1])) continue;
    assert(fs.existsSync(path.resolve(convention, match[1])), `Broken local link: ${match[1]}`);
  }
  for (const name of ['schedule.csv', 'socials.json', 'opening-hours.json']) {
    const source = fs.readFileSync(path.join(repository, 'conventions', slug, name));
    assert.deepEqual(fs.readFileSync(path.join(convention, name)), source);
    assert.deepEqual(fs.readFileSync(path.join(output, slug, name)), source);
  }
  for (const excluded of ['sources', 'tmp', 'AGENTS.md']) {
    assert(!fs.existsSync(path.join(convention, excluded)));
    assert(!fs.existsSync(path.join(output, excluded)));
  }

  const redirect = fs.readFileSync(path.join(output, slug, 'index.html'), 'utf8');
  const target = `../conventions/${slug}/`;
  assert(redirect.includes(`content="0; url=${target}"`));
  assert(redirect.includes(`href="${target}"`));
  let redirected;
  const script = redirect.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, { location: {
    search: '?day=friday', hash: '#schedule', replace: value => { redirected = value; }
  } });
  for (const oldURL of [`https://example.org/Repo/${slug}/`, `https://example.org/Repo/${slug}/index.html`]) {
    assert.equal(new URL(redirected, oldURL).href, `https://example.org/Repo/conventions/${slug}/?day=friday#schedule`);
  }
  const directoryRedirect = fs.readFileSync(path.join(output, 'conventions', 'index.html'), 'utf8');
  assert(directoryRedirect.includes('content="0; url=../"'));
  vm.runInNewContext(directoryRedirect.match(/<script>([\s\S]*?)<\/script>/)[1], { location: {
    search: '?from=conventions', hash: '#events', replace: value => { redirected = value; }
  } });
  for (const base of ['https://example.org/Repo/conventions/', 'https://example.org/Repo/conventions/index.html', 'http://localhost:8000/conventions/']) {
    assert.equal(new URL(redirected, base).href, new URL('../?from=conventions#events', base).href);
  }
  assert.throws(() => buildSite(output), /Output already exists/);

  // A future convention with only required files is discovered without a legacy alias.
  const fixture = path.join(temporary, 'fixture');
  const future = path.join(fixture, 'conventions', 'example-con-2030');
  fs.mkdirSync(future, { recursive: true });
  fs.copyFileSync(path.join(repository, 'conventions', 'index.html'), path.join(fixture, 'conventions', 'index.html'));
  fs.mkdirSync(path.join(fixture, 'assets'));
  fs.writeFileSync(path.join(fixture, 'index.html'), '<a href="conventions/example-con-2030/">Example</a>');
  fs.writeFileSync(path.join(future, 'index.html'), '<p>Example</p>');
  fs.writeFileSync(path.join(future, 'schedule.csv'), 'date,event\n2030-09-18,Example\n');
  fs.writeFileSync(path.join(future, 'private-notes.txt'), 'Not a runtime file');
  fs.mkdirSync(path.join(fixture, 'conventions', 'draft-without-schedule'));
  const futureOutput = buildSite(path.join(temporary, 'future-site'), fixture);
  assert.deepEqual(fs.readdirSync(path.join(futureOutput, 'conventions')).sort(), ['example-con-2030', 'index.html']);
  assert.deepEqual(fs.readdirSync(path.join(futureOutput, 'conventions', 'example-con-2030')).sort(), ['index.html', 'schedule.csv']);
  assert(!fs.existsSync(path.join(futureOutput, 'example-con-2030')));
  console.log('PASS: Nested convention packaging, relative links, optional data, legacy redirects and downloads, source exclusions, and future convention discovery.');
} finally {
  const resolved = path.resolve(temporary);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('vtuber-conventions-test-')) {
    throw new Error('Unexpected temporary directory; refusing cleanup');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}
