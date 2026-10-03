import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, beforeEach, test } from "node:test";
import ts from "typescript";
import * as gate from "../src/lib/localPaidGate.ts";
import * as handoff from "../src/lib/controlledRegistrationHandoff.ts";

const token = "A".repeat(43);
const returnCode = "B".repeat(43);
const invitation = "I".repeat(43);
const registrationId = "dd5f0b66-4e38-4f08-8611-951111bcf099";
const memberOrigin = "https://app.platoonapp.com";
const authorizationUrl = `${memberOrigin}/membership/registration/controlled?request=${token}`;
const binding = gate.PRODUCTION_PAID_REGISTRATION;
const names = ["BREW_MEMBERSHIP_PAID_PRODUCTION", "BREW_MEMBERSHIP_PAID_ACCEPTANCE", "BREW_MEMBERSHIP_PAID_LOCAL", "NODE_ENV",
  "BREW_MEMBERSHIP_STRIPE_ENVIRONMENT", "BREW_MEMBERSHIP_SITE_ORIGIN", "PLATOON_MEMBERSHIP_ADMIN_ORIGIN", "PLATOON_MEMBER_WEB_ORIGIN",
  "PLATOON_MEMBERSHIP_SUPABASE_URL", "PLATOON_MEMBERSHIP_ORGANIZATION_ID", "PLATOON_MEMBERSHIP_PROGRAM_ID", "PLATOON_MEMBERSHIP_INTAKE_URL"];
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
const originalFetch = globalThis.fetch;
const realRequire = createRequire(import.meta.url);
const credentials = { programKeyId: "mpk_synthetic_test_credential", secret: "synthetic-cookie-test-secret" };
const backend = { ...credentials, endpoint: new URL(`${binding.admin}/api/public/membership-applications`) };

function load<T>(relativePath: string, dependencies: Record<string, unknown>): T {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((name: string) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    return realRequire(name);
  }, loaded, loaded.exports);
  return loaded.exports as T;
}

const signatureCalls: Array<Record<string, unknown>> = [];
const membership = {
  programCredentials: () => credentials,
  localPaidRegistrationEnabled: gate.localPaidRegistrationEnabled,
  intakeConfiguration: () => backend,
  APPLICATION_SIGNATURE_PATH: "/api/public/membership-applications",
  signedProgramHeaders: (input: Record<string, unknown>) => {
    signatureCalls.push(input);
    return { "Content-Type": "application/json", "X-Platoon-Signature": "synthetic-fixed-path-signature" };
  },
};
const cookies = load<typeof import("../src/lib/localPaidRegistration.ts")>("../src/lib/localPaidRegistration.ts", {
  "server-only": {}, "./localPaidGate": gate, "./authenticatedState": realRequire("../src/lib/authenticatedState.ts"),
  "./platoonMembership": membership,
});

