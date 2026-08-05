import "server-only";

import { APPLICATION_SCHEMA_VERSION } from "./membershipApplicationContract";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  sealAuthenticatedState,
  unsealAuthenticatedState,
} from "./authenticatedState";
import type { StoredPlatoonConnection } from "./platoonConnectionCookie";

export { readConnection, storeConnection } from "./platoonConnectionCookie";

export { APPLICATION_SCHEMA_VERSION };
export const APPLICATION_SIGNATURE_PATH = "/api/public/membership-applications";
export const CONNECTION_EXCHANGE_PATH = "/api/public/membership-connections/exchange";
export const CONNECTION_COOKIE = "bcf_platoon_connection";

export type MembershipProgramConfig = {
  program: {
    formSchemaVersion: string;
    chapterName: string | null;
    chapterState: string | null;
    enabledApplicationTypes: Array<"new" | "renewal" | "transfer" | "contact_update" | "replacement_card">;
    requiresDateOfBirth: boolean;
    requiresMailingAddress: boolean;
    defaultCountryCode: string;
    currency: string;
    newFeeMinor: number;
    renewalFeeMinor: number;
    newPaymentRequired: boolean;
    renewalPaymentRequired: boolean;
    renewalSchedule: "anniversary" | "fixed_date";
    renewalGraceDays: number;
    savedCardConsentVersion: string | null;
    recurringConsentVersion: string | null;
    membershipSupportEmail: string | null;
  };
  square: {
    ready: boolean;
    environment?: "sandbox" | "production";
    applicationId?: string;
    locationId?: string;
    annualRenewalReady?: boolean;
  };
};

const PROGRAM_KEY_PATTERN = /^mpk_[A-Za-z0-9_-]{12,80}$/;
const PROGRAM_HANDLE_PATTERN = /^mpp_[A-Za-z0-9_-]{12,80}$/;
const COOKIE_CONTEXT = "bcfools-membership-connection-v1";

export type PlatoonConnection = StoredPlatoonConnection;

export type PlatoonConnectionSummary = Pick<PlatoonConnection, "verifiedEmail" | "profile">;

type ConnectionFlow = {
  applicationType: "new" | "renewal";
  browserBindingHash: string;
  verifier: string;
  expiresAt: number;
};

const BROWSER_BINDING_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function httpsEndpoint(value: string, expectedPath: string): URL {
  const endpoint = new URL(value);
  if (
    endpoint.protocol !== "https:" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== expectedPath
  ) {
    throw new Error("Platoon membership endpoint is invalid.");
  }
  return endpoint;
}

export function programCredentials() {
  const programKeyId = requiredEnvironment("PLATOON_MEMBERSHIP_PROGRAM_KEY");
  const secret = requiredEnvironment("PLATOON_MEMBERSHIP_PROGRAM_SECRET");
  if (!PROGRAM_KEY_PATTERN.test(programKeyId)) {
    throw new Error("Platoon membership program key is invalid.");
  }
  return { programKeyId, secret };
}

export function intakeConfiguration() {
  const { programKeyId, secret } = programCredentials();
  const endpoint = httpsEndpoint(
    requiredEnvironment("PLATOON_MEMBERSHIP_INTAKE_URL"),
    APPLICATION_SIGNATURE_PATH,
  );
  const bypassSecret = process.env.PLATOON_MEMBERSHIP_INTAKE_BYPASS_SECRET?.trim();
  return { endpoint, programKeyId, secret, bypassSecret };
}

