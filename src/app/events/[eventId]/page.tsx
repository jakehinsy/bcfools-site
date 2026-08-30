import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteConfig } from "@/config/site";
import { publicEventTimeLabel, websiteEventsFromPlatoon } from "@/data/events";
import { loadPublicOrganizationEvents } from "@/lib/platoonPublicEvents";
import { ArrowIcon } from "../../ArrowIcon";
import { LegalLinks } from "../../LegalLinks";
import { PoweredByPlatoon } from "../../PoweredByPlatoon";
import { SiteHeader } from "../../SiteHeader";
import styles from "./event-detail.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event details",
  description: "Public event details from Brew City F.O.O.L.S.",
};

function eventDateLabel(startsAt: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone,
    weekday: "long",
    year: "numeric",
  }).format(new Date(startsAt));
}

export default async function PublicEventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(eventId)) notFound();

  const feed = await loadPublicOrganizationEvents(
    siteConfig.publicEvents.organizationSlug,
    siteConfig.publicEvents.defaultTimeZone,
    new Date(),
  );
  const event = websiteEventsFromPlatoon(feed.events, siteConfig.publicEvents)
    .find((candidate) => candidate.id === eventId.toLowerCase());
  if (!event) notFound();

  const originalLabel = event.flyer?.originalMimeType === "application/pdf" ? "Open original PDF" : "Open original flyer";

  return (
    <>
      <a className="skip-link" href="#event-detail">Skip to event details</a>
      <SiteHeader />
      <main className={styles.main} id="event-detail">
        <div className={`shell ${styles.layout}`}>
          <Link className={styles.backLink} href="/events"><ArrowIcon direction="left" /> All events</Link>
          <section className={styles.detail}>
            <div className={styles.copy}>
              <p className={styles.category}>
                <i aria-hidden="true" style={{ backgroundColor: event.category.color }} />
                {event.category.label}
              </p>
              <h1>{event.title}</h1>
              <div className={styles.schedule}>
                <div>
                  <span>Date</span>
                  <strong>{eventDateLabel(event.startsAt, event.timeZone)}</strong>
                </div>
                <div>
                  <span>Time</span>
                  <strong>{publicEventTimeLabel(event)}</strong>
                </div>
                {event.location ? (
                  <div>
                    <span>Location</span>
                    <strong>{event.location}</strong>
                  </div>
                ) : null}
              </div>
              {event.summary ? <p className={styles.summary}>{event.summary}</p> : null}
              <div className={styles.actions}>
                {event.externalUrl ? (
                  <a href={event.externalUrl} rel="noreferrer" target="_blank">Open event link <ArrowIcon /></a>
                ) : null}
                {event.flyer ? (
                  <a className={styles.secondaryAction} href={event.flyer.originalUrl} rel="noreferrer" target="_blank">{originalLabel}</a>
                ) : null}
              </div>
            </div>
            {event.flyer ? (
              <a
                aria-label={`${originalLabel} in a new tab`}
                className={styles.flyer}
                href={event.flyer.originalUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Image
                  alt={`Flyer for ${event.title}`}
                  height={1280}
                  loading="eager"
                  sizes="(max-width: 820px) 100vw, 40vw"
                  src={event.flyer.detailUrl}
                  unoptimized
                  width={960}
                />
                <span>{event.flyer.originalMimeType === "application/pdf" ? `${event.flyer.pageCount} page PDF` : "View full flyer"}</span>
              </a>
            ) : null}
          </section>
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={`shell ${styles.footerInner}`}>
          <div><strong>{siteConfig.name}</strong><LegalLinks /></div>
          <PoweredByPlatoon />
        </div>
      </footer>
    </>
  );
}
