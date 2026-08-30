import "server-only";

import {
  parsePublicOrganizationEventsPayload,
  publicEventRange,
  publicEventsRequestInit,
  publicEventsRequestUrl,
  withPublicEventFlyerProxyUrls,
  type PlatoonPublicOrganizationEvent,
  type PublicEventRange,
} from "./publicOrganizationEvents";

export type PublicEventsFeed = PublicEventRange & {
  status: "ready" | "unavailable";
  events: PlatoonPublicOrganizationEvent[];
};

export async function loadPublicOrganizationEvents(
  organizationSlug: string,
  timeZone: string,
  now = new Date(),
): Promise<PublicEventsFeed> {
  const range = publicEventRange(now, timeZone);
  const endpoint = process.env.PLATOON_PUBLIC_EVENTS_URL?.trim() ?? "";
  const url = publicEventsRequestUrl(endpoint, organizationSlug, range);
  if (!url) return { ...range, status: "unavailable", events: [] };

  const bypassSecret = process.env.PLATOON_PUBLIC_EVENTS_BYPASS_SECRET?.trim();
  try {
    const response = await fetch(url, publicEventsRequestInit(bypassSecret));
    if (!response.ok) return { ...range, status: "unavailable", events: [] };

    const payload = parsePublicOrganizationEventsPayload(
      await response.json(),
      organizationSlug,
    );
    if (!payload) return { ...range, status: "unavailable", events: [] };

    return {
      rangeStart: payload.rangeStart,
      rangeEnd: payload.rangeEnd,
      status: "ready",
      events: payload.events.map(withPublicEventFlyerProxyUrls),
    };
  } catch {
    return { ...range, status: "unavailable", events: [] };
  }
}
