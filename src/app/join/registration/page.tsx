import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { localPaidRegistrationEnabled } from "@/lib/platoonMembership";
import { SiteHeader } from "../../SiteHeader";
import { RegistrationStatus } from "./RegistrationStatus";

export const metadata={title:"Membership registration",robots:{index:false,follow:false},referrer:"no-referrer" as const};

export default async function RegistrationPage() {
  const host = (await headers()).get("host") ?? "";
  if (!localPaidRegistrationEnabled(`http://${host}`)) notFound();
  return <><SiteHeader /><main><RegistrationStatus /></main></>;
}
