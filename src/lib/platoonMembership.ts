import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";

export const APPLICATION_SCHEMA_VERSION = "2026-08-02";
export const APPLICATION_SIGNATURE_PATH = "/api/public/membership-applications";
export const CONNECTION_EXCHANGE_PATH = "/api/public/membership-connections/exchange";
export const CONNECTION_FLOW_COOKIE = "bcf_platoon_connect_flow";
export const CONNECTION_COOKIE = "bcf_platoon_connection";

const PROGRAM_KEY_PATTERN = /^mpk_[A-Za-z0-9_-]{12,80}$/;
const PROGRAM_HANDLE_PATTERN = /^mpp_[A-Za-z0-9_-]{12,80}$/;
const COOKIE_CONTEXT = "bcfools-membership-connection-v1";

export type PlatoonConnection = {
  accountId: string;
  verifiedEmail: string;
  profile: {
    fullName: string | null;
    departmentName: string | null;
    rank: string | null;
  };
  receipt: string;
  expiresAt: number;
};

export type PlatoonConnectionSummary = Pick<PlatoonConnection, "verifiedEmail" | "profile">;

type ConnectionFlow = {
  applicationType: "new" | "renewal";
  state: string;
  verifier: string;
  expiresAt: number;
};

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

export function connectionIsConfigured(): boolean {
  try {
    connectionConfiguration();
    return true;
  } catch {
    return false;
  }
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

function encryptionKey(secret: string): Buffer {
  return createHash("sha256").update(`${COOKIE_CONTEXT}:${secret}`).digest();
}

function seal(value: object, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function unseal(value: string, secret: string): unknown {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return JSON.parse(plaintext) as unknown;
  } catch {
    return null;
  }
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function createConnectionFlow(
  secret: string,
  applicationType: "new" | "renewal",
) {
  const verifier = randomBytes(48).toString("base64url");
  const flow: ConnectionFlow = {
    applicationType,
    state: randomBytes(32).toString("base64url"),
    verifier,
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
  return {
    challenge: createHash("sha256").update(verifier).digest("base64url"),
    cookieValue: seal(flow, secret),
    state: flow.state,
  };
}

export function readConnectionFlow(value: string | undefined, secret: string): ConnectionFlow | null {
  if (!value) return null;
  const decoded = unseal(value, secret) as Partial<ConnectionFlow> | null;
  if (
    !decoded ||
    (decoded.applicationType !== "new" && decoded.applicationType !== "renewal") ||
    !boundedString(decoded.state, 512) ||
    !boundedString(decoded.verifier, 128) ||
    typeof decoded.expiresAt !== "number" ||
    decoded.expiresAt <= Date.now()
  ) return null;
  return decoded as ConnectionFlow;
}

export function storeConnection(connection: PlatoonConnection, secret: string): string {
  return seal(connection, secret);
}

export function readConnection(
  value: string | undefined,
  secret: string,
): PlatoonConnection | null {
  if (!value) return null;
  const decoded = unseal(value, secret) as Partial<PlatoonConnection> | null;
  const profile = decoded?.profile as Partial<PlatoonConnection["profile"]> | undefined;
  const email = boundedString(decoded?.verifiedEmail, 320);
  if (
    !decoded ||
    !boundedString(decoded.accountId, 100) ||
    !email ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ||
    !boundedString(decoded.receipt, 2_000) ||
    typeof decoded.expiresAt !== "number" ||
    decoded.expiresAt <= Date.now() ||
    !profile
  ) return null;

  const optionalProfileString = (value: unknown, maxLength: number) =>
    value === null ? null : boundedString(value, maxLength);
  const fullName = optionalProfileString(profile.fullName, 200);
  const departmentName = optionalProfileString(profile.departmentName, 200);
  const rank = optionalProfileString(profile.rank, 120);
  if (
    (profile.fullName !== null && !fullName) ||
    (profile.departmentName !== null && !departmentName) ||
    (profile.rank !== null && !rank)
  ) return null;

  return {
    accountId: decoded.accountId as string,
    verifiedEmail: email.toLowerCase(),
    profile: { fullName, departmentName, rank },
    receipt: decoded.receipt as string,
    expiresAt: decoded.expiresAt,
  };
}

export function connectionSummary(connection: PlatoonConnection): PlatoonConnectionSummary {
  return {
    verifiedEmail: connection.verifiedEmail,
    profile: connection.profile,
  };
}

export const secureCookie = process.env.NODE_ENV === "production";
