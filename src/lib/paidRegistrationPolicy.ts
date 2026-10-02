import type { MembershipProgramConfig } from "./platoonMembership";

// `available` is the server's new-registration/Checkout creation switch, not
// whether valid program information and the application form can be displayed.
export function isPaidRegistrationPolicy(value: unknown): value is NonNullable<MembershipProgramConfig["paidRegistration"]> {
  if (!value || typeof value !== "object") return false;
  const policy = value as Record<string, unknown>;
  return policy.amountMinor === 7500 && policy.currency === "USD" && policy.oneTime === true &&
    typeof policy.available === "boolean" && typeof policy.paidThrough === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(policy.paidThrough) && Number.isInteger(policy.policyRevision) &&
    (policy.formVisible === undefined || typeof policy.formVisible === "boolean") &&
    (policy.checkoutEnabled === undefined || typeof policy.checkoutEnabled === "boolean") &&
    (policy.collectionMode === undefined || ["paused", "controlled", "public"].includes(String(policy.collectionMode)));
}

// Presentation gating only. The authoritative server independently enforces
// collection, recipient, signing, organization and payment restrictions.
export function registrationSubmissionEnabled(localPaid: boolean, policy: unknown): boolean {
  return !localPaid || (isPaidRegistrationPolicy(policy) && policy.available &&
    policy.formVisible !== false && policy.collectionMode !== "paused");
}
