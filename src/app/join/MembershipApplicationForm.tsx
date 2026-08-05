"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { siteConfig } from "@/config/site";
import { membershipFormDefaults } from "@/lib/platoonConnectionPayload";
import type { MembershipProgramConfig, PlatoonConnectionSummary } from "@/lib/platoonMembership";
import styles from "./join.module.css";

type ApplicationType = "new" | "renewal";
type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      applicationReference: string;
      nextAction: "await_review" | "check_email";
      savedCard: { brand: string; lastFour: string };
      renewalMode: "automatic" | "manual";
    }
  | { status: "error"; message: string };

const stateOptions = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

const CONNECTION_BINDING_STORAGE_KEY = "bcf_platoon_connect_binding";
const CONNECTION_HANDOFF_PREFIX = "#platoon-connect=";

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  destroy: () => Promise<void>;
  tokenize: (details: { intent: "STORE"; customerInitiated: true }) => Promise<{
    status: string;
    token?: string;
    errors?: Array<{ message?: string }>;
  }>;
};

declare global {
  interface Window {
    Square?: {
      payments: (applicationId: string, locationId: string) => {
        card: () => Promise<SquareCard>;
      };
    };
  }
}

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amountMinor / 100);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function validConnectionRedirect(value: unknown): value is string {
  return typeof value === "string" && /^\/join\?(?:[^#]*&)?platoon=(?:connected|error)(?:[&#]|$)/.test(value);
}

async function beginPlatoonConnection(
  connectionOrigin: string,
  applicationType: ApplicationType,
) {
  const browserBinding = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(browserBinding),
  );
  const browserBindingHash = bytesToBase64Url(new Uint8Array(digest));
  sessionStorage.setItem(CONNECTION_BINDING_STORAGE_KEY, browserBinding);
  const start = new URL("/api/platoon/connect/start", connectionOrigin);
  start.searchParams.set("type", applicationType);
  start.searchParams.set("binding", browserBindingHash);
  window.location.assign(start);
}

export function MembershipApplicationForm({
  connectionSupportReference,
  connectionStatus,
  defaultType,
  initialConnection,
  platoonConnectionOrigin,
  platoonSignInAvailable,
  paymentConfig,
}: {
  connectionSupportReference: string | null;
  connectionStatus: "connected" | "error" | "unavailable" | null;
  defaultType: ApplicationType;
  initialConnection: PlatoonConnectionSummary | null;
  platoonConnectionOrigin: string | null;
  platoonSignInAvailable: boolean;
  paymentConfig: MembershipProgramConfig | null;
}) {
  const [applicationType, setApplicationType] =
    useState<ApplicationType>(defaultType);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [connectionStarting, setConnectionStarting] = useState(false);
  const [squareState, setSquareState] = useState<"loading" | "ready" | "error">(
    paymentConfig?.square.ready ? "loading" : "error",
  );
  const submissionId = useRef<string | null>(null);
  const squareCard = useRef<SquareCard | null>(null);
  const initialValues = membershipFormDefaults(initialConnection);

  const amountMinor =
    applicationType === "new"
      ? paymentConfig?.program.newFeeMinor ?? siteConfig.membership.newMemberPrice * 100
      : paymentConfig?.program.renewalFeeMinor ?? siteConfig.membership.renewalPrice * 100;
  const renewalAmountMinor = paymentConfig?.program.renewalFeeMinor ?? siteConfig.membership.renewalPrice * 100;
  const currency = paymentConfig?.program.currency ?? "USD";
  const squareScript = paymentConfig?.square.environment === "production"
    ? "https://web.squarecdn.com/v1/square.js"
    : "https://sandbox.web.squarecdn.com/v1/square.js";

  async function initializeSquare() {
    if (
      !window.Square || !paymentConfig?.square.ready ||
      !paymentConfig.square.applicationId || !paymentConfig.square.locationId
    ) {
      setSquareState("error");
      return;
    }
    try {
      if (squareCard.current) await squareCard.current.destroy();
      const payments = window.Square.payments(paymentConfig.square.applicationId, paymentConfig.square.locationId);
      const card = await payments.card();
      await card.attach("#square-card-container");
      squareCard.current = card;
      setSquareState("ready");
    } catch {
      setSquareState("error");
    }
  }

  useEffect(() => {
    if (window.location.hash.startsWith(CONNECTION_HANDOFF_PREFIX)) {
      const encoded = window.location.hash.slice(CONNECTION_HANDOFF_PREFIX.length);
      const browserBinding = sessionStorage.getItem(CONNECTION_BINDING_STORAGE_KEY) ?? "";
      sessionStorage.removeItem(CONNECTION_BINDING_STORAGE_KEY);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#application`);

      let handoff: { code?: unknown; state?: unknown } = {};
      try {
        const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
        const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
        handoff = JSON.parse(atob(padded)) as { code?: unknown; state?: unknown };
      } catch {
        handoff = {};
      }

      void fetch("/api/platoon/connect/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserBinding,
          code: handoff.code,
          state: handoff.state,
        }),
        cache: "no-store",
        credentials: "same-origin",
      })
        .then(async (response) => response.json() as Promise<{ redirectTo?: unknown }>)
        .then((result) => {
          if (!validConnectionRedirect(result.redirectTo)) throw new Error("Invalid redirect.");
          window.location.replace(result.redirectTo);
        })
        .catch(() => {
          window.location.replace("/join?platoon=error#application");
        });
      return;
    }

    const search = new URLSearchParams(window.location.search);
    if (search.get("platoon_start") !== "1" || !platoonConnectionOrigin) return;
    if (window.location.origin !== platoonConnectionOrigin) {
      const canonicalJoin = new URL("/join", platoonConnectionOrigin);
      canonicalJoin.searchParams.set("type", applicationType);
      canonicalJoin.searchParams.set("platoon_start", "1");
      canonicalJoin.hash = "application";
      window.location.replace(canonicalJoin);
      return;
    }

    search.delete("platoon_start");
    const cleanedSearch = search.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${cleanedSearch ? `?${cleanedSearch}` : ""}#application`,
    );
    void beginPlatoonConnection(platoonConnectionOrigin, applicationType).catch(() => {
      sessionStorage.removeItem(CONNECTION_BINDING_STORAGE_KEY);
      window.location.assign(`/join?platoon=unavailable&type=${applicationType}#application`);
    });
  }, [applicationType, platoonConnectionOrigin]);

  async function handlePlatoonSignIn(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (connectionStarting) return;
    setConnectionStarting(true);
    if (!platoonConnectionOrigin) {
      setConnectionStarting(false);
      return;
    }
    try {
      if (window.location.origin !== platoonConnectionOrigin) {
        const canonicalJoin = new URL("/join", platoonConnectionOrigin);
        canonicalJoin.searchParams.set("type", applicationType);
        canonicalJoin.searchParams.set("platoon_start", "1");
        canonicalJoin.hash = "application";
        window.location.assign(canonicalJoin);
        return;
      }
      await beginPlatoonConnection(platoonConnectionOrigin, applicationType);
    } catch {
      sessionStorage.removeItem(CONNECTION_BINDING_STORAGE_KEY);
      setConnectionStarting(false);
      window.location.assign(`/join?platoon=unavailable&type=${applicationType}#application`);
    }
  }

  function resetAttempt() {
    if (submission.status !== "submitting") {
      submissionId.current = null;
      setSubmission({ status: "idle" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentSubmissionId = submissionId.current ?? crypto.randomUUID();
    submissionId.current = currentSubmissionId;
    setSubmission({ status: "submitting" });

    try {
      const renewalMode = formData.get("renewalMode");
      if (
        !paymentConfig?.program.savedCardConsentVersion ||
        !paymentConfig.square.ready ||
        squareState !== "ready" ||
        !squareCard.current ||
        (renewalMode !== "automatic" && renewalMode !== "manual") ||
        (renewalMode === "automatic" && (
          !paymentConfig.program.recurringConsentVersion || !paymentConfig.square.annualRenewalReady
        ))
      ) {
        submissionId.current = null;
        setSubmission({ status: "error", message: "Square's secure payment form is not ready. Nothing was submitted or charged." });
        return;
      }
      const tokenization = await squareCard.current.tokenize({ intent: "STORE", customerInitiated: true });
      if (tokenization.status !== "OK" || !tokenization.token) {
        submissionId.current = null;
        setSubmission({ status: "error", message: tokenization.errors?.[0]?.message || "Square could not save this card. Review the details or use a different card." });
        return;
      }
      const response = await fetch("/api/membership-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: currentSubmissionId,
          application: {
            schemaVersion: "2026-08-02",
            applicationType,
            applicant: {
              firstName: formData.get("firstName"),
              lastName: formData.get("lastName"),
              email: formData.get("email"),
              phone: formData.get("phone"),
            },
            fireService: {
              departmentName: formData.get("fireDepartment"),
              departmentState: formData.get("departmentState"),
              rank: formData.get("rank"),
              status: formData.get("fireServiceStatus"),
              previousChapter: formData.get("previousChapter"),
              foolsId: formData.get("foolsId"),
            },
            attestations: {
              adultFirefighter: formData.get("attestation") === "on",
            },
            communications: {
              sms: {
                consent: formData.get("smsConsent") === "on",
                disclosureVersion: siteConfig.membership.smsConsent.version,
              },
            },
            payment: {
              provider: "square",
              sourceToken: tokenization.token,
              renewalMode,
              savedCardConsentVersion: paymentConfig.program.savedCardConsentVersion,
              recurringConsentVersion: renewalMode === "automatic"
                ? paymentConfig.program.recurringConsentVersion
                : null,
            },
          },
        }),
      });
      const result = (await response.json()) as {
        applicationReference?: string;
        nextAction?: "await_review" | "check_email";
        savedCard?: { brand?: string; lastFour?: string };
        renewalMode?: "automatic" | "manual";
        error?: { code?: string };
      };

      if (
        !response.ok ||
        !result.applicationReference ||
        !result.savedCard?.brand ||
        !result.savedCard.lastFour ||
        (result.renewalMode !== "automatic" && result.renewalMode !== "manual") ||
        (result.nextAction !== "await_review" && result.nextAction !== "check_email")
      ) {
        submissionId.current = null;
        const message =
          result.error?.code === "RATE_LIMITED"
            ? "The application service is busy right now. Please wait a minute and try again."
            : result.error?.code === "VALIDATION_FAILED"
              ? "Please review the form fields and try again."
              : "We couldn’t submit this application. Please try again in a moment.";
        setSubmission({ status: "error", message });
        return;
      }

      setSubmission({
        status: "success",
        applicationReference: result.applicationReference,
        nextAction: result.nextAction,
        savedCard: { brand: result.savedCard.brand, lastFour: result.savedCard.lastFour },
        renewalMode: result.renewalMode,
      });
      form.reset();
    } catch {
      submissionId.current = null;
      setSubmission({
        status: "error",
        message: "We couldn’t reach the application service. Please check your connection and try again.",
      });
    }
  }

  return (
    <>
      {paymentConfig?.square.ready ? (
        <Script id="square-web-payments" onReady={() => void initializeSquare()} src={squareScript} strategy="afterInteractive" />
      ) : null}
      <section className={styles.platoonConnection} aria-labelledby="platoon-connection-title">
        {initialConnection ? (
          <div className={styles.connectionConfirmed}>
            <span aria-hidden="true">&#10003;</span>
            <div>
              <strong id="platoon-connection-title">Platoon account connected</strong>
              <p>
                Signed in as {initialConnection.verifiedEmail}. We&apos;ll use this verified
                email and prefill available profile details for you to review.
              </p>
            </div>
            <a href="/api/platoon/connect/clear">Use another account</a>
          </div>
        ) : (
          <div className={styles.connectionPrompt}>
            <div>
              <strong id="platoon-connection-title">Already use Platoon?</strong>
              <p>Sign in to verify your email and prefill available profile details.</p>
            </div>
            {platoonSignInAvailable ? (
              <button
                aria-disabled={connectionStarting}
                disabled={connectionStarting}
                onClick={handlePlatoonSignIn}
                type="button"
              >
                {connectionStarting ? "Opening Platoon…" : "Sign in with Platoon"}
              </button>
            ) : (
              <span>Sign-in connection pending</span>
            )}
          </div>
        )}
        {!initialConnection && connectionStatus === "error" ? (
          <p className={styles.connectionError} role="alert">
            We couldn&apos;t connect that Platoon account. Please wait before trying
            again or continue with the application.
            {connectionSupportReference ? (
              <> Support reference: <strong>{connectionSupportReference}</strong>.</>
            ) : null}
          </p>
        ) : null}
        {!initialConnection && connectionStatus === "unavailable" ? (
          <p className={styles.connectionError} role="status">
            Platoon sign-in is temporarily unavailable. You can still complete the application.
          </p>
        ) : null}
      </section>

      <form className={styles.form} onChange={resetAttempt} onSubmit={handleSubmit}>
      <div className={styles.previewNotice} role="note">
        <strong>Secure deferred-charge pilot</strong>
        <p>
          Your application is reviewed before any charge. Square securely saves
          the payment method; Brew City FOOLS and Platoon never receive the full card number.
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>What can we help you with?</legend>
        <div className={styles.typeGrid}>
          <label
            className={`${styles.typeCard} ${applicationType === "new" ? styles.typeCardSelected : ""}`}
          >
            <input
              checked={applicationType === "new"}
              name="applicationType"
              onChange={() => {
                setApplicationType("new");
              }}
              type="radio"
              value="new"
            />
            <span>
              <strong>New membership</strong>
              <small>Join the Brew City chapter</small>
            </span>
            <b>{formatMoney(paymentConfig?.program.newFeeMinor ?? siteConfig.membership.newMemberPrice * 100, currency)}</b>
          </label>

          <label
            className={`${styles.typeCard} ${applicationType === "renewal" ? styles.typeCardSelected : ""}`}
          >
            <input
              checked={applicationType === "renewal"}
              name="applicationType"
              onChange={() => {
                setApplicationType("renewal");
              }}
              type="radio"
              value="renewal"
            />
            <span>
              <strong>Annual renewal</strong>
              <small>Renew your chapter membership</small>
            </span>
            <b>{formatMoney(renewalAmountMinor, currency)}</b>
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>About you</legend>
        <p className={styles.legendHelp}>
          Tell us how the chapter can reach you about your membership.
        </p>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            <span>First name</span>
            <input
              autoComplete="given-name"
              defaultValue={initialValues.firstName}
              name="firstName"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Last name</span>
            <input
              autoComplete="family-name"
              defaultValue={initialValues.lastName}
              name="lastName"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Email address</span>
            <input
              autoComplete="email"
              defaultValue={initialConnection?.verifiedEmail ?? ""}
              name="email"
              readOnly={Boolean(initialConnection)}
              required
              type="email"
            />
            {initialConnection ? <small>Verified by Platoon</small> : null}
          </label>
          <label className={styles.field}>
            <span>Phone number</span>
            <input
              autoComplete="tel"
              defaultValue={initialValues.phone}
              name="phone"
              required
              type="tel"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Your fire service</legend>
        <p className={styles.legendHelp}>
          Use the full department name rather than an abbreviation.
        </p>
        <div className={styles.fieldGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Fire department</span>
            <input
              defaultValue={initialValues.departmentName}
              name="fireDepartment"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Department state</span>
            <select
              defaultValue={initialValues.departmentState}
              name="departmentState"
              required
            >
              <option disabled value="">Select state</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Current or last-held rank</span>
            <input defaultValue={initialValues.rank} name="rank" required />
          </label>
          <label className={styles.field}>
            <span>Fire service status</span>
            <select
              defaultValue={initialValues.fireServiceStatus}
              name="fireServiceStatus"
              required
            >
              <option disabled value="">
                Choose one
              </option>
              <option value="active">Active</option>
              <option value="retired">Retired</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Previous FOOLS chapter</span>
            <input name="previousChapter" />
            <small>Optional</small>
          </label>
          <label className={styles.field}>
            <span>FOOLS ID number</span>
            <input name="foolsId" />
            <small>Optional</small>
          </label>
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Payment and renewal</legend>
        <p className={styles.legendHelp}>
          Nothing is charged today. If your application is approved, Square will charge {formatMoney(amountMinor, currency)}.
        </p>
        {squareState === "error" ? (
          <div className={styles.paymentUnavailable} role="alert">
            <strong>Secure payment form unavailable</strong>
            <p>We could not load Square&apos;s secure payment form. Your application has not been submitted and nothing was charged.</p>
          </div>
        ) : (
          <div className={styles.squareField}>
            <span>Payment method</span>
            <div aria-busy={squareState === "loading"} id="square-card-container" />
            {squareState === "loading" ? <small>Loading Square&apos;s secure card form...</small> : null}
          </div>
        )}
        <label className={styles.attestation}>
          <input disabled={squareState !== "ready"} name="savedCardAuthorization" required type="checkbox" />
          <span>
            I authorize Brew City FOOLS to save this payment method with Square and charge {formatMoney(amountMinor, currency)} only if this application is approved. I understand that nothing will be charged today and that a denied application will not be charged.
          </span>
        </label>
        <div className={styles.renewalChoices} role="radiogroup" aria-label="Membership renewal choice">
          <label>
            <input disabled={!paymentConfig?.square.annualRenewalReady} name="renewalMode" required type="radio" value="automatic" />
            <span><strong>Auto-renew annually</strong>{paymentConfig?.square.annualRenewalReady ? <b>Recommended</b> : null}<small>{paymentConfig?.square.annualRenewalReady ? "After the first paid year, charge the saved card annually at the renewal price shown before each renewal. We will email you before charging, and you can turn auto-renew off in Platoon." : "Automatic renewal is not available yet. Choose manual renewal to continue."}</small></span>
          </label>
          <label>
            <input name="renewalMode" required type="radio" value="manual" />
            <span><strong>Renew manually</strong><small>Do not charge the card automatically. Platoon will remind you before the membership expires.</small></span>
          </label>
        </div>
        <p className={styles.recurringDisclosure}>
          Auto-renew authorization continues annually until it is turned off. Brew City uses the successful approval-payment anniversary and a 30-day failed-payment grace period.
        </p>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Finish up</legend>
        <label className={styles.attestation}>
          <input name="attestation" required type="checkbox" />
          <span>
            I attest that I am at least 18 years old and am a current or retired
            firefighter. I understand Brew City FOOLS will use this information
            to review my membership and contact me about it.
          </span>
        </label>
        <div className={styles.smsConsent}>
          <input id="smsConsent" name="smsConsent" type="checkbox" />
          <span className={styles.smsConsentCopy}>
            <label htmlFor="smsConsent">
              <strong>Optional text updates</strong>
              <span>{siteConfig.membership.smsConsent.disclosure}</span>
            </label>
            <small>
              Review our <Link href={siteConfig.links.privacy}>Privacy Policy</Link>
              {" "}and <Link href={siteConfig.links.terms}>Terms of Use</Link>.
            </small>
          </span>
        </div>
      </fieldset>

      <div className={styles.checkoutSummary}>
        <dl>
          <div><dt>Due today</dt><dd>{formatMoney(0, currency)}</dd></div>
          <div><dt>Charged only if approved</dt><dd>{formatMoney(amountMinor, currency)}</dd></div>
          <div><dt>Future annual renewal</dt><dd>{formatMoney(renewalAmountMinor, currency)}</dd></div>
        </dl>
        <small>Your required renewal choice controls whether the future renewal is automatic or manual.</small>
      </div>

      <button
        className={styles.submitButton}
        disabled={squareState !== "ready" || submission.status === "submitting" || submission.status === "success"}
        type="submit"
      >
        {submission.status === "submitting"
          ? "Sending application…"
          : submission.status === "success"
            ? "Application sent"
            : "Submit application - $0 due today"}
      </button>

      {submission.status === "success" ? (
        <div className={styles.previewResult} role="status" tabIndex={-1}>
          <strong>Application submitted. No charge was made.</strong>
          <p>
            Brew City FOOLS will review your application. If approved, Square will charge {formatMoney(amountMinor, currency)} to the {submission.savedCard.brand} ending in {submission.savedCard.lastFour}. After payment succeeds, we will email your receipt and a secure link to finish setting up your Platoon account.
          </p>
          <p>{submission.renewalMode === "automatic" ? "Auto-renew annually selected." : "Manual renewal selected."} Reference: {submission.applicationReference}</p>
        </div>
      ) : null}

      {submission.status === "error" ? (
        <div className={styles.errorResult} role="alert">
          <strong>Application not sent.</strong>
          <p>{submission.message} Nothing was charged.</p>
        </div>
      ) : null}

      <p className={styles.fallback}>
        Need to submit an application today?{" "}
        <a href={siteConfig.links.application} rel="noreferrer" target="_blank">
          Use the current application form
        </a>
        .
      </p>
      </form>
    </>
  );
}
