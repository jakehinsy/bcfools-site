export function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

const FORBIDDEN_PROJECTS = new Set(["baugcxlhxcyszqoetxfq", "kbnqzraryggeselfnaki", "tedmfbjackajexhdqrpb"]);
function exactHttpsOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" &&
      !url.search && !url.hash && raw === url.origin ? url.origin : null;
  } catch { return null; }
}

export function hostedPaidRegistrationOrigins(): { site: string; admin: string; member: string } | null {
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE !== "true" ||
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

export function paidRegistrationMemberOriginAllowed(url: URL): boolean {
  const hosted = hostedPaidRegistrationOrigins();
  if (hosted) return url.protocol === "https:" && url.origin === hosted.member && !url.username && !url.password;
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true") return false;
  const configured = process.env.PLATOON_MEMBER_WEB_ORIGIN?.trim();
  try {
    const member = configured ? new URL(configured) : null;
    return url.protocol === "http:" && isLoopbackHostname(url.hostname) && url.port === "3002" &&
      (!member || (member.protocol === "http:" && member.origin === url.origin && member.pathname === "/" &&
        !member.search && !member.hash && !member.username && !member.password));
  } catch { return false; }
}

export function localPaidRegistrationEnabled(siteOrigin: string): boolean {
  const hosted = hostedPaidRegistrationOrigins();
  if (hosted) return siteOrigin === hosted.site;
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true") return false;
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
  if (hostedPaidRegistrationOrigins()) {
    const allowed=(process.env.BREW_MEMBERSHIP_ACCEPTANCE_RECIPIENTS??"").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean);
    return allowed.length>0 && allowed.length<=30 && allowed.every(value=>/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) && allowed.includes(normalized);
  }
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE === "true") return false;
  return /^[^\s@]+@example\.test$/i.test(normalized);
}
