import { createHmac } from "node:crypto";
import { siteConfig } from "@/config/site";
import { APPLICATION_SCHEMA_VERSION } from "./membershipApplicationContract";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Preserve the production Turnstile and structured-application intake contract.
export type ApplicationPayload = {
  schemaVersion: string;
  applicationType: "new";
  applicant: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    mailingAddress: {
      addressLine1: string;
      addressLine2: string | null;
      city: string;
      state: string;
      postalCode: string;
      countryCode: string;
    };
  };
  fireService: {
    departmentName: string;
    departmentState: string;
    rank: string;
    status: "active" | "retired";
  };
  foolsHistory: { previousChapter: string | null; foolsId: string | null; foolsIdNotAssigned: false };
  attestations: { adultFirefighter: true; version: string };
  accountConnection?: { receipt: string };
  communications: {
    sms: { consent: boolean; disclosureVersion: string };
  };
  abuseProtection?: {
    turnstileToken: string;
    formStartedAt: string;
    website: string;
    networkFingerprint: string | null;
  };
};

type SubmissionBody = { submissionId: string; application: ApplicationPayload };

function requiredString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function optionalString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return requiredString(value, maxLength) ?? undefined;
}

function abuseProtectionProof(value: unknown): ApplicationPayload["abuseProtection"] | null | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const proof = value as Record<string, unknown>;
  const turnstileToken = requiredString(proof.turnstileToken, 2_048);
  const formStartedAt = requiredString(proof.formStartedAt, 40);
  const website = typeof proof.website === "string" && proof.website.length <= 200
    ? proof.website
    : null;
  if (!turnstileToken || !formStartedAt || !Number.isFinite(Date.parse(formStartedAt)) || website === null) {
    return null;
  }
  return { turnstileToken, formStartedAt, website, networkFingerprint: null };
}

export function networkFingerprint(request: Request, secret: string): string | null {
  const forwarded = request.headers.get("x-vercel-forwarded-for") ??
    (process.env.NODE_ENV !== "production" ? request.headers.get("x-forwarded-for") : null);
  const address = forwarded?.split(",", 1)[0]?.trim();
  if (!address || address.length > 128) return null;
  return createHmac("sha256", secret)
    .update(`membership-network-v1:${address}`)
    .digest("hex");
}

function isAdultDateOfBirth(value: string): boolean {
  const birthDate = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0, 10) !== value) return false;
  const today = new Date();
  const adultCutoff = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  const oldestCutoff = new Date(Date.UTC(today.getUTCFullYear() - 110, today.getUTCMonth(), today.getUTCDate()));
  return birthDate <= adultCutoff && birthDate >= oldestCutoff;
}

export function parseMembershipSubmission(value: unknown): SubmissionBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const application = root.application as Record<string, unknown> | undefined;
  const applicant = application?.applicant as Record<string, unknown> | undefined;
  const fireService = application?.fireService as Record<string, unknown> | undefined;
  const foolsHistory = application?.foolsHistory as Record<string, unknown> | undefined;
  const attestations = application?.attestations as Record<string, unknown> | undefined;
  const communications = application?.communications as Record<string, unknown> | undefined;
  const sms = communications?.sms as Record<string, unknown> | undefined;
  const mailingAddress = applicant?.mailingAddress as Record<string, unknown> | undefined;
  const abuseProtection = abuseProtectionProof(application?.abuseProtection);
  if (!application || !applicant || !mailingAddress || !fireService || !foolsHistory || !attestations || !sms) return null;
  if (abuseProtection === null) return null;
  if (Object.hasOwn(application, "payment")) return null;

  const submissionId = requiredString(root.submissionId, 36);
  const firstName = requiredString(applicant.firstName, 100);
  const lastName = requiredString(applicant.lastName, 100);
  const email = requiredString(applicant.email, 320);
  const phone = requiredString(applicant.phone, 40);
  const dateOfBirth = requiredString(applicant.dateOfBirth, 10);
  const addressLine1 = requiredString(mailingAddress.addressLine1, 200);
  const addressLine2 = optionalString(mailingAddress.addressLine2, 200);
  const city = requiredString(mailingAddress.city, 120);
  const addressState = requiredString(mailingAddress.state, 2)?.toUpperCase();
  const postalCode = requiredString(mailingAddress.postalCode, 20)?.toUpperCase();
  const countryCode = requiredString(mailingAddress.countryCode, 2)?.toUpperCase();
  const departmentName = requiredString(fireService.departmentName, 200);
  const departmentState = requiredString(fireService.departmentState, 2)?.toUpperCase();
  const rank = requiredString(fireService.rank, 120);
  const previousChapter = optionalString(foolsHistory.previousChapter, 200);
  const foolsId = optionalString(foolsHistory.foolsId, 120);

  if (
    !submissionId ||
    !UUID_PATTERN.test(submissionId) ||
    application.schemaVersion !== APPLICATION_SCHEMA_VERSION ||
    application.applicationType !== "new" ||
    !firstName ||
    !lastName ||
    !email ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
    !phone ||
    !dateOfBirth ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    !isAdultDateOfBirth(dateOfBirth) ||
    !addressLine1 || addressLine2 === undefined || !city || !addressState || !/^[A-Z]{2}$/.test(addressState) ||
    !postalCode || !/^\d{5}(-\d{4})?$/.test(postalCode) || countryCode !== "US" ||
    !departmentName ||
    !departmentState ||
    !/^[A-Z]{2}$/.test(departmentState) ||
    !rank ||
    (fireService.status !== "active" && fireService.status !== "retired") ||
    previousChapter === undefined ||
    foolsId === undefined ||
    foolsHistory.foolsIdNotAssigned !== false ||
    attestations.adultFirefighter !== true ||
    attestations.version !== "fools-membership-v1" ||
    typeof sms.consent !== "boolean" ||
    sms.disclosureVersion !== siteConfig.membership.smsConsent.version
  ) return null;

  return {
    submissionId,
    application: {
      schemaVersion: APPLICATION_SCHEMA_VERSION,
      applicationType: application.applicationType,
      applicant: {
        firstName,
        lastName,
        dateOfBirth,
        email,
        phone,
        mailingAddress: { addressLine1, addressLine2, city, state: addressState, postalCode, countryCode },
      },
      fireService: {
        departmentName,
        departmentState,
        rank,
        status: fireService.status,
      },
      foolsHistory: { previousChapter, foolsId, foolsIdNotAssigned: false },
      attestations: { adultFirefighter: true, version: "fools-membership-v1" },
      communications: {
        sms: {
          consent: sms.consent,
          disclosureVersion: siteConfig.membership.smsConsent.version,
        },
      },
      ...(abuseProtection ? { abuseProtection } : {}),
    },
  };
}
