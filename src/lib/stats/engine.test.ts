import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBusinessTimestamp } from "../timezone.ts";
import { instantFromCivilTime } from "./calendar.ts";
import { buildStatsReport } from "./engine.ts";
import type { StatsEvent, StatsReport } from "./types.ts";

function at(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  millisecond = 0,
): Date {
  return instantFromCivilTime(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
  );
}

function event(
  id: string,
  type: StatsEvent["type"],
  createdAt: Date,
): StatsEvent {
  return { id, type, createdAt };
}

function assertConsistent(report: StatsReport): void {
  assert.equal(
    report.officeMs,
    report.days.reduce((sum, day) => sum + day.officeMs, 0),
  );
  assert.equal(
    report.outsideMs,
    report.days.reduce((sum, day) => sum + day.outsideMs, 0),
  );
  assert.equal(
    report.visits,
    report.days.reduce((sum, day) => sum + day.visits, 0),
  );
  assert.equal(
    report.officeDays,
    report.days.filter((day) => day.officeMs > 0).length,
  );

  for (const day of report.days) {
    assert.equal(
      day.officeMs,
      day.sessions.reduce((sum, slice) => sum + slice.officeMs, 0),
    );
    if (day.sessions.length === 1) {
      assert.equal(day.outsideMs, 0);
    }
  }
}

