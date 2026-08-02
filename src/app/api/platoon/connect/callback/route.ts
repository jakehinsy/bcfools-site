import { timingSafeEqual, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  CONNECTION_COOKIE,
  CONNECTION_EXCHANGE_PATH,
  CONNECTION_FLOW_COOKIE,
  connectionConfiguration,
  readConnectionFlow,
  secureCookie,
  signedProgramHeaders,
  storeConnection,
  type PlatoonConnection,
} from "@/lib/platoonMembership";

export const runtime = "nodejs";

function sameValue(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function callbackDestination(
  returnUrl: URL,
  status: "connected" | "error",
  applicationType: "new" | "renewal" = "new",
) {
  const destination = new URL("/join", returnUrl);
  destination.searchParams.set("platoon", status);
  destination.searchParams.set("type", applicationType);
  destination.hash = "application";
  return destination;
}

function validExchangeResponse(value: unknown): PlatoonConnection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const profile = root.profile as Record<string, unknown> | undefined;
  const requiredString = (candidate: unknown, maxLength: number) =>
    typeof candidate === "string" && candidate.trim() && candidate.length <= maxLength
      ? candidate.trim()
      : null;
  const optionalString = (candidate: unknown, maxLength: number) =>
    candidate === null || candidate === undefined
      ? null
      : requiredString(candidate, maxLength);
  const accountId = requiredString(root.accountId, 100);
  const verifiedEmail = requiredString(root.verifiedEmail, 320);
  const receipt = requiredString(root.connectionReceipt, 2_000);
  const fullName = optionalString(profile?.fullName, 200);
  const departmentName = optionalString(profile?.departmentName, 200);
  const rank = optionalString(profile?.rank, 120);
  if (
    !accountId ||
    !verifiedEmail ||
    !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(verifiedEmail) ||
    !receipt ||
    !profile ||
    (profile.fullName !== null && profile.fullName !== undefined && !fullName) ||
    (profile.departmentName !== null && profile.departmentName !== undefined && !departmentName) ||
    (profile.rank !== null && profile.rank !== undefined && !rank)
  ) return null;
  return {
    accountId,
    verifiedEmail: verifiedEmail.toLowerCase(),
    profile: { fullName, departmentName, rank },
    receipt,
    expiresAt: Date.now() + 15 * 60 * 1000,
  };
}

export async function GET(request: Request) {
  let config: ReturnType<typeof connectionConfiguration>;
  try {
    config = connectionConfiguration();
  } catch {
    return NextResponse.redirect(new URL("/join?platoon=error#application", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const state = requestUrl.searchParams.get("state")?.trim();
  const cookieHeader = request.headers.get("cookie") ?? "";
  const flowCookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CONNECTION_FLOW_COOKIE}=`))
    ?.slice(CONNECTION_FLOW_COOKIE.length + 1);
  const flow = readConnectionFlow(flowCookie, config.secret);
  const failure = () => {
    const response = NextResponse.redirect(
      callbackDestination(config.returnUrl, "error", flow?.applicationType),
    );
    response.cookies.set(CONNECTION_FLOW_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/api/platoon/connect",
      sameSite: "lax",
      secure: secureCookie,
    });
    return response;
  };

  if (
    !flow ||
    !code ||
    code.length < 20 ||
    code.length > 200 ||
    !state ||
    !sameValue(state, flow.state)
  ) return failure();

  try {
    const idempotencyKey = randomUUID();
    const rawBody = JSON.stringify({ code, codeVerifier: flow.verifier });
    const exchangeResponse = await fetch(config.exchangeUrl, {
      method: "POST",
      headers: signedProgramHeaders({
        rawBody,
        idempotencyKey,
        path: CONNECTION_EXCHANGE_PATH,
        programKeyId: config.programKeyId,
        secret: config.secret,
        bypassSecret: config.bypassSecret,
      }),
      body: rawBody,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(12_000),
    });
    if (!exchangeResponse.ok) return failure();
    const connection = validExchangeResponse(await exchangeResponse.json());
    if (!connection) return failure();

    const response = NextResponse.redirect(
      callbackDestination(config.returnUrl, "connected", flow.applicationType),
    );
    response.cookies.set(CONNECTION_FLOW_COOKIE, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/api/platoon/connect",
      sameSite: "lax",
      secure: secureCookie,
    });
    response.cookies.set(CONNECTION_COOKIE, storeConnection(connection, config.secret), {
      httpOnly: true,
      maxAge: 15 * 60,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
    });
    return response;
  } catch {
    return failure();
  }
}