class PrivateResponse extends Response {
  cookies = {
    set: (name: string, value: string, options: { httpOnly?: boolean; sameSite?: string; secure?: boolean; path?: string; maxAge?: number }) => {
      this.headers.append("set-cookie", `${name}=${value}; Path=${options.path ?? "/"}; Max-Age=${options.maxAge ?? 0}` +
        (options.httpOnly ? "; HttpOnly" : "") + (options.secure ? "; Secure" : "") + (options.sameSite ? `; SameSite=${options.sameSite}` : ""));
    },
    delete: (name: string) => { this.headers.append("set-cookie", `${name}=; Max-Age=0; Path=/`); },
  };
  static json(value: unknown, init?: ResponseInit) {
    return new PrivateResponse(JSON.stringify(value), { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  }
}
const aliases = {
  "next/server": { NextResponse: PrivateResponse },
  "@/lib/localPaidRegistration": cookies,
  "@/lib/localPaidGate": gate,
  "@/lib/platoonMembership": membership,
  "@/lib/controlledRegistrationHandoff": handoff,
};
type TestRequest = Request & { cookies: { get(name: string): { value: string } | undefined } };
type TestRoute = { POST(request: TestRequest): Promise<Response>; GET?: unknown };
const returnRoute = load<TestRoute>("../src/app/api/membership-registration-controlled-return/route.ts", aliases);
const continuationRoute = load<TestRoute>("../src/app/api/local/membership-registration-continuation/route.ts", aliases);
const intakeRoute = load<TestRoute>("../src/app/api/local/membership-registrations/route.ts", {
  ...aliases,
  "@/lib/membershipApplicationIntake": {
    parseMembershipSubmission: (value: unknown) => value,
    networkFingerprint: () => "synthetic-network-fingerprint",
  },
});
function request(path: string, body: unknown, cookieValues: Record<string, string> = {}, origin: string = binding.site): TestRequest {
  const incoming = new Request(`${binding.site}${path}`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  }) as TestRequest;
  incoming.cookies = { get: name => cookieValues[name] ? { value: cookieValues[name] } : undefined };
  return incoming;
}
const invitationCookie = () => ({ [cookies.CONTROLLED_INVITATION_COOKIE]: cookies.sealControlledInvitation(invitation) });
const returnCookies = () => ({ ...invitationCookie(), [cookies.CONTROLLED_REQUEST_COOKIE]: cookies.sealControlledRequest(token) });
const registrationResult = () => ({ applicationReference: "SYNTHETIC-REFERENCE", registration: { registrationId }, continuation: "C".repeat(43), replayed: false });
beforeEach(() => {
  for (const name of names) delete process.env[name];
  Object.assign(process.env, {
    NODE_ENV: "production", BREW_MEMBERSHIP_PAID_PRODUCTION: "true", BREW_MEMBERSHIP_STRIPE_ENVIRONMENT: "production",
    BREW_MEMBERSHIP_SITE_ORIGIN: binding.site, PLATOON_MEMBERSHIP_ADMIN_ORIGIN: binding.admin, PLATOON_MEMBER_WEB_ORIGIN: binding.member,
    PLATOON_MEMBERSHIP_SUPABASE_URL: `https://${binding.project}.supabase.co`, PLATOON_MEMBERSHIP_INTAKE_URL: `${binding.admin}/api/public/membership-applications`,
  });
  signatureCalls.length = 0;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of names) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name]; }
});

test("controlled navigation accepts only the exact configured member route and request token", () => {
  assert.equal(handoff.safeControlledAuthorizationUrl(authorizationUrl, token, memberOrigin), authorizationUrl);
  assert.deepEqual(handoff.controlledAuthorizationResponse({ controlled: { requestToken: token, authorizationUrl } }, memberOrigin), { requestToken: token, authorizationUrl });
  assert.equal(gate.paidRegistrationMemberOrigin(), memberOrigin);
});

for (const hostile of [
  "//evil.example", "javascript:alert(1)", `https://evil.example/membership/registration/controlled?request=${token}`,
  `https://app.platoonapp.com.evil.example/membership/registration/controlled?request=${token}`,
  `https://evil.example@app.platoonapp.com/membership/registration/controlled?request=${token}`,
  `https://app.platoonapp.com\\evil.example/membership/registration/controlled?request=${token}`,
  `${memberOrigin}/%2fmembership/registration/controlled?request=${token}`,
  `${memberOrigin}/membership/registration/%63ontrolled?request=${token}`,
  `${memberOrigin}/membership/registration/../registration/controlled?request=${token}`,
  `${memberOrigin}/membership/registration/%252fcontrolled?request=${token}`,
  `${authorizationUrl}&next=https://evil.example`, `${authorizationUrl}&request=${token}`, `${authorizationUrl}#next=//evil.example`,
  `${memberOrigin}/membership/registration/controlled?request=%41${token.slice(1)}`,
  `https://APP.PLATOONAPP.COM/membership/registration/controlled?request=${token}`,
  ` ${authorizationUrl}`, `${authorizationUrl}\n`,
]) test(`controlled navigation rejects hostile or ambiguous URL ${hostile}`, () => {
  assert.equal(handoff.safeControlledAuthorizationUrl(hostile, token, memberOrigin), null);
});

test("configured local development origin is explicit and cannot select an external host", () => {
  delete process.env.BREW_MEMBERSHIP_PAID_PRODUCTION;
  process.env.BREW_MEMBERSHIP_PAID_LOCAL = "true";
  (process.env as Record<string, string | undefined>).NODE_ENV = "development";
  process.env.PLATOON_MEMBER_WEB_ORIGIN = "http://127.0.0.1:3002";
  assert.equal(gate.paidRegistrationMemberOrigin(), "http://127.0.0.1:3002");
  const url = `http://127.0.0.1:3002/membership/registration/controlled?request=${token}`;
  assert.equal(handoff.safeControlledAuthorizationUrl(url, token, gate.paidRegistrationMemberOrigin()), url);
  assert.equal(handoff.safeControlledAuthorizationUrl(url, token, "http://evil.example:3002"), null);
  process.env.PLATOON_MEMBER_WEB_ORIGIN = "http://127.0.0.1:3002/extra";
  assert.equal(gate.paidRegistrationMemberOrigin(), null);
});

