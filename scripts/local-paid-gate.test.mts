import assert from "node:assert/strict";
import { after, afterEach, test } from "node:test";
import { hostedPaidRegistrationOrigins, localPaidRegistrationEnabled, paidRegistrationMemberOriginAllowed, paidRegistrationApplicantAllowed } from "../src/lib/localPaidGate.ts";

const mutableEnv = process.env as Record<string, string | undefined>;

const oldFlag = process.env.BREW_MEMBERSHIP_PAID_LOCAL;
const oldIntake = process.env.PLATOON_MEMBERSHIP_INTAKE_URL;
const oldNodeEnv = process.env.NODE_ENV;
const hostedNames = ["BREW_MEMBERSHIP_PAID_ACCEPTANCE", "BREW_MEMBERSHIP_STRIPE_ENVIRONMENT", "BREW_MEMBERSHIP_SITE_ORIGIN",
  "PLATOON_MEMBERSHIP_ADMIN_ORIGIN", "PLATOON_MEMBER_WEB_ORIGIN", "PLATOON_MEMBERSHIP_SUPABASE_URL", "PLATOON_MEMBERSHIP_ACCEPTANCE_PROJECT_REF", "BREW_MEMBERSHIP_ACCEPTANCE_RECIPIENTS"] as const;
const oldHosted = Object.fromEntries(hostedNames.map(name => [name, process.env[name]]));
afterEach(() => {
  for (const name of hostedNames) {
    const value = oldHosted[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

after(() => {
  if (oldFlag === undefined) delete process.env.BREW_MEMBERSHIP_PAID_LOCAL;
  else process.env.BREW_MEMBERSHIP_PAID_LOCAL = oldFlag;
  if (oldIntake === undefined) delete process.env.PLATOON_MEMBERSHIP_INTAKE_URL;
  else process.env.PLATOON_MEMBERSHIP_INTAKE_URL = oldIntake;
  if (oldNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = oldNodeEnv;
  for (const name of hostedNames) {
    const value = oldHosted[name];
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});

test("hosted acceptance needs sandbox, exact three HTTPS origins, and an allowlisted nonproduction project", () => {
  Object.assign(process.env, {
    BREW_MEMBERSHIP_PAID_ACCEPTANCE: "true", BREW_MEMBERSHIP_STRIPE_ENVIRONMENT: "sandbox",
    BREW_MEMBERSHIP_SITE_ORIGIN: "https://chapter.example.test",
    PLATOON_MEMBERSHIP_ADMIN_ORIGIN: "https://admin.example.test",
    PLATOON_MEMBER_WEB_ORIGIN: "https://member.example.test",
    PLATOON_MEMBERSHIP_INTAKE_URL: "https://admin.example.test/api/public/membership-applications",
    PLATOON_MEMBERSHIP_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
    PLATOON_MEMBERSHIP_ACCEPTANCE_PROJECT_REF: "abcdefghijklmnopqrst",
  });
  assert.deepEqual(hostedPaidRegistrationOrigins(), {
    site: "https://chapter.example.test", admin: "https://admin.example.test", member: "https://member.example.test",
  });
  assert.equal(localPaidRegistrationEnabled("https://chapter.example.test"), true);
  assert.equal(localPaidRegistrationEnabled("https://other.example.test"), false);
  assert.equal(paidRegistrationMemberOriginAllowed(new URL("https://member.example.test/membership/registration")), true);
  assert.equal(paidRegistrationMemberOriginAllowed(new URL("https://other.example.test/membership/registration")), false);
  assert.equal(paidRegistrationApplicantAllowed("controlled@example.test"),false);
  process.env.BREW_MEMBERSHIP_ACCEPTANCE_RECIPIENTS="controlled@example.test";
  assert.equal(paidRegistrationApplicantAllowed(" CONTROLLED@example.test "),true);
  assert.equal(paidRegistrationApplicantAllowed("unlisted@example.test"),false);
  for (const [name, value] of [
    ["BREW_MEMBERSHIP_STRIPE_ENVIRONMENT", "production"],
    ["PLATOON_MEMBERSHIP_ADMIN_ORIGIN", "https://other.example.test"],
    ["BREW_MEMBERSHIP_SITE_ORIGIN", "https://chapter.example.test/extra"],
    ["PLATOON_MEMBER_WEB_ORIGIN", "http://member.example.test"],
    ["PLATOON_MEMBERSHIP_SUPABASE_URL", "https://baugcxlhxcyszqoetxfq.supabase.co"],
    ["PLATOON_MEMBERSHIP_ACCEPTANCE_PROJECT_REF", "other"],
  ] as const) {
    const previous = process.env[name]; process.env[name] = value;
    assert.equal(hostedPaidRegistrationOrigins(), null, name);
    process.env[name] = previous;
  }
});

test("paid registration opens only for two loopback origins outside production", () => {
  process.env.BREW_MEMBERSHIP_PAID_LOCAL = "true";
  mutableEnv.NODE_ENV = "development";
  process.env.PLATOON_MEMBERSHIP_INTAKE_URL = "http://127.0.0.1:3001/api/public/membership-applications";
  assert.equal(localPaidRegistrationEnabled("http://127.0.0.1:3000"), true);
  assert.equal(localPaidRegistrationEnabled("http://localhost:3000"), true);
  assert.equal(localPaidRegistrationEnabled("http://brew.example.test"), false);
  process.env.PLATOON_MEMBERSHIP_INTAKE_URL = "https://platoon.example.test/api/public/membership-applications";
  assert.equal(localPaidRegistrationEnabled("http://127.0.0.1:3000"), false);
  process.env.PLATOON_MEMBERSHIP_INTAKE_URL = "http://127.0.0.1:3001/api/public/membership-applications";
  mutableEnv.NODE_ENV = "production";
  assert.equal(localPaidRegistrationEnabled("http://127.0.0.1:3000"), false);
  mutableEnv.NODE_ENV = "development";
  delete process.env.BREW_MEMBERSHIP_PAID_LOCAL;
  assert.equal(localPaidRegistrationEnabled("http://127.0.0.1:3000"), false);
});
