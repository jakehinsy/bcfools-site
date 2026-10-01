import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { signedProgramHeaders } from "@/lib/platoonMembership";
import { safeJourneyDraft } from "@/lib/localPaidJourneyDraft";
import {
  JOURNEY_COOKIE, JOURNEY_TOKEN_PATTERN, localBackend, privateError, readContinuation, readJourney,
  REGISTRATION_COOKIE, sealJourney,
} from "@/lib/localPaidRegistration";

export const runtime = "nodejs";

const JOURNEY_PATH = "/api/local/membership-registration-journey";
function privateJson(value: object, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}

function safeMemberJourneyUrl(raw: unknown, path: "/membership/registration/sign-in" | "/membership/registration/preflight"): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(raw);
    const configured = process.env.PLATOON_MEMBER_WEB_ORIGIN?.trim();
    const memberOrigin = configured ? new URL(configured) : null;
    if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.port !== "3002" ||
      (memberOrigin && (memberOrigin.protocol !== "http:" || memberOrigin.origin !== url.origin || memberOrigin.pathname !== "/" || memberOrigin.search || memberOrigin.hash)) ||
      url.pathname !== path ||
      url.hash || !JOURNEY_TOKEN_PATTERN.test(url.searchParams.get("journey") ?? "") ||
      [...url.searchParams.keys()].some((key) => key !== "journey")) return null;
    return url.toString();
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16_384) return privateError(400, "VALIDATION_FAILED");
    const body = JSON.parse(raw) as Record<string, unknown>;
    const action = body.action;
    if (!["create", "redeem", "status", "switch", "bindCurrent"].includes(String(action))) return privateError(400, "VALIDATION_FAILED");
    const existing = readJourney(request.cookies.get(JOURNEY_COOKIE)?.value);
    if (action === "status" && !existing) return privateJson({ account: { connected: false } });
    if (action === "bindCurrent" && !existing) return privateJson({ bound: false });
    if (action === "redeem" && (typeof body.returnCode !== "string" || !/^[A-Za-z0-9_-]{24,256}$/.test(body.returnCode))) return privateError(400, "VALIDATION_FAILED");
    const registration = action === "bindCurrent" ? readContinuation(request.cookies.get(REGISTRATION_COOKIE)?.value) : null;
    if (action === "bindCurrent" && !registration) return privateError(401, "CONTINUATION_REQUIRED");

    const upstreamBody: Record<string, unknown> = {
      action: action === "bindCurrent" ? "bindRegistration" : action,
      ...(existing ? { journeyToken: existing } : {}),
      ...(action === "create" ? { draft: safeJourneyDraft(body.draft) } : {}),
      ...(action === "redeem" ? { returnCode: body.returnCode } : {}),
      ...(registration ? { registrationId: registration.registrationId, continuation: registration.continuation } : {}),
    };
    const rawBody = JSON.stringify(upstreamBody);
    const response = await fetch(new URL(JOURNEY_PATH, backend.endpoint.origin), {
      method: "POST",
      headers: signedProgramHeaders({ rawBody, idempotencyKey: randomUUID(), path: JOURNEY_PATH,
        programKeyId: backend.programKeyId, secret: backend.secret, bypassSecret: backend.bypassSecret }),
      body: rawBody,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) return privateError([400, 401, 403, 404, 409].includes(response.status) ? response.status : 503,
      typeof (result.error as { code?: unknown } | undefined)?.code === "string" ? (result.error as { code: string }).code : "REGISTRATION_UNAVAILABLE");
    if (action === "switch") {
      return privateJson({ account: { connected: false } });
    }
    const journeyToken = typeof result.journeyToken === "string" && JOURNEY_TOKEN_PATTERN.test(result.journeyToken)
      ? result.journeyToken : existing;
    if ((action === "create" || action === "redeem") && !journeyToken) return privateError();
    if (action === "create") {
      const signInUrl = safeMemberJourneyUrl(result.signInUrl, "/membership/registration/sign-in");
      const preflightUrl = safeMemberJourneyUrl(result.preflightUrl, "/membership/registration/preflight");
      if (!signInUrl || !preflightUrl || new URL(signInUrl).searchParams.get("journey") !== journeyToken ||
        new URL(preflightUrl).searchParams.get("journey") !== journeyToken) return privateError();
      const outgoing = privateJson({ signInUrl, preflightUrl });
      outgoing.cookies.set(JOURNEY_COOKIE, sealJourney(journeyToken!), {
        httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 24,
      });
      return outgoing;
    }
    if (action === "redeem") {
      const account = result.account as Record<string, unknown> | undefined;
      if (account?.connected !== true || account.verified !== true || typeof account.maskedEmail !== "string") return privateError();
      const outgoing = privateJson({ account: { connected: true, verified: true, maskedEmail: account.maskedEmail }, draft: safeJourneyDraft(result.draft) });
      outgoing.cookies.set(JOURNEY_COOKIE, sealJourney(journeyToken!), {
        httpOnly: true, sameSite: "lax", secure: false, path: "/", maxAge: 60 * 60 * 24,
      });
      return outgoing;
    }
    if (action === "status") {
      const account = result.account as Record<string, unknown> | undefined;
      return privateJson({
        generation: Number.isSafeInteger(result.generation) && (result.generation as number) >= 0 ? result.generation : null,
        account: account?.connected === true && account.verified === true && typeof account.maskedEmail === "string"
          ? { connected: true, verified: true, maskedEmail: account.maskedEmail } : { connected: false },
      });
    }
    return privateJson({ bound: result.bound === true });
  } catch { return privateError(); }
}
