"use client";

import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { APPLICATION_SCHEMA_VERSION } from "@/lib/membershipApplicationContract";
import { collectLocalPaidDraft, LOCAL_PAID_DRAFT_KEY, parseLocalPaidDraft, restoreLocalPaidDraft } from "@/lib/localPaidDraft";
import { safeJourneyDraft } from "@/lib/localPaidJourneyDraft";
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
      nextAction: "await_review";
    }
  | { status: "error"; message: string };
type PaidAccount = { connected: true; verified: true; maskedEmail: string };

const stateOptions = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

const CONNECTION_BINDING_STORAGE_KEY = "bcf_platoon_connect_binding";
const CONNECTION_HANDOFF_PREFIX = "#platoon-connect=";
const PAID_ACCOUNT_PROBE_KEY = "bcf_paid_account_probe_v1";

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
  initialConnection,
  platoonConnectionOrigin,
  platoonSignInAvailable,
  programConfig,
  localPaid,
  renewalUrl,
}: {
  connectionSupportReference: string | null;
  connectionStatus: "connected" | "error" | "unavailable" | null;
  initialConnection: PlatoonConnectionSummary | null;
  platoonConnectionOrigin: string | null;
  platoonSignInAvailable: boolean;
  programConfig: MembershipProgramConfig | null;
  localPaid: boolean;
  renewalUrl: string;
}) {
  const [submission, setSubmission] = useState<SubmissionState>({ status: "idle" });
  const [connectionStarting, setConnectionStarting] = useState(false);
  const [paidAccount, setPaidAccount] = useState<PaidAccount | null>(null);
  const [paidAccountChecking, setPaidAccountChecking] = useState(localPaid);
  const [paidAccountBusy, setPaidAccountBusy] = useState(false);
  const [paidAccountMessage, setPaidAccountMessage] = useState("");
  const submissionId = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const accountGeneration = useRef(0);
  const manualAccountNavigation = useRef(false);
  const initialValues = membershipFormDefaults(initialConnection);

  const newMemberAmountMinor = localPaid ? 7500 : programConfig?.program.newFeeMinor ?? siteConfig.membership.newMemberPrice * 100;
  const renewalAmountMinor = programConfig?.program.renewalFeeMinor ?? siteConfig.membership.renewalPrice * 100;
  const currency = programConfig?.program.currency ?? "USD";
  const pendingKey = "bcf_local_membership_submission_v1";

  useEffect(() => {
    if (!localPaid || !formRef.current) return;
    try {
      const draft = parseLocalPaidDraft(sessionStorage.getItem(LOCAL_PAID_DRAFT_KEY));
      if (draft) restoreLocalPaidDraft(formRef.current, draft);
    } catch { /* Server journey draft can still restore nonrestricted fields. */ }
  }, [localPaid]);

  function rememberLocalPaidDraft() {
    if (!localPaid || !formRef.current) return;
    try { sessionStorage.setItem(LOCAL_PAID_DRAFT_KEY, JSON.stringify(collectLocalPaidDraft(formRef.current))); }
    catch { /* Continue with the server journey draft. */ }
  }

  async function paidJourneyAction(action: "create" | "redeem" | "status" | "switch" | "bindCurrent", extra: Record<string, unknown> = {}) {
    const response = await fetch("/api/local/membership-registration-journey", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }), cache: "no-store",
    });
    if (!response.ok) throw new Error("Account connection unavailable.");
    return response.json() as Promise<{ signInUrl?: string; preflightUrl?: string; account?: PaidAccount | { connected: false }; draft?: unknown }>;
  }

  useEffect(() => {
    if (!localPaid) return;
    const generation = accountGeneration.current;
    const query = new URLSearchParams(window.location.search);
    const returnCode = query.get("account_return");
    const probeReturned = query.get("account_probe") === "none";
    if (returnCode !== null || probeReturned) {
      query.delete("account_return");
      query.delete("account_probe");
      const cleaned = query.toString();
      window.history.replaceState(null, "", `/join${cleaned ? `?${cleaned}` : ""}#application`);
      try { sessionStorage.setItem(PAID_ACCOUNT_PROBE_KEY, "1"); } catch { /* Skip repeated probes if storage is unavailable. */ }
    }
    void (async () => {
      let leavingForProbe = false;
      try {
        const result = returnCode
          ? await paidJourneyAction("redeem", { returnCode })
          : await paidJourneyAction("status");
        if (accountGeneration.current !== generation) return;
        if (result.account?.connected === true && result.account.verified === true) {
          setPaidAccount(result.account);
          let hasSameTabDraft = false;
          try { hasSameTabDraft = Boolean(sessionStorage.getItem(LOCAL_PAID_DRAFT_KEY)); } catch { /* Use server draft. */ }
          if (returnCode && formRef.current && !hasSameTabDraft) {
            const serverDraft = parseLocalPaidDraft(JSON.stringify(result.draft ?? null));
            if (serverDraft) restoreLocalPaidDraft(formRef.current, serverDraft);
          }
        } else if (returnCode) {
          setPaidAccountMessage("That account could not be connected. You can try again or continue the application.");
        } else if (!probeReturned && !manualAccountNavigation.current) {
          let probeAvailable = false;
          try {
            probeAvailable = sessionStorage.getItem(PAID_ACCOUNT_PROBE_KEY) !== "1";
            if (probeAvailable) sessionStorage.setItem(PAID_ACCOUNT_PROBE_KEY, "1");
          } catch { /* Do not risk a redirect loop without tab storage. */ }
          if (probeAvailable && accountGeneration.current === generation) {
            // A resumed registration takes priority over first-visit account discovery.
            let pendingRegistration = false;
            try { pendingRegistration = Boolean(localStorage.getItem(pendingKey)); } catch { /* Existing status is checked below. */ }
            if (pendingRegistration) return;
            const registrationStatus = await fetch("/api/local/membership-registration-continuation", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "status" }), cache: "no-store",
            });
            if (registrationStatus.ok) {
              if (accountGeneration.current === generation) window.location.assign("/join/registration");
              return;
            }
            if (registrationStatus.status !== 401) return;
            rememberLocalPaidDraft();
            const created = await paidJourneyAction("create", {
              draft: formRef.current ? safeJourneyDraft(collectLocalPaidDraft(formRef.current)) : {},
            });
            if (accountGeneration.current !== generation || manualAccountNavigation.current || !created.preflightUrl) return;
            leavingForProbe = true;
            window.location.assign(created.preflightUrl);
          }
        }
      } catch {
        if (accountGeneration.current === generation) setPaidAccountMessage("Account sign-in is unavailable. You can still complete the application.");
      } finally {
        if (accountGeneration.current === generation && !leavingForProbe) setPaidAccountChecking(false);
      }
    })();
  }, [localPaid]);

  async function handlePaidSignIn() {
    if (paidAccountBusy || submission.status === "submitting") return;
    manualAccountNavigation.current = true;
    accountGeneration.current += 1;
    rememberLocalPaidDraft();
    setPaidAccountBusy(true);
    setPaidAccountMessage("");
    try {
      const result = await paidJourneyAction("create", { draft: formRef.current ? safeJourneyDraft(collectLocalPaidDraft(formRef.current)) : {} });
      if (!result.signInUrl) throw new Error();
      window.location.assign(result.signInUrl);
    } catch {
      setPaidAccountMessage("Account sign-in is unavailable. You can still complete the application.");
      setPaidAccountBusy(false);
    }
  }

  async function handlePaidAccountSwitch() {
    if (paidAccountBusy || submission.status === "submitting") return;
    manualAccountNavigation.current = true;
    accountGeneration.current += 1;
    rememberLocalPaidDraft();
    setPaidAccountBusy(true);
    setPaidAccountMessage("");
    try {
      await paidJourneyAction("switch");
      setPaidAccount(null);
      const created = await paidJourneyAction("create", { draft: formRef.current ? safeJourneyDraft(collectLocalPaidDraft(formRef.current)) : {} });
      if (!created.signInUrl) throw new Error();
      const switchUrl = new URL(created.signInUrl);
      if (switchUrl.pathname !== "/membership/registration/sign-in") throw new Error();
      switchUrl.pathname = "/membership/registration/switch";
      window.location.assign(switchUrl.toString());
    } catch { setPaidAccountMessage("Could not change account right now. Try again shortly."); }
    finally { setPaidAccountBusy(false); }
  }

  useEffect(() => {
    if (!localPaid) return;
    const generation = accountGeneration.current;
    const pending = localStorage.getItem(pendingKey);
    try {
      const parsed = pending ? JSON.parse(pending) as { submissionId?: unknown } : null;
      if (!pending || typeof parsed?.submissionId === "string") {
        if (typeof parsed?.submissionId === "string") submissionId.current = parsed.submissionId;
        queueMicrotask(() => { if (accountGeneration.current === generation) setSubmission({ status: "submitting" }); });
        void (async () => {
          try {
            const existing = await fetch("/api/local/membership-registration-continuation", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "status" }), cache: "no-store",
            });
            if (existing.ok) {
              localStorage.removeItem(pendingKey);
              try { await paidJourneyAction("bindCurrent"); } catch { /* Registration still resumes independently. */ }
              if (accountGeneration.current === generation) window.location.assign("/join/registration");
              return;
            }
            if (existing.status !== 401) throw new Error();
            if (!pending) {
              setSubmission({ status: "idle" });
              return;
            }
            const response = await fetch("/api/local/membership-registrations", {
              method: "POST", headers: { "Content-Type": "application/json" }, body: pending,
            });
            const result = await response.json() as { registration?: { registrationId?: string } };
            if (!response.ok || !result.registration?.registrationId) throw new Error();
            localStorage.removeItem(pendingKey);
            try { await paidJourneyAction("bindCurrent"); } catch { /* Registration still resumes independently. */ }
            if (accountGeneration.current === generation) window.location.assign("/join/registration");
          } catch {
            if (accountGeneration.current === generation) setSubmission({ status: "error", message: "Your earlier submission could not be confirmed. Retry the same attempt when the service is available." });
          }
        })();
      }
    } catch { if (pending) localStorage.removeItem(pendingKey); }
  }, [localPaid]);

  useEffect(() => {
    if (localPaid) return;
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
      canonicalJoin.searchParams.set("type", "new");
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
    void beginPlatoonConnection(platoonConnectionOrigin, "new").catch(() => {
      sessionStorage.removeItem(CONNECTION_BINDING_STORAGE_KEY);
      window.location.assign("/join?platoon=unavailable&type=new#application");
    });
  }, [platoonConnectionOrigin, localPaid]);

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
        canonicalJoin.searchParams.set("type", "new");
        canonicalJoin.searchParams.set("platoon_start", "1");
        canonicalJoin.hash = "application";
        window.location.assign(canonicalJoin);
        return;
      }
      await beginPlatoonConnection(platoonConnectionOrigin, "new");
    } catch {
      sessionStorage.removeItem(CONNECTION_BINDING_STORAGE_KEY);
      setConnectionStarting(false);
      window.location.assign("/join?platoon=unavailable&type=new#application");
    }
  }

  function resetAttempt() {
    if (localPaid && localStorage.getItem(pendingKey)) return;
    if (submission.status !== "submitting") {
      submissionId.current = null;
      setSubmission({ status: "idle" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const pending = localPaid ? localStorage.getItem(pendingKey) : null;
    const currentSubmissionId = submissionId.current ?? crypto.randomUUID();
    const generation = accountGeneration.current;
    submissionId.current = currentSubmissionId;
    setSubmission({ status: "submitting" });

    try {
      const payload = pending ? JSON.parse(pending) : {
          submissionId: currentSubmissionId,
          application: {
            schemaVersion: APPLICATION_SCHEMA_VERSION,
            applicationType: "new",
            applicant: {
              firstName: formData.get("firstName"),
              lastName: formData.get("lastName"),
              dateOfBirth: formData.get("dateOfBirth"),
              email: formData.get("email"),
              phone: formData.get("phone"),
              mailingAddress: {
                addressLine1: formData.get("addressLine1"),
                addressLine2: formData.get("addressLine2"),
                city: formData.get("city"),
                state: formData.get("addressState"),
                postalCode: formData.get("postalCode"),
                countryCode: programConfig?.program.defaultCountryCode ?? "US",
              },
            },
            fireService: {
              departmentName: formData.get("fireDepartment"),
              departmentState: formData.get("departmentState"),
              rank: formData.get("rank"),
              status: formData.get("fireServiceStatus"),
            },
            foolsHistory: {
              previousChapter: formData.get("previousChapter"),
              foolsId: formData.get("foolsId"),
              foolsIdNotAssigned: false,
            },
            attestations: {
              adultFirefighter: formData.get("attestation") === "on",
              version: "fools-membership-v1",
            },
            communications: {
              sms: {
                consent: formData.get("smsConsent") === "on",
                disclosureVersion: siteConfig.membership.smsConsent.version,
              },
            },
          },
        };
      if (localPaid && !pending) localStorage.setItem(pendingKey, JSON.stringify(payload));
      if (localPaid) {
        const existing = await fetch("/api/local/membership-registration-continuation", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status" }), cache: "no-store",
        });
        if (existing.ok) {
          localStorage.removeItem(pendingKey);
          try { await paidJourneyAction("bindCurrent"); } catch { /* Registration still resumes independently. */ }
          if (accountGeneration.current === generation) window.location.assign("/join/registration");
          return;
        }
        if (existing.status !== 401) {
          setSubmission({ status: "error", message: "We could not check your existing registration. Try again shortly." });
          return;
        }
      }
      const response = await fetch(localPaid ? "/api/local/membership-registrations" : "/api/membership-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        applicationReference?: string;
        reviewStatus?: "submitted";
        paymentStatus?: "not_started";
        nextAction?: "await_review";
        replayed?: boolean;
        error?: { code?: string };
        registration?: { registrationId?: string };
      };

      if (localPaid) {
        if (response.ok && result.registration?.registrationId && result.applicationReference) {
          localStorage.removeItem(pendingKey);
          try { sessionStorage.removeItem(LOCAL_PAID_DRAFT_KEY); } catch { /* Navigation can continue. */ }
          try { await paidJourneyAction("bindCurrent"); } catch { /* Registration still resumes independently. */ }
          if (accountGeneration.current === generation) window.location.assign("/join/registration");
          return;
        }
        setSubmission({ status: "error", message: result.error?.code === "VALIDATION_FAILED"
          ? "Please review your details. If you change them, start a new application."
          : "We could not confirm this registration. Resume the same attempt to check again." });
        return;
      }

      if (
        !response.ok ||
        !result.applicationReference ||
        result.reviewStatus !== "submitted" ||
        result.paymentStatus !== "not_started" ||
        typeof result.replayed !== "boolean" ||
        result.nextAction !== "await_review"
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
      });
      form.reset();
    } catch {
      if (!localPaid) submissionId.current = null;
      setSubmission({
        status: "error",
        message: "We couldn’t reach the application service. Please check your connection and try again.",
      });
    }
  }

  return (
    <>
      {localPaid ? (
        <section className={styles.platoonConnection} aria-labelledby="paid-account-title">
          {paidAccount ? (
            <div className={styles.connectionConfirmed}>
              <span aria-hidden="true">&#10003;</span>
              <div>
                <strong id="paid-account-title">Platoon account signed in</strong>
                <p>Verified account: {paidAccount.maskedEmail}. Use the same email in your application for automatic account connection after payment.</p>
              </div>
              <button disabled={paidAccountBusy || submission.status === "submitting"} onClick={() => void handlePaidAccountSwitch()} type="button">Change account</button>
            </div>
          ) : paidAccountChecking ? (
            <p className={styles.connectionChecking} id="paid-account-title" role="status">Checking for an existing Platoon account…</p>
          ) : (
            <div className={styles.connectionPrompt}>
              <div>
                <strong id="paid-account-title">Already have a Platoon account?</strong>
                <p>Sign in now if you like. New members can complete the application without an account.</p>
              </div>
              <button disabled={paidAccountBusy || submission.status === "submitting"} onClick={() => void handlePaidSignIn()} type="button">
                {paidAccountBusy ? "Opening Platoon…" : "Sign in with Platoon"}
              </button>
            </div>
          )}
          {paidAccountMessage ? <p className={styles.connectionError} role="status">{paidAccountMessage}</p> : null}
        </section>
      ) : null}
      {!localPaid && (initialConnection || platoonSignInAvailable || connectionStatus) ? (
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
              ) : null}
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
      ) : null}

      <form className={styles.form} ref={formRef} onChange={() => { rememberLocalPaidDraft(); resetAttempt(); }} onSubmit={handleSubmit}>
      <div className={styles.paymentNotice} role="note">
        <strong>{localPaid ? "One-time chapter registration" : "What happens after you apply"}</strong>
        <p>
          {localPaid ? `Local registration uses a synthetic @example.test email. The $75 one-time payment covers membership through ${programConfig?.paidRegistration?.paidThrough}. After submitting, continue to secure checkout. Your account will show any outstanding amount until payment is confirmed.` : <>No payment is collected with this application. Watch your email for
          the chapter&apos;s decision and, if approved, secure instructions for your
          Platoon account. The chapter will provide
          dues instructions after approval and completed Platoon onboarding.</>}
        </p>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>What can we help you with?</legend>
        <p className={styles.legendHelp}>
          {programConfig?.program.chapterName ?? siteConfig.name}{programConfig?.program.chapterState ? `, ${programConfig.program.chapterState}` : ""} | Application date is recorded when you submit.
        </p>
        <div className={styles.typeGrid}>
          <div className={`${styles.typeCard} ${styles.typeCardSelected}`}>
            <span>
              <strong>New membership</strong>
              <small>Join the Brew City chapter</small>
            </span>
            <b>{formatMoney(newMemberAmountMinor, currency)}</b>
          </div>

          {!localPaid ? <Link className={`${styles.typeCard} ${styles.typeCardLink}`} href={renewalUrl}>
            <span>
              <strong>Annual renewal</strong>
              <small>Sign in to your Platoon account</small>
            </span>
            <b>{formatMoney(renewalAmountMinor, currency)}</b>
          </Link> : null}
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
            <span>Date of birth</span>
            <input
              autoComplete="bday"
              name="dateOfBirth"
              required={programConfig?.program.requiresDateOfBirth ?? true}
              type="date"
            />
            <small>Required by FOOLS International. Visible only to authorized membership administrators.</small>
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
        <legend>Mailing address</legend>
        <p className={styles.legendHelp}>
          FOOLS International uses this address for your membership record and member correspondence.
        </p>
        <div className={styles.fieldGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Home address</span>
            <input autoComplete="address-line1" name="addressLine1" required={programConfig?.program.requiresMailingAddress ?? true} />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Address line 2</span>
            <input autoComplete="address-line2" name="addressLine2" />
            <small>Optional</small>
          </label>
          <label className={styles.field}>
            <span>City</span>
            <input autoComplete="address-level2" name="city" required={programConfig?.program.requiresMailingAddress ?? true} />
          </label>
          <label className={styles.field}>
            <span>State</span>
            <select autoComplete="address-level1" defaultValue={programConfig?.program.chapterState ?? "WI"} name="addressState" required={programConfig?.program.requiresMailingAddress ?? true}>
              <option disabled value="">Select state</option>
              {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>ZIP code</span>
            <input autoComplete="postal-code" inputMode="numeric" name="postalCode" pattern="[0-9]{5}(-[0-9]{4})?" required={programConfig?.program.requiresMailingAddress ?? true} />
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
            By submitting this application, I attest that I am at least 18 years old and am a current or retired firefighter. I will keep FOOLS International and Brew City FOOLS informed of changes to my contact information, fire department rank, or department affiliation.
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

      <button
        className={styles.submitButton}
        disabled={submission.status === "submitting" || submission.status === "success"}
        type="submit"
      >
        {submission.status === "submitting"
          ? (localPaid ? "Starting registration…" : "Sending application…")
          : submission.status === "success"
            ? "Application sent"
            : (localPaid ? "Continue to registration" : "Submit for chapter review")}
      </button>

      {submission.status === "success" ? (
        <div className={styles.submissionResult} role="status" tabIndex={-1}>
          <strong>Application submitted.</strong>
          <p>
            Watch your email for the Brew City FOOLS review decision. If approved,
            you will receive secure instructions to create or sign in to your
            Platoon web account. {`Your membership will be active with ${formatMoney(newMemberAmountMinor, currency)} in dues owed, payable under Account > Membership.`}
          </p>
          <p>Reference: {submission.applicationReference}</p>
        </div>
      ) : null}

      {submission.status === "error" ? (
        <div className={styles.errorResult} role="alert">
          <strong>Application could not be confirmed.</strong>
          <p>{submission.message}</p>
        </div>
      ) : null}

      </form>
    </>
  );
}
