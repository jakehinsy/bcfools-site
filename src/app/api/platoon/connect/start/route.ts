import { NextResponse } from "next/server";
import {
  connectionConfiguration,
  createConnectionFlow,
} from "@/lib/platoonMembership";
import { isLoopbackHostname } from "@/lib/localPaidGate";

export const runtime = "nodejs";

function configuredReturnUrl(): URL | null {
  try {
    const returnUrl = new URL(process.env.PLATOON_MEMBERSHIP_RETURN_URL ?? "");
    const localHttp = process.env.NODE_ENV !== "production" &&
      returnUrl.protocol === "http:" && isLoopbackHostname(returnUrl.hostname);
    if (
      (!localHttp && returnUrl.protocol !== "https:") ||
      returnUrl.username ||
      returnUrl.password ||
      returnUrl.search ||
      returnUrl.hash ||
      returnUrl.pathname !== "/api/platoon/connect/callback"
    ) {
      return null;
    }
    return returnUrl;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const applicationType = requestUrl.searchParams.get("type") === "renewal"
    ? "renewal"
    : "new";
  const browserBindingHash = requestUrl.searchParams.get("binding")?.trim() ?? "";
  try {
    const config = connectionConfiguration();
    const flow = createConnectionFlow(
      config.secret,
      applicationType,
      browserBindingHash,
    );
    const destination = new URL(config.authorizeUrl);
    destination.searchParams.set("program", config.programHandle);
    destination.searchParams.set("return_url", config.returnUrl.toString());
    destination.searchParams.set("state", flow.state);
    destination.searchParams.set("code_challenge", flow.challenge);

    return NextResponse.redirect(destination, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    const returnUrl = configuredReturnUrl();
    if (!returnUrl) {
      return NextResponse.json(
        { error: "Membership connection is unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const destination = new URL("/join", returnUrl);
    destination.searchParams.set("platoon", "unavailable");
    destination.searchParams.set("type", applicationType);
    destination.hash = "application";
    return NextResponse.redirect(destination);
  }
}
