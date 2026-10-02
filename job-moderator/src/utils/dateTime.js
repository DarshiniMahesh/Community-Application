const INDIA_TIME_ZONE = 'Asia/Kolkata';

function parseDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  }
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return new Date(hasTimeZone ? normalized : `${normalized}Z`);
}

function formatIndiaDate(value) {
  const date = parseDate(value);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en-IN', {
      timeZone: INDIA_TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric',
    }).format(date)
    : '—';
}

module.exports = { formatIndiaDate };