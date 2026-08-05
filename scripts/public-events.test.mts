import assert from "node:assert/strict";
import test from "node:test";
import {
  publicEventEndDateKey,
  publicEventIsUpcoming,
  publicEventStartDateKey,
  publicEventTimeLabel,
  websiteEventsFromPlatoon,
  type PublicEvent,
} from "../src/data/events.ts";
import {
  parsePublicOrganizationEventsPayload,
  publicEventFlyerProxyPath,
  publicEventFlyerRequestInit,
  publicEventFlyerRequestUrl,
  publicEventRange,
  publicEventsRequestInit,
  publicEventsRequestUrl,
  withPublicEventFlyerProxyUrls,
} from "../src/lib/publicOrganizationEvents.ts";

const range = {
  rangeStart: "2026-08-01T00:00:00.000Z",
  rangeEnd: "2027-08-01T00:00:00.000Z",
};

test("relies on the bounded upstream cache instead of a stale website cache", () => {
  const request = publicEventsRequestInit("preview-secret");
  const headers = new Headers(request.headers);

  assert.equal(request.cache, "no-store");
  assert.equal(headers.get("accept"), "application/json");
  assert.equal(headers.get("x-vercel-protection-bypass"), "preview-secret");
  assert.ok(request.signal instanceof AbortSignal);
});

const publicEvent = {
  eventKey: "00000000-0000-0000-0000-000000000001",
  title: "Hands-on training",
  summary: "Public event summary",
  externalUrl: "https://example.org/register?class=rit",
  startsAt: "2026-08-10T14:00:00.000Z",
  endsAt: "2026-08-10T16:00:00.000Z",
  allDay: false,
  timeZone: "America/Chicago",
  locationName: "Training Center",
  locationCity: "Milwaukee",
  locationState: "wi",
  categoryKey: "00000000-0000-0000-0000-000000000002",
  categoryName: "Training",
  categoryColor: "#2563EB",
  flyer: {
    key: "00000000-0000-4000-8000-000000000003",
    originalMimeType: "application/pdf",
    pageCount: 2,
    thumbnailUrl: "https://admin.example.test/api/public/organization-event-flyers/00000000-0000-4000-8000-000000000003/thumbnail",
    detailUrl: "https://admin.example.test/api/public/organization-event-flyers/00000000-0000-4000-8000-000000000003/detail",
    fullUrl: "https://admin.example.test/api/public/organization-event-flyers/00000000-0000-4000-8000-000000000003/full",
    originalUrl: "https://admin.example.test/api/public/organization-event-flyers/00000000-0000-4000-8000-000000000003/original",
  },
  body: "must not reach the website",
  contactPhone: "must not reach the website",
};

test("parses only the bounded public organization-event contract", () => {
  assert.deepEqual(
    parsePublicOrganizationEventsPayload({
      organizationSlug: "brew-city-fools",
      ...range,
      events: [publicEvent],
    }, "brew-city-fools"),
    {
      organizationSlug: "brew-city-fools",
      ...range,
      events: [{
        eventKey: publicEvent.eventKey,
        title: publicEvent.title,
        summary: publicEvent.summary,
        externalUrl: publicEvent.externalUrl,
        startsAt: publicEvent.startsAt,
        endsAt: publicEvent.endsAt,
        allDay: false,
        timeZone: "America/Chicago",
        locationName: "Training Center",
        locationCity: "Milwaukee",
        locationState: "WI",
        categoryKey: publicEvent.categoryKey,
        categoryName: "Training",
        categoryColor: "#2563eb",
        flyer: publicEvent.flyer,
      }],
    },
  );
});

test("fails closed on the wrong tenant or malformed event fields", () => {
  const payload = {
    organizationSlug: "brew-city-fools",
    ...range,
    events: [publicEvent],
  };
  assert.equal(parsePublicOrganizationEventsPayload(payload, "another-org"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, categoryColor: "red" }],
  }, "brew-city-fools"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, timeZone: "Not/A_Time_Zone" }],
  }, "brew-city-fools"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, endsAt: "2026-08-10T13:00:00.000Z" }],
  }, "brew-city-fools"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, startsAt: range.rangeEnd, endsAt: null }],
  }, "brew-city-fools"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, eventKey: "not-a-uuid" }],
  }, "brew-city-fools"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, flyer: { ...publicEvent.flyer, detailUrl: "http://admin.example.test/flyer" } }],
  }, "brew-city-fools"), null);
  assert.equal(parsePublicOrganizationEventsPayload({
    ...payload,
    events: [{ ...publicEvent, flyer: { ...publicEvent.flyer, pageCount: 101 } }],
  }, "brew-city-fools"), null);
  for (const externalUrl of [
    undefined,
    "http://example.org/register",
    "javascript:alert(1)",
    "/register",
    "https://member:secret@example.org/register",
    `https://example.org/${"é".repeat(400)}`,
    `https://example.org/${"x".repeat(2049)}`,
  ]) {
    assert.equal(parsePublicOrganizationEventsPayload({
      ...payload,
      events: [{ ...publicEvent, externalUrl }],
    }, "brew-city-fools"), null);
  }
});

