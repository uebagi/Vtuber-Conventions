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
const elements = Object.fromEntries(['#opening-hours', '#search', '#stage', '#announced', '#event-types', '#event-types-summary', '#event-status', '#group', '#talent', '#schedule', '#status', '#download-calendar', '#reset', '.days'].map(k => [k, new Element()]));
elements['#group'].value = elements['#stage'].value = elements['#event-status'].value = elements['#event-types'].value = 'all';
const html = fs.readFileSync('conventions/vexpo-2026/index.html', 'utf8');
assert(!html.includes('value="exclude-meet-greets"'));
assert(!html.includes('id="concerts"')); assert(!html.includes('id="meet-greets"'));
const typeMarkup = html.match(/<details id="event-types".*?<fieldset>(.*?)<\/fieldset>/s)[1];
for (const [, value] of typeMarkup.matchAll(/value="([^"]+)"/g)) { const option = new Element(); option.value = value; elements['#event-types'].append(option); }

const body = new Element();
body.dataset = { eventName: 'VeXpo', eventId: 'vexpo-2026', venue: 'NEC, Birmingham, UK', uidDomain: 'vexpo-fan-planner', socials: 'socials.json', openingHours: 'opening-hours.json', groups: 'groups.json' };
const document = { body, createElement: () => new Element(), querySelector: s => s === '[data-day="all"]' ? elements['.days'].children[0] : elements[s] };
const context = vm.createContext({ document, TextEncoder, URL, console, location: { href: 'https://example.github.io/Vtuber-Conventions/conventions/vexpo-2026/' }, fetch: async path => { assert(['schedule.csv', 'socials.json', 'opening-hours.json', 'groups.json'].includes(path)); return { ok: true, text: async () => fs.readFileSync('conventions/vexpo-2026/' + path, 'utf8'), json: async () => JSON.parse(fs.readFileSync('conventions/vexpo-2026/' + path, 'utf8')) }; } });
context.history = {state: null, replaceState: (state, title, url) => { context.location.href = url; }};
const windowHandlers = {};
context.window = {addEventListener: (name, handler) => { windowHandlers[name] = handler; }};
vm.runInContext(fs.readFileSync('assets/app.js', 'utf8'), context);
setImmediate(() => {
  const run = code => vm.runInContext(code, context);
  const check = (type, checked) => { const box = elements['#event-types'].children.find(box => box.value === type); box.checked = checked; box.handlers.change(); };
  const select = type => { check('all', true); if (type !== 'all') check(type, true); };
  for (const [type, expected] of [['all', 216], ['concert', 14], ['meet-greet', 170], ['roaming', 9], ['afterparty', 1], ['stage-panel', 33]]) {
    select(type); assert.equal(run('filteredSessions().length'), expected, type);
    const url = context.location.href;
    assert.equal(new URL(url).searchParams.get('type'), type === 'all' ? null : type);
    elements['#reset'].click(); assert.equal(elements['#event-types-summary'].textContent, 'All events');
    context.location.href = url; windowHandlers.popstate();
    assert.equal(run('filteredSessions().length'), expected, `restored ${type}`);
    const calendar = run('createCalendar(filteredSessions())');
    assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, expected);
  }
  for (const [query, expected, type] of [['concerts=1', 14, 'concert'], ['meet-greets=only', 170, 'meet-greet'], ['meet-greets=exclude', 46, 'exclude-meet-greets'], ['concerts=1&meet-greets=exclude', 13, 'concert'], ['type=invalid', 216, 'all']]) {
    context.location.href = 'https://example.github.io/Vtuber-Conventions/conventions/vexpo-2026/?' + query;
    windowHandlers.popstate(); assert.equal(run('filteredSessions().length'), expected, query);
    assert(run(`selectedTypes.has(${JSON.stringify(type)})`));
  }
  select('concert'); check('roaming', true); check('afterparty', true);
  assert.equal(run('filteredSessions().length'), 23); // Afterparty already matches Concerts.
  assert.equal(elements['#event-types-summary'].textContent, '3 selected');
  const multiURL = context.location.href;
  assert.equal(new URL(multiURL).searchParams.get('type'), 'afterparty,concert,roaming');
  elements['#reset'].click(); context.location.href = multiURL; windowHandlers.popstate();
  assert.equal(run('filteredSessions().length'), 23);
  const multiCalendar = run('createCalendar(filteredSessions())').replace(/\r\n /g, '');
  assert.equal(new Set(multiCalendar.match(/^UID:.+$/gm)).size, 23);
  check('concert', false); check('roaming', false); check('afterparty', false);
  assert.equal(run('filteredSessions().length'), 0);
  assert.equal(new URL(context.location.href).searchParams.get('type'), 'none');
  windowHandlers.popstate(); assert.equal(run('filteredSessions().length'), 0);
  assert.equal(elements['#download-calendar'].disabled, true);
  check('all', true); assert.equal(run('filteredSessions().length'), 216);
  select('roaming'); elements['#group'].value = 'group:florAtelier'; elements['#group'].handlers.change();
  assert.equal(run('filteredSessions().length'), 2);
  elements['#reset'].click(); assert.equal(new URL(context.location.href).search, '');
  console.log('PASS: Event types, combined filters, calendar exports, URL round-trips, legacy links and reset.');
});
