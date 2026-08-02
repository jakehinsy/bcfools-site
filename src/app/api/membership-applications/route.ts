import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import {
  APPLICATION_SCHEMA_VERSION,
  APPLICATION_SIGNATURE_PATH,
  CONNECTION_COOKIE,
  intakeConfiguration,
  readConnection,
  signedProgramHeaders,
} from "@/lib/platoonMembership";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16_384;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApplicationPayload = {
  schemaVersion: string;
  applicationType: "new" | "renewal";
  applicant: { firstName: string; lastName: string; email: string; phone: string };
  fireService: {
    departmentName: string;
    departmentState: string;
    rank: string;
    status: "active" | "retired";
    previousChapter: string | null;
    foolsId: string | null;
  };
  attestations: { adultFirefighter: true };
  accountConnection?: { receipt: string };
  communications: {
    sms: { consent: boolean; disclosureVersion: string };
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

function parseSubmission(value: unknown): SubmissionBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const application = root.application as Record<string, unknown> | undefined;
  const applicant = application?.applicant as Record<string, unknown> | undefined;
  const fireService = application?.fireService as Record<string, unknown> | undefined;
  const attestations = application?.attestations as Record<string, unknown> | undefined;
  const communications = application?.communications as Record<string, unknown> | undefined;
  const sms = communications?.sms as Record<string, unknown> | undefined;
  if (!application || !applicant || !fireService || !attestations || !sms) return null;

  const submissionId = requiredString(root.submissionId, 36);
  const firstName = requiredString(applicant.firstName, 100);
  const lastName = requiredString(applicant.lastName, 100);
  const email = requiredString(applicant.email, 320);
  const phone = requiredString(applicant.phone, 40);
  const departmentName = requiredString(fireService.departmentName, 200);
  const departmentState = requiredString(fireService.departmentState, 2)?.toUpperCase();
  const rank = requiredString(fireService.rank, 120);
  const previousChapter = optionalString(fireService.previousChapter, 200);
  const foolsId = optionalString(fireService.foolsId, 120);

  if (
    !submissionId ||
    !UUID_PATTERN.test(submissionId) ||
    application.schemaVersion !== APPLICATION_SCHEMA_VERSION ||
    (application.applicationType !== "new" && application.applicationType !== "renewal") ||
    !firstName ||
    !lastName ||
    !email ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
    !phone ||
    !departmentName ||
    !departmentState ||
    !/^[A-Z]{2}$/.test(departmentState) ||
    !rank ||
    (fireService.status !== "active" && fireService.status !== "retired") ||
    previousChapter === undefined ||
    foolsId === undefined ||
    attestations.adultFirefighter !== true ||
    typeof sms.consent !== "boolean" ||
    sms.disclosureVersion !== siteConfig.membership.smsConsent.version
  ) return null;

  return {
    submissionId,
    application: {
      schemaVersion: APPLICATION_SCHEMA_VERSION,
      applicationType: application.applicationType,
      applicant: { firstName, lastName, email, phone },
      fireService: {
        departmentName,
        departmentState,
        rank,
        status: fireService.status,
        previousChapter,
        foolsId,
      },
      attestations: { adultFirefighter: true },
      communications: {
        sms: {
          consent: sms.consent,
          disclosureVersion: siteConfig.membership.smsConsent.version,
        },
      },
    },
  };
}

function publicError(status: number) {
  if (status === 400) return { status: 400, code: "VALIDATION_FAILED" };
  if (status === 409) return { status: 409, code: "SUBMISSION_CONFLICT" };
  if (status === 429) return { status: 429, code: "RATE_LIMITED" };
  return { status: 503, code: "INTAKE_UNAVAILABLE" };
}

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? "0");
    if (declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED" } }, { status: 400 });
    }
    const requestText = await request.text();
    if (Buffer.byteLength(requestText) > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED" } }, { status: 400 });
    }
    let requestBody: unknown;
    try {
      requestBody = JSON.parse(requestText);
    } catch {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED" } }, { status: 400 });
    }
    const submission = parseSubmission(requestBody);
    if (!submission) {
      return NextResponse.json({ error: { code: "VALIDATION_FAILED" } }, { status: 400 });
    }

    const { endpoint, programKeyId, secret, bypassSecret } = intakeConfiguration();
    const cookieHeader = request.headers.get("cookie") ?? "";
    const connectionCookie = cookieHeader
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${CONNECTION_COOKIE}=`))
      ?.slice(CONNECTION_COOKIE.length + 1);
    const connection = readConnection(connectionCookie, secret);
    const application: ApplicationPayload = connection
      ? {
          ...submission.application,
          applicant: {
            ...submission.application.applicant,
            email: connection.verifiedEmail,
          },
          accountConnection: { receipt: connection.receipt },
        }
      : submission.application;
    const rawBody = JSON.stringify(application);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: signedProgramHeaders({
        rawBody,
        idempotencyKey: submission.submissionId,
        path: APPLICATION_SIGNATURE_PATH,
        programKeyId,
        secret,
        bypassSecret,
      }),
      body: rawBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const error = publicError(response.status);
      return NextResponse.json({ error: { code: error.code } }, { status: error.status });
    }

    const result = (await response.json()) as Record<string, unknown>;
    if (
      typeof result.applicationReference !== "string" ||
      result.reviewStatus !== "submitted" ||
      result.paymentStatus !== "not_started" ||
      (result.nextAction !== "await_review" && result.nextAction !== "check_email") ||
      typeof result.replayed !== "boolean"
    ) {
      return NextResponse.json({ error: { code: "INTAKE_UNAVAILABLE" } }, { status: 503 });
    }
    const publicResponse = NextResponse.json(
      {
        applicationReference: result.applicationReference,
        reviewStatus: "submitted",
        paymentStatus: "not_started",
        nextAction: result.nextAction,
        replayed: result.replayed,
      },
      { status: 202 },
    );
    if (connection) publicResponse.cookies.delete(CONNECTION_COOKIE);
    return publicResponse;
  } catch {
    return NextResponse.json({ error: { code: "INTAKE_UNAVAILABLE" } }, { status: 503 });
  }
}
