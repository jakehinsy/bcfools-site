import { NextRequest, NextResponse } from "next/server";
import { paidRegistrationOrigins } from "@/lib/localPaidGate";
import { programCredentials } from "@/lib/platoonMembership";
import {
  CONTROLLED_INVITATION_COOKIE, localBackend, privateError, sealControlledInvitation, TOKEN_PATTERN,
} from "@/lib/localPaidRegistration";

export const runtime = "nodejs";

// GET/navigation is intentionally not exported. An invitation is activated by
// the applicant's explicit same-origin action, without granting membership.
export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 1_024) return privateError(400, "INVALID_INVITATION");
    const body = JSON.parse(raw) as { invitation?: unknown };
    if (typeof body.invitation !== "string" || !TOKEN_PATTERN.test(body.invitation)) return privateError(400, "INVALID_INVITATION");
    const endpoint = new URL("/api/public/membership-registration-policy", backend.endpoint.origin);
    const handle = process.env.PLATOON_MEMBERSHIP_PROGRAM_HANDLE?.trim();
    if (!handle || !/^mpp_[A-Za-z0-9_-]{12,80}$/.test(handle)) return privateError();
    endpoint.searchParams.set("handle", handle);
    const response = await fetch(endpoint, {
      headers: { "x-membership-program-key": programCredentials().programKeyId,
        "x-membership-controlled-invitation": body.invitation,
        ...(backend.bypassSecret ? { "x-vercel-protection-bypass": backend.bypassSecret } : {}) },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000),
    });
    const result = await response.json() as { paidRegistration?: { available?: unknown; collectionMode?: unknown } };
    if (!response.ok || result.paidRegistration?.collectionMode !== "controlled" || result.paidRegistration.available !== true) {
      return privateError(403, "INVITATION_UNAVAILABLE");
    }
    const outgoing = NextResponse.json({ ready: true }, { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
    outgoing.cookies.set(CONTROLLED_INVITATION_COOKIE, sealControlledInvitation(body.invitation), {
      httpOnly: true, sameSite: "lax", secure: Boolean(paidRegistrationOrigins()), path: "/", maxAge: 7 * 24 * 60 * 60,
    });
    return outgoing;
  } catch { return privateError(403, "INVITATION_UNAVAILABLE"); }
}
