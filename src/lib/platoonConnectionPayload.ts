export type PlatoonExchangeConnection = {
  accountId: string;
  verifiedEmail: string;
  profile: {
    fullName: string | null;
    phone: string | null;
    departmentName: string | null;
    departmentState: string | null;
    rank: string | null;
    fireServiceStatus: "active" | "retired" | null;
  };
  receipt: string;
};

export function membershipFormDefaults(
  connection: Pick<PlatoonExchangeConnection, "profile"> | null,
) {
  const nameParts = connection?.profile.fullName?.trim().split(/\s+/) ?? [];
  return {
    firstName: nameParts.length > 1
      ? nameParts.slice(0, -1).join(" ")
      : nameParts[0] ?? "",
    lastName: nameParts.length > 1 ? nameParts.at(-1) ?? "" : "",
    phone: formatPhoneForForm(connection?.profile.phone ?? null),
    departmentName: connection?.profile.departmentName ?? "",
    departmentState: connection
      ? connection.profile.departmentState ?? ""
      : "WI",
    rank: connection?.profile.rank ?? "",
    fireServiceStatus: connection?.profile.fireServiceStatus ?? "",
  };
}

export function formatPhoneForForm(phone: string | null): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const nationalNumber = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
  if (nationalNumber.length !== 10) return phone;
  return `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`;
}

function requiredString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function optionalString(value: unknown, maxLength: number): string | null {
  return value === null || value === undefined
    ? null
    : requiredString(value, maxLength);
}

export function parsePlatoonExchangeResponse(value: unknown): PlatoonExchangeConnection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const profileValue = root.profile;
  const profile =
    profileValue && typeof profileValue === "object" && !Array.isArray(profileValue)
      ? profileValue as Record<string, unknown>
      : null;
  const departmentValue = profile?.department;
  const department =
    departmentValue && typeof departmentValue === "object" && !Array.isArray(departmentValue)
      ? departmentValue as Record<string, unknown>
      : null;
  const accountId = requiredString(root.accountId, 100);
  const verifiedEmail = requiredString(root.verifiedEmail, 320);
  const receipt = requiredString(root.connectionReceipt, 2_000);
  const fullName = optionalString(profile?.fullName, 200);
  const phone = optionalString(profile?.phone, 40);
  const departmentName = department ? requiredString(department.name, 200) : null;
  const departmentState = optionalString(department?.state, 2)?.toUpperCase() ?? null;
  const rank = optionalString(department?.rank, 120);
  const fireServiceStatusValue = department?.fireServiceStatus;
  const fireServiceStatus =
    fireServiceStatusValue === "active" || fireServiceStatusValue === "retired"
      ? fireServiceStatusValue
      : null;

  if (
    !accountId ||
    !verifiedEmail ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(verifiedEmail) ||
    !receipt ||
    !profile ||
    (profile.fullName !== null && profile.fullName !== undefined && !fullName) ||
    (profile.phone !== null && profile.phone !== undefined && !phone) ||
    (departmentValue !== null && departmentValue !== undefined && !department) ||
    (department && !departmentName) ||
    (department?.state !== null && department?.state !== undefined &&
      (!departmentState || !/^[A-Z]{2}$/.test(departmentState))) ||
    (department?.rank !== null && department?.rank !== undefined && !rank) ||
    (department?.fireServiceStatus !== null && department?.fireServiceStatus !== undefined &&
      !fireServiceStatus) ||
    (!department && phone)
  ) return null;

  return {
    accountId,
    verifiedEmail: verifiedEmail.toLowerCase(),
    profile: {
      fullName,
      phone,
      departmentName,
      departmentState,
      rank,
      fireServiceStatus,
    },
    receipt,
  };
}
