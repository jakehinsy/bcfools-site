import "server-only";

import { sealAuthenticatedState, unsealAuthenticatedState } from "./authenticatedState";
import { intakeConfiguration, localPaidRegistrationEnabled, programCredentials } from "./platoonMembership";

export const REGISTRATION_COOKIE = "bcf_local_registration";
const CONTEXT = "bcf-local-paid-registration-v1";
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function localBackend(request: Request, mutation = false) {
  if (!localPaidRegistrationEnabled(new URL(request.url).origin)) return null;
  if (mutation) {
    try {
      const origin = new URL(request.headers.get("origin") ?? "");
      const actual = new URL(request.url);
      const hostOrigin = new URL(`${actual.protocol}//${request.headers.get("host") ?? actual.host}`);
      if (origin.origin !== hostOrigin.origin ||
        !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
    } catch { return null; }
  }
  return intakeConfiguration();
}

export function sealContinuation(registrationId: string, continuation: string): string {
  if (!UUID_PATTERN.test(registrationId) || !TOKEN_PATTERN.test(continuation)) throw new Error("Invalid continuation.");
  return sealAuthenticatedState({ registrationId, continuation }, programCredentials().secret, CONTEXT);
}

export function readContinuation(raw: string | undefined): { registrationId: string; continuation: string } | null {
  if (!raw) return null;
  const decoded = unsealAuthenticatedState(raw, programCredentials().secret, CONTEXT) as Record<string, unknown> | null;
  if (!decoded || typeof decoded.registrationId !== "string" || !UUID_PATTERN.test(decoded.registrationId) ||
    typeof decoded.continuation !== "string" || !TOKEN_PATTERN.test(decoded.continuation)) return null;
  return { registrationId: decoded.registrationId, continuation: decoded.continuation };
}

export function privateError(status = 503, code = "REGISTRATION_UNAVAILABLE") {
  return Response.json({ error: { code } }, { status,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"} });
}
