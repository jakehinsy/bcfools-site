import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { LegalLinks } from "./LegalLinks";
import { PoweredByPlatoon } from "./PoweredByPlatoon";
import { SiteHeader } from "./SiteHeader";
import styles from "./legal.module.css";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#policy">
        Skip to policy
      </a>
      <SiteHeader />
      <main>
        <section className={styles.hero}>
          <div className="shell">
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1>{title}</h1>
            <p className={styles.heroIntro}>{intro}</p>
          </div>
        </section>
        <section className={styles.policyBand} id="policy">
          <div className={`shell ${styles.policyGrid}`}>
            <aside className={styles.sidebar} aria-label="Policy details">
              <dl>
                <div>
                  <dt>Effective</dt>
                  <dd>{siteConfig.legal.effectiveDate}</dd>
                </div>
                <div>
                  <dt>Applies to</dt>
                  <dd>brewcityfools.com</dd>
                </div>
                <div>
                  <dt>Questions</dt>
                  <dd>
                    <a href={`mailto:${siteConfig.legal.contactEmail}`}>
                      {siteConfig.legal.contactEmail}
                    </a>
                  </dd>
                </div>
              </dl>
            </aside>
            <article className={styles.policy}>{children}</article>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`shell ${styles.footerInner}`}>
          <div className={styles.footerChapter}>
            <strong>{siteConfig.name}</strong>
            <span>{siteConfig.motto}</span>
            <LegalLinks />
          </div>
          <PoweredByPlatoon />
        </div>
      </footer>
    </>
  );
}
