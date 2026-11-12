const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const card = (id, endDate, timezone) => ({ id, dataset: { endDate, timezone } });
const old = card('vexpo', '2026-09-20', 'Europe/London');
const recent = card('kumoricon', '2026-11-15', 'America/Los_Angeles');
const current = { children: [old, recent], replaceChildren(...cards) { this.children = cards; } };
const archive = { children: [], replaceChildren(...cards) { this.children = cards; } };
const elements = {
  '#current-list': current, '#archive-list': archive,
  '#current-heading': {}, '#no-upcoming': {}, '#archived-conventions': {}
};
const events = {};
const document = {
  hidden: false,
  querySelector: selector => elements[selector],
  querySelectorAll: () => [...current.children, ...archive.children],
  addEventListener: (name, callback) => { events[name] = callback; }
};
let interval;
const context = vm.createContext({ document, Intl, Date,
  setInterval: (callback, ms) => { assert.equal(ms, 60000); interval = callback; },
  window: { addEventListener: (name, callback) => { events[name] = callback; } }
});
vm.runInContext(fs.readFileSync('assets/directory.js', 'utf8'), context);
context.card = recent;
const ended = iso => vm.runInContext(`conventionHasEnded(card, new Date('${iso}'))`, context);
assert.equal(ended('2026-11-15T08:00:00Z'), false, 'Final local day remains current');
assert.equal(ended('2026-11-16T07:59:59Z'), false, 'UTC midnight must not archive PST events');
assert.equal(ended('2026-11-16T08:00:00Z'), true, 'Archive at midnight after final local day');
context.card = old;
assert.equal(ended('2026-09-20T22:59:59Z'), false);
assert.equal(ended('2026-09-20T23:00:00Z'), true, 'London summer offset differs from UTC');
for (const invalid of [card('missing', '', ''), card('bad-date', '2026-02-30', 'UTC'), card('bad-zone', '2000-01-01', 'Missing/Timezone')]) {
  context.card = invalid;
  assert.equal(ended('2026-11-16T08:00:00Z'), false, invalid.id);
}
function update(iso) { vm.runInContext(`updateConventionDirectory(new Date('${iso}'))`, context); }
update('2026-11-12T12:00:00Z');
assert.deepEqual(current.children.map(x => x.id), ['kumoricon']);
assert.deepEqual(archive.children.map(x => x.id), ['vexpo']);
assert.equal(elements['#archived-conventions'].hidden, false);
assert.equal(elements['#no-upcoming'].hidden, true);
update('2026-11-16T08:00:00Z');
assert.equal(current.children.length, 0);
assert.deepEqual(archive.children.map(x => x.id), ['kumoricon', 'vexpo']);
assert.equal(elements['#no-upcoming'].hidden, false);
update('2026-09-01T00:00:00Z');
assert.deepEqual(current.children.map(x => x.id), ['vexpo', 'kumoricon']);
assert.equal(elements['#archived-conventions'].hidden, true);
// Repeated updates move existing cards without duplicating or replacing links.
update('2026-11-12T12:00:00Z'); update('2026-11-12T12:00:00Z');
assert.equal(current.children[0], recent);
assert.equal(archive.children[0], old);
assert.equal(typeof interval, 'function');
assert.equal(typeof events.pageshow, 'function');
assert.equal(typeof events.visibilitychange, 'function');
console.log('PASS: Automatic archive, event-local midnight/DST boundaries, stable links, sort order, empty states, invalid metadata and refresh hooks.');
