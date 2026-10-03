"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { controlledReturnFragment } from "@/lib/controlledRegistrationHandoff";
import styles from "../../join.module.css";

export function ControlledRegistrationReturn() {
  const task = useRef<Promise<void> | null>(null);
  const [message, setMessage] = useState("Confirming your secure Platoon account continuation…");
  useEffect(() => {
    let cancelled = false;
    if (!task.current) {
      const context = controlledReturnFragment(window.location.hash);
      window.history.replaceState(null, "", window.location.pathname);
      task.current = (async () => {
        if (!context) throw new Error("Controlled return unavailable.");
        const response = await fetch("/api/membership-registration-controlled-return", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(context), cache: "no-store",
        });
        if (!response.ok || (await response.json()).ready !== true) throw new Error("Controlled return unavailable.");
      })();
    }
    void task.current.then(() => {
      if (!cancelled) window.location.replace("/join/registration");
    }).catch(() => {
      if (!cancelled) setMessage("Your secure continuation could not be confirmed. Return to the application to resume the same registration, or contact the membership team for help.");
    });
    return () => { cancelled = true; };
  }, []);
  return <section className={styles.registrationSection}><div className={styles.registrationPanel}>
    <p className={styles.eyebrow}>Brew City FOOLS membership</p>
    <h1>Continue your membership registration</h1>
    <p role="status">{message}</p>
    <div className={styles.registrationActions}><Link href="/join">Return to application</Link></div>
  </div></section>;
}
