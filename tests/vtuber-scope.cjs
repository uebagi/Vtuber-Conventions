const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const parser = vm.createContext({});
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8').split('const el =')[0], parser);
let checked = 0;
for (const slug of fs.readdirSync('conventions')) {
  const folder = `conventions/${slug}`;
  if (slug === 'vexpo-2026' || !fs.existsSync(`${folder}/schedule.csv`)) continue;
  parser.csv = fs.readFileSync(`${folder}/schedule.csv`, 'utf8');
  const timed = vm.runInContext('parseCSV(csv)', parser);
  const pending = fs.existsSync(`${folder}/unconfirmed.json`) ? JSON.parse(fs.readFileSync(`${folder}/unconfirmed.json`, 'utf8')).sessions : [];
  const rows = [...timed, ...pending];
  const audit = JSON.parse(fs.readFileSync(`${folder}/sources/vtuber-audit.json`, 'utf8'));
  const sources = new Map(audit.sources.map(s => [s.id, s]));
  const names = [...new Set(rows.flatMap(r => r.participants.split(';').map(n => n.trim()).filter(n => n && n !== '???')))];
  assert.deepEqual(Object.keys(audit.participants).sort(), names.sort(), `${slug}: every Talent needs identity evidence`);
  for (const person of Object.values(audit.participants)) {
    assert.equal(person.classification, 'verified-vtuber'); assert(person.basis); assert(person.source_ids.length);
    for (const id of person.source_ids) { assert(sources.has(id)); assert.equal(new URL(sources.get(id).url).protocol, 'https:'); }
  }
  assert.equal(audit.events.length, rows.length);
  for (const row of rows) {
    const match = audit.events.find(e => ['event', 'date', 'start_time', 'stage'].every(k => e[k] === row[k]));
    assert(match?.basis && match.sources.length, `${slug}: missing event scope evidence`);
    assert.deepEqual(match.verified_talents, row.participants.split(';').map(n => n.trim()).filter(n => n && n !== '???'));
  }
  if (slug === 'twitchcon-san-diego-2026') {
    assert(!timed.some(r => r.event.includes('Becoming the Monster') || r.participants.includes('TakingBackSubway')));
    for (const name of ['TakingBackSubway', 'TheStockGuy', 'Anthony_Kongphan', 'julieee22']) assert(!names.includes(name));
    assert.deepEqual(timed.find(r => r.event.includes('Open Stage!')).participants.split(';'), ['ironmouse', 'PiaPiUFO']);
    assert(timed.some(r => r.event.startsWith('VTubing Community MeetUp')));
  }
  if (slug === 'anime-festival-asia-singapore-2026') {
    const concert = timed.find(r => r.event.startsWith('AFASG26 MusicFest'));
    assert.equal(concert.start_time, '19:00'); assert.equal(concert.end_time, '');
    assert.equal(concert.participants, 'KAF;Isekaijoucho'); assert(concert.lineup_notes.includes('Kyary Pamyu Pamyu'));
    assert(pending.some(r => r.participants === '96Neko'), 'Confirmed VTuber identity must not be dropped simply because the artist is also a singer.');
  }
  if (slug === 'kumoricon-2026') {
    assert(!timed.some(r => r.event.startsWith('Hololive TCG')));
    assert(!names.includes('Waffo') && !names.includes('Koko'));
    assert(timed.find(r => r.event.startsWith('So You Wanna Rig a VTuber?')).listed_hosts.includes('Waffo'));
    const snapshot = JSON.parse(fs.readFileSync(`${folder}/sources/research.json`, 'utf8')).sessions;
    assert.equal(snapshot.length, timed.length);
    for (const row of timed) {
      const match = snapshot.find(r => ['event', 'date', 'start_time', 'stage'].every(k => r[k] === row[k]));
      assert(match); for (const field of Object.keys(row)) assert.equal(match[field], row[field]);
    }
  }
  checked++;
}
assert.equal(checked, 8);
console.log('PASS: VTuber identity and programme evidence for eight published editions; unrelated workshops, unverified Talent, mixed bills and research-only guest leads.');
