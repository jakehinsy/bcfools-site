import assert from "node:assert/strict";
import { after, test } from "node:test";
import { localPaidRegistrationEnabled } from "../src/lib/localPaidGate.ts";

const mutableEnv = process.env as Record<string, string | undefined>;

const oldFlag = process.env.BREW_MEMBERSHIP_PAID_LOCAL;
const oldIntake = process.env.PLATOON_MEMBERSHIP_INTAKE_URL;
const oldNodeEnv = process.env.NODE_ENV;

after(() => {
  if (oldFlag === undefined) delete process.env.BREW_MEMBERSHIP_PAID_LOCAL;
  else process.env.BREW_MEMBERSHIP_PAID_LOCAL = oldFlag;
  if (oldIntake === undefined) delete process.env.PLATOON_MEMBERSHIP_INTAKE_URL;
  else process.env.PLATOON_MEMBERSHIP_INTAKE_URL = oldIntake;
  if (oldNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = oldNodeEnv;
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
