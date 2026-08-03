import assert from "node:assert/strict";
import test from "node:test";
import {
  membershipFormDefaults,
  parsePlatoonExchangeResponse,
  type PlatoonExchangeConnection,
} from "../src/lib/platoonConnectionPayload.ts";
import { readConnection, storeConnection } from "../src/lib/platoonConnectionCookie.ts";

const baseResponse = {
  accountId: "00000000-0000-0000-0000-000000000001",
  verifiedEmail: " Member@Example.org ",
  connectionReceipt: "receipt-value",
};

test("accepts the approved connected-member prefill fields", () => {
  assert.deepEqual(
    parsePlatoonExchangeResponse({
      ...baseResponse,
      profile: {
        fullName: "Member Name",
        phone: "+10000000000",
        department: {
          name: "Milwaukee Fire Department",
          state: "wi",
          rank: "Captain",
        },
      },
    }),
    {
      accountId: baseResponse.accountId,
      verifiedEmail: "member@example.org",
      profile: {
        fullName: "Member Name",
        phone: "+10000000000",
        departmentName: "Milwaukee Fire Department",
        departmentState: "WI",
        rank: "Captain",
      },
      receipt: "receipt-value",
    },
  );
});

test("keeps optional contact and department fields null", () => {
  assert.deepEqual(
    parsePlatoonExchangeResponse({
      ...baseResponse,
      profile: { fullName: "Applicant Name", phone: null, department: null },
    }),
    {
      accountId: baseResponse.accountId,
      verifiedEmail: "member@example.org",
      profile: {
        fullName: "Applicant Name",
        phone: null,
        departmentName: null,
        departmentState: null,
        rank: null,
      },
      receipt: "receipt-value",
    },
  );
});

test("keeps an unconfigured department state null", () => {
  const connection = parsePlatoonExchangeResponse({
    ...baseResponse,
    profile: {
      fullName: "Applicant Name",
      phone: "+10000000000",
      department: { name: "Test Fire Department", state: null, rank: "Captain" },
    },
  });
  assert.equal(connection?.profile.departmentName, "Test Fire Department");
  assert.equal(connection?.profile.departmentState, null);
});

test("rejects malformed optional profile fields", () => {
  assert.equal(parsePlatoonExchangeResponse({ ...baseResponse, profile: "invalid" }), null);
  assert.equal(
    parsePlatoonExchangeResponse({
      ...baseResponse,
      profile: {
        fullName: "Applicant Name",
        phone: "+10000000000",
        department: { name: "Test Fire Department", state: "Wisconsin", rank: "Captain" },
      },
    }),
    null,
  );
  assert.equal(
    parsePlatoonExchangeResponse({
      ...baseResponse,
      profile: {
        fullName: "Applicant Name",
        phone: "1".repeat(41),
        department: { name: "Test Fire Department", state: "WI", rank: "Captain" },
      },
    }),
    null,
  );
  assert.equal(
    parsePlatoonExchangeResponse({
      ...baseResponse,
      profile: { fullName: "Applicant Name", phone: "+10000000000", department: null },
    }),
    null,
  );
});

const populatedConnection: PlatoonExchangeConnection = {
  accountId: baseResponse.accountId,
  verifiedEmail: "member@example.org",
  profile: {
    fullName: "Member Middle Name",
    phone: "+10000000000",
    departmentName: "Milwaukee Fire Department",
    departmentState: "WI",
    rank: "Captain",
  },
  receipt: "receipt-value",
};

test("round trips populated and null profiles through the encrypted cookie", () => {
  const secret = "membership-profile-test-secret";
  const populated = { ...populatedConnection, expiresAt: Date.now() + 60_000 };
  assert.deepEqual(readConnection(storeConnection(populated, secret), secret), populated);

  const empty = {
    ...populated,
    profile: {
      fullName: "Applicant Name",
      phone: null,
      departmentName: null,
      departmentState: null,
      rank: null,
    },
  };
  assert.deepEqual(readConnection(storeConnection(empty, secret), secret), empty);
});

test("maps connected profile fields to editable form defaults", () => {
  assert.deepEqual(membershipFormDefaults(populatedConnection), {
    firstName: "Member Middle",
    lastName: "Name",
    phone: "+10000000000",
    departmentName: "Milwaukee Fire Department",
    departmentState: "WI",
    rank: "Captain",
  });
});

test("keeps a connected null department blank and defaults only unconnected state", () => {
  const connectedWithoutDepartment = {
    profile: {
      fullName: "Applicant Name",
      phone: null,
      departmentName: null,
      departmentState: null,
      rank: null,
    },
  };
  assert.deepEqual(membershipFormDefaults(connectedWithoutDepartment), {
    firstName: "Applicant",
    lastName: "Name",
    phone: "",
    departmentName: "",
    departmentState: "",
    rank: "",
  });
  assert.equal(membershipFormDefaults(null).departmentState, "WI");
});
