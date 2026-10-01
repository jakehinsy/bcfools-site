import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { signedProgramHeaders } from "@/lib/platoonMembership";
import { JOURNEY_COOKIE, localBackend, readContinuation, readJourney, REGISTRATION_COOKIE } from "@/lib/localPaidRegistration";

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
  if (new URL(request.url).searchParams.get("auto") === "1") {
    const journeyToken = readJourney(request.cookies.get(JOURNEY_COOKIE)?.value);
    if (!journeyToken) return privateRedirect(new URL("/join/registration", request.url));
    try {
      const binding = await signedJourneyOperation(backend, {
        action: "bindRegistration", journeyToken,
        registrationId: state.registrationId, continuation: state.continuation,
      }) as { bound?: unknown };
      if (binding.bound !== true) return privateRedirect(new URL("/join/registration", request.url));
      const journey = await signedJourneyOperation(backend, { action: "status", journeyToken }) as {
        account?: { connected?: unknown; verified?: unknown };
      };
      if (journey.account?.connected !== true || journey.account.verified !== true)
        return privateRedirect(new URL("/join/registration", request.url));
    } catch { return privateRedirect(new URL("/join/registration", request.url)); }
  }
  try {
    const response = await fetch(new URL("/api/public/membership-registration-continuation", backend.endpoint.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.continuation}`,
        ...(backend.bypassSecret ? { "x-vercel-protection-bypass": backend.bypassSecret } : {}) },
      body: JSON.stringify({ registrationId: state.registrationId, action: "setup" }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) return privateRedirect(new URL("/join/registration", request.url));
    const result = await response.json() as { setupUrl?: unknown };
    const destination = safeMemberSetupUrl(result.setupUrl);
    if (!destination) return privateRedirect(new URL("/join/registration", request.url));
    return privateRedirect(destination);
  } catch { return privateRedirect(new URL("/join/registration", request.url)); }
}

async function signedJourneyOperation(backend: NonNullable<ReturnType<typeof localBackend>>, body: Record<string, unknown>): Promise<unknown> {
  const path = "/api/local/membership-registration-journey";
  const rawBody = JSON.stringify(body);
  const response = await fetch(new URL(path, backend.endpoint.origin), {
    method: "POST",
    headers: signedProgramHeaders({ rawBody, idempotencyKey: randomUUID(), path,
      programKeyId: backend.programKeyId, secret: backend.secret, bypassSecret: backend.bypassSecret }),
    body: rawBody, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Journey unavailable");
  return response.json();
}

function safeMemberSetupUrl(raw: unknown): URL | null {
  if (typeof raw !== "string") return null;
  try {
    const destination = new URL(raw);
    const configuredValue = process.env.PLATOON_MEMBER_WEB_ORIGIN?.trim();
    const configured = configuredValue ? new URL(configuredValue) : null;
    if (destination.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(destination.hostname) || destination.port !== "3002" ||
      (configured && (configured.protocol !== "http:" || configured.origin !== destination.origin || configured.pathname !== "/" || configured.search || configured.hash)) ||
      !["/membership/registration", "/membership/registration/sign-in"].includes(destination.pathname) ||
      destination.hash || [...destination.searchParams.keys()].some((key) => key !== "continuation")) return null;
    const continuation = destination.searchParams.get("continuation") ?? "";
    if (!/^[A-Za-z0-9_-]{32,256}$/.test(continuation)) return null;
    return destination;
  } catch { return null; }
}

function privateRedirect(url:URL){const response=NextResponse.redirect(url);response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;}
