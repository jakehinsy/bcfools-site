"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "../../join.module.css";

export function ControlledRegistrationInvitation() {
  const token = useRef<string | null>(null);
  const initialized = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const supplied = new URLSearchParams(window.location.hash.slice(1)).get("invitation");
    window.history.replaceState(null, "", window.location.pathname);
    if (supplied && /^[A-Za-z0-9_-]{43}$/.test(supplied)) {
      token.current = supplied;
      setReady(true);
    } else setMessage("This private registration invitation is unavailable. Please contact the membership team.");
  }, []);
  async function continueRegistration() {
    if (!token.current || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/membership-registration-invitation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitation: token.current }), cache: "no-store",
      });
      if (!response.ok) throw new Error();
      token.current = null;
      window.location.assign("/join");
    } catch { setMessage("This private registration invitation cannot be used right now. Please contact the membership team."); }
    finally { setBusy(false); }
  }
  return <section className={styles.registrationSection}><div className={styles.registrationPanel}>
    <p className={styles.eyebrow}>Brew City FOOLS membership</p><h1>Private registration invitation</h1>
    <p>Your invitation lets you continue a controlled membership registration. Signing in does not grant membership; payment and account verification remain required.</p>
    {message ? <p role="status">{message}</p> : null}
    {ready ? <button className={styles.submitButton} disabled={busy} onClick={() => void continueRegistration()} type="button">{busy ? "Checking invitation…" : "Continue to membership application"}</button> : null}
    <div className={styles.registrationActions}><Link href="/join">View application</Link></div>
  </div></section>;
}
