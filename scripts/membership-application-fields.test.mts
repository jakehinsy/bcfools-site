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
  assert.match(contract, /APPLICATION_SCHEMA_VERSION = "2026-08-05"/);
  assert.match(membership, /import \{ APPLICATION_SCHEMA_VERSION \} from "\.\/membershipApplicationContract"/);
  assert.match(membership, /requiresDateOfBirth/);
  assert.match(membership, /requiresMailingAddress/);
  assert.match(form, /APPLICATION_SCHEMA_VERSION/);
});

test("does not include restricted values in payment or success copy", () => {
  const paymentBlock = form.slice(form.indexOf("payment: {"), form.indexOf("const result ="));
  assert.doesNotMatch(paymentBlock, /dateOfBirth|addressLine1|postalCode/);
  const successBlock = form.slice(form.indexOf('submission.status === "success"'));
  assert.doesNotMatch(successBlock, /dateOfBirth|addressLine1|postalCode/);
});
