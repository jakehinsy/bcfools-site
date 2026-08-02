"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
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

export function MembershipApplicationForm({
  connectionStatus,
  defaultType,
  initialConnection,
  platoonSignInAvailable,
}: {
  connectionStatus: "connected" | "error" | "unavailable" | null;
  defaultType: ApplicationType;
  initialConnection: PlatoonConnectionSummary | null;
  platoonSignInAvailable: boolean;
}) {
  const [applicationType, setApplicationType] =
    useState<ApplicationType>(defaultType);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const submissionId = useRef<string | null>(null);
  const nameParts = initialConnection?.profile.fullName?.trim().split(/\s+/) ?? [];
  const initialFirstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] ?? "";
  const initialLastName = nameParts.length > 1 ? nameParts.at(-1) ?? "" : "";

  const price =
    applicationType === "new"
      ? siteConfig.membership.newMemberPrice
      : siteConfig.membership.renewalPrice;

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
              <a href={`/api/platoon/connect/start?type=${applicationType}`}>
                Sign in with Platoon
              </a>
            ) : (
              <span>Sign-in connection pending</span>
            )}
          </div>
        )}
        {!initialConnection && connectionStatus === "error" ? (
          <p className={styles.connectionError} role="alert">
            We couldn&apos;t connect that Platoon account. Try again or continue with the application.
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
              defaultValue={initialFirstName}
              name="firstName"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Last name</span>
            <input
              autoComplete="family-name"
              defaultValue={initialLastName}
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
            <input autoComplete="tel" name="phone" required type="tel" />
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
              defaultValue={initialConnection?.profile.departmentName ?? ""}
              name="fireDepartment"
              required
            />
          </label>
          <label className={styles.field}>
            <span>Department state</span>
            <select defaultValue="WI" name="departmentState" required>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Current or last-held rank</span>
            <input defaultValue={initialConnection?.profile.rank ?? ""} name="rank" required />
          </label>
          <label className={styles.field}>
            <span>Fire service status</span>
            <select defaultValue="" name="fireServiceStatus" required>
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
