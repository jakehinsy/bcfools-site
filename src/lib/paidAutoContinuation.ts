import { canContinuePaidAccount } from "./paidRegistrationAccess.ts";

export function paidAutoContinuationAttemptKey(
  status: {
    registrationId: string;
    accountConnected: boolean;
    captured: boolean;
    admissionState: string;
    paidThrough: string | null;
    organizationMembershipState?: string;
  },
  generation: unknown,
): string | null {
  if (status.accountConnected || !canContinuePaidAccount(status) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(status.registrationId) ||
    !Number.isSafeInteger(generation) || (generation as number) < 0) return null;
  return `bcf_paid_account_continuation_v1:${status.registrationId}:${generation}`;
}
