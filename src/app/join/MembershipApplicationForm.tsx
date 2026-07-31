"use client";

import { FormEvent, useState } from "react";
import { siteConfig } from "@/config/site";
import styles from "./join.module.css";

type ApplicationType = "new" | "renewal";

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
  const [previewSubmitted, setPreviewSubmitted] = useState(false);

  const price =
    applicationType === "new"
      ? siteConfig.membership.newMemberPrice
      : siteConfig.membership.renewalPrice;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewSubmitted(true);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.previewNotice} role="note">
        <strong>Form preview</strong>
        <p>
          This page is ready for review, but it is not connected to Platoon or
          Square yet. Nothing entered here will be saved or sent.
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
                setPreviewSubmitted(false);
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
                setPreviewSubmitted(false);
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
          <span>Due after submission</span>
          <strong>
            {applicationType === "new" ? "New membership" : "Annual renewal"}
          </strong>
          <small>One-time payment through Square</small>
        </div>
        <b>${price}.00</b>
      </div>

      <button className={styles.submitButton} type="submit">
        Continue to secure payment <span aria-hidden="true">→</span>
      </button>

      {previewSubmitted ? (
        <div className={styles.previewResult} role="status" tabIndex={-1}>
          <strong>The form itself is working.</strong>
          <p>
            In the live version, this is where your application will be saved
            securely and you will continue to Square. This preview did not save
            or transmit any information.
          </p>
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
