import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { pendingSubmissionDraft, shouldRefreshPaidBotProof } from "../src/lib/paidSubmissionRecovery.ts";

test("only definitive server bot rejection discards the pending signed proof", () => {
  assert.equal(shouldRefreshPaidBotProof(403, "BOT_CHECK_FAILED"), true);
  for (const [status, code] of [[503, "BOT_CHECK_FAILED"], [403, "REGISTRATION_UNAVAILABLE"], [409, "SUBMISSION_CONFLICT"], [429, "RATE_LIMITED"], [200, undefined]] as const) {
    assert.equal(shouldRefreshPaidBotProof(status, code), false);
  }
});

test("browser-restart recovery retains business fields without stale proof or authority", () => {
  const raw = JSON.stringify({ submissionId: "stable-submission", application: {
    applicationType: "new", applicant: { firstName: "Synthetic", lastName: "Applicant", email: "synthetic@example.test",
      dateOfBirth: "1990-01-02", mailingAddress: { addressLine1: "Test address", city: "Test city", state: "WI", postalCode: "53201" } },
    fireService: { departmentName: "Synthetic department", departmentState: "WI", rank: "Test rank", status: "active" },
    foolsHistory: { previousChapter: "Test chapter", foolsId: "test" }, attestations: { adultFirefighter: true }, communications: { sms: { consent: false } },
    abuseProtection: { turnstileToken: "stale-token", networkFingerprint: "opaque" }, payment: { amount: 1 }, organizationId: "forged", userId: "forged",
  } });
  const draft = pendingSubmissionDraft(raw);
  assert.equal(draft?.firstName, "Synthetic"); assert.equal(draft?.dateOfBirth, "1990-01-02");
  assert.equal(draft?.addressLine1, "Test address"); assert.equal(draft?.attestation, true); assert.equal(draft?.smsConsent, false);
  assert.doesNotMatch(JSON.stringify(draft), /stale-token|networkFingerprint|payment|organizationId|userId|submissionId/);
  for (const malformed of [null, "invalid", "x".repeat(16_385), JSON.stringify({ application: { applicationType: "renewal" } })]) {
    assert.equal(pendingSubmissionDraft(malformed), null);
  }
});

test("paid bot recovery retains the submission identity and runs in submit and response-loss recovery", async () => {
  const form = await readFile(new URL("../src/app/join/MembershipApplicationForm.tsx", import.meta.url), "utf8");
  const handler = form.slice(form.indexOf("function recoverRejectedPaidBotProof"), form.indexOf("async function paidJourneyAction"));
  assert.match(handler, /rememberLocalPaidDraft/);
  assert.match(handler, /localStorage\.removeItem\(pendingKey\)/);
  assert.match(handler, /resetTurnstile/);
  assert.doesNotMatch(handler, /submissionId\.current\s*=/);
  assert.equal((form.match(/shouldRefreshPaidBotProof\(response\.status/g) ?? []).length, 2);
});
