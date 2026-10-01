import { NextRequest, NextResponse } from "next/server";
import { localBackend, privateError, readContinuation, REGISTRATION_COOKIE, sealContinuation, TOKEN_PATTERN, UUID_PATTERN } from "@/lib/localPaidRegistration";
import { hostedPaidRegistrationOrigins } from "@/lib/localPaidGate";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const backend = localBackend(request, true);
  if (!backend) return privateError(404);
  try {
    const body = await request.json() as { registrationId?: unknown; continuation?: unknown };
    if (typeof body.registrationId !== "string" || !UUID_PATTERN.test(body.registrationId) ||
      typeof body.continuation !== "string" || !TOKEN_PATTERN.test(body.continuation)) return privateError(400, "VALIDATION_FAILED");
    const existing = readContinuation(request.cookies.get(REGISTRATION_COOKIE)?.value);
    if (existing && existing.registrationId !== body.registrationId) return privateError(409, "REGISTRATION_CONFLICT");
    const verified = await fetch(new URL("/api/public/membership-registration-continuation", backend.endpoint.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${body.continuation}`,
        ...(backend.bypassSecret ? { "x-vercel-protection-bypass": backend.bypassSecret } : {}) },
      body: JSON.stringify({ registrationId: body.registrationId, action: "status" }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
    });
    if (!verified.ok) return privateError(401, "INVALID_CONTINUATION");
    const verifiedStatus = await verified.json() as { registrationId?: unknown };
    if (verifiedStatus.registrationId !== body.registrationId) return privateError(401, "INVALID_CONTINUATION");
    const response = NextResponse.json({ ready: true },{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
    response.cookies.set(REGISTRATION_COOKIE, sealContinuation(body.registrationId, body.continuation), {
      httpOnly: true, sameSite: "lax", secure: Boolean(hostedPaidRegistrationOrigins()), path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch { return privateError(400, "VALIDATION_FAILED"); }
}