test("controlled return accepts only two exact bounded fragment fields", () => {
  assert.deepEqual(handoff.controlledReturnFragment(`#request=${token}&return=${returnCode}`), { requestToken: token, returnCode });
  assert.deepEqual(handoff.controlledReturnFragment(`#return=${returnCode}&request=${token}`), { requestToken: token, returnCode });
  for (const malformed of ["", `#request=${token}`, `#request=${token}&return=${returnCode}&user=forged`,
    `#request=${token}&request=${token}&return=${returnCode}`, `#request=%41${token.slice(1)}&return=${returnCode}`,
    `#request=${token}&return=${returnCode.slice(1)}`, `#request=${token}&return=${returnCode}#extra`]) {
    assert.equal(handoff.controlledReturnFragment(malformed), null);
  }
});

test("controlled request cookie is encrypted, distinct from invitation/journey, expired and tamper-resistant", () => {
  const cookie = cookies.sealControlledRequest(token);
  assert.doesNotMatch(cookie, new RegExp(token));
  assert.equal(cookies.readControlledRequest(cookie), token);
  assert.equal(cookies.readControlledRequest(`${cookie}x`), null);
  assert.equal(cookies.readControlledRequest(cookies.sealControlledInvitation(token)), null);
  assert.equal(cookies.readControlledRequest(cookies.sealJourney(token)), null);
  assert.equal(cookies.readControlledRequest(undefined), null);
  assert.throws(() => cookies.sealControlledRequest("short"));
  const clock = Date.now;
  try { Date.now = () => clock() + cookies.CONTROLLED_REQUEST_MAX_AGE * 1_000 + 1; assert.equal(cookies.readControlledRequest(cookie), null); }
  finally { Date.now = clock; }
});

