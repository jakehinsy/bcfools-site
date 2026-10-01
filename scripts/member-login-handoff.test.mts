import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("../src/config/site.ts", import.meta.url), "utf8");
const header = readFileSync(new URL("../src/app/SiteHeader.tsx", import.meta.url), "utf8");
const headerClient = readFileSync(new URL("../src/app/SiteHeaderClient.tsx", import.meta.url), "utf8");

test("Member Login enters organization-scoped Platoon onboarding", () => {
  assert.match(
    config,
    /memberDashboard:\s*\n?\s*["']https:\/\/app\.platoonapp\.com\/organization-join\?organization=brew-city-fools["']/,
  );
  assert.match(header, /hostedPaidRegistrationOrigins\(\)\?\.member/);
  assert.match(header, /memberOrigin\s*\? new URL\("\/organization-join\?organization=brew-city-fools", memberOrigin\)/);
  assert.match(headerClient, /href=\{memberDashboardUrl\}/);
  assert.match(headerClient, /memberDashboardUrl \? <a/);
  assert.doesNotMatch(config, /memberDashboard:\s*["']https:\/\/app\.platoonapp\.com["']/);
});
