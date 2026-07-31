import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { PoweredByPlatoon } from "../PoweredByPlatoon";
import { MembershipApplicationForm } from "./MembershipApplicationForm";
import styles from "./join.module.css";

export const metadata: Metadata = {
  title: "Join the Chapter",
  description:
    "Apply for a new Brew City FOOLS membership or renew your annual chapter membership.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const params = await searchParams;
  const defaultType = params.type === "renewal" ? "renewal" : "new";

  return (
    <>
      <a className="skip-link" href="#application">
        Skip to application
      </a>

      <div className={styles.utilityBar}>
        <div className="shell">
          {siteConfig.region} · Established {siteConfig.established}
        </div>
      </div>

      <header className={styles.header}>
        <div className={`shell ${styles.headerInner}`}>
          <Link className={styles.brand} href="/">
            <Image
              alt=""
              height={60}
              priority
              src="/images/brew-city-fools-logo.png"
              width={62}
            />
            <span>
              <strong>{siteConfig.shortName}</strong>
              <small>{siteConfig.motto}</small>
            </span>
          </Link>
          <Link className={styles.backLink} href="/">
            <span aria-hidden="true">←</span> Back to the chapter
          </Link>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <Image
            alt="Firefighters training together"
            className={styles.heroImage}
            fill
            priority
            sizes="100vw"
            src="/images/rit-team.jpg"
          />
          <div className={styles.heroOverlay} />
          <div className={`shell ${styles.heroContent}`}>
            <p>Membership</p>
            <h1>Pull up a chair.</h1>
            <div className={styles.heroIntro}>
              <p>
                Whether you are joining for the first time or renewing for
                another year, you are helping keep good training, strong
                friendships, and the traditions of the job moving forward.
              </p>
              <div className={styles.heroPrices} aria-label="Membership prices">
                <span>
                  New member <strong>${siteConfig.membership.newMemberPrice}</strong>
                </span>
                <span>
                  Annual renewal <strong>${siteConfig.membership.renewalPrice}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.applicationSection} id="application">
          <div className={`shell ${styles.applicationGrid}`}>
            <aside className={styles.sidebar}>
              <p className={styles.eyebrow}>How it works</p>
              <h2>Simple, secure, and reviewed by the chapter.</h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <strong>Tell us about yourself</strong>
                    <p>A few contact and fire-service details are all we need.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Pay securely</strong>
                    <p>Complete a one-time payment through Square.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Chapter review</strong>
                    <p>A designated chapter officer reviews every application.</p>
                  </div>
                </li>
              </ol>
            </aside>

            <div className={styles.formPanel}>
              <div className={styles.formHeading}>
                <p className={styles.eyebrow}>Chapter application</p>
                <h2>Let&apos;s get you started.</h2>
                <p>Required fields are marked by the browser when you continue.</p>
              </div>
              <MembershipApplicationForm defaultType={defaultType} />
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
