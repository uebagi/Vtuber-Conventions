const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
  constructor() { this.children = []; this.dataset = {}; this.value = ''; this.checked = false; this.handlers = {}; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  click() { this.handlers.click(); }
  querySelectorAll() { return this.children; }
}
const elements = Object.fromEntries(['#opening-hours', '#search', '#stage', '#announced', '#concerts', '#meet-greets', '#event-status', '#group', '#talent', '#schedule', '#status', '#download-calendar', '#reset', '.days'].map(k => [k, new Element()]));
elements['#group'].value = elements['#stage'].value = elements['#event-status'].value = elements['#meet-greets'].value = 'all';
for (const value of ['all', 'only', 'exclude']) { const option = new Element(); option.value = value; elements['#meet-greets'].append(option); }
const body = new Element();
body.dataset = { eventName: 'VeXpo', eventId: 'vexpo-2026', venue: 'NEC, Birmingham, UK', uidDomain: 'vexpo-fan-planner', socials: 'socials.json', openingHours: 'opening-hours.json', groups: 'groups.json' };
const document = { body, createElement: () => new Element(), querySelector: s => s === '[data-day="all"]' ? elements['.days'].children[0] : elements[s] };
const context = vm.createContext({ document, TextEncoder, URL, console, location: { href: 'https://example.github.io/Vtuber-Conventions/conventions/vexpo-2026/' }, fetch: async path => { assert(['schedule.csv', 'socials.json', 'opening-hours.json', 'groups.json'].includes(path)); return { ok: true, text: async () => fs.readFileSync('conventions/vexpo-2026/' + path, 'utf8'), json: async () => JSON.parse(fs.readFileSync('conventions/vexpo-2026/' + path, 'utf8')) }; } });
context.history = {state: null, replaceState: (state, title, url) => { context.location.href = url; }};
const windowHandlers = {};
context.window = {addEventListener: (name, handler) => { windowHandlers[name] = handler; }};
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8'), context);
setImmediate(async () => {
  const run = code => vm.runInContext(code, context);
  const count = () => run('filteredSessions().length');
  const hours = elements['#opening-hours'];
  assert.equal(hours.hidden, false);
  assert.equal(hours.children[1].children.length, 3);
  const fridayHours = hours.children[1].children[0];
  assert.equal(fridayHours.children[0].textContent, 'Friday');
  assert.equal(fridayHours.children[0].children[0].textContent, 'September 18, 2026');
  assert.equal(fridayHours.children[1].children[0].children[1].textContent, '12:00–19:00');
  assert.equal(hours.children[1].children[1].children[1].children.length, 2);
  const hoursToggle = hours.children[0].children[1];
  const hoursDays = hours.children[1];
  assert.equal(hoursToggle.type, 'button');
  assert.equal(hoursToggle.attributes['aria-controls'], hoursDays.id);
  assert.equal(hoursToggle.attributes['aria-expanded'], 'false');
  assert.equal(hoursDays.dataset.collapsed, 'true');
  hoursToggle.click();
  assert.equal(hoursToggle.attributes['aria-expanded'], 'true');
  assert.equal(hoursDays.dataset.collapsed, 'false');
  hoursToggle.click();
  assert.equal(hoursToggle.attributes['aria-expanded'], 'false');
  assert.equal(hoursDays.dataset.collapsed, 'true');
  assert.equal(hoursDays.children.length, 3);


  const change = (id, value, checked = false) => { elements[id][checked ? 'checked' : 'value'] = value; elements[id].handlers.change(); };
  // Share every filter, restore them after loading, and reset the URL.
  context.location.href = 'https://example.github.io/Vtuber-Conventions/conventions/vexpo-2026/?day=2026-09-19&stage=Phase+Connect+-+Booth+S07&status=unofficial&group=group%3APhase+Connect&talent=x%3Ahttps%3A%2F%2Fx.com%2Fkanekolumi&meet-greets=only&announced=1&q=Kaneko#schedule';
  run('restoreFiltersFromURL(); render()');
  assert.equal(count(), 1);
  assert.equal(elements['#announced'].checked, true);
  assert.equal(elements['.days'].children[2].attributes['aria-pressed'], 'true');
  const sharedURL = context.location.href;
  elements['#reset'].click();
  assert.equal(new URL(context.location.href).search, '');
  assert.equal(new URL(context.location.href).hash, '#schedule');
  assert.equal(count(), 215);
  context.location.href = sharedURL;
  windowHandlers.popstate(); assert.equal(count(), 1);
  elements['#reset'].click();
  elements['#search'].value = 'A & B + C'; elements['#search'].handlers.input();
  assert.equal(new URL(context.location.href).searchParams.get('q'), 'A & B + C');
  elements['#reset'].click();
  change('#concerts', true, true);
  assert.equal(new URL(context.location.href).searchParams.get('concerts'), '1');
  context.location.href = 'https://example.github.io/Vtuber-Conventions/conventions/vexpo-2026/?day=bad&stage=missing&talent=missing&group=missing&status=bad&meet-greets=only&concerts=1';
  windowHandlers.popstate();
  assert.equal(run('selectedDay'), 'all');
  assert.equal(elements['#talent'].value, 'all');
  assert.equal(elements['#concerts'].checked, false);
  assert.equal(count(), 169);
  elements['#reset'].click();
  const talentOptions = elements['#talent'].children;
  assert.equal(talentOptions[0].textContent, 'All talents');
  assert(!talentOptions.some(option => option.textContent === 'ChromaSHIFT'));
  assert.equal(talentOptions.filter(option => option.value === run("talentKey('BeriBug')")).length, 1);
  assert.equal(run("talentKey('BeriBug')"), run("talentKey('Beribug')"));
  change('#talent', run("talentKey('Ironmouse')"));
  assert.equal(count(), 3);
  change('#meet-greets', 'only'); assert.equal(count(), 2);
  change('#event-status', 'unofficial'); assert.equal(count(), 0);
  elements['#reset'].click();
  assert.equal(elements['#talent'].value, 'all'); assert.equal(count(), 215);
  change('#talent', run("talentKey('Kaneko Lumi')"));
  const talentCount = count(); assert(talentCount > 0);
  change('#group', 'group:Phase Connect'); assert.equal(count(), talentCount);
  const talentCalendar = run('createCalendar(filteredSessions())');
  assert.equal((talentCalendar.match(/BEGIN:VEVENT/g) || []).length, talentCount);
  change('#talent', 'name:Kaneko'); assert.equal(count(), 0);
  elements['#reset'].click();
  const statusOptions = () => elements['#event-status'].children.map(option => [option.value, option.textContent]);
  const groupOptions = () => elements['#group'].children.map(option => [option.value, option.textContent]);
  assert.deepEqual(statusOptions(), [['all', 'Official & unofficial'], ['official', 'Official'], ['unofficial', 'Unofficial']]);
  assert.deepEqual(groupOptions().slice(1).map(([, name]) => name), ['a:VEnue', 'Aegis-Link', 'Algorhythm Project', 'BEASTIEZ', 'ChromaSHIFT', 'florAtelier', 'hololive', 'HUKEC', 'Oshi Connect', 'Phase Connect', 'Variance Project']);
  assert.deepEqual(Array.from(run("groupsFor({participants: 'Akugaki Koa; Lalabell Lullaby', organizer: ''})")), ['ChromaSHIFT']);
  change('#group', 'group:hololive'); assert.equal(count(), 13);
  assert(run("filteredSessions().some(s => s.event === 'The VX Factor')"));
  assert(run("filteredSessions().some(s => s.event === 'hololive English 3rd concert -All For One-')"));
  change('#meet-greets', 'only'); assert.equal(count(), 9);
  elements['#reset'].click();
  change('#group', 'group:Phase Connect'); assert.equal(count(), 14);
  assert.equal(run("filteredSessions().filter(s => s.event_status === 'official').length"), 6);
  assert.equal(run("filteredSessions().filter(s => s.event_status === 'unofficial').length"), 8);
  const organizerCalendar = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert.equal((organizerCalendar.match(/BEGIN:VEVENT/g) || []).length, 14);
  assert(organizerCalendar.includes('Groups: Phase Connect'));
  change('#meet-greets', 'only'); assert.equal(count(), 10);
  change('#meet-greets', 'exclude'); assert.equal(count(), 4);
  change('#concerts', true, true); assert.equal(count(), 2);
  elements['#reset'].click();
  change('#group', 'group:florAtelier'); assert.equal(count(), 46);
  change('#meet-greets', 'only'); assert.equal(count(), 45);
  change('#meet-greets', 'exclude'); assert.equal(count(), 1);
  assert(run("filteredSessions()[0].event.includes('International Rizzlers')"));
  assert.equal(run('filteredSessions()[0].event_status'), 'official');
  elements['#reset'].click();
  change('#group', 'group:Phase Connect');
  elements['.days'].children[2].click(); assert.equal(count(), 6);
  change('#stage', 'Phase Connect - Booth S07'); assert.equal(count(), 3);
  elements['#search'].value = 'Kaneko'; elements['#search'].handlers.input(); assert.equal(count(), 1);
  elements['#reset'].click();
  assert.equal(elements['#event-status'].value, 'all'); assert.equal(count(), 215);
  elements['#search'].value = 'Phase Connect'; elements['#search'].handlers.input(); assert.equal(count(), 14);
  elements['#reset'].click();
  // A shared concert appears once under each billed group, with all groups in its calendar.
  const concertGroups = ['Algorhythm Project', 'ChromaSHIFT', 'BEASTIEZ', 'Aegis-Link', 'Variance Project'];
  let sharedUid;
  for (const group of concertGroups) {
    change('#group', `group:${group}`);
    elements['#search'].value = 'Group & Agency Concert'; elements['#search'].handlers.input();
    assert.equal(count(), 1, `Shared concert missing or duplicated for ${group}`);
    assert.equal(run('filteredSessions()[0].event_status'), 'official');
    const calendar = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
    assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 1);
    assert(calendar.includes('Groups: Algorhythm Project\\, ChromaSHIFT\\, BEASTIEZ\\, Aegis-Link\\, Variance Project'));
    const uid = calendar.match(/^UID:.+$/m)[0];
    if (sharedUid) assert.equal(uid, sharedUid);
    sharedUid = uid;
    elements['#reset'].click();
  }
  change('#group', 'group:ChromaSHIFT'); assert.equal(count(), 4);
  change('#concerts', true, true); assert.equal(count(), 3);
  elements['#reset'].click();
  change('#group', 'group:BEASTIEZ'); assert.equal(count(), 5);
  change('#meet-greets', 'only'); assert.equal(count(), 3);
  change('#meet-greets', 'exclude'); assert.equal(count(), 2);
  elements['#reset'].click();
  change('#group', 'group:Aegis-Link'); assert.equal(count(), 8);
  change('#meet-greets', 'only'); assert.equal(count(), 7);
  elements['#reset'].click();
  change('#group', 'group:Variance Project'); assert.equal(count(), 7);
  change('#meet-greets', 'only'); assert.equal(count(), 6);
  elements['#reset'].click();
  // New groups need only CSV data; missing fields retain the original status filters.
  run("const originalOrganizerSessions = sessions; sessions = [{...sessions[0], event_status: 'official', organizer: ' Community & Friends ; Group, Inc. ;; Community & Friends ; '}, {...sessions[0], event_status: 'official', organizer: 'Community & Friends'}, {...sessions[0], event_status: 'official', organizer: 'official'}, {...sessions[0], event_status: 'official', organizer: undefined}]; setupGroups()");
  assert.deepEqual(groupOptions().slice(1), [['group:Community & Friends', 'Community & Friends'], ['group:Group, Inc.', 'Group, Inc.'], ['group:official', 'official']]);
  change('#group', 'group:Community & Friends'); assert.equal(count(), 2);
  change('#group', 'group:Group, Inc.'); assert.equal(count(), 1);
  change('#group', 'group:Community'); assert.equal(count(), 0);
  change('#group', 'group:official'); assert.equal(count(), 1);
  change('#group', 'all'); change('#event-status', 'official'); assert.equal(count(), 4);
  change('#event-status', 'all');
  run('sessions = [{...originalOrganizerSessions[0]}]; delete sessions[0].organizer; setupGroups()');
  assert.equal(groupOptions().length, 1); assert.equal(count(), 1);
  run('sessions = originalOrganizerSessions; setupGroups()');
  elements['#reset'].click();
  // One talent belongs to two groups; aliases inherit both, independently of status.
  run("const savedMemberships = talentGroups; talentGroups = indexGroups({groups: [{name: 'Agency', members: ['Talent']}, {name: 'Independent Group', members: ['Talent'], former_members: [{name: 'Former'}]}], aliases: {'Alias': 'Talent'}}); sessions = [{...originalOrganizerSessions[0], participants: 'Alias; Talent', organizer: 'Agency', event_status: 'official'}, {...originalOrganizerSessions[0], participants: 'Talent', organizer: '', event_status: 'unofficial'}]; setupGroups()");
  assert.equal(run('groupsFor(sessions[0]).length'), 2);
  assert.equal(run("talentGroups.has('Former')"), false);
  for (const group of ['Agency', 'Independent Group']) {
    change('#group', `group:${group}`); assert.equal(count(), 2);
    change('#event-status', 'official'); assert.equal(count(), 1);
    change('#event-status', 'unofficial'); assert.equal(count(), 1);
    change('#event-status', 'all');
  }
  assert.equal(run("groupsFor({participants: 'Talent Extra', organizer: ''}).length"), 0);
  assert.throws(() => run("indexGroups({groups: [], aliases: {Alias: 'Missing'}})"));
  run('talentGroups = savedMemberships; sessions = originalOrganizerSessions; setupGroups()');
  elements['#reset'].click();
  const roster = JSON.parse(fs.readFileSync('conventions/vexpo-2026/groups.json', 'utf8'));
  for (const group of roster.groups) {
    assert(group.sources.length > 0);
    group.sources.forEach(url => assert.equal(new URL(url).protocol, 'https:'));
    assert.equal(new Set(group.members).size, group.members.length);
    for (const former of group.former_members || []) assert(!group.members.includes(former.name));
  }
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
  const socialData = JSON.parse(fs.readFileSync('conventions/vexpo-2026/socials.json', 'utf8'));
  const participantNames = new Set(run("sessions.flatMap(s => s.participants.split(';').map(n => n.trim()).filter(Boolean))"));
  assert.equal(participantNames.size, 238);
  for (const name of participantNames) {
    assert(Object.hasOwn(socialData.profiles, name), `Missing social research: ${name}`);
    const profile = socialData.profiles[name];
    if (profile.x) {
      assert.match(profile.x, /^https:\/\/x\.com\/[A-Za-z0-9_]{1,15}$/);
      assert(profile.sources.length > 0, `Missing source: ${name}`);
      profile.sources.forEach(source => assert.equal(new URL(source).protocol, 'https:'));
    }
  }
  assert.equal(Object.values(socialData.profiles).filter(p => p.x).length, 235);
  assert.equal(Object.values(socialData.profiles).filter(p => p.primary).length, 136);
  for (const profile of Object.values(socialData.profiles)) {
    if (profile.primary) {
      assert.equal(new URL(profile.primary.url).protocol, 'https:');
      assert(['https://vexpo.uk/guests', 'https://vexpo.uk/autographs'].includes(profile.primary.source));
    }
  }
  assert.equal(people.children[0].rel, 'noopener noreferrer');
  assert.equal(people.children[0].target, '_blank');
  assert.equal(count(), 215);
  change('#meet-greets', 'exclude'); assert.equal(count(), 46);
  change('#meet-greets', 'all'); assert.equal(count(), 215);
  change('#meet-greets', 'only'); assert.equal(count(), 169);
  elements['.days'].children[2].click(); assert.equal(count(), 87);
  elements['.days'].children[3].click(); assert.equal(count(), 63);
  elements['#search'].value = 'Ironmouse'; elements['#search'].handlers.input(); assert.equal(count(), 2);
  const ironmouse = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert(ironmouse.includes('DTSTART:20260920T090000Z'));
  assert(ironmouse.includes('price: Free'));
  assert(ironmouse.includes('CATEGORIES:Official,Meet & Greet'));
  elements['#reset'].click(); assert.equal(count(), 215);
  change('#concerts', true, true); assert.equal(count(), 14);
  change('#meet-greets', 'only'); assert.equal(elements['#concerts'].checked, false); assert.equal(count(), 169);
  change('#concerts', true, true); assert.equal(elements['#meet-greets'].value, 'exclude'); assert.equal(count(), 13);
  elements['#reset'].click(); change('#event-status', 'unofficial'); assert.equal(count(), 65);
  assert.equal(elements['#download-calendar'].disabled, false);
  change('#meet-greets', 'only'); assert.equal(count(), 62);
  const tags = run('card(filteredSessions()[0])').children.find(e => e.className === 'session-tags');
  assert.equal(tags.children[0].textContent, 'Unofficial');
  const boothCalendar = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert(boothCalendar.includes('CATEGORIES:Unofficial,Meet & Greet'));
  assert(boothCalendar.includes('DTSTART:20260919T080000Z'));
  assert(boothCalendar.includes('DTEND:20260919T085500Z'));
  assert(boothCalendar.includes('price: Not listed'));
  assert(boothCalendar.includes('Booth S05'));
  assert(boothCalendar.includes('Marked Akasupa'));
  elements['.days'].children[1].click(); assert.equal(count(), 17);
  elements['.days'].children[2].click(); assert.equal(count(), 26);
  elements['.days'].children[3].click(); assert.equal(count(), 19);
  elements['#search'].value = 'Captain Camille'; elements['#search'].handlers.input(); assert.equal(count(), 1);
  assert.equal(run('filteredSessions()[0].meet_greet_type'), 'IRL');
  elements['#reset'].click(); change('#event-status', 'official'); assert.equal(count(), 150);
  change('#meet-greets', 'only'); assert.equal(count(), 107);
  elements['#reset'].click(); change('#event-status', 'unofficial'); change('#meet-greets', 'exclude');
  assert.equal(count(), 3);
  change('#stage', 'MONARCH STAGE');
  assert.equal(count(), 0); assert.equal(elements['#download-calendar'].disabled, true);
  elements['#reset'].click();
  assert.equal(run('sessions.filter(isTimeMarker).length'), 0);
  const ics = run('createCalendar(filteredSessions())');
  const unfolded = ics.replace(/\r\n /g, '');
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 215);
  assert.equal(new Set(unfolded.match(/^UID:.+$/gm)).size, 215);
  assert(ics.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75));
  const snapshot = JSON.parse(fs.readFileSync('conventions/vexpo-2026/sources/participants.json', 'utf8'));
  assert.equal(snapshot.length, 215); assert.equal(snapshot.filter(s => s.is_meet_greet).length, 169);
  assert.equal(snapshot.filter(s => s.event_status === 'official').length, 150);
  for (const item of snapshot) {
    const session = run('sessions').find(s => s.day === item.day && s.start_time === item.start_time && s.stage === item.stage);
    assert.equal(item.organizer, session.organizer);
  }
  const unofficial = snapshot.filter(s => s.event_status === 'unofficial');
  assert.equal(unofficial.length, 65);
  for (const session of unofficial) {
    for (const name of session.participants.split(';').map(n => n.trim())) {
      if (['PPSlayerVT', 'Omi'].includes(name)) { assert.equal(socialData.profiles[name].x, null); continue; }
      assert(socialData.profiles[name]?.x, `Unlinked booth participant: ${name}`);
      assert.equal(run(`participantChip(${JSON.stringify(name)}).href`), socialData.profiles[name].x);
    }
  }
  const floratelier = unofficial.filter(s => s.booth === 'S05');
  assert.equal(floratelier.length, 43);
  assert(floratelier.every(s => s.is_meet_greet && !s.is_concert));
  assert.equal(unofficial.filter(s => s.meet_greet_type === 'IRL').length, 5);
  const research = JSON.parse(fs.readFileSync('conventions/vexpo-2026/sources/floratelier-meet-greets.json', 'utf8'));
  const sourceIds = new Set(research.sources.map(source => source.id));
  assert.equal(sourceIds.size, research.sources.length);
  assert.deepEqual(['Friday', 'Saturday', 'Sunday'].map(day => research.sessions.filter(s => s.day === day).length), [13,16,14]);
  assert.equal(research.sessions.filter(s => s.akasupa).length, 5);
  for (const session of research.sessions) {
    assert(session.source_ids.length > 0);
    assert(session.source_ids.every(id => sourceIds.has(id)), 'Broken source reference');
    const imported = floratelier.find(s => s.date === session.date && s.start_time === session.start_time);
    assert(imported, 'Research slot missing from schedule');
    assert.equal(imported.end_time, session.end_time);
    assert.equal(imported.participants, session.participants.join('; '));
    assert.equal(imported.meet_greet_type, session.type);
  }
  const phase = JSON.parse(fs.readFileSync('conventions/vexpo-2026/sources/phase-connect-schedule.json', 'utf8'));
  const phaseSourceIds = new Set(phase.sources.map(source => source.id));
  assert.equal(phaseSourceIds.size, phase.sources.length);
  assert.equal(phase.sessions.length, 14);
  assert.equal(phase.sessions.filter(s => s.action === 'added').length, 8);
  assert.equal(phase.sessions.filter(s => s.event_status === 'official').length, 6);
  for (const session of phase.sessions) {
    assert(session.source_ids.length && session.source_ids.every(id => phaseSourceIds.has(id)));
    const matches = run('sessions').filter(s => s.date === session.date && s.start_time === session.start_time && s.stage === session.stage);
    assert.equal(matches.length, 1, `Missing or duplicated Phase Connect session: ${session.event}`);
    assert.equal(matches[0].end_time, session.end_time);
    assert.equal(matches[0].participants, session.participants.join('; '));
    assert.equal(matches[0].event_status, session.event_status);
  }
  const phaseBooth = run("sessions.filter(s => s.booth === 'S07')");
  assert.deepEqual(Array.from(phaseBooth, s => `${s.day} ${s.start_time}-${s.end_time} ${s.event}`), [
    'Friday 12:30-13:00 Komachi Panko — Karaoke',
    'Friday 15:30-16:30 Bibi Biscuit — Meet & Greet',
    'Friday 17:00-17:30 Eimi Isami — Meet & Greet',
    'Friday 18:00-18:30 Rinkou Ashelia — Meet & Greet',
    'Saturday 13:00-14:00 Malice Evermore — Meet & Greet',
    'Saturday 16:00-17:00 Kaneko Lumi — Meet & Greet',
    'Saturday 18:00-18:30 Quest Teatime',
    'Sunday 15:30-16:30 Jelly Hoshiumi — Meet & Greet'
  ]);
  assert.equal(phaseBooth.filter(s => s.is_meet_greet === 'true').length, 6);
  assert.equal(phaseBooth.filter(s => s.is_concert === 'true').length, 1);
  assert(phaseBooth.every(s => s.event_status === 'unofficial'));
  assert.equal(run("sessions.find(s => s.date === '2026-09-20' && s.stage === 'JUBILEE STAGE' && s.start_time === '11:00').event"), 'Would WE Lie to You?');
  assert.equal(run("participantChip('Jelly Hoshiumi').href"), 'https://x.com/jellyhoshiumi');
  assert.equal(run("participantChip('Jelly').href"), 'https://x.com/jellydoughnut__');
  assert.equal(run("participantChip('Rinkou Ashelia').href"), 'https://x.com/rinkouashelia');
  assert.equal(run("participantChip('Eepy Sleepy').href"), 'https://x.com/EepySleepyCh');
  const phaseCalendar = run("createCalendar(sessions.filter(s => s.booth === 'S07'))").replace(/\r\n /g, '');
  assert(phaseCalendar.includes('DTSTART:20260918T113000Z'));
  assert(phaseCalendar.includes('DTEND:20260918T120000Z'));
  assert(phaseCalendar.includes('DTSTART:20260919T170000Z'));
  assert(phaseCalendar.includes('DTSTART:20260920T143000Z'));
  assert.equal(fs.readdirSync('conventions/vexpo-2026/sources').filter(s => /\.(png|jpe?g)$/i.test(s)).length, 0);
  const roaming = run("sessions.filter(s => s.meet_greet_type === 'Roaming')");
  assert.equal(roaming.length, 9);
  assert.equal(roaming.filter(s => s.date === '2026-09-19' && s.start_time === '14:30').length, 2);
  const roamingCalendar = run("createCalendar(sessions.filter(s => s.meet_greet_type === 'Roaming'))").replace(/\r\n /g, '');
  assert.equal(new Set(roamingCalendar.match(/^UID:.+$/gm)).size, 9);
  assert(roamingCalendar.includes('DTSTART:20260920T073000Z'));
  assert(roaming.some(s => s.participants === 'Hanakyo' && s.start_time === '11:30'));
  change('#group', 'group:Oshi Connect'); assert.equal(count(), 11);
  elements['#reset'].click();
  const afterparty = run("sessions.find(s => s.event.startsWith('Midnight Malarkey'))");
  assert.equal(afterparty.start_time, '23:45'); assert.equal(afterparty.end_time, '');
  const afterpartyCalendar = run("createCalendar([sessions.find(s => s.event.startsWith('Midnight Malarkey'))])").replace(/\r\n /g, '');
  assert(afterpartyCalendar.includes('DTSTART:20260918T224500Z'));
  assert(!afterpartyCalendar.includes('DTEND:'));
  assert(!afterpartyCalendar.includes('NEC, Birmingham'));
  assert(afterpartyCalendar.includes('end time unannounced'));
  assert(!run("sessions.some(s => s.organizer.includes('Veizo'))"));
  const originalFetch = context.fetch;
  context.fetch = async () => ({ok: false});
  assert.equal(Object.keys(await run('loadSocials()')).length, 0);
  assert.equal((await run('loadGroups()')).size, 0);
  context.fetch = async () => ({ok: true, json: async () => ({groups: 'invalid'})});
  assert.equal((await run('loadGroups()')).size, 0);
  context.fetch = originalFetch;
  run('delete config.groups');
  assert.equal((await run('loadGroups()')).size, 0);
  run('delete config.socials');
  assert.equal(Object.keys(await run('loadSocials()')).length, 0);
  console.log('PASS: Researched direct X profiles, aliases, unknown/unsafe links, optional social data;  215 sessions; 169 meet-and-greets including 62 unofficial meet-and-greets; 14 concerts; search, status and organizer filters, reset, three-way meet-and-greet filter, calendar metadata/time conversion/unique IDs, and image removal.');
});
