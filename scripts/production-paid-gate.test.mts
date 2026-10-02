import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import * as gate from "../src/lib/localPaidGate.ts";
import {
  PRODUCTION_PAID_REGISTRATION, productionPaidRegistrationOrigins, hostedPaidRegistrationOrigins,
  localPaidRegistrationEnabled, paidRegistrationApplicantAllowed, paidRegistrationMemberOriginAllowed,
  paidRegistrationSiteOrigin,
} from "../src/lib/localPaidGate.ts";
import { isPaidRegistrationPolicy, registrationSubmissionEnabled } from "../src/lib/paidRegistrationPolicy.ts";

const names = ["BREW_MEMBERSHIP_PAID_PRODUCTION", "BREW_MEMBERSHIP_PAID_ACCEPTANCE", "BREW_MEMBERSHIP_PAID_LOCAL",
  "BREW_MEMBERSHIP_STRIPE_ENVIRONMENT", "BREW_MEMBERSHIP_SITE_ORIGIN", "PLATOON_MEMBERSHIP_ADMIN_ORIGIN",
  "PLATOON_MEMBER_WEB_ORIGIN", "PLATOON_MEMBERSHIP_SUPABASE_URL", "PLATOON_MEMBERSHIP_ORGANIZATION_ID",
  "PLATOON_MEMBERSHIP_PROGRAM_ID", "PLATOON_MEMBERSHIP_INTAKE_URL"];
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
const registrationSource = await readFile(new URL("../src/lib/localPaidRegistration.ts", import.meta.url), "utf8");
const compiledRegistration = ts.transpileModule(registrationSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const realRequire = createRequire(import.meta.url);
const testRegistrationModule = { exports: {} } as { exports: typeof import("../src/lib/localPaidRegistration.ts") };
new Function("require", "module", "exports", compiledRegistration)((name: string) => {
  if (name === "server-only") return {};
  if (name === "./localPaidGate") return gate;
  if (name === "./authenticatedState") return realRequire("../src/lib/authenticatedState.ts");
  if (name === "./platoonMembership") return {
    programCredentials: () => ({ programKeyId: "mpk_synthetic_test_credential", secret: "synthetic-cookie-encryption-test-secret" }),
    localPaidRegistrationEnabled,
    intakeConfiguration: () => ({ endpoint: new URL("https://admin.platoonapp.com/api/public/membership-applications"), programKeyId: "mpk_synthetic_test_credential", secret: "synthetic-cookie-encryption-test-secret" }),
  };
  return realRequire(name);
}, testRegistrationModule, testRegistrationModule.exports);
beforeEach(() => { for (const name of names) delete process.env[name]; });
afterEach(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name];
  }
});
function productionConfiguration() {
  const binding = PRODUCTION_PAID_REGISTRATION;
  Object.assign(process.env, {
    BREW_MEMBERSHIP_PAID_PRODUCTION: "true", BREW_MEMBERSHIP_STRIPE_ENVIRONMENT: "production",
    BREW_MEMBERSHIP_SITE_ORIGIN: binding.site, PLATOON_MEMBERSHIP_ADMIN_ORIGIN: binding.admin,
    PLATOON_MEMBER_WEB_ORIGIN: binding.member, PLATOON_MEMBERSHIP_SUPABASE_URL: `https://${binding.project}.supabase.co`,
    PLATOON_MEMBERSHIP_INTAKE_URL: `${binding.admin}/api/public/membership-applications`,
    PLATOON_MEMBERSHIP_ORGANIZATION_ID: binding.organization, PLATOON_MEMBERSHIP_PROGRAM_ID: binding.program,
  });
}

