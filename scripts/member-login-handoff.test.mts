import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync(new URL("../src/config/site.ts", import.meta.url), "utf8");
const header = readFileSync(new URL("../src/app/SiteHeader.tsx", import.meta.url), "utf8");

test("Member Login enters organization-scoped Platoon onboarding", () => {
  assert.match(
    config,
    /memberDashboard:\s*\n?\s*["']https:\/\/app\.platoonapp\.com\/organization-join\?organization=brew-city-fools["']/,
  );
  assert.match(header, /href=\{siteConfig\.links\.memberDashboard\}/);
  assert.doesNotMatch(config, /memberDashboard:\s*["']https:\/\/app\.platoonapp\.com["']/);
});