test("accepts a nullable, credential-free HTTPS external event URL", () => {
  const payload = {
    organizationSlug: "brew-city-fools",
    ...range,
    events: [{ ...publicEvent, externalUrl: null }],
  };
  assert.equal(
    parsePublicOrganizationEventsPayload(payload, "brew-city-fools")
      ?.events[0]?.externalUrl,
    null,
  );
  assert.equal(
    parsePublicOrganizationEventsPayload({
      ...payload,
      events: [{ ...publicEvent, externalUrl: "  https://example.org/register  " }],
    }, "brew-city-fools")?.events[0]?.externalUrl,
    "https://example.org/register",
  );
});

test("accepts an event that begins before the range and continues into it", () => {
  const overlappingEvent = {
    ...publicEvent,
    startsAt: "2026-07-31T22:00:00.000Z",
    endsAt: "2026-08-01T02:00:00.000Z",
  };
  const parsed = parsePublicOrganizationEventsPayload({
    organizationSlug: "brew-city-fools",
    ...range,
    events: [overlappingEvent],
  }, "brew-city-fools");
  assert.equal(parsed?.events[0]?.eventKey, publicEvent.eventKey);

  assert.equal(parsePublicOrganizationEventsPayload({
    organizationSlug: "brew-city-fools",
    ...range,
    events: [{ ...overlappingEvent, endsAt: "2026-07-31T23:59:59.000Z" }],
  }, "brew-city-fools"), null);
});

test("builds the canonical bounded request without accepting insecure remote URLs", () => {
  assert.deepEqual(
    publicEventRange(new Date("2026-08-01T02:00:00.000Z"), "America/Chicago"),
    {
      rangeStart: "2026-07-01T00:00:00.000Z",
      rangeEnd: "2027-07-01T00:00:00.000Z",
    },
  );
  assert.deepEqual(
    publicEventRange(new Date("2026-08-18T12:00:00.000Z"), "America/Chicago"),
    range,
  );
  assert.equal(
    publicEventsRequestUrl(
      "https://admin.example.test/api/public/organization-events",
      "brew-city-fools",
      range,
    )?.toString(),
    "https://admin.example.test/api/public/organization-events?organization=brew-city-fools&from=2026-08-01T00%3A00%3A00.000Z&to=2027-08-01T00%3A00%3A00.000Z",
  );
  assert.equal(
    publicEventsRequestUrl("http://admin.example.test/events", "brew-city-fools", range),
    null,
  );
});

test("routes public flyer renditions through the website proxy", () => {
  const flyerKey = publicEvent.flyer.key;
  assert.equal(
    publicEventFlyerProxyPath(flyerKey, "detail"),
    `/api/platoon/event-flyers/${flyerKey}/detail`,
  );
  assert.equal(publicEventFlyerProxyPath("not-a-uuid", "detail"), null);
  assert.equal(
    publicEventFlyerRequestUrl(
      "https://admin.example.test/api/public/organization-events",
      flyerKey,
      "original",
    )?.toString(),
    `https://admin.example.test/api/public/organization-event-flyers/${flyerKey}/original`,
  );
  assert.equal(
    publicEventFlyerRequestUrl("http://admin.example.test/events", flyerKey, "detail"),
    null,
  );

  const imageRequest = publicEventFlyerRequestInit("detail", "preview-secret");
  const imageHeaders = new Headers(imageRequest.headers);
  assert.equal(imageRequest.cache, "no-store");
  assert.equal(imageHeaders.get("accept"), "image/webp");
  assert.equal(imageHeaders.get("x-vercel-protection-bypass"), "preview-secret");
  assert.ok(imageRequest.signal instanceof AbortSignal);

  const originalHeaders = new Headers(
    publicEventFlyerRequestInit("original").headers,
  );
  assert.equal(
    originalHeaders.get("accept"),
    "application/pdf,image/jpeg,image/png",
  );
  assert.equal(originalHeaders.has("x-vercel-protection-bypass"), false);
});

