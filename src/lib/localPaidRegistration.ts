import "server-only";

import { sealAuthenticatedState, unsealAuthenticatedState } from "./authenticatedState";
import { intakeConfiguration, localPaidRegistrationEnabled, programCredentials } from "./platoonMembership";
import { paidRegistrationOrigins, paidRegistrationSiteOrigin } from "./localPaidGate";

export const REGISTRATION_COOKIE = "bcf_local_registration";
export const JOURNEY_COOKIE = "bcf_local_registration_journey";
export const CONTROLLED_INVITATION_COOKIE = "bcf_controlled_registration_invitation";
const CONTEXT = "bcf-local-paid-registration-v1";
const JOURNEY_CONTEXT = "bcf-local-paid-registration-journey-v1";
const INVITATION_CONTEXT = "bcf-controlled-registration-invitation-v1";
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const JOURNEY_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

export function localBackend(request: Request, mutation = false) {
  const actual = new URL(request.url);
  if (!localPaidRegistrationEnabled(actual.origin)) return null;
  const hosted = paidRegistrationOrigins();
  if (mutation) {
    try {
      const origin = new URL(request.headers.get("origin") ?? "");
      if (hosted) {
        if (origin.origin !== hosted.site || origin.href !== `${hosted.site}/` ||
          !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
        return intakeConfiguration();
      }
      const siteOrigin = paidRegistrationSiteOrigin();
      if (!siteOrigin || origin.origin !== siteOrigin || actual.origin !== siteOrigin ||
        !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return null;
    } catch { return null; }
  }
  return intakeConfiguration();
}

export function sealControlledInvitation(token: string): string {
  if (!TOKEN_PATTERN.test(token)) throw new Error("Invalid controlled invitation.");
  return sealAuthenticatedState({ token, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1_000 }, programCredentials().secret, INVITATION_CONTEXT);
}

export function readControlledInvitation(raw: string | undefined): string | null {
  if (!raw || raw.length > 1_024 || raw.split(".").length !== 3 || raw.split(".").some(part =>
    !/^[A-Za-z0-9_-]+$/.test(part) || Buffer.from(part, "base64url").toString("base64url") !== part)) return null;
  const decoded = unsealAuthenticatedState(raw, programCredentials().secret, INVITATION_CONTEXT) as Record<string, unknown> | null;
  return decoded && typeof decoded.token === "string" && TOKEN_PATTERN.test(decoded.token) &&
    typeof decoded.expiresAt === "number" && Number.isFinite(decoded.expiresAt) && decoded.expiresAt > Date.now()
    ? decoded.token : null;
}

export function controlledInvitationHeaders(rawCookie: string | undefined): Record<string, string> {
  const token = readControlledInvitation(rawCookie);
  return token ? { "x-membership-controlled-invitation": token } : {};
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

export function sealJourney(journeyToken: string): string {
  if (!JOURNEY_TOKEN_PATTERN.test(journeyToken)) throw new Error("Invalid journey.");
  return sealAuthenticatedState({ journeyToken }, programCredentials().secret, JOURNEY_CONTEXT);
}

export function readJourney(raw: string | undefined): string | null {
  if (!raw) return null;
  const decoded = unsealAuthenticatedState(raw, programCredentials().secret, JOURNEY_CONTEXT) as Record<string, unknown> | null;
  return decoded && typeof decoded.journeyToken === "string" && JOURNEY_TOKEN_PATTERN.test(decoded.journeyToken)
    ? decoded.journeyToken : null;
}

export function privateError(status = 503, code = "REGISTRATION_UNAVAILABLE") {
  return Response.json({ error: { code } }, { status,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"} });
}
