import Image from "next/image";
import { siteConfig } from "@/config/site";

const principles = [
  {
    number: "01",
    title: "Duty",
    copy: "Show up for the job and for one another. If you know something, share it. If you need help, ask.",
  },
  {
    number: "02",
    title: "Pride",
    copy: "Take pride in the craft, your crew, and leaving the fire service stronger than you found it.",
  },
  {
    number: "03",
    title: "Tradition",
    copy: "Keep the stories, lessons, and kitchen-table wisdom moving from one generation to the next.",
  },
];

const membershipSteps = [
  {
    number: "01",
    title: "Apply",
    copy: "Tell us about yourself and your connection to the fire service.",
  },
  {
    number: "02",
    title: "Submit dues",
    copy: `Choose a $${siteConfig.membership.newMemberPrice} new membership or $${siteConfig.membership.renewalPrice} annual renewal.`,
  },
  {
    number: "03",
    title: "Pull up a chair",
    copy: "Once approved, come to a class, lend a hand, and get to know the crew.",
  },
];

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <div className="utility-bar">
        <div className="shell utility-bar__inner">
          <span>{siteConfig.region}</span>
          <span aria-hidden="true">•</span>
          <span>Established {siteConfig.established}</span>
        </div>
      </div>

      <header className="site-header">
        <div className="shell site-header__inner">
          <a className="brand" href="#top" aria-label="Brew City FOOLS home">
            <Image
              className="brand__mark"
              src="/images/brew-city-fools-logo.png"
              alt=""
              width={72}
              height={70}
              priority
            />
            <span className="brand__copy">
              <strong>{siteConfig.shortName}</strong>
              <small>{siteConfig.motto}</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {siteConfig.navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>

          <a
            className="button button--header"
            href={siteConfig.links.applicationRoute}
          >
            Join the chapter <Arrow />
          </a>

          <details className="mobile-nav">
            <summary>Menu</summary>
            <nav aria-label="Mobile navigation">
              {siteConfig.navigation.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
              <a
                className="mobile-nav__cta"
                href={siteConfig.links.applicationRoute}
              >
                Membership application <Arrow />
              </a>
            </nav>
          </details>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <Image
            className="hero__image"
            src="/images/training-hero.jpg"
            alt="Firefighters working together during hands-on roof operations training"
            fill
            sizes="100vw"
            priority
          />
          <div className="hero__wash" />
          <div className="shell hero__content">
            <div className="hero__copy">
              <p className="eyebrow eyebrow--light">
                From the firehouse. For the fire service.
              </p>
              <h1>
                Train together.
                <span>Carry it forward.</span>
              </h1>
              <p className="hero__lede">
                Firefighters from departments near and far, coming together to
                learn, laugh, swap stories, and keep the traditions of the fire
                service alive.
              </p>
              <div className="hero__actions">
                <a className="button button--primary" href="#training">
                  Train with us <Arrow />
                </a>
                <a className="button button--ghost" href="#join">
                  Pull up a chair
                </a>
              </div>
            </div>

            <div className="hero__rail" aria-label="Chapter highlights">
              <div>
                <strong>All ranks</strong>
                <span>Probies, veterans, and chiefs</span>
              </div>
              <div>
                <strong>Hands-on</strong>
                <span>Learn it. Share it. Pass it on.</span>
              </div>
              <div>
                <strong>One table</strong>
                <span>Firefighters from every patch</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--cream" id="about">
          <div className="shell">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">The kitchen table is open</p>
                <h2>Different patches. One fire service.</h2>
              </div>
              <div className="section-heading__copy">
                <p>
                  No matter the patch on your sleeve, there is a place for you
                  here. Brew City F.O.O.L.S. is a crew of firefighters who come
                  together because the job means more when we share it.
                </p>
                <p>
                  We train hard, trade stories, learn from one another, help our
                  neighbors, and make sure what was handed to us stays alive for
                  the next generation.
                </p>
              </div>
            </div>

            <div className="principles">
              {principles.map((principle) => (
                <article className="principle" key={principle.title}>
                  <span>{principle.number}</span>
                  <h3>{principle.title}</h3>
                  <p>{principle.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section training" id="training">
          <div className="shell training__grid">
            <div className="training__media">
              <Image
                src="/images/rit-training.jpg"
                alt="Firefighters advancing ladders during rapid intervention training"
                fill
                sizes="(max-width: 800px) 100vw, 50vw"
              />
              <div className="training__badge">
                <strong>Hands-on</strong>
                <span>Fireground focused</span>
              </div>
            </div>

            <div className="training__copy">
              <p className="eyebrow">No egos. No sales pitch.</p>
              <h2>Just firefighters getting better together.</h2>
              <p className="training__lede">
                The best training feels like the best parts of the firehouse:
                honest, practical, and built on firefighters sharing what
                works. We keep it affordable so more crews can get on the
                training ground.
              </p>
              <ul className="check-list">
                <li>Hands-on skills you can take back to your crew</li>
                <li>Instructors who teach from experience, not a script</li>
                <li>Room for every rank to learn, teach, and ask questions</li>
              </ul>
              <a
                className="text-link"
                href={siteConfig.links.contact}
                target="_blank"
                rel="noreferrer"
              >
                Bring training to your department <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section className="section section--navy" id="events">
          <div className="shell events">
            <div className="events__heading">
              <p className="eyebrow eyebrow--red">
                Classes, gatherings & good company
              </p>
              <h2>Come train. Stay awhile.</h2>
            </div>
            <div className="events__card">
              <div className="events__date" aria-hidden="true">
                <span>Next</span>
                <strong>TBA</strong>
              </div>
              <div className="events__body">
                <p className="events__status">The next one is coming</p>
                <h3>We’re lining up the next chance to get together.</h3>
                <p>
                  Follow the chapter for new dates. Whether it is a hands-on
                  class, a chapter gathering, or a good reason to sit around a
                  table, there is always room for one more.
                </p>
              </div>
              <div className="events__actions">
                <a
                  className="button button--light"
                  href="/events"
                >
                  Open the calendar <Arrow />
                </a>
                <a
                  className="text-link text-link--light"
                  href={siteConfig.links.contact}
                  target="_blank"
                  rel="noreferrer"
                >
                  Bring a class our way
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section join" id="join">
          <div className="shell">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">There’s room at the table</p>
              <h2>Bring your stories. Bring your questions. Bring your crew.</h2>
              <p>
                If you care about the craft, want to keep learning, and believe
                the traditions of the fire service are worth carrying forward,
                you will fit right in.
              </p>
            </div>

            <div className="join__steps">
              {membershipSteps.map((step) => (
                <article className="join__step" key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                </article>
              ))}
            </div>

            <div className="join__actions">
              <a
                className="button button--primary"
                href={`${siteConfig.links.applicationRoute}?type=new#application`}
              >
                Join Brew City <Arrow />
              </a>
              <a
                className="button button--outline"
                href={`${siteConfig.links.applicationRoute}?type=renewal#application`}
              >
                Renew membership
              </a>
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="shell contact__inner">
            <div>
              <p className="eyebrow eyebrow--light">Say hello</p>
              <h2>Want to train, host a class, or meet the crew?</h2>
            </div>
            <a
              className="button button--light"
              href={siteConfig.links.contact}
              target="_blank"
              rel="noreferrer"
            >
              Talk to Brew City <Arrow />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="shell site-footer__grid">
          <div className="footer-brand">
            <Image
              src="/images/brew-city-fools-logo.png"
              alt=""
              width={104}
              height={102}
            />
            <div>
              <strong>{siteConfig.name}</strong>
              <span>{siteConfig.motto}</span>
            </div>
          </div>

          <div className="footer-links">
            <p>Explore</p>
            {siteConfig.navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </div>

          <div className="footer-links">
            <p>Connect</p>
            <a
              href={siteConfig.links.facebook}
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
            <a
              href={siteConfig.links.instagram}
              target="_blank"
              rel="noreferrer"
            >
              Instagram
            </a>
            <a
              href={siteConfig.links.contact}
              target="_blank"
              rel="noreferrer"
            >
              Contact
            </a>
          </div>
        </div>

        <div className="shell site-footer__bottom">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}
          </span>
          <span>{siteConfig.region}</span>
        </div>
      </footer>
    </>
  );
}
