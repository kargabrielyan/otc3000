import type { OfficeStatus, PresenceEventType } from "../presence/transitions.ts";

export type StatsEvent = {
  id: string;
  type: PresenceEventType;
  createdAt: Date;
};

export type DaySessionSlice = {
  start: string;
  end: string | null;
  officeMs: number;
  open: boolean;
  continuedFromPreviousDay: boolean;
  continuesBeyondDay: boolean;
};

export type DayStats = {
  date: string;
  firstArrival: string | null;
  lastExit: string | null;
  officeMs: number;
  outsideMs: number;
  visits: number;
  sessions: DaySessionSlice[];
};

export type CurrentSession = {
  startedAt: string;
  elapsedMs: number;
};

export type StatsReport = {
  timezone: "Asia/Yerevan";
  from: string;
  to: string;
  generatedAt: string;
  status: OfficeStatus;
  since: string | null;
  currentSession: CurrentSession | null;
  officeMs: number;
  outsideMs: number;
  visits: number;
  officeDays: number;
  averageArrivalMs: number | null;
  averageDepartureMs: number | null;
  averageOfficeMs: number | null;
  days: DayStats[];
};

export type BusinessDateRange = {
  from: string;
  to: string;
};
