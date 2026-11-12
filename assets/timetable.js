/* Calendar geometry uses published local dates/times; it never changes ICS data. */
(() => {
  const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const nextDate = date => new Date(Date.parse(date + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  function layout(sessions) {
    const days = new Map();
    for (const session of sessions) {
      if (!session.date || !session.start_time) continue;
      const last = session.end_time ? session.end_date || session.date : session.date;
      if (last < session.date) continue;
      for (let date = session.date; date <= last; date = nextDate(date)) {
        const start = date === session.date ? minutes(session.start_time) : 0;
        const end = session.end_time ? date === last ? minutes(session.end_time) : 1440 : null;
        if (end !== null && end <= start) continue;
        const segment = {session, date, start, end, fromPrevious: date !== session.date, toNext: date !== last};
        // A start-only marker needs space to be readable, without asserting a duration.
        segment.displayEnd = Math.min(1440, Math.max(end ?? start + 45, start + 18));
        if (!days.has(date)) days.set(date, []);
        days.get(date).push(segment);
      }
    }
    const result = [];
    for (const [date, entries] of [...days].sort(([a], [b]) => a.localeCompare(b))) {
      entries.sort((a, b) => a.start - b.start || b.displayEnd - a.displayEnd || a.session.event.localeCompare(b.session.event));
      let component = [], lanes = [], boundary = -1;
      const finish = () => { for (const entry of component) entry.lanes = lanes.length; component = []; lanes = []; };
      for (const entry of entries) {
        if (entry.start >= boundary) finish();
        let lane = lanes.findIndex(end => end <= entry.start);
        if (lane < 0) lane = lanes.length;
        lanes[lane] = entry.displayEnd; entry.lane = lane;
        boundary = component.length ? Math.max(boundary, entry.displayEnd) : entry.displayEnd;
        component.push(entry);
      }
      finish();
      result.push({date, entries, lanes: Math.max(...entries.map(e => e.lanes))});
    }
    return result;
  }
  const occursOnDay = (session, day) => Boolean(session.date && session.start_time && session.end_date && session.end_time && session.date < day && (session.end_date > day || (session.end_date === day && session.end_time !== '00:00')));
  function render(container, sessions, {el, card, displayDate, selectedDay = 'all'}) {
    const days = layout(sessions).filter(day => selectedDay === 'all' || day.date === selectedDay);
    const pending = sessions.filter(s => !s.date || !s.start_time);
    if (days.length) {
      const note = el('p', 'timetable-hint', 'Select an event for details.');
      const viewport = el('div', 'timetable-viewport');
      viewport.tabIndex = 0; viewport.setAttribute('role', 'region');
      viewport.setAttribute('aria-label', 'Calendar schedule in event local time');
      const grid = el('div', 'timetable');
      const columns = '64px ' + days.map(day => `minmax(${Math.max(280, day.lanes * 132)}px, 1fr)`).join(' ');
      const top = el('div', 'timetable-head'); top.style.gridTemplateColumns = columns;
      top.append(el('div', 'timetable-zone', sessions.find(s => s.start_time)?.timezone_abbreviation || 'Local'));
      for (const day of days) {
        const heading = el('div', 'timetable-date');
        heading.append(el('strong', '', new Date(day.date + 'T12:00Z').toLocaleDateString('en-US', {weekday: 'long', timeZone: 'UTC'})), el('span', '', displayDate(day.date)));
        top.append(heading);
      }
      const entries = days.flatMap(day => day.entries);
      const first = Math.floor(Math.min(...entries.map(e => e.start)) / 60) * 60;
      const last = Math.min(1440, Math.ceil(Math.max(...entries.map(e => e.displayEnd)) / 60) * 60);
      const body = el('div', 'timetable-body'); body.style.gridTemplateColumns = columns;
      body.style.height = `${(last - first) * 1.6}px`;
      const axis = el('div', 'timetable-axis');
      for (let time = first; time < last; time += 60) {
        const label = el('span', '', `${String(time / 60).padStart(2, '0')}:00`);
        label.style.top = `${(time - first) * 1.6}px`; axis.append(label);
      }
      body.append(axis);
      const dialog = el('dialog', 'timetable-dialog');
      const header = el('div', 'timetable-dialog-header');
      const title = el('h2', '', 'Event details'); title.id = 'timetable-dialog-title';
      dialog.setAttribute('aria-labelledby', title.id);
      const close = el('button', '', 'Close'); close.type = 'button';
      close.addEventListener('click', () => dialog.close()); header.append(title, close);
      const detail = el('div'); dialog.append(header, detail);
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      const colors = ['#c5b1ff', '#94d9c7', '#ffc29b', '#f3a8d0', '#9cccf5'];
      const locations = [...new Set(sessions.map(s => s.stage))].sort();
      const agenda = el('div', 'timetable-agenda');
      agenda.setAttribute('aria-label', 'Calendar agenda in event local time');
      for (const day of days) {
        const column = el('div', 'timetable-day'); column.setAttribute('aria-label', displayDate(day.date));
        const agendaDay = el('section', 'agenda-day');
        const agendaHeading = el('h2', 'agenda-heading');
        agendaHeading.append(el('strong', '', new Date(day.date + 'T12:00Z').toLocaleDateString('en-US', {weekday: 'long', timeZone: 'UTC'})), el('span', '', `${displayDate(day.date)} · ${day.entries[0].session.timezone_abbreviation || 'Local time'}`));
        agendaDay.append(agendaHeading);
        for (const entry of day.entries) {
          const session = entry.session;
          const button = el('button', 'timetable-event' + (entry.end === null ? ' timetable-start-only' : ''));
          button.type = 'button';
          button.style.top = `${(entry.start - first) * 1.6}px`;
          button.style.height = `${(entry.displayEnd - entry.start) * 1.6}px`;
          button.style.left = `calc(${100 * entry.lane / entry.lanes}% + 3px)`;
          button.style.width = `calc(${100 / entry.lanes}% - 6px)`;
          button.style.setProperty('--event-color', colors[locations.indexOf(session.stage) % colors.length]);
          const time = `${entry.fromPrevious ? '00:00' : session.start_time}${entry.end === null ? ' · End unannounced' : ' – ' + (entry.toNext ? '24:00' : session.end_time)}`;
          const name = session.event === '???' ? 'To be announced' : session.event;
          const continuation = entry.fromPrevious ? 'Continued from previous day. ' : entry.toNext ? 'Continues next day. ' : '';
          button.setAttribute('aria-label', `${name}. ${displayDate(day.date)}, ${time}. ${session.stage}. ${continuation}Open event details.`);
          button.title = `${name}\n${time}\n${session.stage}\n${continuation}${session.participants || ''}`;
          button.append(el('strong', '', name), el('span', 'timetable-time', time), el('span', 'timetable-location', session.stage));
          button.addEventListener('click', () => { detail.replaceChildren(card(session)); dialog.showModal(); });
          column.append(button);
          // Phones use a chronological agenda, keeping simultaneous events readable.
          const agendaButton = el('button', 'agenda-event' + (entry.end === null ? ' agenda-start-only' : ''));
          agendaButton.type = 'button';
          agendaButton.style.setProperty('--event-color', colors[locations.indexOf(session.stage) % colors.length]);
          agendaButton.setAttribute('aria-label', button.getAttribute('aria-label'));
          const agendaTime = el('span', 'agenda-time');
          agendaTime.append(el('strong', '', entry.fromPrevious ? '00:00' : session.start_time));
          if (entry.end !== null) agendaTime.append(el('span', '', entry.toNext ? '24:00' : session.end_time));
          const description = el('span', 'agenda-description');
          description.append(el('strong', 'agenda-title', name), el('span', 'agenda-location', session.stage));
          if (entry.end === null) description.append(el('span', 'agenda-notice', 'End time unannounced'));
          if (continuation) description.append(el('span', 'agenda-notice', continuation.trim()));
          agendaButton.append(agendaTime, description);
          agendaButton.addEventListener('click', () => { detail.replaceChildren(card(session)); dialog.showModal(); });
          agendaDay.append(agendaButton);
        }
        body.append(column);
        agenda.append(agendaDay);
      }
      grid.append(top, body); viewport.append(grid); container.append(note, viewport, agenda, dialog);
    }
    if (pending.length) {
      const section = el('section', 'timetable-pending');
      section.append(el('h2', '', 'Unconfirmed times'));
      const cards = el('div', 'cards');
      for (const session of pending) {
        const item = el('div');
        if (session.date) item.append(el('p', 'muted', displayDate(session.date)));
        item.append(card(session)); cards.append(item);
      }
      section.append(cards); container.append(section);
    }
  }
  globalThis.scheduleTimetable = {layout, render, occursOnDay};
})();
