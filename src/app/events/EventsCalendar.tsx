"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import {
  publicEventEndDateKey,
  publicEventIsUpcoming,
  publicEventStartDateKey,
  publicEventTimeLabel,
  type PublicEvent,
  type PublicEventCategory,
} from "@/data/events";
import { ArrowIcon } from "../ArrowIcon";
import styles from "./events.module.css";

type EventsCalendarProps = {
  calendarTimeZone: string;
  events: readonly PublicEvent[];
  feedStatus: "ready" | "unavailable";
  now: string;
  rangeStart: string;
  rangeEnd: string;
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function datePartsInTimeZone(timestamp: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    day: Number(value.day),
    month: Number(value.month) - 1,
    year: Number(value.year),
  };
}

function eventOccursOnDate(event: PublicEvent, key: string) {
  return key >= publicEventStartDateKey(event) &&
    key <= publicEventEndDateKey(event);
}

function eventDate(event: PublicEvent) {
  const [year, month, day] = publicEventStartDateKey(event).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthIndex(date: Date) {
  return date.getFullYear() * 12 + date.getMonth();
}

function utcMonthIndex(isoTimestamp: string, endExclusive = false) {
  const date = new Date(
    new Date(isoTimestamp).getTime() - (endExclusive ? 1 : 0),
  );
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 2v3M17 2v3M3.5 9h17M5.5 4h13a2 2 0 0 1 2 2v14h-17V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function EventCardContent({ event }: { event: PublicEvent }) {
  const date = eventDate(event);
  return (
    <>
      <div className={styles.eventCardTop}>
        <div className={styles.eventDate}>
          <span>{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
          <strong>{date.getDate()}</strong>
          <small>{date.toLocaleDateString("en-US", { month: "short" })}</small>
        </div>
        <div className={styles.eventCardBody}>
          <p className={styles.eventCategory}>
            <i
              aria-hidden="true"
              style={{ backgroundColor: event.category.color }}
            />
            {event.category.label}
          </p>
          <h3>{event.title}</h3>
          {event.summary && !event.flyer && (
            <p className={styles.eventSummary}>{event.summary}</p>
          )}
          {event.location && <span>{event.location}</span>}
          <span>{publicEventTimeLabel(event)}</span>
        </div>
      </div>
      {event.flyer && (
        <div className={styles.eventFlyerPreview}>
          <Image
            alt={`Flyer for ${event.title}`}
            height={1280}
            sizes="(max-width: 980px) 100vw, 42vw"
            src={event.flyer.detailUrl}
            unoptimized
            width={960}
          />
          <span>Event flyer</span>
        </div>
      )}
      <span className={styles.eventAction}><ArrowIcon /></span>
    </>
  );
}

export function EventsCalendar({
  calendarTimeZone,
  events,
  feedStatus,
  now,
  rangeEnd,
  rangeStart,
}: EventsCalendarProps) {
  const currentDate = datePartsInTimeZone(now, calendarTimeZone);
  const today = new Date(currentDate.year, currentDate.month, currentDate.day);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = new Map<string, PublicEventCategory>();
    events.forEach((event) => unique.set(event.category.key, event.category));
    return [...unique.values()].toSorted((a, b) => a.label.localeCompare(b.label));
  }, [events]);

  const filteredEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            activeCategory === "all" || event.category.key === activeCategory,
        )
        .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [activeCategory, events],
  );

  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const visibleMonthStart = dateKey(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const visibleMonthEnd = dateKey(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    daysInMonth,
  );
  const monthEvents = filteredEvents.filter((event) =>
    publicEventStartDateKey(event) <= visibleMonthEnd &&
    publicEventEndDateKey(event) >= visibleMonthStart
  );
  const upcomingEvents = filteredEvents.filter((event) =>
    publicEventIsUpcoming(event, now, calendarTimeZone)
  );
  const selectedDateEvents = selectedDate
    ? filteredEvents.filter((event) => eventOccursOnDate(event, selectedDate))
    : [];
  const displayedEvents = selectedDate
    ? selectedDateEvents
    : upcomingEvents.slice(0, 5);
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay();
  const daysInPreviousMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    0,
  ).getDate();
  const canViewPrevious = monthIndex(visibleMonth) > utcMonthIndex(rangeStart);
  const canViewNext = monthIndex(visibleMonth) < utcMonthIndex(rangeEnd, true);

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const relativeDay = index - firstDay + 1;
    if (relativeDay < 1) {
      return { day: daysInPreviousMonth + relativeDay, monthOffset: -1 };
    }
    if (relativeDay > daysInMonth) {
      return { day: relativeDay - daysInMonth, monthOffset: 1 };
    }
    return { day: relativeDay, monthOffset: 0 };
  });

  function changeMonth(offset: number) {
    setSelectedDate(null);
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <div className={styles.schedule}>
      {categories.length > 0 && (
        <div className={styles.filters} aria-label="Filter events by type">
          <button
            aria-pressed={activeCategory === "all"}
            className={activeCategory === "all" ? styles.filterActive : ""}
            onClick={() => {
              setActiveCategory("all");
              setSelectedDate(null);
            }}
            type="button"
          >
            <CalendarIcon />
            All events
          </button>
          {categories.map((category) => (
            <button
              aria-pressed={activeCategory === category.key}
              className={activeCategory === category.key ? styles.filterActive : ""}
              key={category.key}
              onClick={() => {
                setActiveCategory(category.key);
                setSelectedDate(null);
              }}
              type="button"
            >
              <span
                aria-hidden="true"
                className={styles.categoryDot}
                style={{ backgroundColor: category.color }}
              />
              {category.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.scheduleGrid}>
        <section
          aria-label={`${monthLabel} calendar`}
          className={styles.calendarPanel}
        >
          <div className={styles.calendarHeading}>
            <button
              aria-label="View previous month"
              disabled={!canViewPrevious}
              onClick={() => changeMonth(-1)}
              type="button"
            >
              <ArrowIcon direction="left" />
            </button>
            <h2 aria-live="polite">{monthLabel}</h2>
            <button
              aria-label="View next month"
              disabled={!canViewNext}
              onClick={() => changeMonth(1)}
              type="button"
            >
              <ArrowIcon direction="right" />
            </button>
          </div>

          <div className={styles.calendarWeek} aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className={styles.calendarGrid}>
            {calendarDays.map(({ day, monthOffset }, index) => {
              const cellDate = new Date(
                visibleMonth.getFullYear(),
                visibleMonth.getMonth() + monthOffset,
                day,
              );
              const key = dateKey(
                cellDate.getFullYear(),
                cellDate.getMonth(),
                cellDate.getDate(),
              );
              const dayEvents = filteredEvents.filter(
                (event) => eventOccursOnDate(event, key),
              );
              const isToday =
                cellDate.getFullYear() === today.getFullYear() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getDate() === today.getDate();

              const className = `${styles.calendarDay} ${
                monthOffset !== 0 ? styles.calendarDayMuted : ""
              } ${isToday ? styles.calendarDayToday : ""} ${
                selectedDate === key ? styles.calendarDaySelected : ""
              }`;
              const content = (
                <>
                  <span>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className={styles.dayDots}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <i
                          aria-hidden="true"
                          key={event.id}
                          style={{ backgroundColor: event.category.color }}
                        />
                      ))}
                    </div>
                  )}
                </>
              );

              return dayEvents.length > 0 ? (
                <button
                  aria-label={`${cellDate.toLocaleDateString("en-US", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}: ${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}`}
                  aria-pressed={selectedDate === key}
                  className={className}
                  key={`${key}-${index}`}
                  onClick={() => {
                    setSelectedDate(key);
                    if (monthOffset !== 0) {
                      setVisibleMonth(new Date(cellDate.getFullYear(), cellDate.getMonth(), 1));
                    }
                  }}
                  type="button"
                >
                  {content}
                </button>
              ) : (
                <div className={className} key={`${key}-${index}`}>
                  {content}
                </div>
              );
            })}
          </div>

          {categories.length > 0 && (
            <div className={styles.calendarLegend}>
              {categories.map((category) => (
                <span key={category.key}>
                  <i
                    aria-hidden="true"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.label}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className={styles.eventList} aria-labelledby="event-list-heading">
          <div className={styles.eventListHeading}>
            <div>
              <p>{selectedDate ? "Selected date" : "Next up"}</p>
              <h2 id="event-list-heading">
                {selectedDateLabel ?? "Upcoming events"}
              </h2>
            </div>
            {selectedDate ? (
              <button
                className={styles.showUpcoming}
                onClick={() => setSelectedDate(null)}
                type="button"
              >
                Show upcoming
              </button>
            ) : (
              <span>{monthEvents.length} this month</span>
            )}
          </div>

          {displayedEvents.length > 0 ? (
            <div className={styles.eventCards}>
              {displayedEvents.map((event) => {
                return (
                  <Link
                    aria-label={`${event.title}: view event details`}
                    className={`${styles.eventCard} ${styles.eventCardLinked}`}
                    href={`/events/${event.id}`}
                    key={event.id}
                  >
                    <EventCardContent event={event} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon}><CalendarIcon /></span>
              <p>
                {selectedDate
                  ? "No events on this date"
                  : feedStatus === "ready" ? "Dates are being lined up" : "Calendar unavailable"}
              </p>
              <h3>
                {selectedDate
                  ? "Choose another marked date or return to upcoming events."
                  : feedStatus === "ready"
                  ? "The next reason to get together is coming."
                  : "Public events could not be loaded."}
              </h3>
              <p>
                {selectedDate
                  ? "Calendar dates with public events are marked with colored dots."
                  : feedStatus === "ready"
                  ? "Public training, chapter gatherings, fundraisers, and community events will appear here as soon as Brew City posts them."
                  : "Please try this page again shortly or follow Brew City for current event updates."}
              </p>
              <div className={styles.emptyStateActions}>
                {selectedDate ? (
                  <button type="button" onClick={() => setSelectedDate(null)}>Show upcoming</button>
                ) : feedStatus === "unavailable" ? (
                  <Link href="/events">Try again <ArrowIcon /></Link>
                ) : (
                  <a href={siteConfig.links.instagram} rel="noreferrer" target="_blank">
                    Follow for updates <ArrowIcon />
                  </a>
                )}
                <Link href={siteConfig.links.contact}>Ask about an event</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
