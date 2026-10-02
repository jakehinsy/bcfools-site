import { NextRequest, NextResponse } from "next/server";
import { hostedPaidRegistrationOrigins, paidRegistrationOrigins, paidRegistrationApplicantAllowed, productionPaidRegistrationOrigins } from "@/lib/localPaidGate";
import { APPLICATION_SIGNATURE_PATH, signedProgramHeaders } from "@/lib/platoonMembership";
import { CONTROLLED_INVITATION_COOKIE, controlledInvitationHeaders, localBackend, privateError, REGISTRATION_COOKIE, sealContinuation, UUID_PATTERN, TOKEN_PATTERN } from "@/lib/localPaidRegistration";
import { parseMembershipSubmission, networkFingerprint } from "@/lib/membershipApplicationIntake";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  try {
    const text = await request.text();
    if (Buffer.byteLength(text) > 16_384) return privateError(400, "VALIDATION_FAILED");
    const parsed = parseMembershipSubmission(JSON.parse(text));
    if (!parsed) return privateError(400, "VALIDATION_FAILED");
    if (!paidRegistrationApplicantAllowed(parsed.application.applicant.email)) return privateError(400, hostedPaidRegistrationOrigins() ? "CONTROLLED_ACCEPTANCE_EMAIL_REQUIRED" : productionPaidRegistrationOrigins() ? "VALIDATION_FAILED" : "LOCAL_SYNTHETIC_EMAIL_REQUIRED");
    const application = parsed.application.abuseProtection ? { ...parsed.application, abuseProtection: {
      ...parsed.application.abuseProtection, networkFingerprint: networkFingerprint(request, backend.secret),
    } } : parsed.application;
    const rawBody = JSON.stringify(application);
    const upstream = new URL("/api/public/membership-registrations", backend.endpoint.origin);
    const response = await fetch(upstream, {
      method: "POST",
      headers: { ...signedProgramHeaders({ rawBody, idempotencyKey: parsed.submissionId, path: APPLICATION_SIGNATURE_PATH,
        programKeyId: backend.programKeyId, secret: backend.secret, bypassSecret: backend.bypassSecret }),
        ...controlledInvitationHeaders(request.cookies.get(CONTROLLED_INVITATION_COOKIE)?.value) },
      body: rawBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return privateError([400, 403, 409, 429].includes(response.status) ? response.status : 503,
      typeof (result.error as { code?: unknown } | undefined)?.code === "string" ? (result.error as { code: string }).code : "REGISTRATION_UNAVAILABLE");
    const registration = result.registration as Record<string, unknown> | undefined;
    if (typeof result.applicationReference !== "string" || typeof registration?.registrationId !== "string" ||
      !UUID_PATTERN.test(registration.registrationId) || typeof result.continuation !== "string" || !TOKEN_PATTERN.test(result.continuation) ||
      typeof result.replayed !== "boolean") return privateError();
    const outgoing = NextResponse.json({ applicationReference: result.applicationReference, registration, replayed: result.replayed }, {status:202,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
    outgoing.cookies.set(REGISTRATION_COOKIE, sealContinuation(registration.registrationId, result.continuation), {
      httpOnly: true, sameSite: "lax", secure: Boolean(paidRegistrationOrigins()), path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return outgoing;
  } catch {
    return privateError();
  }
}