test("explicit production mode resolves only the canonical production bindings", () => {
  productionConfiguration();
  assert.deepEqual(productionPaidRegistrationOrigins(), {
    site: PRODUCTION_PAID_REGISTRATION.site, admin: PRODUCTION_PAID_REGISTRATION.admin, member: PRODUCTION_PAID_REGISTRATION.member,
  });
  assert.equal(localPaidRegistrationEnabled(PRODUCTION_PAID_REGISTRATION.site), true);
  assert.equal(localPaidRegistrationEnabled("https://evil.example"), false);
  assert.equal(paidRegistrationSiteOrigin(), PRODUCTION_PAID_REGISTRATION.site);
  assert.equal(hostedPaidRegistrationOrigins(), null);
  assert.equal(paidRegistrationMemberOriginAllowed(new URL("https://app.platoonapp.com/membership/registration")), true);
  assert.equal(paidRegistrationMemberOriginAllowed(new URL("https://evil.example/membership/registration")), false);
});

for (const [name, value] of [
  ["BREW_MEMBERSHIP_STRIPE_ENVIRONMENT", "sandbox"],
  ["BREW_MEMBERSHIP_SITE_ORIGIN", "https://evil.example"],
  ["BREW_MEMBERSHIP_SITE_ORIGIN", "https://brewcityfools.com/extra"],
  ["PLATOON_MEMBERSHIP_ADMIN_ORIGIN", "https://admin.example.test"],
  ["PLATOON_MEMBER_WEB_ORIGIN", "https://user@app.platoonapp.com"],
  ["PLATOON_MEMBERSHIP_SUPABASE_URL", "https://kbnqzraryggeselfnaki.supabase.co"],
  ["PLATOON_MEMBERSHIP_ORGANIZATION_ID", "unrelated-org"],
  ["PLATOON_MEMBERSHIP_PROGRAM_ID", "unrelated-program"],
  ["PLATOON_MEMBERSHIP_INTAKE_URL", "https://admin.platoonapp.com/api/public/membership-applications?org=forged"],
  ["BREW_MEMBERSHIP_PAID_LOCAL", "true"],
  ["BREW_MEMBERSHIP_PAID_ACCEPTANCE", "true"],
] as const) {
  test(`production configuration rejects ${name}=${value}`, () => {
    productionConfiguration(); process.env[name] = value;
    assert.equal(productionPaidRegistrationOrigins(), null);
    assert.equal(localPaidRegistrationEnabled(PRODUCTION_PAID_REGISTRATION.site), false);
    assert.equal(paidRegistrationSiteOrigin(), null);
    assert.equal(paidRegistrationApplicantAllowed("synthetic@example.test"), false);
  });
}

test("production email syntax is not a controlled invitation authorization grant", () => {
  productionConfiguration();
  assert.equal(paidRegistrationApplicantAllowed("synthetic@example.test"), true);
  assert.equal(paidRegistrationApplicantAllowed("not an address"), false);
  const paused = { amountMinor: 7500, currency: "USD", oneTime: true, paidThrough: "2026-12-31", policyRevision: 1,
    available: false, formVisible: true, collectionMode: "paused", checkoutEnabled: false };
  assert.equal(isPaidRegistrationPolicy(paused), true);
  assert.equal(registrationSubmissionEnabled(true, paused), false);
  assert.equal(registrationSubmissionEnabled(true, { ...paused, available: true }), false);
  assert.equal(registrationSubmissionEnabled(true, { ...paused, available: true, collectionMode: "controlled" }), true);
  assert.equal(registrationSubmissionEnabled(true, { ...paused, available: true, collectionMode: "public" }), true);
  assert.equal(registrationSubmissionEnabled(true, { ...paused, available: true, collectionMode: "unknown" }), false);
  assert.equal(registrationSubmissionEnabled(true, { ...paused, available: true, formVisible: false }), false);
});

