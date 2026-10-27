import { prisma } from "@/lib/db";
import {
  decideTransition,
  statusFromLatestEvent,
  type OfficeStatus,
  type PresenceEventType,
} from "@/lib/presence/transitions";
import { formatBusinessTimestamp } from "@/lib/timezone";

/**
 * One lock for this single-person office. It is transaction-scoped, so PostgreSQL
 * releases it on commit or rollback. When createdAt values tie, the greater id
 * is the latest event.
 */
const PRESENCE_ADVISORY_LOCK_KEY = BigInt(3000);

const latestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }];

export type PresenceWriteResult =
  | { recorded: true }
  | {
      recorded: false;
      reason: "already_in_office" | "already_out_of_office";
    };

export type PresenceStatusSnapshot = {
  status: OfficeStatus;
  since: string | null;
};

function asEventType(type: string): PresenceEventType {
  if (type === "ENTER" || type === "EXIT") {
    return type;
  }

  throw new Error("Unexpected presence event type");
}

export async function recordPresence(
  event: PresenceEventType,
): Promise<PresenceWriteResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PRESENCE_ADVISORY_LOCK_KEY})`;

    const latest = await tx.presenceEvent.findFirst({
      orderBy: latestFirst,
      select: { type: true },
    });
    const decision = decideTransition(
      statusFromLatestEvent(latest ? asEventType(latest.type) : null),
      event,
    );

    if (!decision.record) {
      return { recorded: false, reason: decision.reason };
    }

    await tx.presenceEvent.create({ data: { type: event } });
    return { recorded: true };
  });
}

export async function readPresenceStatus(): Promise<PresenceStatusSnapshot> {
  const latest = await prisma.presenceEvent.findFirst({
    orderBy: latestFirst,
    select: { type: true, createdAt: true },
  });

  if (!latest) {
    return { status: "OUT_OF_OFFICE", since: null };
  }

  return {
    status: statusFromLatestEvent(asEventType(latest.type)),
    since: formatBusinessTimestamp(latest.createdAt),
  };
}
