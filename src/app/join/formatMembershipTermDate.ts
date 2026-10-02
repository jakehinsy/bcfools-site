/** Format the server's calendar date without shifting it across time zones. */
export function formatMembershipTermDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(date);
}
