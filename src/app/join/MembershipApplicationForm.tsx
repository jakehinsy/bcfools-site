"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { membershipFormDefaults } from "@/lib/platoonConnectionPayload";
import type { PlatoonConnectionSummary } from "@/lib/platoonMembership";
import styles from "./join.module.css";

type ApplicationType = "new" | "renewal";
type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      applicationReference: string;
      nextAction: "await_review" | "check_email";
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
}: {
  connectionSupportReference: string | null;
  connectionStatus: "connected" | "error" | "unavailable" | null;
  defaultType: ApplicationType;
  initialConnection: PlatoonConnectionSummary | null;
  platoonConnectionOrigin: string | null;
  platoonSignInAvailable: boolean;
}) {
  const [applicationType, setApplicationType] =
    useState<ApplicationType>(defaultType);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [connectionStarting, setConnectionStarting] = useState(false);
  const submissionId = useRef<string | null>(null);
  const initialValues = membershipFormDefaults(initialConnection);

  const price =
    applicationType === "new"
      ? siteConfig.membership.newMemberPrice
      : siteConfig.membership.renewalPrice;

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
          },
        }),
      });
      const result = (await response.json()) as {
        applicationReference?: string;
        nextAction?: "await_review" | "check_email";
        error?: { code?: string };
      };

      if (
        !response.ok ||
        !result.applicationReference ||
        (result.nextAction !== "await_review" && result.nextAction !== "check_email")
      ) {
        const message =
          result.error?.code === "RATE_LIMITED"
            ? "The test system is busy right now. Please wait a minute and try again."
            : result.error?.code === "VALIDATION_FAILED"
              ? "Please review the form fields and try again."
              : "We couldn’t send this test application. Please try again in a moment.";
        setSubmission({ status: "error", message });
        return;
      }

      setSubmission({
        status: "success",
        applicationReference: result.applicationReference,
        nextAction: result.nextAction,
      });
      form.reset();
    } catch {
      setSubmission({
        status: "error",
        message: "We couldn’t reach the test system. Please check your connection and try again.",
      });
    }
  }

  return (
    <>
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
        <strong>Staging preview</strong>
        <p>
          Applications submitted here are saved only in Platoon&apos;s test
          environment for internal review. Square is not connected, and this is
          not yet the live application. Please use test details only.
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
            <b>${siteConfig.membership.newMemberPrice}</b>
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
              <small>One-time payment for this year</small>
            </span>
            <b>${siteConfig.membership.renewalPrice}</b>
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
        <div>
          <span>Due after chapter approval</span>
          <strong>
            {applicationType === "new" ? "New membership" : "Annual renewal"}
          </strong>
          <small>One-time payment through Square</small>
        </div>
        <b>${price}.00</b>
      </div>

      <button
        className={styles.submitButton}
        disabled={submission.status === "submitting" || submission.status === "success"}
        type="submit"
      >
        {submission.status === "submitting"
          ? "Sending application…"
          : submission.status === "success"
            ? "Application sent"
            : "Submit for chapter review"}
      </button>

      {submission.status === "success" ? (
        <div className={styles.previewResult} role="status" tabIndex={-1}>
          <strong>Test application received.</strong>
          <p>
            {submission.nextAction === "check_email"
              ? "Check your email for the secure Platoon activation or sign-in step. "
              : "Your verified Platoon account is connected to this application. "}
            The chapter review and payment steps remain separate. No payment was
            requested or charged. Test reference: {submission.applicationReference}
          </p>
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
