import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import {
  CONNECTION_COOKIE,
  connectionConfiguration,
  connectionSummary,
  membershipProgramConfiguration,
  programCredentials,
  readConnection,
} from "@/lib/platoonMembership";
import { PoweredByPlatoon } from "../PoweredByPlatoon";
import { LegalLinks } from "../LegalLinks";
import { SiteHeader } from "../SiteHeader";
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
  searchParams: Promise<{
    type?: string;
    platoon?: string;
    connection_ref?: string;
  }>;
}) {
  const params = await searchParams;
  const defaultType = params.type === "renewal" ? "renewal" : "new";
  const connectionStatus =
    params.platoon === "connected" ||
    params.platoon === "error" ||
    params.platoon === "unavailable"
      ? params.platoon
      : null;
  const rawConnectionSupportReference = params.connection_ref ?? "";
  const connectionSupportReference = /^CONN-[A-F0-9]{8}$/.test(
    rawConnectionSupportReference,
  )
    ? rawConnectionSupportReference
    : null;
  let initialConnection = null;
  const paymentConfig = await membershipProgramConfiguration();
  const membershipCurrency = paymentConfig?.program.currency ?? "USD";
  const formatMembershipPrice = (amountMinor: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: membershipCurrency }).format(amountMinor / 100);
  let platoonConnectionOrigin: string | null = null;
  try {
    const cookieStore = await cookies();
    const connection = readConnection(
      cookieStore.get(CONNECTION_COOKIE)?.value,
      programCredentials().secret,
    );
    initialConnection = connection ? connectionSummary(connection) : null;
  } catch {
    initialConnection = null;
  }
  try {
    platoonConnectionOrigin = connectionConfiguration().returnUrl.origin;
  } catch {
    platoonConnectionOrigin = null;
  }

  return (
    <>
      <a className="skip-link" href="#application">
        Skip to application
      </a>

      <SiteHeader />

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
                  New member <strong>{formatMembershipPrice(paymentConfig?.program.newFeeMinor ?? siteConfig.membership.newMemberPrice * 100)}</strong>
                </span>
                <span>
                  Annual renewal <strong>{formatMembershipPrice(paymentConfig?.program.renewalFeeMinor ?? siteConfig.membership.renewalPrice * 100)}</strong>
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
                    <strong>Apply and save your card</strong>
                    <p>Submit your details and securely save a card with Square. Due today: $0.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Chapter review</strong>
                    <p>A designated chapter officer reviews every application. Nothing is charged during review.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Approval and activation</strong>
                    <p>If approved, the saved card is charged and we email your receipt and secure Platoon setup link.</p>
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
              <MembershipApplicationForm
                connectionSupportReference={connectionSupportReference}
                connectionStatus={connectionStatus}
                defaultType={defaultType}
                initialConnection={initialConnection}
                platoonConnectionOrigin={platoonConnectionOrigin}
                platoonSignInAvailable={Boolean(platoonConnectionOrigin)}
                paymentConfig={paymentConfig}
              />
            </div>
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
