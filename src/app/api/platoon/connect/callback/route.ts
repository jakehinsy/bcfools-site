import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  CONNECTION_COOKIE,
  CONNECTION_EXCHANGE_PATH,
  connectionConfiguration,
  connectionFlowMatchesBrowser,
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

function relativeDestination(destination: URL) {
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

type ConnectionFailureStage =
  | "configuration"
  | "callback_parameters"
  | "browser_binding"
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

function errorRedirect(request: Request, reference: string) {
  const destination = new URL("/join", request.url);
  destination.searchParams.set("platoon", "error");
  destination.searchParams.set("connection_ref", reference);
  destination.hash = "application";
  return destination;
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
    return NextResponse.redirect(errorRedirect(request, reference), {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim();
  const state = requestUrl.searchParams.get("state")?.trim();
  const flow = readConnectionFlow(state, config.secret);
  if (
    !flow ||
    !code ||
    code.length < 20 ||
    code.length > 200 ||
    !state ||
    state.length < 32 ||
    state.length > 512
  ) {
    logConnectionFailure(reference, "callback_parameters", {
      hasFlow: Boolean(flow),
      hasCode: Boolean(code),
      codeLengthValid: Boolean(code && code.length >= 20 && code.length <= 200),
      hasState: Boolean(state),
      stateLengthValid: Boolean(state && state.length >= 32 && state.length <= 512),
    });
    return NextResponse.redirect(
      callbackDestination(config.returnUrl, "error", flow?.applicationType, reference),
      { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
    );
  }

  const handoff = Buffer.from(JSON.stringify({ code, state })).toString("base64url");
  const destination = new URL("/join", config.returnUrl);
  destination.searchParams.set("type", flow.applicationType);
  destination.hash = `platoon-connect=${handoff}`;
  return NextResponse.redirect(destination, {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

export async function POST(request: Request) {
  const reference = supportReference();
  let config: ReturnType<typeof connectionConfiguration>;
  try {
    config = connectionConfiguration();
  } catch (error) {
    logConnectionFailure(reference, "configuration", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { redirectTo: relativeDestination(errorRedirect(request, reference)) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin !== config.returnUrl.origin) {
    logConnectionFailure(reference, "browser_binding", {
      hasBrowserBinding: false,
      originMatches: false,
      browserMatches: false,
    });
    return NextResponse.json(
      {
        redirectTo: relativeDestination(
          callbackDestination(config.returnUrl, "error", "new", reference),
        ),
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.toLowerCase().startsWith("application/json")) {
    try {
      const rawBody = await request.text();
      if (rawBody.length <= 4_096) {
        const candidate = JSON.parse(rawBody) as unknown;
        if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
          body = candidate as Record<string, unknown>;
        }
      }
    } catch {
      body = {};
    }
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";
  const browserBinding = typeof body.browserBinding === "string"
    ? body.browserBinding.trim()
    : "";
  const flow = readConnectionFlow(state, config.secret);
  const failure = (
    stage: ConnectionFailureStage,
    status: number,
    details: Record<string, boolean | number | string | null> = {},
  ) => {
    logConnectionFailure(reference, stage, details);
    return NextResponse.json(
      {
        redirectTo: relativeDestination(
          callbackDestination(
            config.returnUrl,
            "error",
            flow?.applicationType,
            reference,
          ),
        ),
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  };

  if (
    !flow ||
    code.length < 20 ||
    code.length > 200 ||
    state.length < 32 ||
    state.length > 512
  ) {
    return failure("callback_parameters", 400, {
      hasFlow: Boolean(flow),
      hasCode: Boolean(code),
      codeLengthValid: code.length >= 20 && code.length <= 200,
      hasState: Boolean(state),
      stateLengthValid: state.length >= 32 && state.length <= 512,
    });
  }

  const browserMatches = connectionFlowMatchesBrowser(flow, browserBinding);
  if (!browserMatches) {
    return failure("browser_binding", 403, {
      hasBrowserBinding: Boolean(browserBinding),
      originMatches: true,
      browserMatches,
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
      return failure("exchange_rejected", 502, {
        hasBypassSecret: Boolean(config.bypassSecret),
        status: exchangeResponse.status,
      });
    }
    const connection = validExchangeResponse(await exchangeResponse.json());
    if (!connection) return failure("exchange_response", 502);

    const response = NextResponse.json(
      {
        redirectTo: relativeDestination(
          callbackDestination(config.returnUrl, "connected", flow.applicationType),
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
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
    return failure("exchange_request", 502, {
      errorName: error instanceof Error ? error.name : "UnknownError",
      hasBypassSecret: Boolean(config.bypassSecret),
    });
  }
}
