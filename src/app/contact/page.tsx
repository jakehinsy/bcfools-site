import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { PoweredByPlatoon } from "../PoweredByPlatoon";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact & Leadership",
  description:
    "Meet the Brew City F.O.O.L.S. leadership team and reach the right chapter officer for training, membership, dues, or general questions.",
};

function Arrow() {
  return <span aria-hidden="true">&nearr;</span>;
}

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M3.5 6.5h17v12h-17zM4 7l8 6 8-6" />
    </svg>
  );
}

function contactFor(
  role: (typeof siteConfig.contactDirectory)[number]["role"],
) {
  const contact = siteConfig.contactDirectory.find((item) => item.role === role);

  if (!contact) {
    throw new Error(`Missing ${role} contact configuration.`);
  }

  return contact;
}

export default function ContactPage() {
  const trainingContact = contactFor("Training");
  const membershipContact = contactFor("Membership");

  return (
    <>
      <a className="skip-link" href="#contact-content">
        Skip to contact information
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
          <nav className={styles.pageNav} aria-label="Contact page navigation">
            <Link href="/about">About</Link>
            <Link href="/#training">Training</Link>
            <Link href="/events">Events</Link>
            <Link href="/join">Join</Link>
          </nav>
          <Link className={styles.backLink} href="/">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
        </div>
      </header>

      <main id="contact-content">
        <section className={styles.hero}>
          <Image
            alt="Firefighters working together during hands-on training"
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src="/images/training-hero.jpg"
          />
          <div className={styles.heroOverlay} />
          <div className={`shell ${styles.heroContent}`}>
            <p>The kitchen table is open</p>
            <h1>Meet the crew. Reach the right person.</h1>
            <div className={styles.heroIntro}>
              <p>
                Questions about training, membership, dues, or the chapter?
                Start here and your note will land with the person who can help.
              </p>
              <span>Leadership & contact</span>
            </div>
          </div>
        </section>

        <section className={styles.quickContactSection}>
          <div className="shell">
            <div className={styles.sectionHeading}>
              <div>
                <p>Start with the right crew</p>
                <h2>What can we help with?</h2>
              </div>
              <p>
                These are the quickest routes for the questions we hear most.
                The full officer directory is below if you already know who you
                need.
              </p>
            </div>

            <div className={styles.quickContacts}>
              <article className={styles.quickContactPrimary}>
                <span className={styles.cardNumber}>01</span>
                <p>Training & hosting</p>
                <h3>Bring practical fireground training to your crew.</h3>
                <p>
                  Ask about upcoming classes, instructors, or bringing Brew City
                  training to your department.
                </p>
                <a href={`mailto:${trainingContact.email}`}>
                  Email training <Arrow />
                </a>
              </article>

              <article className={styles.quickContactCard}>
                <span className={styles.cardNumber}>02</span>
                <p>Membership</p>
                <h3>Applications, renewals, and dues.</h3>
                <p>
                  Get help with joining the chapter, renewing, or a membership
                  record that needs attention.
                </p>
                <a href={`mailto:${membershipContact.email}`}>
                  Email membership <Arrow />
                </a>
              </article>

              <article className={styles.quickContactCard}>
                <span className={styles.cardNumber}>03</span>
                <p>Follow the crew</p>
                <h3>See where Brew City has been lately.</h3>
                <p>
                  Training photos, chapter updates, and the next good reason to
                  get together all land on social.
                </p>
                <div className={styles.socialLinks}>
                  <a
                    href={siteConfig.links.facebook}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Facebook <Arrow />
                  </a>
                  <a
                    href={siteConfig.links.instagram}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Instagram <Arrow />
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.leadershipSection}>
          <div className="shell">
            <div className={styles.leadershipHeading}>
              <div>
                <p>Chapter leadership</p>
                <h2>The folks keeping Brew City moving.</h2>
              </div>
              <p>
                Volunteer officers who help organize training, welcome members,
                protect the traditions, and make sure there is always room for
                one more at the table.
              </p>
            </div>

            <div className={styles.leadershipGrid}>
              {siteConfig.leadership.map((leader, index) => (
                <article
                  className={styles.leaderCard}
                  key={`${leader.role}-${leader.name}`}
                >
                  <div className={styles.leaderPhoto}>
                    {"image" in leader ? (
                      <Image
                        alt={`Portrait of ${leader.name}`}
                        fill
                        sizes="(max-width: 680px) 100vw, (max-width: 980px) 50vw, 33vw"
                        src={leader.image}
                      />
                    ) : (
                      <div className={styles.leaderPlaceholder}>
                        <Image
                          alt=""
                          height={112}
                          src="/images/brew-city-fools-logo.png"
                          width={116}
                        />
                        <span>Photo coming soon</span>
                      </div>
                    )}
                    <span className={styles.leaderNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className={styles.leaderBody}>
                    <p>{leader.role}</p>
                    <h3>{leader.name}</h3>
                    {"email" in leader && (
                      <a href={`mailto:${leader.email}`}>
                        <MailIcon /> Email {leader.role}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.directorySection}>
          <div className="shell">
            <div className={styles.directoryHeading}>
              <div>
                <p>Officer directory</p>
                <h2>Send it where it belongs.</h2>
              </div>
              <p>
                Role-based addresses keep chapter questions moving even when
                officers change. Choose the closest fit and the right person
                will take it from there.
              </p>
            </div>

            <div className={styles.directoryList}>
              {siteConfig.contactDirectory.map((contact, index) => (
                <a href={`mailto:${contact.email}`} key={contact.role}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{contact.role}</strong>
                    <small>{contact.description}</small>
                  </div>
                  <em>{contact.email}</em>
                  <Arrow />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.joinStrip}>
          <div className={`shell ${styles.joinStripInner}`}>
            <div>
              <p>There is room at the table</p>
              <h2>Ready to join the crew?</h2>
            </div>
            <Link href="/join">
              Start your application <Arrow />
            </Link>
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
