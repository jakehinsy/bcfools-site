import Image from "next/image";
import { siteConfig } from "@/config/site";

const principles = [
  {
    number: "01",
    title: "Duty",
    copy: "Show up prepared, share what you know, and serve the fire service with purpose.",
  },
  {
    number: "02",
    title: "Pride",
    copy: "Honor the craft, the people beside you, and the standards that keep crews strong.",
  },
  {
    number: "03",
    title: "Tradition",
    copy: "Carry hard-earned knowledge forward while staying hungry enough to keep learning.",
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
    title: "Join the brotherhood",
    copy: "The chapter reviews your application and follows up with next steps.",
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
            href={siteConfig.links.application}
            target="_blank"
            rel="noreferrer"
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
                href={siteConfig.links.application}
                target="_blank"
                rel="noreferrer"
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
                Firefighters Own Outstanding Leadership Skills
              </p>
              <h1>
                Built on brotherhood.
                <span>Driven by training.</span>
              </h1>
              <p className="hero__lede">
                Keeping duty, pride, and tradition alive through accessible
                fire-service training, shared knowledge, and service to the
                communities of southeastern Wisconsin.
              </p>
              <div className="hero__actions">
                <a className="button button--primary" href="#training">
                  Explore training <Arrow />
                </a>
                <a className="button button--ghost" href="#join">
                  Join Brew City
                </a>
              </div>
            </div>

            <div className="hero__rail" aria-label="Chapter highlights">
              <div>
                <strong>2009</strong>
                <span>Chapter established</span>
              </div>
              <div>
                <strong>Low cost</strong>
                <span>Training for firefighters</span>
              </div>
              <div>
                <strong>Local</strong>
                <span>Milwaukee & Southeast Wisconsin</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section section--cream" id="about">
          <div className="shell">
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">Who we are</p>
                <h2>Pass the knowledge forward.</h2>
              </div>
              <div className="section-heading__copy">
                <p>
                  Brew City F.O.O.L.S. began with a simple idea: bring
                  like-minded firefighters together to train, learn from one
                  another, and strengthen the calling they share.
                </p>
                <p>
                  From probies to chiefs, everyone has something to offer. We
                  keep that exchange moving—and put the same spirit to work for
                  our neighbors.
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
              <p className="eyebrow">Train with purpose</p>
              <h2>Better prepared. Better together.</h2>
              <p className="training__lede">
                We connect firefighters with high-quality, practical training
                at the lowest cost possible. Host a class at your department,
                train alongside neighboring crews, or bring an idea to the
                chapter.
              </p>
              <ul className="check-list">
                <li>Practical instruction from experienced firefighters</li>
                <li>Opportunities built for departments across the region</li>
                <li>A chapter committed to learning—not profit</li>
              </ul>
              <a
                className="text-link"
                href={siteConfig.links.contact}
                target="_blank"
                rel="noreferrer"
              >
                Request a training class <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section className="section section--navy" id="events">
          <div className="shell events">
            <div className="events__heading">
              <p className="eyebrow eyebrow--red">Upcoming opportunities</p>
              <h2>Meet us on the training ground.</h2>
            </div>
            <div className="events__card">
              <div className="events__date" aria-hidden="true">
                <span>Next</span>
                <strong>TBA</strong>
              </div>
              <div className="events__body">
                <p className="events__status">Calendar update</p>
                <h3>New public training dates are being finalized.</h3>
                <p>
                  Follow the chapter for announcements, or contact the training
                  team to start a conversation about hosting a class.
                </p>
              </div>
              <div className="events__actions">
                <a
                  className="button button--light"
                  href={siteConfig.links.instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  Follow updates <Arrow />
                </a>
                <a
                  className="text-link text-link--light"
                  href={siteConfig.links.contact}
                  target="_blank"
                  rel="noreferrer"
                >
                  Contact training
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section join" id="join">
          <div className="shell">
            <div className="section-heading section-heading--center">
              <p className="eyebrow">Membership</p>
              <h2>Pull up a chair at the kitchen table.</h2>
              <p>
                Brew City is accepting new members who want to learn, teach,
                serve, and keep the fire-service brotherhood strong.
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
                href={siteConfig.links.application}
                target="_blank"
                rel="noreferrer"
              >
                Start an application <Arrow />
              </a>
              <a
                className="button button--outline"
                href={siteConfig.links.renewal}
                target="_blank"
                rel="noreferrer"
              >
                Renew membership
              </a>
            </div>
          </div>
        </section>

        <section className="contact" id="contact">
          <div className="shell contact__inner">
            <div>
              <p className="eyebrow eyebrow--light">Start a conversation</p>
              <h2>Have a training request or chapter question?</h2>
            </div>
            <a
              className="button button--light"
              href={siteConfig.links.contact}
              target="_blank"
              rel="noreferrer"
            >
              Contact Brew City <Arrow />
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
