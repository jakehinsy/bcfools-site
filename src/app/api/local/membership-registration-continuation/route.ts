import { NextRequest, NextResponse } from "next/server";
import { CONTROLLED_INVITATION_COOKIE, controlledInvitationHeaders, CONTROLLED_REQUEST_COOKIE, CONTROLLED_REQUEST_MAX_AGE, JOURNEY_COOKIE, localBackend, privateError, readContinuation, readJourney, REGISTRATION_COOKIE, sealControlledRequest } from "@/lib/localPaidRegistration";
import { paidRegistrationMemberOrigin, paidRegistrationOrigins } from "@/lib/localPaidGate";
import { safeControlledAuthorizationUrl } from "@/lib/controlledRegistrationHandoff";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  const continuation = readContinuation(request.cookies.get(REGISTRATION_COOKIE)?.value);
  if (!continuation) return privateError(401, "CONTINUATION_REQUIRED");
  try {
    const body = await request.json() as { action?: unknown };
    if (body.action !== "status" && body.action !== "checkout" && body.action !== "verify") return privateError(400, "VALIDATION_FAILED");
    const journey = readJourney(request.cookies.get(JOURNEY_COOKIE)?.value);
    const response = await fetch(new URL("/api/public/membership-registration-continuation", backend.endpoint.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${continuation.continuation}`,
        ...controlledInvitationHeaders(request.cookies.get(CONTROLLED_INVITATION_COOKIE)?.value),
        ...(journey ? { "x-membership-registration-journey": journey } : {}),
        ...(backend.bypassSecret ? { "x-vercel-protection-bypass": backend.bypassSecret } : {}) },
      body: JSON.stringify({ registrationId: continuation.registrationId, action: body.action }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json();
    if (!response.ok) return privateError(response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404 || response.status === 409 ? response.status : 503);
    if (result.state === "authorization_required") {
      const url = safeControlledAuthorizationUrl(result.url, result.requestToken, paidRegistrationMemberOrigin());
      if (body.action !== "checkout" || !url || !controlledInvitationHeaders(request.cookies.get(CONTROLLED_INVITATION_COOKIE)?.value)["x-membership-controlled-invitation"]) return privateError();
      const outgoing = NextResponse.json({ state: "authorization_required", url, requestToken: result.requestToken }, { headers: {
        "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
      } });
      outgoing.cookies.set(CONTROLLED_REQUEST_COOKIE, sealControlledRequest(result.requestToken), {
        httpOnly: true, sameSite: "lax", secure: Boolean(paidRegistrationOrigins()), path: "/", maxAge: CONTROLLED_REQUEST_MAX_AGE,
      });
      return outgoing;
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch { return privateError(); }
}
