// ~40 recent audit entries derived from plausible activity
import type { AuditEntry } from "./types";
import { INITIAL_JOBS } from "./jobs";
import { USERS } from "./users";

function buildAudit(): AuditEntry[] {
  const entries: AuditEntry[] = [];
  let n = 0;
  const manager = USERS.find((u) => u.role === "MANAGER")!;

  const sorted = [...INITIAL_JOBS].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );

  for (const job of sorted) {
    if (entries.length >= 40) break;
    const by = job.mechanic
      ? { userName: job.mechanic.name, userRole: "MECHANIC" }
      : { userName: manager.name, userRole: manager.role };

    entries.push({
      id: `al${++n}`,
      jobId: job.id,
      action: "JOB_CREATE",
      fromStatus: null,
      toStatus: "RECEIVED",
      details: job.tokenNumber,
      userName: "Shravan",
      userRole: "SUPERVISOR",
      createdAt: job.receivedAt,
    });
    if (job.status !== "RECEIVED") {
      entries.push({
        id: `al${++n}`,
        jobId: job.id,
        action: "STATUS_CHANGE",
        fromStatus: "RECEIVED",
        toStatus: job.status === "DELIVERED" ? "READY" : job.status,
        details: job.tokenNumber,
        ...by,
        createdAt: job.readyAt || job.deliveredAt || job.receivedAt,
      });
    }
    if (job.status === "DELIVERED" && job.deliveredAt) {
      entries.push({
        id: `al${++n}`,
        jobId: job.id,
        action: "STATUS_CHANGE",
        fromStatus: "READY",
        toStatus: "DELIVERED",
        details: job.tokenNumber,
        userName: "Shravan",
        userRole: "SUPERVISOR",
        createdAt: job.deliveredAt,
      });
    }
    if (job.partsNeeded) {
      entries.push({
        id: `al${++n}`,
        jobId: job.id,
        action: "BILL_UPDATE",
        fromStatus: null,
        toStatus: null,
        details: `${job.tokenNumber} · ₹${job.amount ?? 0}`,
        ...by,
        createdAt: job.receivedAt,
      });
    }
  }

  return entries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40);
}

export const INITIAL_AUDIT: AuditEntry[] = buildAudit();
