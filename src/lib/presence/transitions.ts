export type OfficeStatus = "IN_OFFICE" | "OUT_OF_OFFICE";

export type PresenceEventType = "ENTER" | "EXIT";

export type TransitionDecision =
  | { record: true }
  | {
      record: false;
      reason: "already_in_office" | "already_out_of_office";
    };

export function statusFromLatestEvent(
  latest: PresenceEventType | null,
): OfficeStatus {
  if (latest === "ENTER") {
    return "IN_OFFICE";
  }

  return "OUT_OF_OFFICE";
}

export function decideTransition(
  status: OfficeStatus,
  event: PresenceEventType,
): TransitionDecision {
  if (event === "ENTER") {
    if (status === "IN_OFFICE") {
      return { record: false, reason: "already_in_office" };
    }

    return { record: true };
  }

  if (status === "OUT_OF_OFFICE") {
    return { record: false, reason: "already_out_of_office" };
  }

  return { record: true };
}
