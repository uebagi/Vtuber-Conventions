const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync('assets/timetable.js', 'utf8'), context);
const layout = context.scheduleTimetable.layout;
const session = (event, start, end, extra = {}) => ({event, date: '2026-11-13', start_time: start, end_time: end, ...extra});
let days = layout([session('First', '10:00', '11:00'), session('Overlap', '10:30', '11:30'), session('Next', '11:30', '12:00')]);
const [a, b, c] = days[0].entries;
assert.equal(a.lanes, 2); assert.equal(b.lanes, 2); assert.notEqual(a.lane, b.lane);
assert.equal(c.lanes, 1); assert.equal(c.lane, 0);
days = layout([session('Long', '10:00', '13:00'), session('Short 1', '10:30', '11:00'), session('Short 2', '11:00', '11:30')]);
assert.equal(days[0].entries[1].lane, days[0].entries[2].lane);
assert(days[0].entries.every(e => e.lanes === 2));
const unknown = session('End unknown', '15:00', '');
days = layout([unknown, session('Untimed', '', ''), session('No day', '13:00', '', {date: ''})]);
assert.equal(days.length, 1); assert.equal(days[0].entries.length, 1);
assert.equal(days[0].entries[0].end, null); assert.equal(unknown.end_time, '');
days = layout([session('Overnight', '23:30', '01:00', {end_date: '2026-11-14'})]);
assert.equal(days.length, 2);
assert.equal(days[0].entries[0].start, 1410); assert.equal(days[0].entries[0].end, 1440);
assert(days[0].entries[0].toNext); assert(days[1].entries[0].fromPrevious);
assert.equal(days[1].entries[0].start, 0); assert.equal(days[1].entries[0].end, 60);
days = layout([session('Until midnight', '23:00', '00:00', {end_date: '2026-11-14'})]);
assert.equal(days.length, 1); // No phantom zero-length block on the next day.
const result = layout([session('Later', '14:00', '15:00', {date: '2026-11-14'}), session('Earlier', '14:00', '15:00')]);
assert.equal(result[0].date, '2026-11-13');
assert.equal(layout([]).length, 0);
assert(context.scheduleTimetable.occursOnDay(session('Overnight', '23:30', '01:00', {end_date: '2026-11-14'}), '2026-11-14'));
assert(!context.scheduleTimetable.occursOnDay(session('Until midnight', '23:30', '00:00', {end_date: '2026-11-14'}), '2026-11-14'));
assert(!context.scheduleTimetable.occursOnDay(unknown, '2026-11-14'));
// Both responsive layouts must contain every segment and open the same details.
class Element {
  constructor(tag, className, text) { this.tag = tag; this.className = className || ''; this.text = text; this.children = []; this.attributes = {}; this.handlers = {}; this.style = {setProperty() {}}; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(key, value) { this.attributes[key] = value; }
  getAttribute(key) { return this.attributes[key]; }
  addEventListener(key, handler) { this.handlers[key] = handler; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
const el = (tag, cls, text) => new Element(tag, cls, text);
const container = el('div');
const fixture = [session('Known', '10:00', '11:00'), unknown, session('Night', '23:30', '01:00', {end_date: '2026-11-14'}), session('Pending', '', '')].map(s => ({stage: 'Test room', timezone_abbreviation: 'PST', participants: '', ...s}));
context.scheduleTimetable.render(container, fixture, {el, card: s => el('article', 'card', s.event), displayDate: date => date});
const all = node => [node, ...node.children.flatMap(all)];
const nodes = all(container);
const mobile = nodes.filter(n => n.className.split(' ').includes('agenda-event'));
const desktop = nodes.filter(n => n.className.split(' ').includes('timetable-event'));
assert.equal(mobile.length, 4); assert.equal(mobile.length, desktop.length);
for (let i = 0; i < mobile.length; i++) assert.equal(mobile[i].attributes['aria-label'], desktop[i].attributes['aria-label']);
const dialog = nodes.find(n => n.tag === 'dialog');
mobile[0].handlers.click(); assert(dialog.open);
assert(nodes.find(n => n.className === 'timetable-pending'));
assert(nodes.some(n => n.className === 'agenda-notice' && n.text === 'End time unannounced'));
for (const slug of fs.readdirSync('conventions')) {
  const file = `conventions/${slug}/index.html`;
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes('id="schedule"')) continue;
  assert(html.includes('id="schedule-view"'));
  assert(html.indexOf('assets/timetable.js') < html.indexOf('assets/app.js'));
}
console.log('PASS: Calendar overlap lanes/reuse, unknown ends, untimed exclusions, overnight splitting, date order and page integration.');
