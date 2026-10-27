import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideTransition, statusFromLatestEvent } from "./transitions.ts";

describe("statusFromLatestEvent", () => {
  it("treats no latest event as out of the office", () => {
    assert.equal(statusFromLatestEvent(null), "OUT_OF_OFFICE");
  });

  it("treats the latest ENTER as in the office", () => {
    assert.equal(statusFromLatestEvent("ENTER"), "IN_OFFICE");
  });

  it("treats the latest EXIT as out of the office", () => {
    assert.equal(statusFromLatestEvent("EXIT"), "OUT_OF_OFFICE");
  });
});

describe("decideTransition", () => {
  it("records ENTER when out of the office", () => {
    assert.deepEqual(decideTransition("OUT_OF_OFFICE", "ENTER"), {
      record: true,
    });
  });

  it("does not record a duplicate ENTER", () => {
    assert.deepEqual(decideTransition("IN_OFFICE", "ENTER"), {
      record: false,
      reason: "already_in_office",
    });
  });

  it("records EXIT when in the office", () => {
    assert.deepEqual(decideTransition("IN_OFFICE", "EXIT"), { record: true });
  });

  it("does not record a duplicate EXIT", () => {
    assert.deepEqual(decideTransition("OUT_OF_OFFICE", "EXIT"), {
      record: false,
      reason: "already_out_of_office",
    });
  });
});
