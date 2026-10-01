import assert from "node:assert/strict";
import { test } from "node:test";
import { parseLocalPaidDraft } from "../src/lib/localPaidDraft.ts";
import { safeJourneyDraft } from "../src/lib/localPaidJourneyDraft.ts";
import { paidAutoContinuationAttemptKey } from "../src/lib/paidAutoContinuation.ts";
import { connectedLocalPaidJourneyAccount } from "../src/lib/localPaidJourneyAccount.ts";

test("same-tab application draft preserves attestations and restricted fields for sign-in return", () => {
  const draft = parseLocalPaidDraft(JSON.stringify({
    firstName: "Jane", dateOfBirth: "1990-01-02", addressLine1: "123 Main St",
    attestation: true, smsConsent: false, unknown: "discard",
  }));
  assert.deepEqual(draft, {
    firstName: "Jane", dateOfBirth: "1990-01-02", addressLine1: "123 Main St",
    attestation: true, smsConsent: false,
  });
});

test("server journey draft keeps only bounded nonrestricted form fields", () => {
  assert.deepEqual(safeJourneyDraft({
    firstName: "Jane", email: "jane@example.test", dateOfBirth: "1990-01-02",
    addressLine1: "123 Main St", attestation: true, smsConsent: false,
    userId: "spoof", organizationId: "spoof", price: 0,
  }), { firstName: "Jane", email: "jane@example.test", attestation: true, smsConsent: false });
  assert.deepEqual(safeJourneyDraft({ email: "x".repeat(1_001), attestation: "true" }), {});
});

test("automatic account continuation is scoped to captured paid registration and account generation", () => {
  const paid = {
    registrationId: "9b95de43-4b44-4fa5-941a-2f2a83a80e6a",
    accountConnected: false, captured: true, admissionState: "approved",
    paidThrough: "2026-12-31", organizationMembershipState: "not_projected",
  };
  assert.equal(paidAutoContinuationAttemptKey(paid, 2), `bcf_paid_account_continuation_v1:${paid.registrationId}:2`);
  assert.equal(paidAutoContinuationAttemptKey(paid, 3), `bcf_paid_account_continuation_v1:${paid.registrationId}:3`);
  assert.equal(paidAutoContinuationAttemptKey({ ...paid, captured: false }, 2), null);
  assert.equal(paidAutoContinuationAttemptKey({ ...paid, accountConnected: true }, 2), null);
  assert.equal(paidAutoContinuationAttemptKey({ ...paid, organizationMembershipState: "removed" }, 2), null);
  assert.equal(paidAutoContinuationAttemptKey(paid, null), null);
});

test("signed journey carries an unverified account without exposing its email", () => {
  assert.deepEqual(connectedLocalPaidJourneyAccount({
    connected: true, verified: false, maskedEmail: null,
    email: "private@example.test", userId: "private-user", paid: true,
  }), { connected: true, verified: false, maskedEmail: null });
  assert.deepEqual(connectedLocalPaidJourneyAccount({
    connected: true, verified: true, maskedEmail: "p***@example.test", userId: "private-user",
  }), { connected: true, verified: true, maskedEmail: "p***@example.test" });
  assert.equal(connectedLocalPaidJourneyAccount({
    connected: true, verified: false, maskedEmail: "private@example.test",
  }), null);
  assert.equal(connectedLocalPaidJourneyAccount({ connected: true, verified: "false", maskedEmail: null }), null);
  assert.equal(connectedLocalPaidJourneyAccount({ connected: false, verified: true, maskedEmail: null }), null);
});