test("controlled intake preserves signed business body and server-held invitation/journey, without creating registration cookie", async () => {
  const journey = "J".repeat(43);
  let observed: RequestInit | undefined;
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    observed = init;
    return Response.json({ controlled: { requestToken: token, authorizationUrl }, userId: "private-identity" }, { status: 202 });
  }) as typeof fetch;
  const response = await intakeRoute.POST(request("/api/membership-registrations", {
    submissionId: "stable-identity", application: { applicant: { email: "synthetic@example.test" } },
  }, { ...invitationCookie(), [cookies.JOURNEY_COOKIE]: cookies.sealJourney(journey) }));
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { controlled: { requestToken: token, authorizationUrl } });
  const headers = observed?.headers as Record<string, string>;
  assert.equal(headers["x-membership-registration-journey"], journey);
  assert.equal(headers["x-membership-controlled-invitation"], invitation);
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(cookies.CONTROLLED_REQUEST_COOKIE));
  assert.doesNotMatch(response.headers.get("set-cookie") ?? "", new RegExp(`${cookies.REGISTRATION_COOKIE}=`));
  assert.equal(signatureCalls[0].path, "/api/public/membership-applications");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("intake denies malformed/off-origin authorization responses and missing invitation", async () => {
  for (const [url, supplied] of [[`${authorizationUrl}&next=//evil.example`, invitationCookie()], [authorizationUrl, {}]]) {
    globalThis.fetch = (async () => Response.json({ controlled: { requestToken: token, authorizationUrl: url } }, { status: 202 })) as typeof fetch;
    const response = await intakeRoute.POST(request("/api/membership-registrations", {
      submissionId: "stable-identity", application: { applicant: { email: "synthetic@example.test" } },
    }, supplied as Record<string, string>));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("paused public intake remains denied without state/cookie creation", async () => {
  globalThis.fetch = (async () => Response.json({ error: { code: "COLLECTION_PAUSED" } }, { status: 403 })) as typeof fetch;
  const response = await intakeRoute.POST(request("/api/membership-registrations", {
    submissionId: "stable-identity", application: { applicant: { email: "synthetic@example.test" } },
  }));
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("set-cookie"), null);
});

test("Checkout authorization handoff cannot redirect to Stripe until member-web verifies its session", async () => {
  let observed: RequestInit | undefined;
  const journey = "J".repeat(43);
  globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
    observed = init; return Response.json({ state: "authorization_required", url: authorizationUrl, requestToken: token });
  }) as typeof fetch;
  const response = await continuationRoute.POST(request("/api/membership-registration-continuation", { action: "checkout" }, {
    ...invitationCookie(), [cookies.REGISTRATION_COOKIE]: cookies.sealContinuation(registrationId, "C".repeat(43)),
    [cookies.JOURNEY_COOKIE]: cookies.sealJourney(journey),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { state: "authorization_required", url: authorizationUrl, requestToken: token });
  assert.equal((observed?.headers as Record<string, string>)["x-membership-registration-journey"], journey);
  assert.match(response.headers.get("set-cookie") ?? "", new RegExp(cookies.CONTROLLED_REQUEST_COOKIE));
});

test("controlled return requires both server-sealed request binding and valid invitation before backend lookup", async () => {
  let fetches = 0;
  globalThis.fetch = (async () => { fetches++; return Response.json(registrationResult()); }) as typeof fetch;
  const cases: Array<Record<string, string>> = [{}, invitationCookie(), { [cookies.CONTROLLED_REQUEST_COOKIE]: cookies.sealControlledRequest(token) },
    { ...invitationCookie(), [cookies.CONTROLLED_REQUEST_COOKIE]: cookies.sealControlledRequest("Z".repeat(43)) },
    { ...invitationCookie(), [cookies.CONTROLLED_REQUEST_COOKIE]: `${cookies.sealControlledRequest(token)}x` }];
  for (const values of cases) {
    const response = await returnRoute.POST(request("/api/membership-registration-controlled-return", { requestToken: token, returnCode }, values));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(fetches, 0);
});

test("protected controlled return uses only fixed signed operation and discards caller-supplied account/org authority", async () => {
  let observedUrl = "";
  let observed: RequestInit | undefined;
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    observedUrl = String(url); observed = init; return Response.json(registrationResult());
  }) as typeof fetch;
  const response = await returnRoute.POST(request("/api/membership-registration-controlled-return", {
    requestToken: token, returnCode, userId: "forged", organizationId: "forged", operation: "arbitrary_rpc",
  }, returnCookies()));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ready: true });
  assert.equal(observedUrl, `${binding.admin}/api/public/membership-registration-controlled-return`);
  assert.deepEqual(JSON.parse(String(observed?.body)), { requestToken: token, returnCode });
  assert.equal((observed?.headers as Record<string, string>)["x-membership-controlled-invitation"], invitation);
  assert.equal(signatureCalls[0].path, "/api/public/membership-registration-controlled-return");
  assert.match(response.headers.get("set-cookie") ?? "", /bcf_local_registration=.*HttpOnly.*Secure.*SameSite=lax/);
  assert.match(response.headers.get("set-cookie") ?? "", /bcf_controlled_registration_request=; Max-Age=0/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("cross-origin controlled mutations and GET/navigation cannot execute privileged operations", async () => {
  let fetches = 0;
  globalThis.fetch = (async () => { fetches++; return Response.json(registrationResult()); }) as typeof fetch;
  for (const route of [returnRoute, intakeRoute, continuationRoute]) {
    assert.equal(route.GET, undefined);
    const response = await route.POST(request("/api/membership-registration-controlled-return", { requestToken: token, returnCode }, returnCookies(), "https://evil.example"));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(fetches, 0);
});

test("return rejects backend denial/replay, invalid registration, and another existing browser registration", async () => {
  for (const [result, status, supplied, expected] of [
    [{ error: { code: "INVALID_RETURN" } }, 401, returnCookies(), 401],
    [{ ...registrationResult(), continuation: "invalid" }, 200, returnCookies(), 503],
    [registrationResult(), 200, { ...returnCookies(), [cookies.REGISTRATION_COOKIE]: cookies.sealContinuation("ee5f0b66-4e38-4f08-8611-951111bcf099", "C".repeat(43)) }, 409],
  ] as const) {
    globalThis.fetch = (async () => Response.json(result, { status })) as typeof fetch;
    const response = await returnRoute.POST(request("/api/membership-registration-controlled-return", { requestToken: token, returnCode }, supplied));
    assert.equal(response.status, expected);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("control-return client removes fragment before POST, shares Strict Mode request, and retains no browser authority", () => {
  const source = readFileSync(new URL("../src/app/join/registration/controlled-return/ControlledRegistrationReturn.tsx", import.meta.url), "utf8");
  assert.ok(source.indexOf("window.history.replaceState") < source.indexOf("await fetch"));
  assert.match(source, /if \(!task\.current\)/);
  assert.match(source, /method: "POST"/);
  assert.match(source, /window\.location\.replace\("\/join\/registration"\)/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|userId|organizationId|console\./);
});
