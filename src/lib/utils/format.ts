const FORMATTER = new Intl.DateTimeFormat("es-HN", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Tegucigalpa",
});

export function formatDateTimeHN(d: Date): string {
  return FORMATTER.format(d);
}

const DATE_FORMATTER = new Intl.DateTimeFormat("es-HN", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Tegucigalpa",
});

export function formatDateHN(d: Date): string {
  return DATE_FORMATTER.format(d);
}
