import { cookies } from "next/headers";
import { getStaff, listStaff } from "@/lib/data/staff";
import type { Staff } from "@/lib/types";

// Meridian Ops is an internal tool: there is no password. The header's
// user switcher sets a cookie saying who is acting, and everything that
// writes (orders, approvals, notes) is attributed to that person.

export const ACTING_COOKIE = "meridian_acting_as";

export async function currentUser(): Promise<Staff> {
  const jar = await cookies();
  const raw = jar.get(ACTING_COOKIE)?.value;
  const id = raw ? Number(raw) : NaN;
  const chosen = Number.isInteger(id) ? getStaff(id) : null;
  return chosen ?? listStaff()[0];
}
