export type PlatoonPublicOrganizationEvent = {
  eventKey: string;
  title: string;
  summary: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  timeZone: string | null;
  locationName: string | null;
  locationCity: string | null;
  locationState: string | null;
  categoryKey: string;
  categoryName: string;
  categoryColor: string | null;
};

export type PublicEventRange = {
  rangeStart: string;
  rangeEnd: string;
};

export type PublicOrganizationEventsPayload = PublicEventRange & {
  organizationSlug: string;
  events: PlatoonPublicOrganizationEvent[];
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function requiredString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function uuid(value: unknown): string | null {
  const candidate = requiredString(value, 36);
  return candidate &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate.toLowerCase()
    : null;
}

function optionalString(value: unknown, maxLength: number): string | null {
  return value === null ? null : requiredString(value, maxLength);
}

function isoTimestamp(value: unknown): string | null {
  const candidate = requiredString(value, 40);
  if (!candidate || !/^\d{4}-\d{2}-\d{2}T/.test(candidate)) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function timeZone(value: unknown): string | null {
  const candidate = optionalString(value, 100);
  if (candidate === null) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(0);
    return candidate;
  } catch {
    return null;
  }
}

function parseEvent(value: unknown): PlatoonPublicOrganizationEvent | null {
  const event = record(value);
  if (!event) return null;

  const eventKey = uuid(event.eventKey);
  const title = requiredString(event.title, 200);
  const summary = optionalString(event.summary, 500);
  const startsAt = isoTimestamp(event.startsAt);
  const endsAt = event.endsAt === null ? null : isoTimestamp(event.endsAt);
  const eventTimeZone = timeZone(event.timeZone);
  const locationName = optionalString(event.locationName, 200);
  const locationCity = optionalString(event.locationCity, 120);
  const locationState = optionalString(event.locationState, 2)?.toUpperCase() ?? null;
  const categoryKey = uuid(event.categoryKey);
  const categoryName = requiredString(event.categoryName, 120);
  const categoryColor = optionalString(event.categoryColor, 7)?.toLowerCase() ?? null;

  if (
    !eventKey ||
    !title ||
    (event.summary !== null && !summary) ||
    !startsAt ||
    (event.endsAt !== null && !endsAt) ||
    (endsAt && new Date(endsAt) < new Date(startsAt)) ||
    typeof event.allDay !== "boolean" ||
    (event.timeZone !== null && !eventTimeZone) ||
    (event.locationName !== null && !locationName) ||
    (event.locationCity !== null && !locationCity) ||
    (event.locationState !== null &&
      (!locationState || !/^[A-Z]{2}$/.test(locationState))) ||
    !categoryKey ||
    !categoryName ||
    (event.categoryColor !== null &&
      (!categoryColor || !/^#[0-9a-f]{6}$/.test(categoryColor)))
  ) return null;

  return {
    eventKey,
    title,
    summary,
    startsAt,
    endsAt,
    allDay: event.allDay,
    timeZone: eventTimeZone,
    locationName,
    locationCity,
    locationState,
    categoryKey,
    categoryName,
    categoryColor,
  };
}

export function parsePublicOrganizationEventsPayload(
  value: unknown,
  expectedOrganizationSlug: string,
): PublicOrganizationEventsPayload | null {
  const payload = record(value);
  if (!payload || !Array.isArray(payload.events) || payload.events.length > 500) return null;

  const organizationSlug = requiredString(payload.organizationSlug, 120);
  const rangeStart = isoTimestamp(payload.rangeStart);
  const rangeEnd = isoTimestamp(payload.rangeEnd);
  if (
    organizationSlug !== expectedOrganizationSlug ||
    !rangeStart ||
    !rangeEnd ||
    new Date(rangeEnd) <= new Date(rangeStart) ||
    new Date(rangeEnd).getTime() - new Date(rangeStart).getTime() >
      366 * 24 * 60 * 60 * 1000
  ) return null;

  const rangeStartTime = new Date(rangeStart).getTime();
  const rangeEndTime = new Date(rangeEnd).getTime();
  const events = payload.events.map(parseEvent);
  if (events.some((event) =>
    !event ||
    new Date(event.startsAt).getTime() >= rangeEndTime ||
    new Date(event.endsAt ?? event.startsAt).getTime() < rangeStartTime
  )) return null;

  return {
    organizationSlug,
    rangeStart,
    rangeEnd,
    events: events as PlatoonPublicOrganizationEvent[],
  };
}

export function publicEventRange(
  now = new Date(),
  timeZone = "UTC",
): PublicEventRange {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    timeZone,
    year: "numeric",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(values.year);
  const month = Number(values.month) - 1;
  const rangeStart = new Date(Date.UTC(year, month, 1));
  const rangeEnd = new Date(Date.UTC(year + 1, month, 1));
  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
  };
}

export function publicEventsRequestUrl(
  endpoint: string,
  organizationSlug: string,
  range: PublicEventRange,
): URL | null {
  try {
    const url = new URL(endpoint);
    const localHttp = url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if (url.protocol !== "https:" && !localHttp) return null;
    url.searchParams.set("organization", organizationSlug);
    url.searchParams.set("from", range.rangeStart);
    url.searchParams.set("to", range.rangeEnd);
    return url;
  } catch {
    return null;
  }
}
