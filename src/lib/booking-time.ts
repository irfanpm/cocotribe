/** Booking date and phone checks without zod, so customer pages stay light. */
export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validBookingTime(
  date: string,
  startMinute: number,
  leadHours: number,
  maxDays: number,
  now = new Date(),
) {
  const at = new Date(`${date}T00:00:00+05:30`);
  if (!Number.isFinite(at.getTime()) || indiaDate(at) !== date) return false;
  at.setTime(at.getTime() + startMinute * 60000);
  return (
    at.getTime() >= now.getTime() + leadHours * 3600000 &&
    date <= indiaDate(new Date(now.getTime() + maxDays * 86400000))
  );
}
export const phonePattern = /^(?:91)?[6-9]\d{9}$/;
export function validPhone(value: string) {
  return phonePattern.test(value.trim().replace(/[\s()+-]/g, ""));
}
