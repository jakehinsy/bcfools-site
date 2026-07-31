import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { publicEvents } from "@/data/events";
import { PoweredByPlatoon } from "../PoweredByPlatoon";
import { EventsCalendar } from "./EventsCalendar";
import styles from "./events.module.css";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Public training, chapter gatherings, fundraisers, and community events from Brew City F.O.O.L.S.",
};

const eventTypes = [
  {
    number: "01",
    title: "Hands-on training",
    copy:
      "Fireground-focused classes where experience gets shared and everyone leaves sharper.",
  },
  {
    number: "02",
    title: "Chapter gatherings",
    copy:
      "Kitchen-table nights, chapter meetings, and chances to catch up with the crew.",
  },
  {
    number: "03",
    title: "Community support",
    copy:
      "Fundraisers, benefit events, and good work that helps firefighters and neighbors.",
  },
];

export default function EventsPage() {
  return (
    <>
      <a className="skip-link" href="#events-content">
        Skip to event calendar
      </a>

      <div className={styles.utilityBar}>
        <div className="shell">
          {siteConfig.region} <span aria-hidden="true">&bull;</span> Established{" "}
          {siteConfig.established}
        </div>
      </div>

      <header className={styles.header}>
        <div className={`shell ${styles.headerInner}`}>
          <Link
            aria-label="Brew City FOOLS home"
            className={styles.brand}
            href="/"
          >
            <Image
              alt=""
              height={58}
              priority
              src="/images/brew-city-fools-logo.png"
              width={60}
            />
            <span>
              <strong>{siteConfig.shortName}</strong>
              <small>{siteConfig.motto}</small>
            </span>
          </Link>
          <nav className={styles.pageNav} aria-label="Events page navigation">
            <Link href="/#training">Training</Link>
            <Link href="/join">Join</Link>
            <Link href="/#contact">Contact</Link>
          </nav>
          <Link className={styles.backLink} href="/">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
        </div>
      </header>

      <main id="events-content">
        <section className={styles.hero}>
          <Image
            alt="Firefighters gathered together during hands-on training"
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src="/images/rit-team.jpg"
          />
          <div className={styles.heroOverlay} />
          <div className={`shell ${styles.heroContent}`}>
            <p>Train. Gather. Give back.</p>
            <h1>Upcoming events</h1>
            <div className={styles.heroIntro}>
              <p>
                This is where the next class, chapter night, or good reason to
                get the crew together will land. Check the calendar, then pull
                up a chair.
              </p>
              <span>Public chapter calendar</span>
            </div>
          </div>
        </section>

        <section className={styles.scheduleSection}>
          <div className="shell">
            <div className={styles.sectionHeading}>
              <div>
                <p>Save the date</p>
                <h2>See what is coming up.</h2>
              </div>
              <p>
                Browse by month or event type. Once public Brew City events are
                available through Platoon, they will fill this calendar and the
                upcoming list together.
              </p>
            </div>
            <EventsCalendar events={publicEvents} />
          </div>
        </section>

        <section className={styles.eventTypesSection}>
          <div className="shell">
            <div className={styles.eventTypesHeading}>
              <p>More than a meeting</p>
              <h2>Good work happens when the crew gets together.</h2>
            </div>
            <div className={styles.eventTypes}>
              {eventTypes.map((type) => (
                <article key={type.number}>
                  <span>{type.number}</span>
                  <h3>{type.title}</h3>
                  <p>{type.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.contactStrip}>
          <div className={`shell ${styles.contactStripInner}`}>
            <div>
              <p>Have a class in mind?</p>
              <h2>Bring training our way.</h2>
            </div>
            <a
              href={siteConfig.links.contact}
              rel="noreferrer"
              target="_blank"
            >
              Talk to Brew City <span aria-hidden="true">&nearr;</span>
            </a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`shell ${styles.footerInner}`}>
          <div className={styles.footerChapter}>
            <strong>{siteConfig.name}</strong>
            <span>{siteConfig.motto}</span>
          </div>
          <PoweredByPlatoon />
        </div>
      </footer>
    </>
  );
}
