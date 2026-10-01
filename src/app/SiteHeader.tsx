import { siteConfig } from "@/config/site";
import { hostedPaidRegistrationOrigins } from "@/lib/localPaidGate";
import { SiteHeaderClient } from "./SiteHeaderClient";

export function memberDashboardUrl(): string | null {
  if (process.env.BREW_MEMBERSHIP_PAID_ACCEPTANCE !== "true") return siteConfig.links.memberDashboard;
  const memberOrigin = hostedPaidRegistrationOrigins()?.member;
  return memberOrigin
    ? new URL("/organization-join?organization=brew-city-fools", memberOrigin).toString()
    : null;
}

export function SiteHeader() {
  return <SiteHeaderClient memberDashboardUrl={memberDashboardUrl()} />;
}
