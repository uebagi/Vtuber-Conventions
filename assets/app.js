/* Small RFC 4180 parser: quoted commas, newlines, escaped quotes and UTF-8 BOM. */
function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(Boolean)) rows.push(row);
      row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Unclosed CSV field');
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map(values => Object.fromEntries(headers.map((name, i) => [name, values[i] || ''])));
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const displayDate = date => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const config = document.body.dataset;
const isTimeMarker = session => ['opening', 'closing'].includes(session.event_type);
let sessions = [], selectedDay = 'all', socialProfiles = {};

function participantChip(name) {
  const profile = socialProfiles[name];
  const handle = typeof profile?.x === 'string' && /^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})$/.exec(profile.x)?.[1];
  if (!handle) {
    const chip = el('span', 'person', name);
    chip.title = 'X profile unconfirmed';
    return chip;
  }
  const link = el('a', 'person social-link');
  link.href = profile.x;
  link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.title = `${name} on X (Twitter): @${handle}`;
  link.setAttribute('aria-label', `${name} on X (Twitter), @${handle}, opens in a new tab`);
  link.append(el('span', '', name), el('span', 'social-label', 'X ↗'));
  return link;
}

function participantLinks(name) {
  const group = el('span', 'person-group');
  group.append(participantChip(name));
  const primary = socialProfiles[name]?.primary;
  if (primary?.url) {
    try {
      const url = new URL(primary.url);
      if (url.protocol === 'https:' && !url.username && !url.password && url.href !== socialProfiles[name].x) {
        const host = url.hostname.replace(/^www\./, '');
        const label = ({'youtube.com': 'YouTube', 'twitch.tv': 'Twitch', 'x.com': 'X', 'twitter.com': 'X'}[host] || 'Website');
        const link = el('a', 'primary-social', `${label} ↗`);
        link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
        link.title = `${name}: ${label}, linked by the convention`;
        link.setAttribute('aria-label', `${name} on ${label}, opens in a new tab`);
        group.append(link);
      }
    } catch { /* Invalid optional links do not hide the participant. */ }
  }
  return group;
}

