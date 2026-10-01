import { NextRequest, NextResponse } from "next/server";
import { hostedPaidRegistrationOrigins, paidRegistrationApplicantAllowed } from "@/lib/localPaidGate";
import { APPLICATION_SIGNATURE_PATH, signedProgramHeaders } from "@/lib/platoonMembership";
import { localBackend, privateError, REGISTRATION_COOKIE, sealContinuation, UUID_PATTERN, TOKEN_PATTERN } from "@/lib/localPaidRegistration";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16_384) return privateError(400, "VALIDATION_FAILED");
    const parsed = JSON.parse(text) as { submissionId?: unknown; application?: unknown };
    if (typeof parsed.submissionId !== "string" || !UUID_PATTERN.test(parsed.submissionId) || !parsed.application || typeof parsed.application !== "object") return privateError(400, "VALIDATION_FAILED");
    const applicant = (parsed.application as { applicant?: { email?: unknown } }).applicant;
    if (!paidRegistrationApplicantAllowed(applicant?.email)) return privateError(400, hostedPaidRegistrationOrigins() ? "CONTROLLED_ACCEPTANCE_EMAIL_REQUIRED" : "LOCAL_SYNTHETIC_EMAIL_REQUIRED");
    const rawBody = JSON.stringify(parsed.application);
    const upstream = new URL("/api/public/membership-registrations", backend.endpoint.origin);
    const response = await fetch(upstream, {
      method: "POST",
      headers: signedProgramHeaders({ rawBody, idempotencyKey: parsed.submissionId, path: APPLICATION_SIGNATURE_PATH,
        programKeyId: backend.programKeyId, secret: backend.secret, bypassSecret: backend.bypassSecret }),
      body: rawBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return privateError(response.status === 400 || response.status === 409 || response.status === 429 ? response.status : 503,
      typeof (result.error as { code?: unknown } | undefined)?.code === "string" ? (result.error as { code: string }).code : "REGISTRATION_UNAVAILABLE");
    const registration = result.registration as Record<string, unknown> | undefined;
    if (typeof result.applicationReference !== "string" || typeof registration?.registrationId !== "string" ||
      !UUID_PATTERN.test(registration.registrationId) || typeof result.continuation !== "string" || !TOKEN_PATTERN.test(result.continuation) ||
      typeof result.replayed !== "boolean") return privateError();
    const outgoing = NextResponse.json({ applicationReference: result.applicationReference, registration, replayed: result.replayed }, {status:202,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
    outgoing.cookies.set(REGISTRATION_COOKIE, sealContinuation(registration.registrationId, result.continuation), {
      httpOnly: true, sameSite: "lax", secure: Boolean(hostedPaidRegistrationOrigins()), path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return outgoing;
  } catch {
    return privateError();
  }
}
