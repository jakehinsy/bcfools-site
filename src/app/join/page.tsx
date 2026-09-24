import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { siteConfig } from "@/config/site";
import {
  CONNECTION_COOKIE,
  connectionConfiguration,
  connectionSummary,
  membershipManagementUrl,
  membershipProgramConfiguration,
  programCredentials,
  readConnection,
} from "@/lib/platoonMembership";
import { PoweredByPlatoon } from "../PoweredByPlatoon";
import { LegalLinks } from "../LegalLinks";
import { SiteHeader } from "../SiteHeader";
import { ArrowIcon } from "../ArrowIcon";
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
  const renewalUrl = membershipManagementUrl(siteConfig.links.renewal);
  if (params.type === "renewal") redirect(renewalUrl);
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
  const programConfig = await membershipProgramConfiguration();
  const abuseProtectionReady = !programConfig?.abuseProtection?.required || Boolean(
    programConfig.abuseProtection.enabled && programConfig.abuseProtection.siteKey,
  );
  const applicationReady = Boolean(
    programConfig?.program.enabledApplicationTypes.includes("new") && abuseProtectionReady,
  );
  const membershipCurrency = programConfig?.program.currency ?? "USD";
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
                  New member <strong>{formatMembershipPrice(programConfig?.program.newFeeMinor ?? siteConfig.membership.newMemberPrice * 100)}</strong>
                </span>
                <span>
                  Annual renewal <strong>{formatMembershipPrice(programConfig?.program.renewalFeeMinor ?? siteConfig.membership.renewalPrice * 100)}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.applicationSection} id="application">
          <div className={`shell ${styles.applicationGrid}`}>
            <aside className={styles.sidebar}>
              {applicationReady ? (
                <>
                  <p className={styles.eyebrow}>How it works</p>
                  <h2>Simple, secure, and reviewed by the chapter.</h2>
                  <ol>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Apply online</strong>
                        <p>Submit your details online. No payment is collected with the application.</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Chapter review</strong>
                        <p>The Membership Trustee and President review every new application.</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Continue by email</strong>
                        <p>If approved, follow the secure email instructions to claim or sign in to your Platoon account. The chapter will provide dues instructions after you complete onboarding.</p>
                      </div>
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className={styles.eyebrow}>Membership</p>
                  <h2>There is room at the table.</h2>
                  <ol>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>New members</strong>
                        <p>Introduce yourself, tell us about your fire-service experience, and join the chapter.</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Returning members</strong>
                        <p>Renew your annual chapter membership and keep your record current.</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Questions</strong>
                        <p>The membership crew can help with applications, renewals, dues, or record updates.</p>
                      </div>
                    </li>
                  </ol>
                </>
              )}
            </aside>

            <div className={styles.formPanel}>
              {applicationReady ? (
                <>
                  <div className={styles.formHeading}>
                    <p className={styles.eyebrow}>Chapter application</p>
                    <h2>Let&apos;s get you started.</h2>
                    <p>Required fields are marked by the browser when you continue.</p>
                  </div>
                  <MembershipApplicationForm
                    connectionSupportReference={connectionSupportReference}
                    connectionStatus={connectionStatus}
                    initialConnection={initialConnection}
                    platoonConnectionOrigin={platoonConnectionOrigin}
                    platoonSignInAvailable={Boolean(platoonConnectionOrigin)}
                    programConfig={programConfig}
                    renewalUrl={renewalUrl}
                  />
                </>
              ) : (
                <div className={styles.applicationFallback}>
                  <p className={styles.eyebrow}>Membership applications</p>
                  <h2>Applications are temporarily unavailable.</h2>
                  <p>
                    Please try again shortly, or contact our membership team for help.
                  </p>
                  <div className={styles.applicationFallbackActions}>
                    <form action={`${siteConfig.links.applicationRoute}#application`} method="get">
                      <button type="submit">Try again <ArrowIcon /></button>
                    </form>
                    <a href={`mailto:${siteConfig.legal.contactEmail}`}>
                      Email membership <ArrowIcon />
                    </a>
                  </div>
                  <p className={styles.applicationFallbackHelp}>
                    Need help? <Link href={siteConfig.links.contact}>Contact the chapter</Link>.
                  </p>
                </div>
              )}
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
