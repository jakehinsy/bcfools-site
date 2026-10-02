import type { ReactNode } from "react";

export type RegistrationStatusData = {
  registrationId: string;
  applicationReference: string;
  admissionState: string;
  paymentState: string;
  captured: boolean;
  entitlementActive: boolean;
  paidThrough: string | null;
  accountConnected: boolean;
  organizationMembershipState?: string;
  refundedAmountMinor?: number;
  refundStatus?: string | null;
  disputeStatus?: string | null;
  checkoutAvailable?: boolean;
};

type Props = {
  status: RegistrationStatusData | null;
  message: string;
  busy: boolean;
  canContinueAccount: boolean;
  paidThroughLabel: string | null;
  styles: Record<string, string>;
  onCheckout: () => void;
  onCheckStatus: () => void;
  returnToApplication: ReactNode;
};

export function RegistrationSummary({ status, message, busy, canContinueAccount, paidThroughLabel, styles, onCheckout, onCheckStatus, returnToApplication }: Props) {
  const paymentException = Boolean(status && ((status.refundedAmountMinor ?? 0) > 0 || (status.disputeStatus && status.disputeStatus !== "none") || status.admissionState === "term_exception"));
  const membershipRemoved = status?.organizationMembershipState === "removed";
  const noticeTone = paymentException || membershipRemoved
    ? styles.registrationWarning
    : status?.captured ? styles.registrationPaid : "";

  return <section className={styles.registrationSection}>
    <div className={styles.registrationPanel}>
      <p className={styles.eyebrow}>Brew City FOOLS membership</p>
      <h1>Registration status</h1>
      <p className={styles.registrationIntro}>Your application, payment, and account details in one place.</p>
      {message ? <p className={styles.registrationMessage} role="status">{message}</p> : null}
      {status ? <div className={`${styles.paymentNotice} ${styles.registrationNotice} ${noticeTone}`} role="status">
        <strong>{paymentException ? "Payment needs review" : membershipRemoved ? "Membership removed — contact the chapter" : status.entitlementActive ? "Membership active" : status.captured ? "Payment received" : "Registration in progress"}</strong>
        <dl className={styles.registrationDetails}>
          <div><dt>Reference</dt><dd>{status.applicationReference}</dd></div>
          <div><dt>Payment</dt><dd>{status.captured ? "Paid" : status.paymentState.replaceAll("_", " ")}</dd></div>
          <div><dt>Account</dt><dd>{status.accountConnected ? "Connected" : "Not connected"}</dd></div>
          {paidThroughLabel ? <div><dt>Paid through</dt><dd>{paidThroughLabel}</dd></div> : null}
        </dl>
        {paymentException ? <p>{status.admissionState === "term_exception" ? "This registration needs a membership term review. Contact the chapter for help." : "A refund or payment dispute is recorded. Your payment history is preserved. Membership changes require a separate chapter decision."}</p> : null}
        {membershipRemoved ? <p>Contact the chapter for help with your membership.</p> : null}
        {!status.captured ? <p>$75 remains outstanding until payment is confirmed.</p> : null}
        {!status.captured && status.checkoutAvailable === false ? <p>Checkout is temporarily paused. Your registration is saved; check this page again later.</p> : null}
        {status.captured && canContinueAccount && !status.accountConnected ? <p>Finish setting up your account to connect your membership.</p> : null}
      </div> : null}
      {status && !status.captured && !paymentException && status.checkoutAvailable !== false ? <button className={styles.submitButton} disabled={busy} onClick={onCheckout} type="button">Continue to secure checkout</button> : null}
      {status && canContinueAccount ? <a className={styles.submitButton} href="/api/membership-registration-account">{status.accountConnected ? "Open Brew City FOOLS" : "Finish membership setup"}</a> : null}
      <div className={styles.registrationActions}>
        <button disabled={busy} onClick={onCheckStatus} type="button">Check status</button>
        {returnToApplication}
      </div>
    </div>
  </section>;
}
