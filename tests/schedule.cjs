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
body.dataset = { eventName: 'VeXpo', eventId: 'vexpo-2026', venue: 'NEC, Birmingham, UK', uidDomain: 'vexpo-fan-planner' };
const document = { body, createElement: () => new Element(), querySelector: s => s === '[data-day="all"]' ? elements['.days'].children[0] : elements[s] };
const context = vm.createContext({ document, TextEncoder, URL, console, location: { href: 'https://example.github.io/conventions/vexpo-2026/' }, fetch: async path => { assert.equal(path, 'schedule.csv'); return { ok: true, text: async () => fs.readFileSync('vexpo-2026/schedule.csv', 'utf8') }; } });
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8'), context);
setImmediate(() => {
  const run = code => vm.runInContext(code, context);
  const count = () => run('filteredSessions().length');
  const change = (id, value, checked = false) => { elements[id][checked ? 'checked' : 'value'] = value; elements[id].handlers.change(); };
  const people = run("card({...sessions[0], participants: 'Mint Fantôme; A & B'})").children.find(e => e.className === 'people');
  assert.equal(people.children.length, 2);
  const profileSearch = new URL(people.children[0].href);
  assert.equal(profileSearch.origin, 'https://x.com');
  assert.equal(profileSearch.searchParams.get('q'), 'Mint Fantôme');
  assert.equal(profileSearch.searchParams.get('f'), 'user');
  assert.equal(new URL(people.children[1].href).searchParams.get('q'), 'A & B');
  assert.equal(people.children[0].rel, 'noopener noreferrer');
  assert.equal(people.children[0].target, '_blank');
  assert.equal(count(), 141);
  change('#meet-greets', 'exclude'); assert.equal(count(), 43);
  change('#meet-greets', 'all'); assert.equal(count(), 141);
  change('#meet-greets', 'only'); assert.equal(count(), 98);
  elements['.days'].children[2].click(); assert.equal(count(), 57);
  elements['.days'].children[3].click(); assert.equal(count(), 41);
  elements['#search'].value = 'Ironmouse'; elements['#search'].handlers.input(); assert.equal(count(), 2);
  const ironmouse = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert(ironmouse.includes('DTSTART:20260920T090000Z'));
  assert(ironmouse.includes('price: Free'));
  assert(ironmouse.includes('CATEGORIES:Official,Meet & Greet'));
  elements['#reset'].click(); assert.equal(count(), 141);
  change('#concerts', true, true); assert.equal(count(), 8);
  change('#meet-greets', 'only'); assert.equal(elements['#concerts'].checked, false); assert.equal(count(), 98);
  change('#concerts', true, true); assert.equal(elements['#meet-greets'].value, 'exclude'); assert.equal(count(), 8);
  elements['#reset'].click(); change('#event-status', 'unofficial'); assert.equal(count(), 0); assert.equal(elements['#download-calendar'].disabled, true);
  // A future unofficial entry must filter and render with the correct tag.
  run("sessions[0].event_status = 'unofficial'; render()"); assert.equal(count(), 1);
  const tags = run('card(filteredSessions()[0])').children.find(e => e.className === 'session-tags');
  assert.equal(tags.children[0].textContent, 'Unofficial');
  assert(run('createCalendar(filteredSessions())').includes('CATEGORIES:Unofficial'));
  run("sessions[0].event_status = 'official'"); elements['#reset'].click();
  const ics = run('createCalendar(filteredSessions())');
  const unfolded = ics.replace(/\r\n /g, '');
  assert.equal((unfolded.match(/BEGIN:VEVENT/g) || []).length, 141);
  assert.equal(new Set(unfolded.match(/^UID:.+$/gm)).size, 141);
  assert(ics.split('\r\n').every(line => Buffer.byteLength(line, 'utf8') <= 75));
  const snapshot = JSON.parse(fs.readFileSync('vexpo-2026/sources/participants.json', 'utf8'));
  assert.equal(snapshot.length, 141); assert.equal(snapshot.filter(s => s.is_meet_greet).length, 98);
  assert(snapshot.every(s => s.event_status === 'official'));
  assert.equal(fs.readdirSync('vexpo-2026/sources').filter(s => /\.(png|jpe?g)$/i.test(s)).length, 0);
  console.log('PASS: 141 sessions; 98 meet-and-greets (57 Saturday, 41 Sunday); 8 concerts; search, status tags, reset, three-way meet-and-greet filter, calendar metadata/time conversion/unique IDs, and image removal.');
});