test("controlled invitation activation uses protected POST and never GET/query authority", async () => {
  const route = await readFile(new URL("../src/app/api/membership-registration-invitation/route.ts", import.meta.url), "utf8");
  const continuation = await readFile(new URL("../src/app/api/local/membership-registration-continuation/route.ts", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/app/join/registration/invitation/ControlledRegistrationInvitation.tsx", import.meta.url), "utf8");
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /export (?:async )?function GET/);
  assert.match(route, /localBackend\(request, true\)/);
  assert.match(route, /"x-membership-controlled-invitation": body\.invitation/);
  assert.match(route, /collectionMode !== "controlled"/);
  assert.match(route, /httpOnly: true, sameSite: "lax"/);
  assert.match(route, /sealControlledInvitation\(body\.invitation\)/);
  assert.match(continuation, /controlledInvitationHeaders/);
  assert.match(client, /window\.location\.hash/);
  assert.match(client, /window\.history\.replaceState/);
  assert.match(client, /onClick/);
  assert.doesNotMatch(client, /localStorage|sessionStorage/);
});

test("paid intake preserves the production anti-abuse and signed-body contract", async () => {
  const route = await readFile(new URL("../src/app/api/local/membership-registrations/route.ts", import.meta.url), "utf8");
  const input = await readFile(new URL("../src/lib/membershipApplicationIntake.ts", import.meta.url), "utf8");
  assert.match(route, /parseMembershipSubmission/);
  assert.match(route, /networkFingerprint\(request, backend\.secret\)/);
  assert.match(route, /signedProgramHeaders/);
  assert.match(route, /path: APPLICATION_SIGNATURE_PATH/);
  assert.match(input, /abuseProtectionProof/);
  assert.match(input, /x-vercel-forwarded-for/);
  assert.match(input, /membership-network-v1:/);
  assert.match(input, /Object\.hasOwn\(application, "payment"\)/);
});

test("controlled invitation cookie is sealed, scoped, bounded and fails closed on tampering", () => {
  const { sealControlledInvitation, readControlledInvitation, controlledInvitationHeaders, sealJourney } = testRegistrationModule.exports;
  const token = "A".repeat(43);
  const cookie = sealControlledInvitation(token);
  assert.doesNotMatch(cookie, new RegExp(token));
  assert.equal(readControlledInvitation(cookie), token);
  assert.deepEqual(controlledInvitationHeaders(cookie), { "x-membership-controlled-invitation": token });
  assert.equal(readControlledInvitation(undefined), null);
  assert.equal(readControlledInvitation(`${cookie}x`), null);
  assert.equal(readControlledInvitation(sealJourney(token)), null);
  assert.throws(() => sealControlledInvitation("short"));
  const clock = Date.now;
  try {
    Date.now = () => clock() + 7 * 24 * 60 * 60 * 1_000 + 1;
    assert.equal(readControlledInvitation(cookie), null);
    assert.deepEqual(controlledInvitationHeaders(cookie), {});
  } finally { Date.now = clock; }
});

test("production mutations require canonical same-origin JSON and reject cross-site navigation", () => {
  productionConfiguration();
  const { localBackend } = testRegistrationModule.exports;
  const url = `${PRODUCTION_PAID_REGISTRATION.site}/api/membership-registrations`;
  const intentional = new Request(url, { method: "POST", headers: { origin: PRODUCTION_PAID_REGISTRATION.site, "content-type": "application/json" } });
  assert.ok(localBackend(intentional, true));
  const rejectedHeaders: Array<Record<string, string>> = [
    { origin: "https://evil.example", "content-type": "application/json" },
    { "content-type": "application/json" },
    { origin: PRODUCTION_PAID_REGISTRATION.site, "content-type": "text/plain" },
    { origin: `${PRODUCTION_PAID_REGISTRATION.site}/forged`, "content-type": "application/json" },
  ];
  for (const headers of rejectedHeaders) assert.equal(localBackend(new Request(url, { method: "POST", headers }), true), null);
  assert.equal(localBackend(new Request("https://evil.example/api/membership-registrations", {
    method: "POST", headers: { origin: PRODUCTION_PAID_REGISTRATION.site, "content-type": "application/json" },
  }), true), null);
});
