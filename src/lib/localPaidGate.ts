export function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

const FORBIDDEN_PROJECTS = new Set(["baugcxlhxcyszqoetxfq", "kbnqzraryggeselfnaki", "tedmfbjackajexhdqrpb"]);
export const PRODUCTION_PAID_REGISTRATION = Object.freeze({
  site: "https://brewcityfools.com",
  admin: "https://admin.platoonapp.com",
  member: "https://app.platoonapp.com",
  project: "baugcxlhxcyszqoetxfq",
  organization: "65a6f189-213c-42ea-9f7f-6508c34d082d",
  program: "75623f17-1280-432c-8798-3d3ff746e304",
});
type PaidRegistrationOrigins = { site: string; admin: string; member: string };
function exactHttpsOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" &&
      !url.search && !url.hash && raw === url.origin ? url.origin : null;
  } catch { return null; }
}

export function productionPaidRegistrationOrigins(): PaidRegistrationOrigins | null {
  if (process.env.BREW_MEMBERSHIP_PAID_PRODUCTION !== "true" ||
    process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true" ||
    process.env.BREW_MEMBERSHIP_PAID_LOCAL === "true" ||
    process.env.BREW_MEMBERSHIP_STRIPE_ENVIRONMENT !== "production") return null;
  const binding = PRODUCTION_PAID_REGISTRATION;
  if (exactHttpsOrigin(process.env.BREW_MEMBERSHIP_SITE_ORIGIN) !== binding.site ||
    exactHttpsOrigin(process.env.PLATOON_MEMBERSHIP_ADMIN_ORIGIN) !== binding.admin ||
    exactHttpsOrigin(process.env.PLATOON_MEMBER_WEB_ORIGIN) !== binding.member ||
    process.env.PLATOON_MEMBERSHIP_SUPABASE_URL !== `https://${binding.project}.supabase.co` ||
    (process.env.PLATOON_MEMBERSHIP_ORGANIZATION_ID !== undefined && process.env.PLATOON_MEMBERSHIP_ORGANIZATION_ID !== binding.organization) ||
    (process.env.PLATOON_MEMBERSHIP_PROGRAM_ID !== undefined && process.env.PLATOON_MEMBERSHIP_PROGRAM_ID !== binding.program) ||
    process.env.PLATOON_MEMBERSHIP_INTAKE_URL !== `${binding.admin}/api/public/membership-applications`) return null;
  return { site: binding.site, admin: binding.admin, member: binding.member };
}

export function hostedPaidRegistrationOrigins(): PaidRegistrationOrigins | null {
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE !== "true" ||
    process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true" ||
    process.env.BREW_MEMBERSHIP_STRIPE_ENVIRONMENT !== "sandbox") return null;
  const site = exactHttpsOrigin(process.env.BREW_MEMBERSHIP_SITE_ORIGIN);
  const admin = exactHttpsOrigin(process.env.PLATOON_MEMBERSHIP_ADMIN_ORIGIN);
  const member = exactHttpsOrigin(process.env.PLATOON_MEMBER_WEB_ORIGIN);
  if (!site || !admin || !member || new Set([site, admin, member]).size !== 3) return null;
  try {
    const intake = new URL(process.env.PLATOON_MEMBERSHIP_INTAKE_URL ?? "");
    const db = new URL(process.env.PLATOON_MEMBERSHIP_SUPABASE_URL ?? "");
    const ref = db.hostname.endsWith(".supabase.co") ? db.hostname.slice(0, -".supabase.co".length) : "";
    if (intake.origin !== admin || intake.protocol !== "https:" || intake.pathname !== "/api/public/membership-applications" ||
      intake.username || intake.password || intake.search || intake.hash ||
      db.protocol !== "https:" || db.username || db.password || db.pathname !== "/" || db.search || db.hash ||
      !/^[a-z0-9]{20}$/.test(ref) || FORBIDDEN_PROJECTS.has(ref) ||
      ref !== process.env.PLATOON_MEMBERSHIP_ACCEPTANCE_PROJECT_REF) return null;
  } catch { return null; }
  return { site, admin, member };
}