describe("statistics engine", () => {
  it("matches the 10:30, 13:00, 13:45, and 18:30 example", () => {
    const now = at(2026, 10, 26, 19, 0);
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 30)),
        event("2", "EXIT", at(2026, 10, 26, 13, 0)),
        event("3", "ENTER", at(2026, 10, 26, 13, 45)),
        event("4", "EXIT", at(2026, 10, 26, 18, 30)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now,
    });

    assertConsistent(report);
    assert.equal(report.timezone, "Asia/Yerevan");
    assert.equal(report.generatedAt, formatBusinessTimestamp(now));
    assert.equal(report.status, "OUT_OF_OFFICE");
    assert.equal(report.currentSession, null);
    assert.equal(report.days[0]?.firstArrival, "2026-10-26T10:30:00.000+04:00");
    assert.equal(report.days[0]?.lastExit, "2026-10-26T18:30:00.000+04:00");
    assert.equal(report.officeMs, 26_100_000);
    assert.equal(report.outsideMs, 2_700_000);
    assert.equal(report.visits, 2);
    assert.equal(report.officeDays, 1);
    assert.deepEqual(
      report.days[0]?.sessions.map((slice) => slice.officeMs),
      [9_000_000, 17_100_000],
    );
    assert.equal(report.days[0]?.sessions[0]?.start, "2026-10-26T10:30:00.000+04:00");
    assert.equal(report.days[0]?.sessions[0]?.end, "2026-10-26T13:00:00.000+04:00");
    assert.equal(report.days[0]?.sessions[1]?.start, "2026-10-26T13:45:00.000+04:00");
    assert.equal(report.days[0]?.sessions[1]?.end, "2026-10-26T18:30:00.000+04:00");
    assert.equal(report.days[0]?.sessions[0]?.open, false);
    assert.equal(report.days[0]?.sessions[0]?.continuedFromPreviousDay, false);
    assert.equal(report.days[0]?.sessions[0]?.continuesBeyondDay, false);
  });

  it("gives a single visit no outside time", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 0)),
        event("2", "EXIT", at(2026, 10, 26, 12, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 26, 18, 0),
    });

    assertConsistent(report);
    assert.equal(report.outsideMs, 0);
    assert.equal(report.officeMs, 7_200_000);
    assert.equal(report.visits, 1);
    assert.equal(report.days[0]?.sessions.length, 1);
  });

  it("ignores a duplicate enter or exit", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 0)),
        event("2", "ENTER", at(2026, 10, 26, 10, 15)),
        event("3", "EXIT", at(2026, 10, 26, 12, 0)),
        event("4", "EXIT", at(2026, 10, 26, 12, 10)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 26, 13, 0),
    });

    assertConsistent(report);
    assert.equal(report.visits, 1);
    assert.equal(report.officeMs, 7_200_000);
    assert.equal(report.days[0]?.sessions.length, 1);
    assert.equal(report.days[0]?.firstArrival, "2026-10-26T10:00:00.000+04:00");
    assert.equal(report.days[0]?.lastExit, "2026-10-26T12:00:00.000+04:00");
  });

  it("ignores a leading exit", () => {
    const report = buildStatsReport({
      events: [
        event("1", "EXIT", at(2026, 10, 26, 9, 0)),
        event("2", "ENTER", at(2026, 10, 26, 10, 0)),
        event("3", "EXIT", at(2026, 10, 26, 11, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 26, 12, 0),
    });

    assertConsistent(report);
    assert.equal(report.visits, 1);
    assert.equal(report.officeMs, 3_600_000);
    assert.equal(report.days[0]?.firstArrival, "2026-10-26T10:00:00.000+04:00");
    assert.equal(report.days[0]?.lastExit, "2026-10-26T11:00:00.000+04:00");
    assert.equal(report.since, "2026-10-26T11:00:00.000+04:00");
  });

  it("stops an open session at the injected now", () => {
    const now = at(2026, 10, 26, 11, 0);
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 0)),
        event("2", "EXIT", at(2026, 10, 26, 12, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now,
    });

    assertConsistent(report);
    assert.equal(report.status, "IN_OFFICE");
    assert.equal(report.officeMs, 3_600_000);
    assert.equal(report.days[0]?.lastExit, null);
    assert.equal(report.currentSession?.startedAt, "2026-10-26T10:00:00.000+04:00");
    assert.equal(report.currentSession?.elapsedMs, 3_600_000);
    assert.equal(report.days[0]?.sessions[0]?.open, true);
    assert.equal(report.days[0]?.sessions[0]?.end, null);
    assert.equal(report.since, "2026-10-26T10:00:00.000+04:00");
  });

  it("keeps an earlier exit after a later re-entry", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 0)),
        event("2", "EXIT", at(2026, 10, 26, 12, 0)),
        event("3", "ENTER", at(2026, 10, 26, 13, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 26, 14, 0),
    });

    assertConsistent(report);
    assert.equal(report.days[0]?.lastExit, "2026-10-26T12:00:00.000+04:00");
    assert.equal(report.visits, 2);
    assert.equal(report.officeMs, 10_800_000);
    assert.equal(report.outsideMs, 3_600_000);
    assert.equal(report.status, "IN_OFFICE");
    assert.equal(report.currentSession?.startedAt, "2026-10-26T13:00:00.000+04:00");
    assert.equal(report.currentSession?.elapsedMs, 3_600_000);
    assert.equal(report.days[0]?.sessions[1]?.open, true);
  });

  it("splits an overnight session across local midnight", () => {
    const now = at(2026, 10, 27, 12, 0);
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 22, 0)),
        event("2", "EXIT", at(2026, 10, 27, 2, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-27",
      now,
    });

    assertConsistent(report);
    assert.equal(report.officeMs, 14_400_000);
    assert.equal(report.outsideMs, 0);
    assert.equal(report.visits, 1);

    const first = report.days[0];
    const second = report.days[1];
    assert.equal(first?.date, "2026-10-26");
    assert.equal(first?.firstArrival, "2026-10-26T22:00:00.000+04:00");
    assert.equal(first?.lastExit, null);
    assert.equal(first?.officeMs, 7_200_000);
    assert.equal(first?.outsideMs, 0);
    assert.equal(first?.visits, 1);
    assert.equal(first?.sessions.length, 1);
    assert.equal(first?.sessions[0]?.start, "2026-10-26T22:00:00.000+04:00");
    assert.equal(first?.sessions[0]?.end, "2026-10-27T00:00:00.000+04:00");
    assert.equal(first?.sessions[0]?.continuesBeyondDay, true);
    assert.equal(first?.sessions[0]?.continuedFromPreviousDay, false);
    assert.equal(first?.sessions[0]?.open, false);

    assert.equal(second?.date, "2026-10-27");
    assert.equal(second?.firstArrival, null);
    assert.equal(second?.lastExit, "2026-10-27T02:00:00.000+04:00");
    assert.equal(second?.officeMs, 7_200_000);
    assert.equal(second?.outsideMs, 0);
    assert.equal(second?.visits, 0);
    assert.equal(second?.sessions.length, 1);
    assert.equal(second?.sessions[0]?.start, "2026-10-27T00:00:00.000+04:00");
    assert.equal(second?.sessions[0]?.end, "2026-10-27T02:00:00.000+04:00");
    assert.equal(second?.sessions[0]?.continuedFromPreviousDay, true);
    assert.equal(second?.sessions[0]?.continuesBeyondDay, false);
    assert.equal(second?.sessions[0]?.open, false);
    assert.ok((second?.officeMs ?? 0) > 0);
  });

  it("counts an exit exactly at local midnight only on the day being left", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 23, 0)),
        event("2", "EXIT", at(2026, 10, 27, 0, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-27",
      now: at(2026, 10, 27, 12, 0),
    });

    assertConsistent(report);
    assert.equal(report.days[0]?.officeMs, 3_600_000);
    assert.equal(report.days[0]?.lastExit, null);
    assert.equal(report.days[0]?.visits, 1);
    assert.equal(report.days[0]?.sessions[0]?.end, "2026-10-27T00:00:00.000+04:00");
    assert.equal(report.days[0]?.sessions[0]?.continuesBeyondDay, false);
    assert.equal(report.days[0]?.sessions[0]?.open, false);

    assert.equal(report.days[1]?.officeMs, 0);
    assert.equal(report.days[1]?.visits, 0);
    assert.equal(report.days[1]?.firstArrival, null);
    assert.equal(report.days[1]?.lastExit, "2026-10-27T00:00:00.000+04:00");
    assert.deepEqual(report.days[1]?.sessions, []);
    assert.equal(report.officeMs, 3_600_000);
  });

  it("keeps today's open slice live when now is exactly the next midnight", () => {
    const now = at(2026, 10, 27, 0, 0);
    const report = buildStatsReport({
      events: [event("1", "ENTER", at(2026, 10, 26, 22, 0))],
      from: "2026-10-26",
      to: "2026-10-27",
      now,
    });

    assertConsistent(report);
    assert.equal(report.days[0]?.sessions[0]?.open, false);
    assert.equal(report.days[0]?.sessions[0]?.end, "2026-10-27T00:00:00.000+04:00");
    assert.equal(report.days[0]?.sessions[0]?.continuesBeyondDay, true);
    assert.equal(report.days[0]?.officeMs, 7_200_000);
    assert.equal(report.days[1]?.officeMs, 0);
    assert.equal(report.days[1]?.sessions.length, 0);
    assert.equal(report.currentSession?.elapsedMs, 7_200_000);
    assert.equal(report.status, "IN_OFFICE");
  });

  it("counts a pre-midnight UTC instant on the Yerevan business date", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", new Date("2026-10-25T20:30:00.000Z")),
        event("2", "EXIT", at(2026, 10, 26, 1, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 26, 2, 0),
    });

    assertConsistent(report);
    assert.equal(report.days[0]?.firstArrival, "2026-10-26T00:30:00.000+04:00");
    assert.equal(report.visits, 1);
    assert.equal(report.officeMs, 1_800_000);
  });

  it("includes empty days and keeps averages on the days that have values", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 0)),
        event("2", "EXIT", at(2026, 10, 26, 12, 0)),
        event("3", "ENTER", at(2026, 10, 28, 11, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-28",
      now: at(2026, 10, 28, 12, 0),
    });

    assertConsistent(report);
    assert.deepEqual(
      report.days.map((day) => day.date),
      ["2026-10-26", "2026-10-27", "2026-10-28"],
    );
    assert.equal(report.days[1]?.officeMs, 0);
    assert.equal(report.days[1]?.visits, 0);
    assert.equal(report.days[1]?.firstArrival, null);
    assert.equal(report.days[1]?.lastExit, null);
    assert.equal(report.officeMs, 10_800_000);
    assert.equal(report.outsideMs, 0);
    assert.equal(report.visits, 2);
    assert.equal(report.officeDays, 2);
    assert.equal(report.averageOfficeMs, 5_400_000);
    assert.equal(report.averageArrivalMs, 37_800_000);
    assert.equal(report.averageDepartureMs, 43_200_000);
    assert.equal(report.days[2]?.lastExit, null);
    assert.equal(report.currentSession?.elapsedMs, 3_600_000);
  });

  it("gives a future day no office time while a session is open", () => {
    const report = buildStatsReport({
      events: [event("1", "ENTER", at(2026, 10, 26, 10, 0))],
      from: "2026-10-26",
      to: "2026-10-27",
      now: at(2026, 10, 26, 12, 0),
    });

    assertConsistent(report);
    assert.equal(report.days[0]?.officeMs, 7_200_000);
    assert.equal(report.days[0]?.sessions[0]?.open, true);
    assert.equal(report.days[1]?.date, "2026-10-27");
    assert.equal(report.days[1]?.officeMs, 0);
    assert.deepEqual(report.days[1]?.sessions, []);
    assert.equal(report.officeMs, 7_200_000);
    assert.equal(report.currentSession?.elapsedMs, 7_200_000);
  });

  it("returns null averages when every divisor is zero", () => {
    const report = buildStatsReport({
      events: [],
      from: "2026-10-26",
      to: "2026-10-27",
      now: at(2026, 10, 26, 12, 0),
    });

    assertConsistent(report);
    assert.equal(report.days.length, 2);
    assert.equal(report.officeDays, 0);
    assert.equal(report.averageOfficeMs, null);
    assert.equal(report.averageArrivalMs, null);
    assert.equal(report.averageDepartureMs, null);
    assert.equal(report.status, "OUT_OF_OFFICE");
    assert.equal(report.since, null);
    assert.equal(report.currentSession, null);
  });

  it("rounds the office average half up", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 0, 0, 0, 0)),
        event("2", "EXIT", at(2026, 10, 26, 0, 0, 0, 1)),
        event("3", "ENTER", at(2026, 10, 27, 0, 0, 0, 0)),
        event("4", "EXIT", at(2026, 10, 27, 0, 0, 0, 2)),
      ],
      from: "2026-10-26",
      to: "2026-10-27",
      now: at(2026, 10, 27, 12, 0),
    });

    assertConsistent(report);
    assert.equal(report.officeMs, 3);
    assert.equal(report.officeDays, 2);
    assert.equal(report.averageOfficeMs, 2);
  });

  it("uses the whole open session for elapsed time when today starts at midnight", () => {
    const report = buildStatsReport({
      events: [event("1", "ENTER", at(2026, 10, 26, 22, 0))],
      from: "2026-10-27",
      to: "2026-10-27",
      now: at(2026, 10, 27, 1, 0),
    });

    assertConsistent(report);
    assert.equal(report.officeMs, 3_600_000);
    assert.equal(report.visits, 0);
    assert.equal(report.days[0]?.firstArrival, null);
    assert.equal(report.days[0]?.lastExit, null);
    assert.equal(report.days[0]?.sessions[0]?.continuedFromPreviousDay, true);
    assert.equal(report.days[0]?.sessions[0]?.open, true);
    assert.equal(report.days[0]?.sessions[0]?.end, null);
    assert.equal(report.currentSession?.startedAt, "2026-10-26T22:00:00.000+04:00");
    assert.equal(report.currentSession?.elapsedMs, 10_800_000);
    assert.equal(report.since, "2026-10-26T22:00:00.000+04:00");
    assert.equal(report.status, "IN_OFFICE");
  });

  it("keeps status from an exit that happened before the range", () => {
    const exitAt = at(2026, 10, 25, 18, 0);
    const report = buildStatsReport({
      events: [event("1", "EXIT", exitAt)],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 26, 12, 0),
    });

    assertConsistent(report);
    assert.equal(report.status, "OUT_OF_OFFICE");
    assert.equal(report.since, formatBusinessTimestamp(exitAt));
    assert.equal(report.currentSession, null);
    assert.equal(report.officeMs, 0);
    assert.equal(report.visits, 0);
  });

  it("does not let an event after the range change that range's visits", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", at(2026, 10, 26, 10, 0)),
        event("2", "EXIT", at(2026, 10, 26, 11, 0)),
        event("3", "ENTER", at(2026, 10, 27, 9, 0)),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: at(2026, 10, 27, 10, 0),
    });

    assertConsistent(report);
    assert.equal(report.visits, 1);
    assert.equal(report.officeMs, 3_600_000);
    assert.equal(report.days[0]?.lastExit, "2026-10-26T11:00:00.000+04:00");
    assert.equal(report.status, "IN_OFFICE");
    assert.equal(report.currentSession?.startedAt, "2026-10-27T09:00:00.000+04:00");
    assert.equal(report.currentSession?.elapsedMs, 3_600_000);
    assert.equal(report.since, "2026-10-27T09:00:00.000+04:00");
  });

  it("orders tied timestamps by id and accepts events in any order", () => {
    const same = at(2026, 10, 26, 10, 0);
    const now = at(2026, 10, 26, 12, 0);
    const tied = buildStatsReport({
      events: [
        event("b", "EXIT", same),
        event("a", "ENTER", same),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now,
    });
    assert.equal(tied.status, "OUT_OF_OFFICE");
    assert.equal(tied.officeMs, 0);
    assert.equal(tied.visits, 1);
    assert.equal(tied.currentSession, null);

    const enter = event("1", "ENTER", at(2026, 10, 26, 10, 0));
    const exit = event("2", "EXIT", at(2026, 10, 26, 12, 0));
    const sorted = buildStatsReport({
      events: [enter, exit],
      from: "2026-10-26",
      to: "2026-10-26",
      now,
    });
    const reversed = buildStatsReport({
      events: [exit, enter],
      from: "2026-10-26",
      to: "2026-10-26",
      now,
    });
    assert.deepEqual(sorted, reversed);
    assert.equal(sorted.officeMs, 7_200_000);
    assert.equal(sorted.status, "OUT_OF_OFFICE");
  });

  it("reproduces the four accepted presence rows", () => {
    const report = buildStatsReport({
      events: [
        event("1", "ENTER", new Date("2026-10-26T16:51:27.376Z")),
        event("2", "EXIT", new Date("2026-10-26T16:51:31.263Z")),
        event("3", "ENTER", new Date("2026-10-26T16:53:17.433Z")),
        event("4", "EXIT", new Date("2026-10-26T16:55:22.638Z")),
      ],
      from: "2026-10-26",
      to: "2026-10-26",
      now: new Date("2026-10-26T17:00:00.000Z"),
    });

    assertConsistent(report);
    assert.equal(report.days[0]?.firstArrival, "2026-10-26T20:51:27.376+04:00");
    assert.equal(report.days[0]?.lastExit, "2026-10-26T20:55:22.638+04:00");
    assert.equal(report.officeMs, 129_092);
    assert.equal(report.outsideMs, 106_170);
    assert.equal(report.visits, 2);
    assert.deepEqual(
      report.days[0]?.sessions.map((slice) => slice.officeMs),
      [3_887, 125_205],
    );
    assert.equal(report.status, "OUT_OF_OFFICE");
    assert.equal(report.currentSession, null);
  });
});
