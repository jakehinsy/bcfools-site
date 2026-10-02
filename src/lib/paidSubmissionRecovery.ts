import { parseLocalPaidDraft, type LocalPaidDraft } from "./localPaidDraft.ts";

// A transport failure preserves the exact pending request. Only the server's
// definitive bot rejection proves this request needs fresh proof rather than
// recovery of an already-persisted application/obligation.
export function shouldRefreshPaidBotProof(status: number, code: unknown): boolean {
  return status === 403 && code === "BOT_CHECK_FAILED";
}

export function pendingSubmissionDraft(raw: string | null): LocalPaidDraft | null {
  if (!raw || raw.length > 16_384) return null;
  try {
    const root = JSON.parse(raw) as { application?: Record<string, unknown> };
    const application = root.application;
    if (!application || application.applicationType !== "new") return null;
    const applicant = application.applicant as Record<string, unknown> | undefined;
    const address = applicant?.mailingAddress as Record<string, unknown> | undefined;
    const fire = application.fireService as Record<string, unknown> | undefined;
    const history = application.foolsHistory as Record<string, unknown> | undefined;
    const attestations = application.attestations as Record<string, unknown> | undefined;
    const communications = application.communications as { sms?: { consent?: unknown } } | undefined;
    return parseLocalPaidDraft(JSON.stringify({
      firstName: applicant?.firstName, lastName: applicant?.lastName, dateOfBirth: applicant?.dateOfBirth,
      email: applicant?.email, phone: applicant?.phone, addressLine1: address?.addressLine1,
      addressLine2: address?.addressLine2, city: address?.city, addressState: address?.state, postalCode: address?.postalCode,
      fireDepartment: fire?.departmentName, departmentState: fire?.departmentState, rank: fire?.rank,
      fireServiceStatus: fire?.status, previousChapter: history?.previousChapter, foolsId: history?.foolsId,
      attestation: attestations?.adultFirefighter, smsConsent: communications?.sms?.consent,
    }));
  } catch { return null; }
}
