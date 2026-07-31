"use client";

import { FormEvent, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import styles from "./join.module.css";

type ApplicationType = "new" | "renewal";
type SubmissionState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; applicationReference: string }
  | { status: "error"; message: string };

const stateOptions = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export function MembershipApplicationForm({
  defaultType,
}: {
  defaultType: ApplicationType;
}) {
  const [applicationType, setApplicationType] =
    useState<ApplicationType>(defaultType);
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const submissionId = useRef<string | null>(null);

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
            schemaVersion: "2026-07-31",
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
          },
        }),
      });
      const result = (await response.json()) as {
        applicationReference?: string;
        error?: { code?: string };
      };

      if (!response.ok || !result.applicationReference) {
        const message =
          result.error?.code === "RATE_LIMITED"
            ? "The test system is busy right now. Please wait a minute and try again."
            : result.error?.code === "VALIDATION_FAILED"
              ? "Please review the form fields and try again."
              : "We couldn’t send this test application. Please try again in a moment.";
        setSubmission({ status: "error", message });
        return;
      }

      setSubmission({ status: "success", applicationReference: result.applicationReference });
      form.reset();
    } catch {
      setSubmission({
        status: "error",
        message: "We couldn’t reach the test system. Please check your connection and try again.",
      });
    }
  }

  return (
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
            <input autoComplete="given-name" name="firstName" required />
          </label>
          <label className={styles.field}>
            <span>Last name</span>
            <input autoComplete="family-name" name="lastName" required />
          </label>
          <label className={styles.field}>
            <span>Email address</span>
            <input autoComplete="email" name="email" required type="email" />
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
            <input name="fireDepartment" required />
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
            <input name="rank" required />
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
            Platoon saved this application for chapter review. No payment was
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
  );
}
