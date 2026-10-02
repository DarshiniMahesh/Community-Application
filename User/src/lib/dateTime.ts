export const INDIA_TIME_ZONE = "Asia/Kolkata";

type DateValue = string | number | Date | null | undefined;

export function parseIndiaDate(value: DateValue): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = value.includes(" ") && !value.includes("T")
    ? value.replace(" ", "T")
    : value;
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const parsed = new Date(hasTimeZone ? normalized : `${normalized}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function indiaParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: INDIA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date).map(({ type, value }) => [type, value])
  );
}

export function indiaDateInputValue(value: DateValue = new Date()): string {
  const date = parseIndiaDate(value);
  if (!date) return "";
  const parts = indiaParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatIndiaDate(
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseIndiaDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
    timeZone: INDIA_TIME_ZONE,
  }).format(date);
}

export function formatIndiaDateTime(
  value: DateValue,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = parseIndiaDate(value);
  if (!date) return "—";
  const hasStyleOptions = options.dateStyle !== undefined || options.timeStyle !== undefined;
  return new Intl.DateTimeFormat("en-IN", {
    ...(hasStyleOptions ? {} : {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }),
    ...options,
    timeZone: INDIA_TIME_ZONE,
  }).format(date);
}

export function isIndiaDatePast(value: DateValue): boolean {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value < indiaDateInputValue();
  }
  const date = parseIndiaDate(value);
  return date ? date.getTime() < Date.now() : false;
}

export function addIndiaDays(value: DateValue, days: number): Date | null {
  const isoDate = indiaDateInputValue(value);
  if (!isoDate) return null;
  const utcDate = new Date(`${isoDate}T00:00:00Z`);
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return parseIndiaDate(utcDate.toISOString().slice(0, 10));
}

export function calculateIndiaAge(value: string | null | undefined): number | null {
  if (!value) return null;
  const birthDate = indiaDateInputValue(value);
  if (!birthDate) return null;
  const [birthYear, birthMonth, birthDay] = birthDate.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = indiaDateInputValue().split("-").map(Number);
  return todayYear - birthYear - (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay) ? 1 : 0);
}

export function indiaDaysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const targetDate = indiaDateInputValue(value);
  if (!targetDate) return null;
  const todayDate = indiaDateInputValue();
  const target = new Date(`${targetDate}T00:00:00Z`).getTime();
  const today = new Date(`${todayDate}T00:00:00Z`).getTime();
  return Math.ceil((target - today) / 86_400_000);
}