// Refund accounting and membership disposition are independent. A refund
// observation alone does not revoke an otherwise active paid entitlement.
export function canContinuePaidAccount(state: {
 captured?: unknown; entitlementActive?: unknown; paidThrough?: unknown; admissionState?: unknown; organizationMembershipState?: unknown;
}): boolean {
 // Historical paid terms can still attach to an account. The authoritative
 // projection RPC grants active organization access only within the term.
 return state.organizationMembershipState !== "removed" && state.captured === true &&
  typeof state.paidThrough === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(state.paidThrough) &&
  ['approved','account_linked'].includes(String(state.admissionState));
}
