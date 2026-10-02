import assert from "node:assert/strict";
import test from "node:test";
import { isPaidRegistrationPolicy, registrationSubmissionEnabled } from "../src/lib/paidRegistrationPolicy.ts";
const policy = { amountMinor: 7500, currency: "USD", oneTime: true, available: true, paidThrough: "2026-12-31", policyRevision: 1 };
test("disabled collection is valid display configuration, without permitting submission", () => {
  const disabled = { ...policy, available: false };
  assert.equal(isPaidRegistrationPolicy(disabled), true);
  assert.equal(registrationSubmissionEnabled(true, disabled), false);
});
test("enabled paid collection remains available", () => {
  assert.equal(isPaidRegistrationPolicy(policy), true);
  assert.equal(registrationSubmissionEnabled(true, policy), true);
});
test("missing or ambiguous creation flags fail closed", () => {
  for (const available of [undefined, null, "true", "false", 0, 1]) {
    assert.equal(isPaidRegistrationPolicy({ ...policy, available }), false);
    assert.equal(registrationSubmissionEnabled(true, { ...policy, available }), false);
  }
  assert.equal(registrationSubmissionEnabled(true, undefined), false);
});
test("display still requires the authoritative fixed-price and term policy", () => {
  for (const patch of [{ amountMinor: 1 }, { currency: "EUR" }, { oneTime: false }, { paidThrough: "invalid" }, { policyRevision: "1" }]) {
    assert.equal(isPaidRegistrationPolicy({ ...policy, ...patch }), false);
    assert.equal(registrationSubmissionEnabled(true, { ...policy, ...patch }), false);
  }
});
test("legacy manual application presentation remains independent", () => {
  assert.equal(registrationSubmissionEnabled(false, undefined), true);
  assert.equal(registrationSubmissionEnabled(false, { ...policy, available: false }), true);
});
