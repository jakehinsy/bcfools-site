import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const form = await readFile(new URL("../src/app/join/MembershipApplicationForm.tsx", import.meta.url), "utf8");
const route = await readFile(new URL("../src/app/api/membership-applications/route.ts", import.meta.url), "utf8");
const membership = await readFile(new URL("../src/lib/platoonMembership.ts", import.meta.url), "utf8");
const contract = await readFile(new URL("../src/lib/membershipApplicationContract.ts", import.meta.url), "utf8");

test("collects the International FOOLS DOB and structured mailing address", () => {
  for (const field of ["dateOfBirth", "addressLine1", "addressLine2", "city", "addressState", "postalCode"]) {
    assert.match(form, new RegExp(`name=["']${field}["']`));
  }
  assert.match(form, /Required by FOOLS International/);
  assert.match(form, /Visible only to authorized membership administrators/);
});

test("validates personal fields at the public server boundary", () => {
  assert.match(route, /isAdultDateOfBirth/);
  assert.match(route, /\^\\d\{5\}\(-\\d\{4\}\)\?\$/);
  assert.match(route, /mailingAddress/);
  assert.match(route, /foolsHistory/);
});

test("uses the server-owned program schema and requiredness", () => {
  assert.match(contract, /APPLICATION_SCHEMA_VERSION = "2026-08-30"/);
  assert.match(membership, /import \{ APPLICATION_SCHEMA_VERSION \} from "\.\/membershipApplicationContract"/);
  assert.match(membership, /requiresDateOfBirth/);
  assert.match(membership, /requiresMailingAddress/);
  assert.match(form, /APPLICATION_SCHEMA_VERSION/);
});

test("loads membership program configuration without requiring the account connection flow", () => {
  const configBlock = membership.slice(
    membership.indexOf("export async function membershipProgramConfiguration"),
    membership.indexOf("export function connectionConfiguration"),
  );
  assert.match(configBlock, /requiredEnvironment\("PLATOON_MEMBERSHIP_PROGRAM_HANDLE"\)/);
  assert.doesNotMatch(configBlock, /connectionConfiguration\(\)/);
});

test("allows only development loopback HTTP for isolated certification", () => {
  assert.match(membership, /process\.env\.NODE_ENV !== "production"/);
  assert.match(membership, /hostname === "localhost"/);
  assert.match(membership, /hostname === "127\.0\.0\.1"/);
  assert.match(membership, /hostname === "\[::1\]"/);
  assert.match(membership, /PLATOON_MEMBER_WEB_ORIGIN/);
});

test("does not collect or forward payment details with a public application", () => {
  assert.doesNotMatch(form, /sourceToken|savedCard|renewalMode|square-card-container/);
  assert.doesNotMatch(route, /sourceToken|savedCard|renewalMode|recurringConsentVersion/);
  assert.match(route, /Object\.hasOwn\(application, "payment"\)/);
  const successBlock = form.slice(form.indexOf('submission.status === "success"'));
  assert.doesNotMatch(successBlock, /dateOfBirth|addressLine1|postalCode/);
});

test("sets the web-first expectation after submission", () => {
  const successBlock = form.slice(form.indexOf('submission.status === "success"'));
  assert.match(successBlock, /Watch your email/);
  assert.match(successBlock, /review decision/);
  assert.match(successBlock, /secure instructions/);
  assert.match(successBlock, /Platoon web account/);
  assert.match(successBlock, /Account > Membership/);
  assert.doesNotMatch(successBlock, /download|App Store|Google Play/i);
});

test("collects Turnstile proof and keeps it inside the signed Platoon application", () => {
  assert.match(form, /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js\?render=explicit/);
  assert.match(form, /turnstileAction/);
  assert.match(form, /turnstileToken/);
  assert.match(form, /formStartedAt/);
  assert.match(form, /name="website"/);
  assert.match(route, /abuseProtectionProof/);
  assert.match(route, /const rawBody = JSON\.stringify\(application\)/);
  assert.match(route, /signedProgramHeaders\(\{/);
});

test("derives only an opaque network key from Vercel's trusted client address", () => {
  assert.match(route, /x-vercel-forwarded-for/);
  assert.match(route, /membership-network-v1:/);
  assert.match(route, /createHmac\("sha256", secret\)/);
  assert.match(route, /networkFingerprint: networkFingerprint\(request, secret\)/);
  assert.doesNotMatch(form, /networkFingerprint/);
});