test("rewrites every flyer rendition without changing non-flyer events", () => {
  const parsed = parsePublicOrganizationEventsPayload({
    organizationSlug: "brew-city-fools",
    ...range,
    events: [publicEvent],
  }, "brew-city-fools");
  assert.ok(parsed);

  assert.deepEqual(withPublicEventFlyerProxyUrls(parsed.events[0]).flyer, {
    ...publicEvent.flyer,
    thumbnailUrl: `/api/platoon/event-flyers/${publicEvent.flyer.key}/thumbnail`,
    detailUrl: `/api/platoon/event-flyers/${publicEvent.flyer.key}/detail`,
    fullUrl: `/api/platoon/event-flyers/${publicEvent.flyer.key}/full`,
    originalUrl: `/api/platoon/event-flyers/${publicEvent.flyer.key}/original`,
  });

  const withoutFlyer = { ...parsed.events[0], flyer: null };
  assert.equal(withPublicEventFlyerProxyUrls(withoutFlyer), withoutFlyer);
});

test("maps public details and tenant category overrides into the website shape", () => {
  const parsed = parsePublicOrganizationEventsPayload({
    organizationSlug: "brew-city-fools",
    ...range,
    events: [publicEvent],
  }, "brew-city-fools");
  assert.ok(parsed);
  assert.deepEqual(websiteEventsFromPlatoon(parsed.events, {
    categoryOverrides: {
      [publicEvent.categoryKey]: { label: "Fireground", color: "#ff5964" },
    },
    defaultCategoryColor: "#ffffff",
    defaultTimeZone: "America/Chicago",
  }), [{
    id: publicEvent.eventKey,
    title: "Hands-on training",
    summary: "Public event summary",
    externalUrl: publicEvent.externalUrl,
    startsAt: publicEvent.startsAt,
    endsAt: publicEvent.endsAt,
    allDay: false,
    timeZone: "America/Chicago",
    location: "Training Center, Milwaukee, WI",
    category: {
      key: publicEvent.categoryKey,
      label: "Fireground",
      color: "#ff5964",
    },
    flyer: publicEvent.flyer,
  }]);
});

test("formats all-day, legacy, timezone-aware, and multi-day events canonically", () => {
  const baseEvent: PublicEvent = {
    id: publicEvent.eventKey,
    title: publicEvent.title,
    summary: null,
    externalUrl: null,
    startsAt: "2026-08-10T00:00:00.000Z",
    endsAt: "2026-08-10T23:59:59.999Z",
    allDay: true,
    timeZone: "America/Chicago",
    location: null,
    category: { key: publicEvent.categoryKey, label: "Training", color: "#2563eb" },
    flyer: null,
  };
  assert.equal(publicEventStartDateKey(baseEvent), "2026-08-10");
  assert.equal(publicEventEndDateKey(baseEvent), "2026-08-10");
  assert.equal(publicEventTimeLabel(baseEvent), "All day");
  assert.equal(
    publicEventIsUpcoming(
      baseEvent,
      "2026-08-11T01:00:00.000Z",
      "America/Chicago",
    ),
    true,
  );
  assert.equal(
    publicEventIsUpcoming(
      baseEvent,
      "2026-08-11T06:00:00.000Z",
      "America/Chicago",
    ),
    false,
  );

  assert.equal(publicEventTimeLabel({
    ...baseEvent,
    startsAt: "2026-08-10T09:00:00.000Z",
    endsAt: "2026-08-10T11:00:00.000Z",
    allDay: false,
    timeZone: "UTC",
  }), "9:00 AM - 11:00 AM");

  assert.equal(publicEventTimeLabel({
    ...baseEvent,
    startsAt: "2026-08-10T14:00:00.000Z",
    endsAt: "2026-08-10T16:00:00.000Z",
    allDay: false,
  }), "9:00 AM - 11:00 AM");

  assert.equal(publicEventTimeLabel({
    ...baseEvent,
    startsAt: "2026-08-10T14:00:00.000Z",
    endsAt: "2026-08-11T16:00:00.000Z",
    allDay: false,
  }), "9:00 AM - Aug 11, 11:00 AM");
});

test("uses UTC for timed null-zone events and the tenant zone for all-day events", () => {
  const nullZoneEvent = { ...publicEvent, timeZone: null };
  const parsed = parsePublicOrganizationEventsPayload({
    organizationSlug: "brew-city-fools",
    ...range,
    events: [nullZoneEvent],
  }, "brew-city-fools");
  assert.ok(parsed);

  const options = {
    categoryOverrides: {},
    defaultCategoryColor: "#ffffff",
    defaultTimeZone: "America/Chicago",
  };
  assert.equal(websiteEventsFromPlatoon(parsed.events, options)[0]?.timeZone, "UTC");
  assert.equal(websiteEventsFromPlatoon([{
    ...parsed.events[0],
    allDay: true,
  }], options)[0]?.timeZone, "America/Chicago");
});
