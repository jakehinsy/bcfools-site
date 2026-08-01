import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { chapterPillars, chapterStory, traditions } from "@/data/about";
import { PoweredByPlatoon } from "../PoweredByPlatoon";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About Brew City FOOLS",
  description:
    "Learn how Brew City FOOLS brings southeastern Wisconsin firefighters together through training, brotherhood, tradition, and service.",
};

function Arrow() {
  return <span aria-hidden="true">&nearr;</span>;
}

export default function AboutPage() {
  return (
    <>
      <a className="skip-link" href="#about-content">
        Skip to our story
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
          <nav className={styles.pageNav} aria-label="About page navigation">
            <Link href="/#training">Training</Link>
            <Link href="/events">Events</Link>
            <Link href="/join">Join</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <Link className={styles.backLink} href="/">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>
        </div>
      </header>

      <main id="about-content">
        <section className={styles.hero}>
          <Image
            alt="Brew City firefighters training together as a crew"
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src="/images/rit-team.jpg"
          />
          <div className={styles.heroOverlay} />
          <div className={`shell ${styles.heroContent}`}>
            <p>Who we are</p>
            <h1>Built on the job. Carried by the brotherhood.</h1>
            <div className={styles.heroIntro}>
              <p>
                Brew City F.O.O.L.S. brings firefighters together to train,
                trade hard-earned lessons, serve our neighbors, and keep the
                best traditions of the fire service moving forward.
              </p>
              <span>Firefighters helping firefighters</span>
            </div>
          </div>
        </section>

        <section className={styles.storySection}>
          <div className={`shell ${styles.storyGrid}`}>
            <div className={styles.storyHeading}>
              <p>Our chapter</p>
              <h2>One idea, passed around the kitchen table.</h2>
            </div>
            <div className={styles.storyCopy}>
              <p className={styles.storyLead}>
                In {chapterStory.founded}, {chapterStory.founderTitle}{" "}
                {chapterStory.founder} saw a need for firefighters across{" "}
                {chapterStory.region} to have more chances to learn from one
                another.
              </p>
              <p>
                The idea was simple: get people who care about the craft in the
                same room, leave rank and ego at the door, and pass useful
                knowledge from one firefighter to the next. Probies, veterans,
                officers, career members, and volunteers all have something to
                teach and something left to learn.
              </p>
              <p>
                That is still the work. Brew City organizes practical training,
                builds relationships across department lines, and lends time or
                support when firefighters, families, or the community need it.
                We are not here to turn the job into a sales pitch. We are here
                to leave it better than we found it.
              </p>
            </div>
          </div>

          <div className={`shell ${styles.storyFacts}`}>
            <div>
              <strong>{chapterStory.founded}</strong>
              <span>Chapter established</span>
            </div>
            <div>
              <strong>All ranks</strong>
              <span>One shared table</span>
            </div>
            <div>
              <strong>Local roots</strong>
              <span>{chapterStory.region}</span>
            </div>
          </div>
        </section>

        <section className={styles.purposeSection}>
          <div className="shell">
            <div className={styles.purposeHeading}>
              <div>
                <p>What we are here to do</p>
                <h2>Keep the craft sharp and the crew strong.</h2>
              </div>
              <p>
                Brotherhood is a verb. It looks like making time to train,
                sharing the lesson you had to learn the hard way, checking on
                the person beside you, and showing up when help is needed.
              </p>
            </div>

            <div className={styles.pillarGrid}>
              {chapterPillars.map((pillar) => (
                <article key={pillar.number}>
                  <span>{pillar.number}</span>
                  <h3>{pillar.title}</h3>
                  <p>{pillar.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.heritageSection}>
          <div className={`shell ${styles.heritageGrid}`}>
            <div className={styles.heritageMedia}>
              <Image
                alt="Firefighters advancing ladders during hands-on training"
                fill
                sizes="(max-width: 860px) 100vw, 48vw"
                src="/images/rit-training.jpg"
              />
              <span>Train it. Share it. Carry it forward.</span>
            </div>
            <div className={styles.heritageCopy}>
              <p>Part of something larger</p>
              <h2>What does “Leatherhead” mean?</h2>
              <p>
                The Fraternal Order of Leatherheads Society began in Central
                Florida in 1995 around a shared respect for the brotherhood,
                heritage, and responsibility of the fire service.
              </p>
              <p>
                A leather helmet is an old symbol of that tradition, but the
                values are what matter. You do not need to own one to belong.
                Being a Leatherhead means taking the job seriously, taking care
                of brother and sister firefighters, and never forgetting those
                who came before us.
              </p>
              <a
                href={siteConfig.links.international}
                rel="noreferrer"
                target="_blank"
              >
                Visit FOOLS International <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section className={styles.traditionsSection}>
          <div className="shell">
            <div className={styles.traditionsHeading}>
              <div>
                <p>The words we carry</p>
                <h2>More than acronyms.</h2>
              </div>
              <p>
                These phrases have traveled through the F.O.O.L.S. for years.
                Each one is a short reminder of how we train, how we treat one
                another, and what we owe the fire service.
              </p>
            </div>

            <div className={styles.traditionsGrid}>
              {traditions.map((tradition, index) => (
                <article key={tradition.abbreviation}>
                  <div>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{tradition.abbreviation}</strong>
                  </div>
                  <h3>{tradition.title}</h3>
                  <p>{tradition.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.calloutSection}>
          <div className={`shell ${styles.calloutInner}`}>
            <div>
              <p>Duty. Pride. Tradition.</p>
              <h2>The job is bigger than any one of us.</h2>
            </div>
            <p>
              Learn what you can. Teach what you know. Take care of the people
              beside you. Remember the ones who came before. Then leave
              something worth carrying forward.
            </p>
          </div>
        </section>

        <section className={styles.joinStrip}>
          <div className={`shell ${styles.joinStripInner}`}>
            <div>
              <p>There is room at the table</p>
              <h2>Come train, learn, and carry it forward.</h2>
            </div>
            <div className={styles.joinActions}>
              <Link href="/join">
                Join Brew City <Arrow />
              </Link>
              <Link href="/contact">Talk to the crew</Link>
            </div>
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
