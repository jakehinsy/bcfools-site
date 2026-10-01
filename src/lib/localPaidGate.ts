export function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function localPaidRegistrationEnabled(siteOrigin: string): boolean {
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
