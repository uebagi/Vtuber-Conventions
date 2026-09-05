const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor() { this.children = []; this.dataset = {}; this.value = ''; this.checked = false; this.handlers = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute() {}
  addEventListener(name, fn) { this.handlers[name] = fn; }
  click() { this.handlers.click(); }
  querySelectorAll() { return this.children; }
}
const elements = Object.fromEntries(['#search', '#stage', '#announced', '#concerts', '#meet-greets', '#event-status', '#schedule', '#status', '#download-calendar', '#reset', '.days'].map(k => [k, new Element()]));
elements['#stage'].value = elements['#event-status'].value = elements['#meet-greets'].value = 'all';
const body = new Element();
body.dataset = { eventName: 'VeXpo', eventId: 'vexpo-2026', venue: 'NEC, Birmingham, UK', uidDomain: 'vexpo-fan-planner', socials: 'socials.json' };
const document = { body, createElement: () => new Element(), querySelector: s => s === '[data-day="all"]' ? elements['.days'].children[0] : elements[s] };
const context = vm.createContext({ document, TextEncoder, URL, console, location: { href: 'https://example.github.io/conventions/vexpo-2026/' }, fetch: async path => { assert(['schedule.csv', 'socials.json'].includes(path)); return { ok: true, text: async () => fs.readFileSync('vexpo-2026/' + path, 'utf8'), json: async () => JSON.parse(fs.readFileSync('vexpo-2026/' + path, 'utf8')) }; } });
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8'), context);
setImmediate(async () => {
  const run = code => vm.runInContext(code, context);
  const count = () => run('filteredSessions().length');
  const change = (id, value, checked = false) => { elements[id][checked ? 'checked' : 'value'] = value; elements[id].handlers.change(); };
  const people = run("card({...sessions[0], participants: 'Mint Fantôme; A & B'})").children.find(e => e.className === 'people');
  assert.equal(people.children.length, 2);
  const primary = people.children[0].children[1];
  assert.equal(primary.href, 'https://youtube.com/channel/UCcHHkJ98eSfa5aj0mdTwwLQ');
  assert.equal(primary.rel, 'noopener noreferrer');
  assert.equal(primary.target, '_blank');
  people.children = people.children.map(group => group.children[0]);
  assert.equal(people.children[0].href, 'https://x.com/MintFantome');
  assert.equal(people.children[1].href, undefined);
  assert.equal(people.children[1].textContent, 'A & B');
  assert.equal(run("participantChip('Phoebe Chan').href"), 'https://x.com/feebeechanchibi');
  assert.equal(run("participantChip('Paige Turner').href"), 'https://x.com/paigeterner_');
  assert.equal(run("participantChip('Patchumi').href"), 'https://x.com/Patchumii');
  assert.equal(run("participantChip('Bun-Mii').href"), 'https://x.com/bun_mii');
  assert.equal(run("participantChip('Milia').href"), 'https://x.com/ounceofMilia');
  assert.equal(run("participantChip('Seraph').href"), 'https://x.com/serafufu');
  assert.equal(run("participantChip('Haewon').href"), 'https://x.com/HaewonTheHeart');
  assert.equal(run("participantChip('BeriBug').href"), run("participantChip('Beribug').href"));
  assert.equal(run("participantChip('Poka').href"), undefined);
  assert.equal(run("participantLinks('Poka').children.length"), 1);
  run("socialProfiles.BadPrimary = {primary: {url: 'javascript:alert(1)'}}");
  assert.equal(run("participantLinks('BadPrimary').children.length"), 1);
  run("delete socialProfiles.BadPrimary");
  run("socialProfiles['Unsafe'] = {x: 'javascript:alert(1)'}");
  assert.equal(run("participantChip('Unsafe').href"), undefined);
  run("delete socialProfiles.Unsafe");
  const socialData = JSON.parse(fs.readFileSync('vexpo-2026/socials.json', 'utf8'));
  const participantNames = new Set(run("sessions.flatMap(s => s.participants.split(';').map(n => n.trim()).filter(Boolean))"));
  assert.equal(participantNames.size, 198);
  for (const name of participantNames) {
    assert(Object.hasOwn(socialData.profiles, name), `Missing social research: ${name}`);
    const profile = socialData.profiles[name];
    if (profile.x) {
      assert.match(profile.x, /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/);
      assert(profile.sources.length > 0, `Missing source: ${name}`);
      profile.sources.forEach(source => assert.equal(new URL(source).protocol, 'https:'));
    }
  }
  assert.equal(Object.values(socialData.profiles).filter(p => p.x).length, 197);
  assert.equal(Object.values(socialData.profiles).filter(p => p.primary).length, 136);
  for (const profile of Object.values(socialData.profiles)) {
    if (profile.primary) {
      assert.equal(new URL(profile.primary.url).protocol, 'https:');
      assert(['https://vexpo.uk/guests', 'https://vexpo.uk/autographs'].includes(profile.primary.source));
    }
  }
  assert.equal(people.children[0].rel, 'noopener noreferrer');
  assert.equal(people.children[0].target, '_blank');
  assert.equal(count(), 192);
  change('#meet-greets', 'exclude'); assert.equal(count(), 51);
  change('#meet-greets', 'all'); assert.equal(count(), 192);
  change('#meet-greets', 'only'); assert.equal(count(), 141);
  elements['.days'].children[2].click(); assert.equal(count(), 73);
  elements['.days'].children[3].click(); assert.equal(count(), 55);
  elements['#search'].value = 'Ironmouse'; elements['#search'].handlers.input(); assert.equal(count(), 2);
  const ironmouse = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert(ironmouse.includes('DTSTART:20260920T090000Z'));
  assert(ironmouse.includes('price: Free'));
  assert(ironmouse.includes('CATEGORIES:Official,Meet & Greet'));
  elements['#reset'].click(); assert.equal(count(), 192);
  change('#concerts', true, true); assert.equal(count(), 8);
  change('#meet-greets', 'only'); assert.equal(elements['#concerts'].checked, false); assert.equal(count(), 141);
  change('#concerts', true, true); assert.equal(elements['#meet-greets'].value, 'exclude'); assert.equal(count(), 8);
  elements['#reset'].click(); change('#event-status', 'unofficial'); assert.equal(count(), 43);
  assert.equal(elements['#download-calendar'].disabled, false);
  change('#meet-greets', 'only'); assert.equal(count(), 43);
  const tags = run('card(filteredSessions()[0])').children.find(e => e.className === 'session-tags');
  assert.equal(tags.children[0].textContent, 'Unofficial');
  const boothCalendar = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert(boothCalendar.includes('CATEGORIES:Unofficial,Meet & Greet'));
  assert(boothCalendar.includes('DTSTART:20260919T080000Z'));
  assert(boothCalendar.includes('DTEND:20260919T085500Z'));
  assert(boothCalendar.includes('price: Not listed'));
  assert(boothCalendar.includes('Booth S05'));
  assert(boothCalendar.includes('Marked Akasupa'));
  elements['.days'].children[1].click(); assert.equal(count(), 13);
  elements['.days'].children[2].click(); assert.equal(count(), 16);
  elements['.days'].children[3].click(); assert.equal(count(), 14);
  elements['#search'].value = 'Captain Camille'; elements['#search'].handlers.input(); assert.equal(count(), 1);
  assert.equal(run('filteredSessions()[0].meet_greet_type'), 'IRL');
  elements['#reset'].click(); change('#event-status', 'official'); assert.equal(count(), 149);
  change('#meet-greets', 'only'); assert.equal(count(), 98);
  elements['#reset'].click(); change('#event-status', 'unofficial'); change('#meet-greets', 'exclude');
  assert.equal(count(), 0); assert.equal(elements['#download-calendar'].disabled, true);
  elements['#reset'].click();
  const markers = run('sessions.filter(isTimeMarker)');
  assert.equal(markers.length, 8);
  assert.deepEqual(Array.from(markers, s => `${s.day} ${s.start_time} ${s.event}`), [
    'Friday 12:00 General entry opens', 'Friday 19:00 Show closes',
    'Saturday 09:00 Akasupa entry opens', 'Saturday 11:00 General entry opens', 'Saturday 20:00 Show closes',
    'Sunday 09:00 Akasupa entry opens', 'Sunday 10:00 General entry opens', 'Sunday 18:00 Show closes'
  ]);
  for (const marker of markers) {
    const rendered = run(`card(${JSON.stringify(marker)})`);
    assert.equal(rendered.children[0].children[1].children.length, 1);
    assert(!rendered.children.some(e => e.textContent === 'Participants not announced.'));
  }
  const markerCalendar = run('createCalendar(sessions.filter(isTimeMarker))').replace(/\r\n /g, '');
  assert(!markerCalendar.includes('DTEND:'));
  assert(!markerCalendar.includes('Participants not announced'));
  assert(markerCalendar.includes('DTSTART:20260918T110000Z'));
  assert.equal(run("sessions.filter(s => s.date === '2026-09-18')[0].event"), 'General entry opens');
  assert.equal(run("sessions.filter(s => s.date === '2026-09-20').at(-1).event"), 'Show closes');
  const ics = run('createCalendar(filteredSessions())');
  const unfolded = ics.replace(/\r\n /g, '');
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 192);
  assert.equal(new Set(unfolded.match(/^UID:.+$/gm)).size, 192);
  assert(ics.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75));
  const snapshot = JSON.parse(fs.readFileSync('vexpo-2026/sources/participants.json', 'utf8'));
  assert.equal(snapshot.length, 192); assert.equal(snapshot.filter(s => s.is_meet_greet).length, 141);
  assert.equal(snapshot.filter(s => s.event_status === 'official').length, 149);
  const unofficial = snapshot.filter(s => s.event_status === 'unofficial');
  assert.equal(unofficial.length, 43);
  for (const session of unofficial) {
    for (const name of session.participants.split(';').map(n => n.trim())) {
      assert(socialData.profiles[name]?.x, `Unlinked booth participant: ${name}`);
      assert.equal(run(`participantChip(${JSON.stringify(name)}).href`), socialData.profiles[name].x);
    }
  }
  assert(unofficial.every(s => s.is_meet_greet && !s.is_concert && s.booth === 'S05'));
  assert.equal(unofficial.filter(s => s.meet_greet_type === 'IRL').length, 5);
  const research = JSON.parse(fs.readFileSync('vexpo-2026/sources/floratelier-meet-greets.json', 'utf8'));
  const sourceIds = new Set(research.sources.map(source => source.id));
  assert.equal(sourceIds.size, research.sources.length);
  assert.deepEqual(['Friday', 'Saturday', 'Sunday'].map(day => research.sessions.filter(s => s.day === day).length), [13,16,14]);
  assert.equal(research.sessions.filter(s => s.akasupa).length, 5);
  for (const session of research.sessions) {
    assert(session.source_ids.length > 0);
    assert(session.source_ids.every(id => sourceIds.has(id)), 'Broken source reference');
    const imported = unofficial.find(s => s.date === session.date && s.start_time === session.start_time);
    assert(imported, 'Research slot missing from schedule');
    assert.equal(imported.end_time, session.end_time);
    assert.equal(imported.participants, session.participants.join('; '));
    assert.equal(imported.meet_greet_type, session.type);
  }
  assert.equal(fs.readdirSync('vexpo-2026/sources').filter(s => /\.(png|jpe?g)$/i.test(s)).length, 0);
  const originalFetch = context.fetch;
  context.fetch = async () => ({ok: false});
  assert.equal(Object.keys(await run('loadSocials()')).length, 0);
  context.fetch = originalFetch;
  run('delete config.socials');
  assert.equal(Object.keys(await run('loadSocials()')).length, 0);
  console.log('PASS: Researched direct X profiles, aliases, unknown/unsafe links, optional social data;  192 sessions; 141 meet-and-greets including 43 unofficial booth slots; 8 concerts; search, status tags, reset, three-way meet-and-greet filter, calendar metadata/time conversion/unique IDs, and image removal.');
});
