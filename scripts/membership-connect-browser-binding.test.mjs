import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import net from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function availablePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a test port.")));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(origin, output) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${origin}/join`);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Production server did not start.\n${output.join("")}`);
}

test("a callback from browser A is rejected in browser B", { timeout: 30_000 }, async (context) => {
  const port = await availablePort();
  const localOrigin = `http://127.0.0.1:${port}`;
  const configuredOrigin = `https://127.0.0.1:${port}`;
  const output = [];
  const server = spawn(
    process.execPath,
    [path.join(repositoryRoot, "node_modules", "next", "dist", "bin", "next"), "start", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        NEXT_TEST_WASM: "1",
        NEXT_TEST_WASM_DIR: path.join(repositoryRoot, "node_modules", "@next", "swc-wasm-nodejs"),
        NODE_ENV: "production",
        PLATOON_MEMBERSHIP_CONNECTION_AUTHORIZE_URL: "https://example.test/membership-connect/authorize",
        PLATOON_MEMBERSHIP_CONNECTION_EXCHANGE_URL: "https://127.0.0.1:9/api/public/membership-connections/exchange",
        PLATOON_MEMBERSHIP_PROGRAM_HANDLE: "mpp_bcfools_20260802",
        PLATOON_MEMBERSHIP_PROGRAM_KEY: "mpk_abcdefghijklmnop",
        PLATOON_MEMBERSHIP_PROGRAM_SECRET: "test-secret-that-is-long-enough-for-authenticated-encryption",
        PLATOON_MEMBERSHIP_RETURN_URL: `${configuredOrigin}/api/platoon/connect/callback`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => output.push(chunk.toString()));
  server.stderr.on("data", (chunk) => output.push(chunk.toString()));
  context.after(() => {
    if (!server.killed) server.kill();
  });

  await waitForServer(localOrigin, output);

  const browserA = randomBytes(32).toString("base64url");
  const browserAHash = createHash("sha256").update(browserA).digest("base64url");
  const startResponse = await fetch(
    `${localOrigin}/api/platoon/connect/start?type=renewal&binding=${browserAHash}`,
    { redirect: "manual" },
  );
  assert.equal(startResponse.status, 307);
  assert.equal(startResponse.headers.get("set-cookie"), null);
  const authorizeLocation = startResponse.headers.get("location");
  assert.ok(authorizeLocation);
  const authorize = new URL(authorizeLocation);
  const state = authorize.searchParams.get("state");
  assert.ok(state);
  assert.ok(state.length >= 32 && state.length <= 512);

  const code = randomBytes(32).toString("base64url");
  const callbackResponse = await fetch(
    `${localOrigin}/api/platoon/connect/callback?code=${code}&state=${state}`,
    { redirect: "manual" },
  );
  assert.equal(callbackResponse.status, 307);
  const rawHandoffLocation = callbackResponse.headers.get("location");
  assert.ok(rawHandoffLocation);
  const handoffLocation = new URL(rawHandoffLocation);
  assert.ok(handoffLocation.hash.startsWith("#platoon-connect="));
  const handoff = JSON.parse(
    Buffer.from(handoffLocation.hash.slice("#platoon-connect=".length), "base64url").toString("utf8"),
  );
  assert.deepEqual(handoff, { code, state });

  const browserB = randomBytes(32).toString("base64url");
  const transplantedResponse = await fetch(`${localOrigin}/api/platoon/connect/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: configuredOrigin },
    body: JSON.stringify({ ...handoff, browserBinding: browserB }),
  });
  assert.equal(transplantedResponse.status, 403);
  assert.equal(transplantedResponse.headers.get("set-cookie"), null);
  assert.match(
    (await transplantedResponse.json()).redirectTo,
    /^\/join\?platoon=error&type=renewal&connection_ref=CONN-[A-F0-9]{8}#application$/,
  );

  const initiatingBrowserResponse = await fetch(`${localOrigin}/api/platoon/connect/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: configuredOrigin },
    body: JSON.stringify({ ...handoff, browserBinding: browserA }),
  });
  assert.equal(initiatingBrowserResponse.status, 502);
  assert.equal(initiatingBrowserResponse.headers.get("set-cookie"), null);
  assert.match(
    (await initiatingBrowserResponse.json()).redirectTo,
    /^\/join\?platoon=error&type=renewal&connection_ref=CONN-[A-F0-9]{8}#application$/,
  );
});
