import { notFound } from "next/navigation";
import { localPaidRegistrationEnabled, paidRegistrationSiteOrigin } from "@/lib/localPaidGate";
import { SiteHeader } from "../../../SiteHeader";
import { ControlledRegistrationReturn } from "./ControlledRegistrationReturn";

export const metadata = { title: "Brew City FOOLS Membership Continuation", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export const dynamic = "force-dynamic";
export default function ControlledReturnPage() {
  const origin = paidRegistrationSiteOrigin();
  if (!origin || !localPaidRegistrationEnabled(origin)) notFound();
  return <><SiteHeader /><main><ControlledRegistrationReturn /></main></>;
}