export function paidRegistrationOrigins(): PaidRegistrationOrigins | null {
  return productionPaidRegistrationOrigins() ?? hostedPaidRegistrationOrigins();
}

/** A configured hosted journey uses its canonical origin, never forwarded host data. */
export function paidRegistrationSiteOrigin(): string | null {
  const hosted = paidRegistrationOrigins();
  if (hosted) return hosted.site;
  if (process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true" || process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true") return null;
  if (process.env.BREW_MEMBERSHIP_PAID_LOCAL !== "true" || process.env.NODE_ENV === "production") return null;
  try {
    const site = new URL(process.env.BREW_MEMBERSHIP_SITE_ORIGIN ?? "http://localhost:3000");
    return site.protocol === "http:" && isLoopbackHostname(site.hostname) && site.pathname === "/" &&
      !site.search && !site.hash && !site.username && !site.password ? site.origin : null;
  } catch { return null; }
}

export function paidRegistrationJourneyPath(): string {
  return "/api/public/membership-registration-journey";
}

export function paidRegistrationMemberOriginAllowed(url: URL): boolean {
  const hosted = paidRegistrationOrigins();
  if (hosted) return url.protocol === "https:" && url.origin === hosted.member && !url.username && !url.password;
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true" || process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true") return false;
  const configured = process.env.PLATOON_MEMBER_WEB_ORIGIN?.trim();
  try {
    const member = configured ? new URL(configured) : null;
    return url.protocol === "http:" && isLoopbackHostname(url.hostname) && url.port === "3002" &&
      (!member || (member.protocol === "http:" && member.origin === url.origin && member.pathname === "/" &&
        !member.search && !member.hash && !member.username && !member.password));
  } catch { return false; }
}

/** Presentation/navigation context; no browser value selects this origin. */
export function paidRegistrationMemberOrigin(): string | null {
  const hosted = paidRegistrationOrigins();
  if (hosted) return hosted.member;
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true" || process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true" ||
    process.env.BREW_MEMBERSHIP_PAID_LOCAL !== "true" || process.env.NODE_ENV === "production") return null;
  try {
    const raw = process.env.PLATOON_MEMBER_WEB_ORIGIN ?? "http://localhost:3002";
    const member = new URL(raw);
    return raw === member.origin && member.pathname === "/" && !member.search && !member.hash &&
      paidRegistrationMemberOriginAllowed(member) ? member.origin : null;
  } catch { return null; }
}

export function localPaidRegistrationEnabled(siteOrigin: string): boolean {
  const hosted = paidRegistrationOrigins();
  if (hosted) return siteOrigin === hosted.site;
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true" || process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true") return false;
  if (process.env.BREW_MEMBERSHIP_PAID_LOCAL !== "true" || process.env.NODE_ENV === "production") return false;
  try {
    const site = new URL(siteOrigin);
    const intake = new URL(process.env.PLATOON_MEMBERSHIP_INTAKE_URL ?? "");
    return site.protocol === "http:" && isLoopbackHostname(site.hostname) &&
      intake.protocol === "http:" && isLoopbackHostname(intake.hostname) &&
      intake.pathname === "/api/public/membership-applications" && !site.username && !site.password &&
      !intake.username && !intake.password;
  } catch {
    return false;
  }
}

/** Hosted tests use controlled deliverable inboxes; local tests remain synthetic-only. */
export function paidRegistrationApplicantAllowed(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const normalized=email.trim().toLowerCase();
  // Public/controlled collection is authorized by the server-owned policy and
  // invitation binding, not by knowledge of an email address.
  if (productionPaidRegistrationOrigins()) return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(normalized);
  if (hostedPaidRegistrationOrigins()) {
    const allowed=(process.env.BREW_MEMBERSHIP_ACCEPTANCE_RECIPIENTS??"").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean);
    return allowed.length>0 && allowed.length<=30 && allowed.every(value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) && allowed.includes(normalized);
  }
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true" || process.env.BREW_MEMBERSHIP_PAID_PRODUCTION === "true") return false;
  return /^[^\s@]+@example\.test$/i.test(normalized);
}
