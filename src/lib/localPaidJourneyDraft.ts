const FIELDS = new Set([
  "firstName", "lastName", "email", "phone", "city", "addressState",
  "postalCode", "fireDepartment", "departmentState", "rank",
  "fireServiceStatus", "previousChapter", "foolsId", "attestation", "smsConsent",
]);

export function safeJourneyDraft(input: unknown): Record<string, string | boolean> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const draft: Record<string, string | boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!FIELDS.has(key)) continue;
    if (key === "attestation" || key === "smsConsent") {
      if (typeof value === "boolean") draft[key] = value;
    } else if (typeof value === "string" && value.length <= 1_000) draft[key] = value;
  }
  return draft;
}
