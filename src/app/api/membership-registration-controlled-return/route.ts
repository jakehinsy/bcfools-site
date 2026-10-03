import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { paidRegistrationOrigins } from "@/lib/localPaidGate";
import { signedProgramHeaders } from "@/lib/platoonMembership";
import {
  CONTROLLED_INVITATION_COOKIE, CONTROLLED_REQUEST_COOKIE, controlledInvitationHeaders, localBackend, privateError,
  readContinuation, readControlledRequest, REGISTRATION_COOKIE, sealContinuation, TOKEN_PATTERN, UUID_PATTERN,
} from "@/lib/localPaidRegistration";

export const runtime = "nodejs";
const RETURN_PATH = "/api/public/membership-registration-controlled-return";

// A navigation only renders the return page. Cookie/account state is changed
// exclusively through this intentional, protected same-origin JSON POST.
export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_024) return privateError(400, "VALIDATION_FAILED");
    const body = JSON.parse(raw) as { requestToken?: unknown; returnCode?: unknown };
    if (!body || typeof body.requestToken !== "string" || !TOKEN_PATTERN.test(body.requestToken) ||
      typeof body.returnCode !== "string" || !TOKEN_PATTERN.test(body.returnCode)) return privateError(400, "VALIDATION_FAILED");
    const expected = readControlledRequest(request.cookies.get(CONTROLLED_REQUEST_COOKIE)?.value);
    const invitation = controlledInvitationHeaders(request.cookies.get(CONTROLLED_INVITATION_COOKIE)?.value);
    if (expected !== body.requestToken || !invitation["x-membership-controlled-invitation"]) return privateError(401, "CONTROLLED_CONTINUATION_REQUIRED");
    const rawBody = JSON.stringify({ requestToken: body.requestToken, returnCode: body.returnCode });
    const response = await fetch(new URL(RETURN_PATH, backend.endpoint.origin), {
      method: "POST", headers: {
        ...signedProgramHeaders({ rawBody, idempotencyKey: randomUUID(), path: RETURN_PATH,
          programKeyId: backend.programKeyId, secret: backend.secret, bypassSecret: backend.bypassSecret }),
        ...invitation,
      }, body: rawBody, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return privateError([400, 401, 403, 404, 409].includes(response.status) ? response.status : 503, "CONTROLLED_CONTINUATION_UNAVAILABLE");
    const result = await response.json() as Record<string, unknown>;
    const registration = result.registration as Record<string, unknown> | undefined;
    if (typeof result.applicationReference !== "string" || typeof registration?.registrationId !== "string" ||
      !UUID_PATTERN.test(registration.registrationId) || typeof result.continuation !== "string" || !TOKEN_PATTERN.test(result.continuation) ||
      typeof result.replayed !== "boolean") return privateError();
    const existing = readContinuation(request.cookies.get(REGISTRATION_COOKIE)?.value);
    if (existing && existing.registrationId !== registration.registrationId) return privateError(409, "REGISTRATION_CONFLICT");
    const outgoing = NextResponse.json({ ready: true }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    outgoing.cookies.set(REGISTRATION_COOKIE, sealContinuation(registration.registrationId, result.continuation), {
      httpOnly: true, sameSite: "lax", secure: Boolean(paidRegistrationOrigins()), path: "/", maxAge: 30 * 24 * 60 * 60,
    });
    outgoing.cookies.delete(CONTROLLED_REQUEST_COOKIE);
    return outgoing;
  } catch { return privateError(503, "CONTROLLED_CONTINUATION_UNAVAILABLE"); }
}
