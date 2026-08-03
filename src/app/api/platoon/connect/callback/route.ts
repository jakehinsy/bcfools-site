import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  CONNECTION_COOKIE,
  CONNECTION_EXCHANGE_PATH,
  connectionConfiguration,
  readConnectionFlow,
  secureCookie,
  signedProgramHeaders,
  storeConnection,
  type PlatoonConnection,
} from "@/lib/platoonMembership";

export const runtime = "nodejs";

function callbackDestination(
  returnUrl: URL,
  status: "connected" | "error",
  applicationType: "new" | "renewal" = "new",
  supportReference?: string,
) {
  const destination = new URL("/join", returnUrl);
  destination.searchParams.set("platoon", status);
  destination.searchParams.set("type", applicationType);
  if (status === "error" && supportReference) {
    destination.searchParams.set("connection_ref", supportReference);
  }
  destination.hash = "application";
  return destination;
}

type ConnectionFailureStage =
  | "configuration"
  | "callback_parameters"
  | "exchange_request"
  | "exchange_rejected"
  | "exchange_response";

function supportReference() {
  return `CONN-${randomUUID().split("-")[0].toUpperCase()}`;
}

function logConnectionFailure(
  reference: string,
  stage: ConnectionFailureStage,
  details: Record<string, boolean | number | string | null> = {},
) {
  console.error("[membership-connect] callback failed", {
    reference,
    stage,
    ...details,
  });
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
  const reference = supportReference();
  let config: ReturnType<typeof connectionConfiguration>;
  try {
    config = connectionConfiguration();
  } catch (error) {
    logConnectionFailure(reference, "configuration", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    const destination = new URL("/join", request.url);
    destination.searchParams.set("platoon", "error");
    destination.searchParams.set("connection_ref", reference);
    destination.hash = "application";
    return NextResponse.redirect(destination);
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const state = requestUrl.searchParams.get("state")?.trim();
  const flow = readConnectionFlow(state, config.secret);
  const failure = (
    stage: ConnectionFailureStage,
    details: Record<string, boolean | number | string | null> = {},
  ) => {
    logConnectionFailure(reference, stage, details);
    const response = NextResponse.redirect(
      callbackDestination(
        config.returnUrl,
        "error",
        flow?.applicationType,
        reference,
      ),
    );
    return response;
  };

  if (
    !flow ||
    !code ||
    code.length < 20 ||
    code.length > 200 ||
    !state
  ) {
    return failure("callback_parameters", {
      hasFlow: Boolean(flow),
      hasCode: Boolean(code),
      codeLengthValid: Boolean(code && code.length >= 20 && code.length <= 200),
      hasState: Boolean(state),
      stateLengthValid: Boolean(state && state.length >= 32 && state.length <= 512),
    });
  }

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
    if (!exchangeResponse.ok) {
      return failure("exchange_rejected", {
        hasBypassSecret: Boolean(config.bypassSecret),
        status: exchangeResponse.status,
      });
    }
    const connection = validExchangeResponse(await exchangeResponse.json());
    if (!connection) return failure("exchange_response");

    const response = NextResponse.redirect(
      callbackDestination(config.returnUrl, "connected", flow.applicationType),
    );
    response.cookies.set(CONNECTION_COOKIE, storeConnection(connection, config.secret), {
      httpOnly: true,
      maxAge: 15 * 60,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
    });
    return response;
  } catch (error) {
    return failure("exchange_request", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      hasBypassSecret: Boolean(config.bypassSecret),
    });
  }
}
