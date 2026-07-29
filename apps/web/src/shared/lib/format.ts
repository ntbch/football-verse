export const publicLocale = "en-US";

export function formatDate(value?: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(publicLocale, options).format(date);
}

export function formatDateTime(value?: string) {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short" });
}
