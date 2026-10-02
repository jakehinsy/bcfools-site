import { notFound } from "next/navigation";
import { localPaidRegistrationEnabled, paidRegistrationSiteOrigin } from "@/lib/localPaidGate";
import { SiteHeader } from "../../../SiteHeader";
import { ControlledRegistrationInvitation } from "./ControlledRegistrationInvitation";

export const metadata = { title: "Brew City FOOLS Membership Invitation", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";
export default function InvitationPage() {
  const origin = paidRegistrationSiteOrigin();
  if (!origin || !localPaidRegistrationEnabled(origin)) notFound();
  return <><SiteHeader /><main><ControlledRegistrationInvitation /></main></>;
}
