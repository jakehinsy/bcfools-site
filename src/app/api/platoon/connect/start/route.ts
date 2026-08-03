import { NextResponse } from "next/server";
import {
  connectionConfiguration,
  createConnectionFlow,
} from "@/lib/platoonMembership";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const applicationType = new URL(request.url).searchParams.get("type") === "renewal"
    ? "renewal"
    : "new";
  try {
    const config = connectionConfiguration();
    const flow = createConnectionFlow(config.secret, applicationType);
    const destination = new URL(config.authorizeUrl);
    destination.searchParams.set("program", config.programHandle);
    destination.searchParams.set("return_url", config.returnUrl.toString());
    destination.searchParams.set("state", flow.state);
    destination.searchParams.set("code_challenge", flow.challenge);

    return NextResponse.redirect(destination, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    const destination = new URL("/join", request.url);
    destination.searchParams.set("platoon", "unavailable");
    destination.searchParams.set("type", applicationType);
    destination.hash = "application";
    return NextResponse.redirect(destination);
  }
}
