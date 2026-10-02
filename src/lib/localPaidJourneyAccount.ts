export type LocalPaidJourneyAccount =
  | { connected: true; verified: true; maskedEmail: string }
  | { connected: true; verified: false; maskedEmail: null };

// The signed Admin journey owns account identity. The website carries only its
// bounded state; an unverified account never receives an email hint here.
export function connectedLocalPaidJourneyAccount(value: unknown): LocalPaidJourneyAccount | null {
  if (!value || typeof value !== "object") return null;
  const account = value as Record<string, unknown>;
  if (account.connected !== true) return null;
  if (account.verified === false && account.maskedEmail === null) {
    return { connected: true, verified: false, maskedEmail: null };
  }
  if (account.verified === true && typeof account.maskedEmail === "string" && account.maskedEmail.length > 0) {
    return { connected: true, verified: true, maskedEmail: account.maskedEmail };
  }
  return null;
}
