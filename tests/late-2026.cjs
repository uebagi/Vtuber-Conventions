const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const parser = vm.createContext({});
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8').split('const el =')[0], parser);
const parse = text => { parser.csv = text; return vm.runInContext('parseCSV(csv)', parser); };
const editions = ['twitchcon-san-diego-2026', 'asmr-vtuber-awards-2026', 'anime-weekend-atlanta-2026', 'dreamhack-stockholm-2026', 'anime-festival-asia-singapore-2026', 'hakos-baelz-regalia-2026', 'anime-frontier-2026'];
const home = fs.readFileSync('index.html', 'utf8');
let timedCount = 0, pendingCount = 0;
for (const slug of editions) {
  const folder = path.join('conventions', slug);
  const read = name => JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
  const page = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
  const text = fs.readFileSync(path.join(folder, 'schedule.csv'), 'utf8');
  const timed = parse(text);
  const pending = fs.existsSync(path.join(folder, 'unconfirmed.json')) ? read('unconfirmed.json').sessions : [];
  const research = read('sources/research.json');
  const sources = new Map(research.sources.map(s => [s.id, s]));
  assert.equal(sources.size, research.sources.length);
  for (const s of sources.values()) {
    assert(/^[a-z0-9-]+$/.test(s.id)); assert(s.locator); assert.equal(new URL(s.url).protocol, 'https:');
  }
  assert(home.includes(`href="conventions/${slug}/" data-end-date="${research.event.end}" data-timezone="${research.event.timezone}"`));
  assert(page.includes(`data-event-id="${slug}"`));
  assert(!page.includes('kumoricon')); assert(!page.includes('data-uid-domain'));
  const participants = new Set();
  const uids = new Set();
  const snapshots = new Map(research.sessions.map(s => [s.id, s]));
  assert.equal(snapshots.size, research.sessions.length);
  const headers = text.split(/\r?\n/)[0].split(',');
  for (const row of timed.concat(pending)) {
    const snapshot = row.id ? snapshots.get(row.id) : research.sessions.find(s => s.date === row.date && s.start_time === row.start_time && s.stage === row.stage && s.event === row.event);
    assert(snapshot, `${slug}: missing research snapshot for ${row.event}`);
    for (const field of headers) assert.equal(snapshot[field], row[field], `${slug}: snapshot mismatch: ${row.event} / ${field}`);
    assert(snapshot.source_ids.length);
    const sourceURLs = new Set(snapshot.source_ids.map(id => { assert(sources.has(id)); return sources.get(id).url; }));
    for (const url of row.source_url.split(';')) assert(sourceURLs.has(url));
    for (const n of row.participants.split(';').filter(n => n && n !== '???')) participants.add(n);
    for (const flag of ['is_concert', 'is_meet_greet']) assert(['true', 'false'].includes(row[flag]));
    assert(['official', 'unofficial', ''].includes(row.event_status));
    assert(row.stage && row.event && row.source_url);
    if (!row.start_time) { assert(row.id); assert(!row.end_time); continue; }
    assert(row.date >= research.event.start && row.date <= research.event.end);
    assert.equal(new Intl.DateTimeFormat('en-US', {weekday: 'long', timeZone: 'UTC'}).format(new Date(row.date + 'T12:00Z')), row.day);
    const start = new Date(`${row.date}T${row.start_time}:00${row.utc_offset}`);
    assert(Number.isFinite(start.getTime()));
    const parts = new Intl.DateTimeFormat('en-US', {timeZone: row.timezone, timeZoneName: 'longOffset'}).formatToParts(start);
    const offset = parts.find(p => p.type === 'timeZoneName').value.replace('GMT', '') || '+00:00';
    assert.equal(row.utc_offset, offset, `${slug}: incorrect per-date offset`);
    if (row.end_time) assert(new Date(`${row.end_date || row.date}T${row.end_time}:00${row.utc_offset}`) > start);
    const uid = row.calendar_uid || `${row.date}-${row.start_time.replace(':', '')}-${row.stage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@${slug}`;
    assert(!uids.has(uid), `${slug}: calendar UID collision: ${uid}`); uids.add(uid);
  }
  const socials = fs.existsSync(path.join(folder, 'socials.json')) ? read('socials.json').profiles : {};
  assert.deepEqual(Object.keys(socials).sort(), [...participants].sort(), `${slug}: participant/social mismatch`);
  for (const profile of Object.values(socials)) {
    assert(profile.x === null || /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/.test(profile.x));
    assert(profile.sources.length); if (!profile.x) assert(profile.notes);
  }
  if (fs.existsSync(path.join(folder, 'groups.json'))) {
    for (const group of read('groups.json').groups) {
      assert(group.sources.length); for (const name of group.members) assert(participants.has(name));
    }
  }
  if (fs.existsSync(path.join(folder, 'opening-hours.json'))) {
    for (const day of read('opening-hours.json').days) {
      assert(day.date >= research.event.start && day.date <= research.event.end);
      for (const entry of day.entries) assert(entry.opens < entry.closes);
    }
  }
  for (const [, attr, file] of page.matchAll(/data-(socials|groups|opening-hours|unconfirmed)="([^"]+)"/g)) assert(fs.existsSync(path.join(folder, file)), `${slug}: missing ${attr}`);
  assert(timed.length + pending.length > 0);
  timedCount += timed.length; pendingCount += pending.length;
}
assert.equal(timedCount, 37); assert.equal(pendingCount, 35);
assert(!home.includes('href="conventions/holiday-matsuri-2026/"'));
assert(!fs.existsSync('conventions/holiday-matsuri-2026/schedule.csv'));
console.log(`PASS: Seven verified late-2026 events; ${timedCount} timed sessions, ${pendingCount} pending cards; dates, offsets, source snapshots, social/group maps, hours and unique calendar IDs.`);
