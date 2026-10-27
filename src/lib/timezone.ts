export const BUSINESS_TIMEZONE = "Asia/Yerevan";

type DateTimePart = Intl.DateTimeFormatPartTypes;

function part(
  parts: Intl.DateTimeFormatPart[],
  type: DateTimePart,
): string {
  const match = parts.find((item) => item.type === type);
  if (!match) {
    throw new Error(`Missing date part: ${type}`);
  }
  return match.value;
}

function numericOffset(timeZoneName: string): string {
  const raw = timeZoneName.replace(/^GMT|^UTC/, "");
  if (raw === "" || raw === "Z") {
    return "+00:00";
  }

  const match = /^([+-])(\d{1,2})(?::(\d{2}))?$/.exec(raw);
  if (!match) {
    throw new Error(`Unrecognized timezone offset: ${timeZoneName}`);
  }

  const sign = match[1] ?? "+";
  const hours = (match[2] ?? "0").padStart(2, "0");
  const minutes = match[3] ?? "00";
  return `${sign}${hours}:${minutes}`;
}

export function formatBusinessTimestamp(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(instant);

  let hour = part(parts, "hour");
  if (hour === "24") {
    hour = "00";
  }

  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}T${hour}:${part(parts, "minute")}:${part(parts, "second")}.${part(parts, "fractionalSecond")}${numericOffset(part(parts, "timeZoneName"))}`;
}
