export const LOCAL_PAID_DRAFT_KEY = "bcf_local_membership_draft_v1";

const DRAFT_FIELDS = [
  "firstName", "lastName", "dateOfBirth", "email", "phone", "addressLine1",
  "addressLine2", "city", "addressState", "postalCode", "fireDepartment",
  "departmentState", "rank", "fireServiceStatus", "previousChapter", "foolsId",
  "attestation", "smsConsent",
] as const;

export type LocalPaidDraft = Partial<Record<(typeof DRAFT_FIELDS)[number], string | boolean>>;

export function collectLocalPaidDraft(form: HTMLFormElement): LocalPaidDraft {
  const draft: LocalPaidDraft = {};
  for (const name of DRAFT_FIELDS) {
    const field = form.elements.namedItem(name);
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) continue;
    draft[name] = field instanceof HTMLInputElement && field.type === "checkbox" ? field.checked : field.value;
  }
  return draft;
}

export function restoreLocalPaidDraft(form: HTMLFormElement, draft: LocalPaidDraft): void {
  for (const name of DRAFT_FIELDS) {
    const field = form.elements.namedItem(name);
    const value = draft[name];
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) continue;
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      if (typeof value === "boolean") field.checked = value;
    } else if (typeof value === "string" && !(field instanceof HTMLInputElement && field.readOnly)) {
      field.value = value;
    }
  }
}

export function parseLocalPaidDraft(raw: string | null): LocalPaidDraft | null {
  if (!raw || raw.length > 16_384) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Record<string, unknown>;
    const draft: LocalPaidDraft = {};
    for (const name of DRAFT_FIELDS) {
      const value = candidate[name];
      if (typeof value === "string" && value.length <= 1_000) draft[name] = value;
      if (typeof value === "boolean") draft[name] = value;
    }
    return draft;
  } catch { return null; }
}