// Optional per-convention entry hours, displayed in event-local time.
async function loadOpeningHours() {
  const container = document.querySelector('#opening-hours');
  if (!config.openingHours || !container) return;
  try {
    const response = await fetch(config.openingHours);
    if (!response.ok) throw new Error('Opening hours unavailable');
    const data = await response.json();
    new Intl.DateTimeFormat('en-US', { timeZone: data.timezone });
    if (!data.timezone || !Array.isArray(data.days)) throw new Error('Invalid opening hours');
    const days = el('div', 'opening-days');
    for (const day of data.days) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Array.isArray(day.entries)) throw new Error('Invalid opening day');
      const section = el('section');
      const heading = el('h3', '', new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }));
      const date = el('time', '', displayDate(day.date));
      date.setAttribute('datetime', day.date);
      heading.append(date);
      const entries = el('dl');
      for (const entry of day.entries) {
        if (typeof entry.label !== 'string' || ![entry.opens, entry.closes].every(time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Invalid entry hours');
        const row = el('div');
        row.append(el('dt', '', entry.label), el('dd', '', `${entry.opens}–${entry.closes}`));
        entries.append(row);
      }
      section.append(heading, entries);
      days.append(section);
    }
    const heading = el('h2');
    heading.id = 'opening-hours-heading';
    days.id = 'opening-hours-days';
    days.dataset.collapsed = 'true';
    const toggle = el('button', 'opening-hours-toggle', 'Show opening hours');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', days.id);
    toggle.setAttribute('aria-expanded', 'false');
    const chevron = el('span', 'opening-hours-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    toggle.append(chevron);
    toggle.addEventListener('click', () => {
      const expanded = days.dataset.collapsed === 'true';
      days.dataset.collapsed = String(!expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
    });
    heading.append(el('span', 'opening-hours-title', 'Show opening hours'), toggle);
    container.replaceChildren(heading, days);
    container.hidden = !data.days.length;
  } catch (error) {
    container.hidden = true;
    console.warn('Opening hours could not be loaded.', error);
  }
}

async function loadSocials() {
  if (!config.socials) return {};
  try {
    const response = await fetch(config.socials);
    if (!response.ok) throw new Error('Social profiles unavailable');
    const data = await response.json();
    if (!data?.profiles || typeof data.profiles !== 'object' || Array.isArray(data.profiles)) throw new Error('Invalid social profiles');
    return data.profiles;
  } catch (error) {
    console.warn('Social profiles could not be loaded; participant names remain available.', error);
    return {};
  }
}
const search = document.querySelector('#search');
const stage = document.querySelector('#stage');
const announced = document.querySelector('#announced');
const concerts = document.querySelector('#concerts');
const meetGreets = document.querySelector('#meet-greets');
const eventStatus = document.querySelector('#event-status');
const organizerFor = session => (session.organizer || '').trim();
const statusLabel = session => ({ official: 'Official', unofficial: 'Unofficial' }[session.event_status] || 'Status unconfirmed');
const schedule = document.querySelector('#schedule');
const status = document.querySelector('#status');
const downloadCalendar = document.querySelector('#download-calendar');

// Export UTC instants so calendar apps preserve BST regardless of device timezone.
function calendarTimestamp(value) {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function calendarText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}
function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  let result = '', bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) { result += '\r\n '; bytes = 1; }
    result += character; bytes += size;
  }
  return result;
}
function createCalendar(items, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//VeXpo Fan Planner//Schedule//EN', 'CALSCALE:GREGORIAN'];
  for (const session of items) {
    const title = session.event === '???' ? 'To be announced' : session.event;
    const description = [
      `Local time: ${displayDate(session.date)} ${session.start_time}${isTimeMarker(session) ? '' : '–' + session.end_time} ${session.timezone_abbreviation || session.timezone} (UTC${session.utc_offset}).`,
      session.participants ? `Participants: ${session.participants}` : isTimeMarker(session) ? '' : 'Participants not announced.',
      `Event status: ${statusLabel(session)}`,
      organizerFor(session) ? `Organizer: ${organizerFor(session)}` : '',
      session.is_meet_greet === 'true' ? `Meet & greet: ${session.meet_greet_type}; price: ${session.price}; booth: ${session.booth}` : '',
      session.lineup_notes,
      'Fan-maintained schedule snapshot; check the source listing for changes.',
      session.participant_source_urls || session.source_url
    ].filter(Boolean).join('\n\n');
    // A slot retains its identity when an unannounced title or lineup is updated.
    const uid = `${session.date}-${session.start_time.replace(':', '')}-${session.stage.toLowerCase().replace(/[^a-z0-9]+/g, '-')}@${config.uidDomain || config.eventId}`;
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${calendarTimestamp(now)}`,
      `DTSTART:${calendarTimestamp(`${session.date}T${session.start_time}:00${session.utc_offset}`)}`,
      ...(isTimeMarker(session) ? [] : [`DTEND:${calendarTimestamp(`${session.date}T${session.end_time}:00${session.utc_offset}`)}`]),
      `SUMMARY:${calendarText(`${config.eventName}: ${title}`)}`,
      `LOCATION:${calendarText(`${session.stage}, ${config.venue}`)}`,
      `DESCRIPTION:${calendarText(description)}`,
      `CATEGORIES:${calendarText(statusLabel(session))}${session.is_meet_greet === 'true' ? ',Meet & Greet' : ''}`,
      `URL:${session.source_url.replace(/[\r\n]/g, '')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldCalendarLine).join('\r\n') + '\r\n';
}
function saveCalendar(items, filename) {
  if (!items.length) return;
  const url = URL.createObjectURL(new Blob([createCalendar(items)], { type: 'text/calendar;charset=utf-8' }));
  const link = el('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function card(session) {
  const article = el('article', 'card');
  article.dataset.stage = session.stage;
  const top = el('div', 'card-top');
  top.append(el('span', 'stage', session.stage));
  const times = el('span', 'time');
  for (const [i, value] of (isTimeMarker(session) ? [session.start_time] : [session.start_time, session.end_time]).entries()) {
    if (i) times.append(' – ');
    const time = el('time', '', value);
    time.dateTime = `${session.date}T${value}:00${session.utc_offset}`;
    times.append(time);
  }
  top.append(times); article.append(top);
  const tags = el('div', 'session-tags');
  tags.append(el('span', 'badge event-status', statusLabel(session)));
  if (session.is_meet_greet === 'true') tags.append(el('span', 'badge', 'Meet & Greet'));
  article.append(tags);
  article.append(el('h3', '', session.event === '???' ? 'To be announced' : session.event));
  if (/recorded concert screening/i.test(session.lineup_notes)) article.append(el('span', 'badge', 'Recorded screening'));
  else if (session.lineup_status === 'partial') article.append(el('span', 'badge', 'Full lineup not listed'));
  if (session.is_meet_greet === 'true') article.append(el('p', 'muted', `${session.meet_greet_type} · ${session.price} · Availability window`));
  const names = session.participants.split(';').map(s => s.trim()).filter(Boolean);
  if (names.length) {
    const people = el('div', 'people');
    names.forEach(name => people.append(participantLinks(name)));
    article.append(people);
  } else if (!isTimeMarker(session)) article.append(el('p', 'muted', 'Participants not announced.'));
  const details = el('details'); details.append(el('summary', '', isTimeMarker(session) ? 'Details & sources' : 'Lineup details & sources'));
  if (session.listed_hosts && session.listed_hosts !== '???') details.append(el('p', '', `Listed hosts: ${session.listed_hosts}`));
  if (session.lineup_notes) details.append(el('p', '', session.lineup_notes));
  if (session.concert_classification_notes) details.append(el('p', '', `Concert filter: ${session.concert_classification_notes}`));
  const links = el('div', 'source-links');
  const urls = [...new Set((session.participant_source_urls || session.source_url).split(';').map(s => s.trim()).filter(Boolean))];
  urls.forEach((value, i) => {
    const url = new URL(value, location.href);
    if (!['https:', 'http:'].includes(url.protocol)) return;
    const a = el('a', '', i === 0 ? (session.event_status === 'official' ? 'Official listing ↗' : 'Source listing ↗') : 'Lineup poster ↗');
    a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; links.append(a);
  });
  details.append(links); article.append(details);
  const download = el('button', 'session-calendar', 'Download calendar (.ics)');
  download.type = 'button'; download.setAttribute('aria-label', `Download calendar for ${session.event === '???' ? 'unannounced session' : session.event}, ${session.day} ${session.start_time}, ${session.stage}`);
  download.addEventListener('click', () => saveCalendar([session], `${config.eventId}-${session.date}-${session.start_time.replace(':', '')}-${session.stage.toLowerCase().replace(/\s+/g, '-')}.ics`));
  article.append(download); return article;
}

function setupEventStatus() {
  eventStatus.replaceChildren();
  const choices = [
    ['all', 'Official & unofficial'],
    ['official', 'Official'],
    ['unofficial', 'Unofficial'],
    ...[...new Set(sessions.map(organizerFor).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'en-US', { sensitivity: 'base' }))
      .map(name => [`organizer:${name}`, name])
  ];
  for (const [value, label] of choices) {
    const option = el('option', '', label);
    option.value = value;
    eventStatus.append(option);
  }
  eventStatus.value = 'all';
}

function matchesEventStatus(session) {
  const selected = eventStatus.value;
  if (selected === 'all') return true;
  if (selected.startsWith('organizer:')) return organizerFor(session) === selected.slice('organizer:'.length);
  return session.event_status === selected;
}

function filteredSessions() {
  const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
  return sessions.filter(s => (selectedDay === 'all' || s.date === selectedDay)
    && (stage.value === 'all' || s.stage === stage.value)
    && (!announced.checked || s.lineup_status !== 'unannounced')
    && (!concerts.checked || s.is_concert === 'true')
    && (meetGreets.value === 'all' || (meetGreets.value === 'only' ? s.is_meet_greet === 'true' : s.is_meet_greet !== 'true'))
    && matchesEventStatus(s)
    && terms.every(term => normalize([s.event, s.participants, s.listed_hosts, s.lineup_notes, s.stage, s.meet_greet_type, s.event_status, organizerFor(s)].join(' ')).includes(term)));
}

function render() {
  const filtered = filteredSessions();
  downloadCalendar.disabled = !filtered.length;
  downloadCalendar.textContent = `Download ${filtered.length} sessions (.ics)`;
  status.textContent = `${filtered.length} of ${sessions.length} sessions · Event local time`;
  schedule.replaceChildren();
  for (const date of [...new Set(sessions.map(s => s.date))]) {
    const items = filtered.filter(s => s.date === date); if (!items.length) continue;
    const section = el('section'); const heading = el('div', 'day-heading');
    heading.append(el('h2', '', items[0].day), el('span', '', `${displayDate(date)} · ${items.length} sessions`));
    const cards = el('div', 'cards'); items.forEach(s => cards.append(card(s)));
    section.append(heading, cards); schedule.append(section);
  }
  if (!filtered.length) {
    const empty = el('div', 'empty');
    empty.append(el('h2', '', 'No sessions found'));
    schedule.append(empty);
  }
}

function setupDays() {
  const container = document.querySelector('.days');
  container.replaceChildren();
  const dates = [...new Set(sessions.map(s => s.date))];
  for (const date of ['all', ...dates]) {
    const label = date === 'all' ? 'All days' : new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
    const button = el('button', '', label);
    button.type = 'button'; button.dataset.day = date;
    button.setAttribute('aria-pressed', String(date === selectedDay));
    button.addEventListener('click', () => {
      selectedDay = date;
      container.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      render();
    });
    container.append(button);
  }
}
search.addEventListener('input', render); stage.addEventListener('change', render); announced.addEventListener('change', render);
concerts.addEventListener('change', () => { if (concerts.checked && meetGreets.value === 'only') meetGreets.value = 'exclude'; render(); });
meetGreets.addEventListener('change', () => { if (meetGreets.value === 'only') concerts.checked = false; render(); });
eventStatus.addEventListener('change', render);
downloadCalendar.addEventListener('click', () => saveCalendar(filteredSessions(), `${config.eventId}-${selectedDay === 'all' ? 'schedule' : selectedDay.toLowerCase()}.ics`));
document.querySelector('#reset').addEventListener('click', () => {
  search.value = ''; stage.value = 'all'; announced.checked = false; concerts.checked = false; meetGreets.value = 'all'; eventStatus.value = 'all';
  document.querySelector('[data-day="all"]').click();
});

async function load() {
  try {
    const [response, profiles] = await Promise.all([fetch('schedule.csv'), loadSocials()]);
    socialProfiles = profiles;
    if (!response.ok) throw new Error(`Schedule request failed: ${response.status}`);
    sessions = parseCSV(await response.text());
    if (!sessions.length || sessions.some(s => !s.date || !s.event || !s.stage || !s.start_time || (!s.end_time && !isTimeMarker(s)) || !s.utc_offset || !s.source_url || !('participants' in s) || !('lineup_notes' in s))) throw new Error('Invalid schedule columns');
    const sortKey = s => s.date + s.start_time + (s.event_type === 'opening' ? '0' : s.event_type === 'closing' ? '2' : '1') + s.stage;
    sessions.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    [...new Set(sessions.map(s => s.stage))].sort().forEach(name => { const option = el('option', '', name); option.value = name; stage.append(option); });
    setupDays();
    setupEventStatus();
    render();
  } catch (error) {
    status.textContent = 'The schedule could not be loaded.';
    const box = el('div', 'empty'); box.append(el('h2', '', 'Schedule unavailable'));
    box.append(el('p', '', 'Please reload the page, or use the CSV download above.'));
    const retry = el('button', '', 'Try again'); retry.type = 'button'; retry.addEventListener('click', () => location.reload()); box.append(retry);
    schedule.replaceChildren(box); console.error(error);
  }
}
load();
loadOpeningHours();
