"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import {
  eventCategories,
  type EventCategory,
  type PublicEvent,
} from "@/data/events";
import styles from "./events.module.css";

type EventsCalendarProps = {
  events: readonly PublicEvent[];
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const categoryOrder = Object.keys(eventCategories) as EventCategory[];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eventDate(event: PublicEvent) {
  const [year, month, day] = event.date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 2v3M17 2v3M3.5 9h17M5.5 4h13a2 2 0 0 1 2 2v14h-17V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function EventsCalendar({ events }: EventsCalendarProps) {
  const today = new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [activeCategory, setActiveCategory] = useState<
    EventCategory | "all"
  >("all");

  const filteredEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            activeCategory === "all" || event.category === activeCategory,
        )
        .toSorted((a, b) => a.date.localeCompare(b.date)),
    [activeCategory, events],
  );

  const monthEvents = filteredEvents.filter((event) => {
    const date = eventDate(event);
    return (
      date.getFullYear() === visibleMonth.getFullYear() &&
      date.getMonth() === visibleMonth.getMonth()
    );
  });

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const upcomingEvents = filteredEvents.filter(
    (event) => eventDate(event).getTime() >= todayStart,
  );

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const firstDay = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  ).getDay();
  const daysInMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  ).getDate();
  const daysInPreviousMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    0,
  ).getDate();

  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const relativeDay = index - firstDay + 1;

    if (relativeDay < 1) {
      return {
        day: daysInPreviousMonth + relativeDay,
        monthOffset: -1,
      };
    }

    if (relativeDay > daysInMonth) {
      return { day: relativeDay - daysInMonth, monthOffset: 1 };
    }

    return { day: relativeDay, monthOffset: 0 };
  });

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  return (
    <div className={styles.schedule}>
      <div className={styles.filters} aria-label="Filter events by type">
        <button
          aria-pressed={activeCategory === "all"}
          className={activeCategory === "all" ? styles.filterActive : ""}
          onClick={() => setActiveCategory("all")}
          type="button"
        >
          <CalendarIcon />
          All events
        </button>
        {categoryOrder.map((category) => (
          <button
            aria-pressed={activeCategory === category}
            className={activeCategory === category ? styles.filterActive : ""}
            key={category}
            onClick={() => setActiveCategory(category)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={styles.categoryDot}
              style={{ backgroundColor: eventCategories[category].color }}
            />
            {eventCategories[category].label}
          </button>
        ))}
      </div>

      <div className={styles.scheduleGrid}>
        <section
          aria-label={`${monthLabel} calendar`}
          className={styles.calendarPanel}
        >
          <div className={styles.calendarHeading}>
            <button
              aria-label="View previous month"
              onClick={() => changeMonth(-1)}
              type="button"
            >
              <span aria-hidden="true">&larr;</span>
            </button>
            <h2 aria-live="polite">{monthLabel}</h2>
            <button
              aria-label="View next month"
              onClick={() => changeMonth(1)}
              type="button"
            >
              <span aria-hidden="true">&rarr;</span>
            </button>
          </div>

          <div className={styles.calendarWeek} aria-hidden="true">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
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
                (event) => event.date === key,
              );
              const isToday =
                cellDate.getFullYear() === today.getFullYear() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getDate() === today.getDate();

              return (
                <div
                  className={`${styles.calendarDay} ${
                    monthOffset !== 0 ? styles.calendarDayMuted : ""
                  } ${isToday ? styles.calendarDayToday : ""}`}
                  key={`${key}-${index}`}
                >
                  <span>{day}</span>
                  {dayEvents.length > 0 && (
                    <div className={styles.dayDots}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <i
                          aria-label={eventCategories[event.category].label}
                          key={event.id}
                          style={{
                            backgroundColor:
                              eventCategories[event.category].color,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.calendarLegend}>
            {categoryOrder.map((category) => (
              <span key={category}>
                <i
                  aria-hidden="true"
                  style={{ backgroundColor: eventCategories[category].color }}
                />
                {eventCategories[category].label}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.eventList} aria-labelledby="upcoming-events">
          <div className={styles.eventListHeading}>
            <div>
              <p>Next up</p>
              <h2 id="upcoming-events">Upcoming events</h2>
            </div>
            <span>{monthEvents.length} this month</span>
          </div>

          {upcomingEvents.length > 0 ? (
            <div className={styles.eventCards}>
              {upcomingEvents.slice(0, 5).map((event) => {
                const date = eventDate(event);

                return (
                  <article className={styles.eventCard} key={event.id}>
                    <div className={styles.eventDate}>
                      <span>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <strong>{date.getDate()}</strong>
                      <small>
                        {date.toLocaleDateString("en-US", { month: "short" })}
                      </small>
                    </div>
                    <div className={styles.eventCardBody}>
                      <p>
                        <i
                          aria-hidden="true"
                          style={{
                            backgroundColor:
                              eventCategories[event.category].color,
                          }}
                        />
                        {eventCategories[event.category].label}
                      </p>
                      <h3>{event.title}</h3>
                      {event.location && <span>{event.location}</span>}
                      {event.startTime && (
                        <span>
                          {event.startTime}
                          {event.endTime ? ` - ${event.endTime}` : ""}
                        </span>
                      )}
                    </div>
                    {event.href && (
                      <a href={event.href}>
                        Details <span aria-hidden="true">&nearr;</span>
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyStateIcon}>
                <CalendarIcon />
              </span>
              <p>Dates are being lined up</p>
              <h3>The next reason to get together is coming.</h3>
              <p>
                Public training, chapter gatherings, fundraisers, and community
                events will appear here as soon as Brew City posts them.
              </p>
              <div className={styles.emptyStateActions}>
                <a
                  href={siteConfig.links.instagram}
                  rel="noreferrer"
                  target="_blank"
                >
                  Follow for updates <span aria-hidden="true">&nearr;</span>
                </a>
                <Link href={siteConfig.links.contact}>
                  Ask about an event
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
