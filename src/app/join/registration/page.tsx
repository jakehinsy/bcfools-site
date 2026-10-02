import { notFound } from "next/navigation";
import { localPaidRegistrationEnabled } from "@/lib/platoonMembership";
import { paidRegistrationSiteOrigin } from "@/lib/localPaidGate";
import { SiteHeader } from "../../SiteHeader";
import { RegistrationStatus } from "./RegistrationStatus";

export const metadata={title:"Brew City FOOLS Membership Status",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const origin = paidRegistrationSiteOrigin();
  if (!origin || !localPaidRegistrationEnabled(origin)) notFound();
  return <><SiteHeader /><main><RegistrationStatus /></main></>;
}
