"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { canContinuePaidAccount } from "@/lib/paidRegistrationAccess";
import styles from "../join.module.css";

type Status = {
  registrationId: string;
  applicationReference: string;
  admissionState: string;
  paymentState: string;
  captured: boolean;
  entitlementActive: boolean;
  paidThrough: string | null;
  accountConnected: boolean;
  organizationMembershipState?:string;
  refundedAmountMinor?: number;
  refundStatus?: string | null;
  disputeStatus?: string | null;
};

const pendingKey = "bcf_local_membership_submission_v1";

export function RegistrationStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("Checking registration…");
  const [busy, setBusy] = useState(false);
  const resumeTask = useRef<Promise<void> | null>(null);

  const requestAction = useCallback(async (action: "status" | "checkout" | "verify") => {
    const response = await fetch("/api/local/membership-registration-continuation", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }), cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to confirm registration right now.");
    return response.json();
  }, []);

  const refresh = useCallback(async (verify = false) => {
    setBusy(true);
    try {
      if (verify) await requestAction("verify");
      const next = await requestAction("status") as Status;
      if (!next.registrationId || typeof next.captured !== "boolean") throw new Error("Unable to confirm registration right now.");
      setStatus(next);
      localStorage.removeItem(pendingKey);
      setMessage("");
    } catch {
      setMessage("Unable to confirm registration right now. Use your email link or try again shortly.");
    } finally { setBusy(false); }
  }, [requestAction]);

  useEffect(() => {
    let cancelled = false;
    async function resume() {
      // Strict Mode may run the effect twice. Both mounts must await the same
      // cookie-setting request before either reads status; never consume the
      // fragment and race an unauthenticated status request against it.
      if (!resumeTask.current) {
        const parts = new URLSearchParams(window.location.hash.slice(1));
        const registrationId = parts.get("registration");
        const continuation = parts.get("continuation");
        if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
        resumeTask.current = (async () => {
          if (!registrationId || !continuation) return;
          const response = await fetch("/api/local/membership-registration-resume", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ registrationId, continuation }), cache: "no-store",
          });
          if (!response.ok) throw new Error("Private registration link unavailable");
        })();
      }
      try { await resumeTask.current; }
      catch {
        if (!cancelled) setMessage("That registration link could not be resumed. Check the link in your email.");
        return;
      }
      if (!cancelled) await refresh(new URLSearchParams(window.location.search).has("returned"));
    }
    void resume();
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    if (!status || status.captured || status.admissionState === "term_exception" || (status.refundedAmountMinor ?? 0) > 0 || (status.disputeStatus && status.disputeStatus !== "none")) return;
    let checks = 0;
    const interval = window.setInterval(() => {
      if (checks++ >= 12) {
        window.clearInterval(interval);
        return;
      }
      void requestAction("status").then((next: Status) => setStatus(next)).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [status?.registrationId, status?.captured, status?.admissionState, status?.refundedAmountMinor, status?.disputeStatus, requestAction]);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await requestAction("checkout") as { state?: string; url?: string };
      if (result.state === "open" && result.url) {
        const destination = new URL(result.url);
        if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com") throw new Error();
        window.location.assign(destination.toString());
        return;
      }
      await refresh();
    } catch { setMessage("Checkout is unavailable right now. Refresh your registration status and try again."); }
    finally { setBusy(false); }
  }

  const paymentException = Boolean(status && ((status.refundedAmountMinor ?? 0) > 0 || (status.disputeStatus && status.disputeStatus !== "none") || status.admissionState === "term_exception"));

  return <section className={styles.applicationSection}>
    <div className={`shell ${styles.formPanel}`}>
      <p className={styles.eyebrow}>Membership registration</p>
      <h1>Registration status</h1>
      {message ? <p role="status">{message}</p> : null}
      {status ? <div className={styles.paymentNotice} role="status">
        <strong>{paymentException ? "Payment needs review" : status.organizationMembershipState === "removed" ? "Membership removed — contact the chapter" : status.entitlementActive ? "Membership active" : status.captured ? "Payment received" : "Registration in progress"}</strong>
        <p>Reference: {status.applicationReference}</p>
        <p>Payment: {status.captured ? "Paid" : status.paymentState.replaceAll("_", " ")}</p>
        <p>Account: {status.accountConnected ? "Connected" : "Not connected"}</p>
        {status.paidThrough ? <p>Paid through {status.paidThrough}</p> : null}
        {paymentException ? <p>{status.admissionState === "term_exception" ? "This registration needs a membership term review. Contact the chapter for help." : "A refund or payment dispute is recorded. Your payment history is preserved. Membership changes require a separate chapter decision."}</p> : null}
        {!status.captured ? <p>$75 remains outstanding until the server confirms payment.</p> : null}
      </div> : null}
      {status && !status.captured && !paymentException ? <button className={styles.submitButton} disabled={busy} onClick={startCheckout} type="button">Continue to secure checkout</button> : null}
      <div className={styles.registrationActions}>
        <button disabled={busy} onClick={() => void refresh(true)} type="button">Check payment status</button>
        {status && canContinuePaidAccount(status) ? <a href="/api/local/membership-registration-account">Continue to account</a> : null}
        <Link href="/join">Join page</Link>
      </div>
    </div>
  </section>;
}
