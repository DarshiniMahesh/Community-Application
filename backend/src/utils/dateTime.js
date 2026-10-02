const INDIA_TIME_ZONE = 'Asia/Kolkata';

function indiaDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateOnly(value) {
  if (value instanceof Date) return indiaDateString(value);
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ''));
  return match ? match[1] : null;
}

function indiaDaysUntil(value) {
  const target = dateOnly(value);
  if (!target) return null;
  const today = indiaDateString();
  return Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

function indiaAge(value) {
  const birthDate = dateOnly(value);
  if (!birthDate) return null;
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = indiaDateString().split('-').map(Number);
  return todayYear - birthYear - (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay) ? 1 : 0);
}

function indiaYear() {
  return Number(indiaDateString().slice(0, 4));
}

module.exports = { dateOnly, indiaAge, indiaDateString, indiaDaysUntil, indiaYear };