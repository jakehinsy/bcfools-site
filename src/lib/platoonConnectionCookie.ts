import {
  sealAuthenticatedState,
  unsealAuthenticatedState,
} from "./authenticatedState.ts";
import type { PlatoonExchangeConnection } from "./platoonConnectionPayload.ts";

const COOKIE_CONTEXT = "bcfools-membership-connection-v1";

export type StoredPlatoonConnection = PlatoonExchangeConnection & {
  expiresAt: number;
};

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

export function storeConnection(
  connection: StoredPlatoonConnection,
  secret: string,
): string {
  return sealAuthenticatedState(connection, secret, COOKIE_CONTEXT);
}

export function readConnection(
  value: string | undefined,
  secret: string,
): StoredPlatoonConnection | null {
  if (!value) return null;
  const decoded = unsealAuthenticatedState(
    value,
    secret,
    COOKIE_CONTEXT,
  ) as Partial<StoredPlatoonConnection> | null;
  const profile = decoded?.profile as Partial<StoredPlatoonConnection["profile"]> | undefined;
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

  const optionalProfileString = (candidate: unknown, maxLength: number) =>
    candidate === null ? null : boundedString(candidate, maxLength);
  const fullName = optionalProfileString(profile.fullName, 200);
  const phone = optionalProfileString(profile.phone, 40);
  const departmentName = optionalProfileString(profile.departmentName, 200);
  const departmentState = optionalProfileString(profile.departmentState, 2)?.toUpperCase() ?? null;
  const rank = optionalProfileString(profile.rank, 120);
  const fireServiceStatusValue = profile.fireServiceStatus;
  const fireServiceStatus =
    fireServiceStatusValue === "active" || fireServiceStatusValue === "retired"
      ? fireServiceStatusValue
      : null;
  if (
    (profile.fullName !== null && !fullName) ||
    (profile.phone !== null && !phone) ||
    (profile.departmentName !== null && !departmentName) ||
    (profile.departmentState !== null &&
      (!departmentState || !/^[A-Z]{2}$/.test(departmentState))) ||
    (profile.rank !== null && !rank) ||
    (profile.fireServiceStatus !== null && !fireServiceStatus) ||
    (!departmentName && (phone || departmentState || rank || fireServiceStatus))
  ) return null;

  return {
    accountId: decoded.accountId as string,
    verifiedEmail: email.toLowerCase(),
    profile: {
      fullName,
      phone,
      departmentName,
      departmentState,
      rank,
      fireServiceStatus,
    },
    receipt: decoded.receipt as string,
    expiresAt: decoded.expiresAt,
  };
}
