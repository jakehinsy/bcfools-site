import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { paidRegistrationMemberOrigin, paidRegistrationSiteOrigin } from "@/lib/localPaidGate";
import { siteConfig } from "@/config/site";
import {
  CONNECTION_COOKIE,
  connectionConfiguration,
  connectionSummary,
  membershipManagementUrl,
  membershipProgramConfiguration,
  localPaidRegistrationEnabled,
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
  title: "Brew City FOOLS Membership",
  description:
    "Apply for a new Brew City FOOLS membership or manage your existing membership in Platoon.",
  referrer: "no-referrer",
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
  const hostedAcceptance = process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true";
  const paidRequested = hostedAcceptance || process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true" || process.env.BREW_MEMBERSHIP_PAID_LOCAL === "true";
  const siteOrigin = paidRegistrationSiteOrigin();
  const localPaid = siteOrigin !== null && localPaidRegistrationEnabled(siteOrigin);
  const renewalUrl = hostedAcceptance ? "" : membershipManagementUrl(siteConfig.links.renewal);
  const membershipUrl = membershipManagementUrl(siteConfig.links.renewal);
  const existingMemberEntry = new URL(siteConfig.links.memberDashboard);
  const existingMemberConnectionUrl = new URL(
    existingMemberEntry.pathname + existingMemberEntry.search,
    new URL(membershipUrl).origin,
  ).toString();
  if (params.type === "renewal" && !hostedAcceptance) redirect(renewalUrl);
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
  const programConfig = await membershipProgramConfiguration(localPaid);
  const abuseProtectionReady = !programConfig?.abuseProtection?.required || Boolean(
    programConfig.abuseProtection.enabled && programConfig.abuseProtection.siteKey,
  );
  const applicationReady = Boolean(
    (!paidRequested || localPaid) && programConfig?.program.enabledApplicationTypes.includes("new") &&
    programConfig?.paidRegistration?.formVisible !== false && abuseProtectionReady,
  );
  const membershipCurrency = localPaid ? "USD" : programConfig?.program.currency ?? "USD";
  const formatMembershipPrice = (amountMinor: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: membershipCurrency }).format(amountMinor / 100);
  let platoonConnectionOrigin: string | null = null;
  if (!localPaid) try {
    const cookieStore = await cookies();
    const connection = readConnection(
      cookieStore.get(CONNECTION_COOKIE)?.value,
      programCredentials().secret,
    );
    initialConnection = connection ? connectionSummary(connection) : null;
  } catch {
    initialConnection = null;
  }
  if (!localPaid) try {
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
                {localPaid
                  ? "Join the Brew City chapter and help keep good training, strong friendships, and the traditions of the job moving forward."
                  : "Whether you are joining for the first time or renewing for another year, you are helping keep good training, strong friendships, and the traditions of the job moving forward."}
              </p>
              <div className={styles.heroPrices} aria-label="New membership price">
                <span>
                  New membership <strong>{formatMembershipPrice(localPaid ? 7500 : programConfig?.program.newFeeMinor ?? siteConfig.membership.newMemberPrice * 100)}</strong>
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
                  <h2>{localPaid ? "Simple, secure registration and checkout." : "Simple, secure, and reviewed by the chapter."}</h2>
                  <ol>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Apply online</strong>
                        <p>{localPaid ? (programConfig?.paidRegistration?.available ? "Submit your details and continue to secure checkout for a one-time $75 payment." : "Review and fill in the application. New membership registration is currently paused; existing registrations can still be resumed.") : "Submit your details online. No payment is collected with the application."}</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>{localPaid ? "Confirm payment" : "Chapter review"}</strong>
                        <p>{localPaid ? "Your registration and payment status appear on the next page." : "The Membership Trustee and President review every new application."}</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Continue by email</strong>
                        <p>{localPaid ? "Use the secure link from email to resume registration or connect your account." : "If approved, follow the secure email instructions to claim or sign in to your Platoon account. The chapter will provide dues instructions after you complete onboarding."}</p>
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
                    {!hostedAcceptance ? <li>
                      <span>02</span>
                      <div>
                        <strong>Returning members</strong>
                        <p>Renew your annual chapter membership and keep your record current.</p>
                      </div>
                    </li> : null}
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
              {hostedAcceptance && params.type === "renewal" ? <div role="status" className={styles.applicationFallback}>
                <h2>Renewals are unavailable here.</h2>
                <p>This registration flow supports new memberships only. Please contact the membership team for renewal help.</p>
              </div> : null}
              {applicationReady ? (
                <>
                  <div className={styles.formHeading}>
                    <p className={styles.eyebrow}>{programConfig?.program.chapterName ?? siteConfig.name} membership</p>
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
                    controlledMemberOrigin={localPaid ? paidRegistrationMemberOrigin() : null}
                    localPaid={localPaid}
                    hostedAcceptance={hostedAcceptance}
                    renewalAvailable={!localPaid && !hostedAcceptance}
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
        <section className={styles.existingMemberSection} aria-labelledby="existing-member-heading">
          <div className={`shell ${styles.existingMemberContent}`}>
            <div>
              <h2 id="existing-member-heading">Already a Brew City FOOLS member?</h2>
              <p>Annual renewal is ${siteConfig.membership.renewalPrice}. Online renewals will be available in Platoon for the next renewal period.</p>
            </div>
            <div className={styles.existingMemberActions}>
              <a href={membershipUrl}>Manage membership in Platoon <ArrowIcon /></a>
              <a href={existingMemberConnectionUrl}>Connect an existing membership to Platoon <ArrowIcon /></a>
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
