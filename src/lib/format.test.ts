import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessTimeOfDayMs,
  formatBusinessDate,
  formatChartLabel,
  formatDuration,
  formatMonthHeading,
  formatMsSinceMidnight,
  formatSummaryClock,
  formatTimelineClock,
  homeTimelineStartMs,
  slicePlacement,
} from "./format.ts";

describe("formatDuration", () => {
  it("rounds to the nearest second and omits empty parts", () => {
    assert.equal(formatDuration(0), "0m");
    assert.equal(formatDuration(3887), "4s");
    assert.equal(formatDuration(125_205), "2m 5s");
    assert.equal(formatDuration(129_092), "2m 9s");
    assert.equal(formatDuration(106_170), "1m 46s");
    assert.equal(formatDuration(2_700_000), "45m");
    assert.equal(formatDuration(26_100_000), "7h 15m");
    assert.equal(formatDuration(3_600_000), "1h");
  });
});

describe("clock labels", () => {
  it("reads Asia/Yerevan clock text without rounding up", () => {
    const timestamp = "2026-10-26T20:55:22.638+04:00";
    assert.equal(formatSummaryClock(timestamp), "20:55");
    assert.equal(formatTimelineClock(timestamp), "20:55:22");
  });

  it("formats milliseconds since local midnight and empty values", () => {
    assert.equal(formatMsSinceMidnight(75_087_376), "20:51");
    assert.equal(formatMsSinceMidnight(37_800_000), "10:30");
    assert.equal(formatMsSinceMidnight(null), "—");
    assert.equal(formatSummaryClock(null), "—");
    assert.equal(formatTimelineClock(null), "—");
  });

  it("reads the time of day from the business timestamp", () => {
    assert.equal(
      businessTimeOfDayMs("2026-10-26T20:51:27.376+04:00"),
      75_087_376,
    );
  });
});

describe("business date labels", () => {
  it("formats an English weekday without parsing a date-only string", () => {
    assert.equal(formatBusinessDate("2026-10-26"), "Mon 26 Oct 2026");
    assert.equal(formatBusinessDate("2026-11-01"), "Sun 1 Nov 2026");
    assert.equal(formatMonthHeading("2026-10"), "October 2026");
    assert.equal(formatChartLabel("2026-10-26", "weekday"), "Mon 26");
    assert.equal(formatChartLabel("2026-10-26", "day"), "26");
  });
});

describe("slice placement", () => {
  it("places the accepted office slices on the business day", () => {
    const first = slicePlacement(
      "2026-10-26",
      {
        start: "2026-10-26T20:51:27.376+04:00",
        end: "2026-10-26T20:51:31.263+04:00",
        open: false,
        continuedFromPreviousDay: false,
        continuesBeyondDay: false,
      },
      "2026-10-26T21:00:00.000+04:00",
    );
    assert.equal(first.left, 75_087_376 / 86_400_000);
    assert.equal(first.width, 3_887 / 86_400_000);

    const second = slicePlacement(
      "2026-10-26",
      {
        start: "2026-10-26T20:53:17.433+04:00",
        end: "2026-10-26T20:55:22.638+04:00",
        open: false,
        continuedFromPreviousDay: false,
        continuesBeyondDay: false,
      },
      "2026-10-26T21:00:00.000+04:00",
    );
    assert.equal(second.width, 125_205 / 86_400_000);
  });

  it("starts a carried slice at midnight and stops an open slice at now", () => {
    const carried = slicePlacement(
      "2026-10-27",
      {
        start: "2026-10-27T00:00:00.000+04:00",
        end: "2026-10-27T02:00:00.000+04:00",
        open: false,
        continuedFromPreviousDay: true,
        continuesBeyondDay: false,
      },
      "2026-10-27T12:00:00.000+04:00",
    );
    assert.equal(carried.left, 0);
    assert.equal(carried.width, 7_200_000 / 86_400_000);

    const overnight = slicePlacement(
      "2026-10-26",
      {
        start: "2026-10-26T22:00:00.000+04:00",
        end: "2026-10-27T00:00:00.000+04:00",
        open: false,
        continuedFromPreviousDay: false,
        continuesBeyondDay: true,
      },
      "2026-10-27T12:00:00.000+04:00",
    );
    assert.equal(overnight.left, 79_200_000 / 86_400_000);
    assert.equal(overnight.width, 7_200_000 / 86_400_000);

    const open = slicePlacement(
      "2026-10-26",
      {
        start: "2026-10-26T20:00:00.000+04:00",
        end: null,
        open: true,
        continuedFromPreviousDay: false,
        continuesBeyondDay: false,
      },
      "2026-10-26T21:00:00.000+04:00",
    );
    assert.equal(open.left, 72_000_000 / 86_400_000);
    assert.equal(open.width, 3_600_000 / 86_400_000);
  });

  it("places a slice inside a window that starts at 10:00", () => {
    const placed = slicePlacement(
      "2026-10-29",
      {
        start: "2026-10-29T11:00:00.000+04:00",
        end: "2026-10-29T12:00:00.000+04:00",
        open: false,
        continuedFromPreviousDay: false,
        continuesBeyondDay: false,
      },
      "2026-10-29T12:00:00.000+04:00",
      36_000_000,
    );
    assert.equal(placed.left, 3_600_000 / 50_400_000);
    assert.equal(placed.width, 3_600_000 / 50_400_000);
  });
});

describe("home timeline start", () => {
  it("starts at 10:00 when the first arrival is later", () => {
    assert.equal(
      homeTimelineStartMs({
        date: "2026-10-29",
        firstArrival: "2026-10-29T11:46:26.016+04:00",
        sessions: [
          {
            start: "2026-10-29T11:46:26.016+04:00",
            end: null,
            open: true,
            continuedFromPreviousDay: false,
            continuesBeyondDay: false,
          },
        ],
      }),
      36_000_000,
    );
  });

  it("starts at the arrival hour when that hour is before 10:00", () => {
    assert.equal(
      homeTimelineStartMs({
        date: "2026-10-29",
        firstArrival: "2026-10-29T09:46:00.000+04:00",
        sessions: [
          {
            start: "2026-10-29T09:46:00.000+04:00",
            end: "2026-10-29T12:00:00.000+04:00",
            open: false,
            continuedFromPreviousDay: false,
            continuesBeyondDay: false,
          },
        ],
      }),
      32_400_000,
    );
  });

  it("starts at midnight when the visit began the previous day", () => {
    assert.equal(
      homeTimelineStartMs({
        date: "2026-10-29",
        firstArrival: null,
        sessions: [
          {
            start: "2026-10-29T00:00:00.000+04:00",
            end: "2026-10-29T11:00:00.000+04:00",
            open: false,
            continuedFromPreviousDay: true,
            continuesBeyondDay: false,
          },
        ],
      }),
      0,
    );
  });

  it("starts at 10:00 when the day has no office time", () => {
    assert.equal(
      homeTimelineStartMs({
        date: "2026-10-29",
        firstArrival: null,
        sessions: [],
      }),
      36_000_000,
    );
  });
});
