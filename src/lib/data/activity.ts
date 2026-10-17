import { q } from "@/lib/db";
import { nowIso } from "@/lib/dates";
import type { Activity } from "@/lib/types";

export function recordActivity(
  actorId: number | null,
  kind: Activity["kind"],
  subject: string,
  href: string,
  message: string,
): void {
  q("INSERT INTO activity (actor_id, kind, subject, href, message, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(actorId, kind, subject, href, message, nowIso());
}

export function listActivity(limit = 20): Activity[] {
  return q(
      `SELECT a.*, s.name AS actor_name FROM activity a LEFT JOIN staff s ON s.id = a.actor_id
       ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
    )
    .all(limit) as Activity[];
}
