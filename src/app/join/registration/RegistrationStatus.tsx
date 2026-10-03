"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { canContinuePaidAccount } from "@/lib/paidRegistrationAccess";
import { paidAutoContinuationAttemptKey } from "@/lib/paidAutoContinuation";
import { safeControlledAuthorizationUrl } from "@/lib/controlledRegistrationHandoff";
import { formatMembershipTermDate } from "../formatMembershipTermDate";
import { RegistrationSummary, type RegistrationStatusData } from "./RegistrationSummary";
import styles from "../join.module.css";

type Status = RegistrationStatusData;

const pendingKey = "bcf_local_membership_submission_v1";

export function RegistrationStatus({ controlledMemberOrigin }: { controlledMemberOrigin: string | null }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [message, setMessage] = useState("Checking registration…");
  const [busy, setBusy] = useState(false);
  const resumeTask = useRef<Promise<void> | null>(null);

  const requestAction = useCallback(async (action: "status" | "checkout" | "verify") => {
    const response = await fetch("/api/membership-registration-continuation", {
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
          const response = await fetch("/api/membership-registration-resume", {
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

  useEffect(() => {
    if (!status || status.accountConnected || !canContinuePaidAccount(status)) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/membership-registration-journey", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status" }), cache: "no-store",
        });
        if (!response.ok) return;
        const journey = await response.json() as {
          generation?: unknown;
          account?: { connected?: unknown; verified?: unknown };
        };
        const attemptKey = paidAutoContinuationAttemptKey(status, journey.generation);
        if (cancelled || journey.account?.connected !== true || journey.account.verified !== true || !attemptKey) return;
        if (sessionStorage.getItem(attemptKey)) return;
        sessionStorage.setItem(attemptKey, "1");
        setMessage("Connecting your verified Platoon account…");
        window.location.assign("/api/membership-registration-account?auto=1");
      } catch { /* Manual account continuation remains available. */ }
    })();
    return () => { cancelled = true; };
  }, [status?.registrationId, status?.captured, status?.admissionState, status?.accountConnected, status?.organizationMembershipState, status?.paidThrough]);

  async function startCheckout() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await requestAction("checkout") as { state?: string; url?: string; requestToken?: string };
      if (result.state === "authorization_required") {
        const destination = safeControlledAuthorizationUrl(result.url, result.requestToken, controlledMemberOrigin);
        if (!destination) throw new Error();
        window.location.assign(destination);
        return;
      }
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

  return <RegistrationSummary
    status={status}
    message={message}
    busy={busy}
    canContinueAccount={Boolean(status && canContinuePaidAccount(status))}
    paidThroughLabel={formatMembershipTermDate(status?.paidThrough)}
    styles={styles}
    onCheckout={() => void startCheckout()}
    onCheckStatus={() => void refresh(true)}
    returnToApplication={<Link href="/join">Return to application</Link>}
  />;
}
