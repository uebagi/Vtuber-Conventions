// A convention stays current through its final day in its own timezone.
function conventionHasEnded(card, now) {
  const end = card.dataset.endDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return false;
  const parsed = new Date(`${end}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== end) return false;
  if (!card.dataset.timezone) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: card.dataset.timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}` > end;
  } catch {
    // Missing or invalid metadata must not hide a convention.
    return false;
  }
}

function updateConventionDirectory(now = new Date()) {
  const current = document.querySelector('#current-list');
  const archive = document.querySelector('#archive-list');
  if (!current || !archive) return;
  const cards = [...document.querySelectorAll('.convention-link')];
  const upcoming = cards.filter(card => !conventionHasEnded(card, now));
  const past = cards.filter(card => conventionHasEnded(card, now));
  const byDate = (a, b) => (a.dataset.endDate || '').localeCompare(b.dataset.endDate || '');
  upcoming.sort(byDate);
  past.sort((a, b) => byDate(b, a));
  // Move the existing links, retaining their original URLs and markup.
  current.replaceChildren(...upcoming);
  archive.replaceChildren(...past);
  document.querySelector('#current-heading').textContent = 'Current & upcoming';
  document.querySelector('#no-upcoming').hidden = upcoming.length > 0;
  document.querySelector('#archived-conventions').hidden = past.length === 0;
}

updateConventionDirectory();
// Reclassify without a deployment, including tabs left open past midnight.
setInterval(() => updateConventionDirectory(), 60000);
window.addEventListener('pageshow', () => updateConventionDirectory());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateConventionDirectory();
});
