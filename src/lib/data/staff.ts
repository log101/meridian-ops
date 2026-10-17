import { q } from "@/lib/db";
import type { Staff } from "@/lib/types";

export function listStaff(): Staff[] {
  return q("SELECT * FROM staff ORDER BY id").all() as Staff[];
}

export function getStaff(id: number): Staff | null {
  return (q("SELECT * FROM staff WHERE id = ?").get(id) as Staff | undefined) ?? null;
}
