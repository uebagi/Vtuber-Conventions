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
const elements = Object.fromEntries(['#opening-hours', '#search', '#stage', '#announced', '#event-type', '#event-status', '#group', '#talent', '#schedule', '#status', '#download-calendar', '#reset', '.days'].map(k => [k, new Element()]));
elements['#group'].value = elements['#stage'].value = elements['#event-status'].value = elements['#event-type'].value = 'all';
const html = fs.readFileSync('conventions/vexpo-2026/index.html', 'utf8');
assert(!html.includes('id="concerts"')); assert(!html.includes('id="meet-greets"'));
const typeMarkup = html.match(/<select id="event-type">(.*?)<\/select>/s)[1];
for (const [, value] of typeMarkup.matchAll(/value="([^"]+)"/g)) { const option = new Element(); option.value = value; elements['#event-type'].append(option); }

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
  const select = type => { elements['#event-type'].value = type; elements['#event-type'].handlers.change(); };
  for (const [type, expected] of [['all', 215], ['concert', 14], ['meet-greet', 169], ['roaming', 9], ['afterparty', 1], ['stage-panel', 33], ['exclude-meet-greets', 46]]) {
    select(type); assert.equal(run('filteredSessions().length'), expected, type);
    const url = context.location.href;
    assert.equal(new URL(url).searchParams.get('type'), type === 'all' ? null : type);
    elements['#reset'].click(); assert.equal(elements['#event-type'].value, 'all');
    context.location.href = url; windowHandlers.popstate();
    assert.equal(run('filteredSessions().length'), expected, `restored ${type}`);
    const calendar = run('createCalendar(filteredSessions())');
    assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, expected);
  }
  for (const [query, expected, type] of [['concerts=1', 14, 'concert'], ['meet-greets=only', 169, 'meet-greet'], ['meet-greets=exclude', 46, 'exclude-meet-greets'], ['concerts=1&meet-greets=exclude', 13, 'concert'], ['type=invalid', 215, 'all']]) {
    context.location.href = 'https://example.github.io/Vtuber-Conventions/conventions/vexpo-2026/?' + query;
    windowHandlers.popstate(); assert.equal(run('filteredSessions().length'), expected, query);
    assert.equal(elements['#event-type'].value, type);
  }
  select('roaming'); elements['#group'].value = 'group:florAtelier'; elements['#group'].handlers.change();
  assert.equal(run('filteredSessions().length'), 2);
  elements['#reset'].click(); assert.equal(new URL(context.location.href).search, '');
  console.log('PASS: Event types, combined filters, calendar exports, URL round-trips, legacy links and reset.');
});