export async function membershipProgramConfiguration(): Promise<MembershipProgramConfig | null> {
  try {
    const intake = intakeConfiguration();
    const { programHandle } = connectionConfiguration();
    const endpoint = new URL("/api/public/membership-program-config", intake.endpoint.origin);
    endpoint.searchParams.set("handle", programHandle);
    const response = await fetch(endpoint, {
      headers: intake.bypassSecret ? { "x-vercel-protection-bypass": intake.bypassSecret } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const result = await response.json() as MembershipProgramConfig;
    if (
      !result?.program || !result?.square ||
      !Number.isInteger(result.program.newFeeMinor) ||
      !Number.isInteger(result.program.renewalFeeMinor) ||
      result.program.formSchemaVersion !== APPLICATION_SCHEMA_VERSION ||
      !Array.isArray(result.program.enabledApplicationTypes) ||
      typeof result.program.requiresDateOfBirth !== "boolean" ||
      typeof result.program.requiresMailingAddress !== "boolean" ||
      !/^[A-Z]{2}$/.test(result.program.defaultCountryCode) ||
      !/^[A-Z]{3}$/.test(result.program.currency)
    ) return null;
    return result;
  } catch {
    return null;
  }
}

export function connectionConfiguration() {
  const { programKeyId, secret } = programCredentials();
  const programHandle = requiredEnvironment("PLATOON_MEMBERSHIP_PROGRAM_HANDLE");
  if (!PROGRAM_HANDLE_PATTERN.test(programHandle)) {
    throw new Error("Platoon membership program handle is invalid.");
  }

  const authorizeUrl = httpsEndpoint(
    requiredEnvironment("PLATOON_MEMBERSHIP_CONNECTION_AUTHORIZE_URL"),
    "/membership-connect/authorize",
  );
  const exchangeUrl = httpsEndpoint(
    requiredEnvironment("PLATOON_MEMBERSHIP_CONNECTION_EXCHANGE_URL"),
    CONNECTION_EXCHANGE_PATH,
  );
  const returnUrl = httpsEndpoint(
    requiredEnvironment("PLATOON_MEMBERSHIP_RETURN_URL"),
    "/api/platoon/connect/callback",
  );
  const bypassSecret = process.env.PLATOON_MEMBERSHIP_INTAKE_BYPASS_SECRET?.trim();

  return {
    authorizeUrl,
    bypassSecret,
    exchangeUrl,
    programHandle,
    programKeyId,
    returnUrl,
    secret,
  };
}

export function signedProgramHeaders({
  rawBody,
  idempotencyKey,
  path,
  programKeyId,
  secret,
  bypassSecret,
}: {
  rawBody: string;
  idempotencyKey: string;
  path: string;
  programKeyId: string;
  secret: string;
  bypassSecret?: string;
}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(24).toString("base64url");
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const canonicalInput = [
    "v1",
    "POST",
    path,
    programKeyId,
    idempotencyKey,
    timestamp,
    nonce,
    bodyHash,
  ].join("\n");
  const signature = createHmac("sha256", secret)
    .update(canonicalInput)
    .digest("base64url");
  return {
    "Content-Type": "application/json",
    "Idempotency-Key": idempotencyKey,
    "X-Platoon-Program-Key": programKeyId,
    "X-Platoon-Timestamp": timestamp,
    "X-Platoon-Nonce": nonce,
    "X-Platoon-Signature": `v1=${signature}`,
    ...(bypassSecret ? { "x-vercel-protection-bypass": bypassSecret } : {}),
  };
}

function seal(value: object, secret: string): string {
  return sealAuthenticatedState(value, secret, COOKIE_CONTEXT);
}

function unseal(value: string, secret: string): unknown {
  return unsealAuthenticatedState(value, secret, COOKIE_CONTEXT);
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function createConnectionFlow(
  secret: string,
  applicationType: "new" | "renewal",
  browserBindingHash: string,
) {
  if (!BROWSER_BINDING_PATTERN.test(browserBindingHash)) {
    throw new Error("The browser binding is invalid.");
  }
  const verifier = randomBytes(48).toString("base64url");
  const flow: ConnectionFlow = {
    applicationType,
    browserBindingHash,
    verifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  return {
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    // Authenticated encryption keeps the PKCE verifier confidential while
    // allowing the callback to recover its short-lived flow without relying
    // on a browser cookie surviving deployment-host redirects.
    state: seal(flow, secret),
  };
}

export function readConnectionFlow(value: string | undefined, secret: string): ConnectionFlow | null {
  if (!value) return null;
  const decoded = unseal(value, secret) as Partial<ConnectionFlow> | null;
  if (
    !decoded ||
    (decoded.applicationType !== "new" && decoded.applicationType !== "renewal") ||
    typeof decoded.browserBindingHash !== "string" ||
    !boundedString(decoded.browserBindingHash, 43) ||
    !BROWSER_BINDING_PATTERN.test(decoded.browserBindingHash) ||
    !boundedString(decoded.verifier, 128) ||
    typeof decoded.expiresAt !== "number" ||
    decoded.expiresAt <= Date.now()
  ) return null;
  return decoded as ConnectionFlow;
}

export function connectionFlowMatchesBrowser(
  flow: ConnectionFlow,
  browserBinding: string,
): boolean {
  if (!BROWSER_BINDING_PATTERN.test(browserBinding)) return false;
  const actual = createHash("sha256").update(browserBinding).digest("base64url");
  const expectedBuffer = Buffer.from(flow.browserBindingHash);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer);
}

export function connectionSummary(connection: PlatoonConnection): PlatoonConnectionSummary {
  return {
    verifiedEmail: connection.verifiedEmail,
    profile: connection.profile,
  };
}

export const secureCookie = process.env.NODE_ENV === "production";
