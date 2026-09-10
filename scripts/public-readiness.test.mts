import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const sourceFiles = [
  "../src/app/events/page.tsx",
  "../src/app/contact/page.tsx",
  "../src/app/join/MembershipApplicationForm.tsx",
  "../src/app/join/page.tsx",
  "../src/app/privacy/page.tsx",
  "../src/app/terms/page.tsx",
] as const;

test("public pages do not contain audited rollout language", async () => {
  const source = (
    await Promise.all(
      sourceFiles.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
    )
  ).join("\n");

  for (const phrase of [
    "Secure deferred-charge pilot",
    "Sign-in connection pending",
    "Automatic renewal is not available yet",
    "future checkout",
    "When account activation is available",
    "When Platoon account matching is offered",
    "through Platoon",
    "Photo coming soon",
  ]) {
    assert.doesNotMatch(source, new RegExp(phrase, "i"));
  }
});

test("public launch metadata and branded not-found page exist", async () => {
  for (const path of [
    "../src/app/not-found.tsx",
    "../src/app/robots.ts",
    "../src/app/sitemap.ts",
  ]) {
    await assert.doesNotReject(access(new URL(path, import.meta.url)));
  }
});

test("homepage event fallback uses a calendar symbol instead of a date-like action label", async () => {
  const homePage = await readFile(
    new URL("../src/app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(homePage, /<CalendarIcon \/>/);
  assert.doesNotMatch(homePage, /feed\.status === "ready" \? "TBA" : "View"/);
});

test("membership application requires the versioned new-application program", async () => {
  const joinPage = await readFile(
    new URL("../src/app/join/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(joinPage, /program\.enabledApplicationTypes\.includes\("new"\)/);
  assert.doesNotMatch(joinPage, /square\.(?:ready|environment|applicationId|locationId)/);
});

test("renewals leave the public application and require a Platoon member account", async () => {
  const [config, home, joinPage, form] = await Promise.all([
    readFile(new URL("../src/config/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/join/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/join/MembershipApplicationForm.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(config, /renewal: "https:\/\/app\.platoonapp\.com\/account\/membership"/);
  assert.match(home, /href=\{siteConfig\.links\.renewal\}/);
  assert.match(joinPage, /membershipManagementUrl\(siteConfig\.links\.renewal\)/);
  assert.match(joinPage, /params\.type === "renewal"\) redirect\(renewalUrl\)/);
  assert.doesNotMatch(form, /value="renewal"/);
  assert.match(form, /Sign in to your Platoon account/);
  assert.doesNotMatch(config, /shop\/membership-renewal|account\/membership\/renew/);
});

test("new membership entry points stay on the native same-origin application", async () => {
  const [config, home] = await Promise.all([
    readFile(new URL("../src/config/site.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(config, /applicationRoute: "\/join"/);
  assert.match(config, /newMembership: "\/join\?type=new#application"/);
  assert.match(home, /href=\{`\$\{siteConfig\.links\.applicationRoute\}\?type=new#application`\}/);
  assert.doesNotMatch(config, /jotform|shop\/new-membership|woocommerce/i);
});

test("membership prices match the approved Brew City dues", async () => {
  const config = await readFile(
    new URL("../src/config/site.ts", import.meta.url),
    "utf8",
  );

  assert.match(config, /newMemberPrice: 75/);
  assert.match(config, /renewalPrice: 50/);
});

test("unused framework starter assets are absent", async () => {
  for (const asset of ["file.svg", "globe.svg", "next.svg", "vercel.svg", "window.svg"]) {
    await assert.rejects(access(new URL(`../public/${asset}`, import.meta.url)));
  }
});
