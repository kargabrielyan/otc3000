import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBusinessTimestamp } from "../timezone.ts";
import {
  businessDateFromInstant,
  calendarMonthContaining,
  countInclusiveBusinessDays,
  instantFromCivilTime,
  isWeekday,
  mondayWeekContaining,
  resolveInclusiveRange,
  resolveOptionalBusinessDate,
  startInstantOfBusinessDate,
} from "./calendar.ts";

describe("business dates", () => {
  it("puts 2026-10-25T20:30:00.000Z on 2026-10-26 and that Monday week", () => {
    const instant = new Date("2026-10-25T20:30:00.000Z");
    assert.equal(businessDateFromInstant(instant), "2026-10-26");
    assert.equal(
      formatBusinessTimestamp(instant),
      "2026-10-26T00:30:00.000+04:00",
    );
    assert.deepEqual(mondayWeekContaining("2026-10-26"), {
      from: "2026-10-26",
      to: "2026-11-01",
    });
  });

  it("puts 2026-10-25T19:30:00.000Z on 2026-10-25 and the previous Monday week", () => {
    const instant = new Date("2026-10-25T19:30:00.000Z");
    assert.equal(businessDateFromInstant(instant), "2026-10-25");
    assert.equal(
      formatBusinessTimestamp(instant),
      "2026-10-25T23:30:00.000+04:00",
    );
    assert.deepEqual(mondayWeekContaining("2026-10-25"), {
      from: "2026-10-19",
      to: "2026-10-25",
    });
  });

  it("puts 2026-10-31T20:30:00.000Z in November", () => {
    const instant = new Date("2026-10-31T20:30:00.000Z");
    assert.equal(businessDateFromInstant(instant), "2026-11-01");
    assert.equal(
      formatBusinessTimestamp(instant),
      "2026-11-01T00:30:00.000+04:00",
    );
    assert.deepEqual(calendarMonthContaining("2026-11-01"), {
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  it("formats October and January instants with offset +04:00", () => {
    const october = instantFromCivilTime(2026, 10, 26, 15, 0, 0, 0);
    const january = instantFromCivilTime(2026, 1, 15, 15, 0, 0, 0);
    assert.equal(
      formatBusinessTimestamp(october),
      "2026-10-26T15:00:00.000+04:00",
    );
    assert.equal(
      formatBusinessTimestamp(january),
      "2026-01-15T15:00:00.000+04:00",
    );
    assert.equal(
      startInstantOfBusinessDate("2026-10-27").toISOString(),
      "2026-10-26T20:00:00.000Z",
    );
  });

  it("treats Monday through Friday as weekdays", () => {
    assert.equal(isWeekday("2026-10-26"), true);
    assert.equal(isWeekday("2026-10-30"), true);
    assert.equal(isWeekday("2026-10-31"), false);
    assert.equal(isWeekday("2026-11-01"), false);
    assert.equal(isWeekday("2026-11-02"), true);
  });

  it("uses the calendar length of October", () => {
    assert.deepEqual(calendarMonthContaining("2026-10-26"), {
      from: "2026-10-01",
      to: "2026-10-31",
    });
    assert.equal(countInclusiveBusinessDays("2026-10-01", "2026-10-31"), 31);
  });
});

describe("range validation", () => {
  it("rejects dates that are not real calendar days", () => {
    assert.equal(resolveInclusiveRange("2026-02-31", "2026-03-01"), null);
    assert.equal(resolveInclusiveRange("2026-04-31", "2026-05-01"), null);
    assert.equal(resolveInclusiveRange("2026-13-01", "2026-13-02"), null);
    assert.equal(resolveInclusiveRange("2026-00-10", "2026-00-11"), null);
    assert.equal(resolveInclusiveRange("2026-2-01", "2026-02-02"), null);
    assert.equal(resolveInclusiveRange("2026-10-26T00:00:00", "2026-10-27"), null);
    assert.equal(resolveInclusiveRange("26-10-26", "2026-10-27"), null);
    assert.equal(resolveOptionalBusinessDate("2026-02-29", "2026-10-26"), null);
    assert.equal(
      resolveOptionalBusinessDate("2024-02-29", "2026-10-26"),
      "2024-02-29",
    );
  });

  it("rejects a reversed range and a missing endpoint", () => {
    assert.equal(resolveInclusiveRange("2026-10-27", "2026-10-26"), null);
    assert.equal(resolveInclusiveRange(null, "2026-10-26"), null);
    assert.equal(resolveInclusiveRange("2026-10-26", null), null);
    assert.equal(resolveInclusiveRange("", "2026-10-26"), null);
  });

  it("rejects 367 inclusive days and accepts 366", () => {
    assert.equal(countInclusiveBusinessDays("2026-01-01", "2027-01-02"), 367);
    assert.equal(resolveInclusiveRange("2026-01-01", "2027-01-02"), null);
    assert.equal(countInclusiveBusinessDays("2024-01-01", "2025-01-01"), 367);
    assert.equal(resolveInclusiveRange("2024-01-01", "2025-01-01"), null);

    assert.equal(countInclusiveBusinessDays("2026-01-01", "2027-01-01"), 366);
    assert.deepEqual(resolveInclusiveRange("2026-01-01", "2027-01-01"), {
      from: "2026-01-01",
      to: "2027-01-01",
    });
    assert.equal(countInclusiveBusinessDays("2024-01-01", "2024-12-31"), 366);
    assert.deepEqual(resolveInclusiveRange("2024-01-01", "2024-12-31"), {
      from: "2024-01-01",
      to: "2024-12-31",
    });
  });

  it("uses today when the optional anchor is omitted", () => {
    assert.equal(resolveOptionalBusinessDate(null, "2026-10-26"), "2026-10-26");
    assert.equal(
      resolveOptionalBusinessDate("2026-11-03", "2026-10-26"),
      "2026-11-03",
    );
    assert.deepEqual(resolveInclusiveRange("2026-10-26", "2026-10-26"), {
      from: "2026-10-26",
      to: "2026-10-26",
    });
  });
});
