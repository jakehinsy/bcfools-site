import type { PlatoonPublicOrganizationEvent } from "@/lib/publicOrganizationEvents";

export type PublicEventCategory = {
  key: string;
  label: string;
  color: string;
};

export type PublicEvent = {
  id: string;
  title: string;
  summary: string | null;
  externalUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  timeZone: string;
  location: string | null;
  category: PublicEventCategory;
  flyer: PlatoonPublicOrganizationEvent["flyer"];
};

export type EventCategoryOverrides = Record<
  string,
  { label?: string; color?: string }
>;

function timestampDateKey(timestamp: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function publicEventStartDateKey(event: PublicEvent) {
  return event.allDay
    ? event.startsAt.slice(0, 10)
    : timestampDateKey(event.startsAt, event.timeZone);
}

export function publicEventEndDateKey(event: PublicEvent) {
  if (!event.endsAt) return publicEventStartDateKey(event);
  return event.allDay
    ? event.endsAt.slice(0, 10)
    : timestampDateKey(event.endsAt, event.timeZone);
}

export function publicEventTimeLabel(event: PublicEvent) {
  const startsOn = publicEventStartDateKey(event);
  const endsOn = publicEventEndDateKey(event);
  const endDate = startsOn !== endsOn
    ? new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${endsOn}T12:00:00.000Z`))
    : null;
  if (event.allDay) return endDate ? `All day through ${endDate}` : "All day";

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: event.timeZone,
  });
  const start = timeFormatter.format(new Date(event.startsAt));
  if (!event.endsAt) return start;
  const end = timeFormatter.format(new Date(event.endsAt));
  return endDate ? `${start} - ${endDate}, ${end}` : `${start} - ${end}`;
}

export function publicEventIsUpcoming(
  event: PublicEvent,
  now: string,
  calendarTimeZone: string,
) {
  if (event.allDay) {
    return publicEventEndDateKey(event) >= timestampDateKey(now, calendarTimeZone);
  }
  return new Date(event.endsAt ?? event.startsAt).getTime() >= new Date(now).getTime();
}

type WebsiteEventOptions = {
  categoryOverrides: EventCategoryOverrides;
  defaultCategoryColor: string;
  defaultTimeZone: string;
};

function validColor(value: string | null | undefined): string | null {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : null;
}

export function websiteEventsFromPlatoon(
  events: readonly PlatoonPublicOrganizationEvent[],
  options: WebsiteEventOptions,
): PublicEvent[] {
  return events.map((event) => {
    const override = options.categoryOverrides[event.categoryKey];
    const location = [event.locationName, event.locationCity, event.locationState]
      .filter(Boolean)
      .join(", ");

    return {
      id: event.eventKey,
      title: event.title,
      summary: event.summary,
      externalUrl: event.externalUrl,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      allDay: event.allDay,
      timeZone: event.timeZone ?? (event.allDay ? options.defaultTimeZone : "UTC"),
      location: location || null,
      category: {
        key: event.categoryKey,
        label: override?.label?.trim() || event.categoryName,
        color: validColor(override?.color) ??
          validColor(event.categoryColor) ??
          options.defaultCategoryColor,
      },
      flyer: event.flyer,
    };
  });
}
