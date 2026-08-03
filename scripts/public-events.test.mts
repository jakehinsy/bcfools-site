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
  publicEventRange,
  publicEventsRequestUrl,
} from "../src/lib/publicOrganizationEvents.ts";

const range = {
  rangeStart: "2026-08-01T00:00:00.000Z",
  rangeEnd: "2027-08-01T00:00:00.000Z",
};

const publicEvent = {
  eventKey: "00000000-0000-0000-0000-000000000001",
  title: "Hands-on training",
  summary: "Public event summary",
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
  }]);
});

test("formats all-day, legacy, timezone-aware, and multi-day events canonically", () => {
  const baseEvent: PublicEvent = {
    id: publicEvent.eventKey,
    title: publicEvent.title,
    summary: null,
    startsAt: "2026-08-10T00:00:00.000Z",
    endsAt: "2026-08-10T23:59:59.999Z",
    allDay: true,
    timeZone: "America/Chicago",
    location: null,
    category: { key: publicEvent.categoryKey, label: "Training", color: "#2563eb" },
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
