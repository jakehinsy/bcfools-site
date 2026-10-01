import { NextRequest, NextResponse } from "next/server";
import { localBackend, readContinuation, REGISTRATION_COOKIE } from "@/lib/localPaidRegistration";

import { canContinuePaidAccount } from "@/lib/paidRegistrationAccess";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const backend = localBackend(request);
  if (!backend) return new Response(null, { status: 404 });
  const state = readContinuation(request.cookies.get(REGISTRATION_COOKIE)?.value);
  if (!state) return privateRedirect(new URL("/join/registration", request.url));
  try {
    const response = await fetch(new URL("/api/public/membership-registration-continuation", backend.endpoint.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.continuation}`,
        ...(backend.bypassSecret ? { "x-vercel-protection-bypass": backend.bypassSecret } : {}) },
      body: JSON.stringify({ registrationId: state.registrationId, action: "status" }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return privateRedirect(new URL("/join/registration", request.url));
    const status = await response.json() as { registrationId?: unknown; captured?: unknown; entitlementActive?: unknown; paidThrough?: unknown; admissionState?: unknown; refundedAmountMinor?: unknown; disputeStatus?: unknown; organizationMembershipState?: unknown };
    if (status.registrationId !== state.registrationId || !canContinuePaidAccount(status)) return privateRedirect(new URL("/join/registration", request.url));
  } catch { return privateRedirect(new URL("/join/registration", request.url)); }
  const destination = new URL("/membership/registration/account", backend.endpoint.origin);
  destination.hash = new URLSearchParams({ registration: state.registrationId, continuation: state.continuation }).toString();
  return privateRedirect(destination);
}

function privateRedirect(url:URL){const response=NextResponse.redirect(url);response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;}
