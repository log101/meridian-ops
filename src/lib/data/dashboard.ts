import { q } from "@/lib/db";
import { daysAgo, nowIso } from "@/lib/dates";
import { countPendingExpenses } from "./expenses";
import { receivables } from "./invoices";
import { listOrders } from "./orders";
import { listLowStock } from "./products";

export function dashboardStats() {
  const openOrders = q("SELECT COUNT(*) AS n, COALESCE(SUM(t.total), 0) AS total FROM (SELECT (SELECT SUM(quantity * unit_price_cents) FROM order_lines l WHERE l.order_id = o.id) AS total FROM orders o WHERE o.status IN ('draft','confirmed','shipped')) t")
    .get() as { n: number; total: number };
  const paidThisMonth = q("SELECT COALESCE(SUM(total_cents), 0) AS total, COUNT(*) AS n FROM invoices WHERE status = 'paid' AND paid_at >= ?")
    .get(daysAgo(30)) as { total: number; n: number };
  const paidPreviousMonth = q("SELECT COALESCE(SUM(total_cents), 0) AS total FROM invoices WHERE status = 'paid' AND paid_at >= ? AND paid_at < ?")
    .get(daysAgo(60), daysAgo(30)) as { total: number };
  return {
    openOrders,
    paidThisMonth,
    paidPreviousMonth,
    receivables: receivables(),
    pendingExpenses: countPendingExpenses(),
    lowStock: listLowStock(),
    recentOrders: listOrders({ limit: 8 }),
    asOf: nowIso(),
  };
}
