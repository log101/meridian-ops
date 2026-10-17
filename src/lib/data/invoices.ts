import { db, q } from "@/lib/db";
import { daysFromNow, nowIso } from "@/lib/dates";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { recordActivity } from "./activity";
import { getOrder, nextNumber } from "./orders";

export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

const invoiceSelect = `
  SELECT i.*, o.number AS order_number, c.name AS customer_name,
    (i.status = 'open' AND i.due_at < ?) AS overdue
  FROM invoices i
  JOIN orders o ON o.id = i.order_id
  JOIN customers c ON c.id = i.customer_id`;

function rows(sql: string, ...args: (string | number)[]): Invoice[] {
  return (q(sql).all(nowIso(), ...args) as (Omit<Invoice, "overdue"> & { overdue: number })[]).map((r) => ({
    ...r,
    overdue: r.overdue === 1,
  }));
}

export type InvoiceFilter = "all" | "open" | "overdue" | "paid" | "void";

export function listInvoices(filter: InvoiceFilter = "all", customerId?: number): Invoice[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter === "overdue") {
    where.push("i.status = 'open' AND i.due_at < ?");
    args.push(nowIso());
  } else if (filter !== "all") {
    where.push("i.status = ?");
    args.push(filter);
  }
  if (customerId) {
    where.push("i.customer_id = ?");
    args.push(customerId);
  }
  return rows(`${invoiceSelect}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY i.issued_at DESC, i.id DESC`, ...args);
}

export function getInvoice(id: number): Invoice | null {
  return rows(`${invoiceSelect} WHERE i.id = ?`, id)[0] ?? null;
}

export function getInvoiceForOrder(orderId: number): Invoice | null {
  return rows(`${invoiceSelect} WHERE i.order_id = ?`, orderId)[0] ?? null;
}

export function receivables(): { open_cents: number; open_count: number; overdue_cents: number; overdue_count: number } {
  return q(
      `SELECT COALESCE(SUM(total_cents), 0) AS open_cents, COUNT(*) AS open_count,
        COALESCE(SUM(CASE WHEN due_at < ? THEN total_cents ELSE 0 END), 0) AS overdue_cents,
        SUM(CASE WHEN due_at < ? THEN 1 ELSE 0 END) AS overdue_count
       FROM invoices WHERE status = 'open'`,
    )
    .get(nowIso(), nowIso()) as { open_cents: number; open_count: number; overdue_cents: number; overdue_count: number };
}

/** Issues an invoice for a shipped order and marks the order invoiced. */
export function createInvoice(orderId: number, actorId: number, termsDays = DEFAULT_PAYMENT_TERMS_DAYS): Invoice {
  const order = getOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (getInvoiceForOrder(orderId)) throw new Error("Order already has an invoice");
  if (order.status !== "shipped") throw new Error("Only shipped orders can be invoiced");
  const d = db();
  const number = nextNumber("INV-", "invoices");
  const now = nowIso();
  d.exec("BEGIN");
  try {
    const res = d
      .prepare(
        `INSERT INTO invoices (number, order_id, customer_id, status, total_cents, issued_at, due_at, paid_at)
         VALUES (?, ?, ?, 'open', ?, ?, ?, NULL)`,
      )
      .run(number, orderId, order.customer_id, order.total_cents, now, daysFromNow(termsDays));
    d.prepare("UPDATE orders SET status = 'invoiced', updated_at = ? WHERE id = ?").run(now, orderId);
    d.exec("COMMIT");
    const id = Number(res.lastInsertRowid);
    recordActivity(actorId, "invoice", number, `/invoices/${id}`, `issued invoice for ${order.number}`);
    return getInvoice(id)!;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export function setInvoiceStatus(id: number, status: InvoiceStatus, actorId: number): Invoice {
  const inv = getInvoice(id);
  if (!inv) throw new Error("Invoice not found");
  if (inv.status !== "open") throw new Error(`Invoice is already ${inv.status}`);
  q("UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?")
    .run(status, status === "paid" ? nowIso() : null, id);
  recordActivity(actorId, "invoice", inv.number, `/invoices/${id}`, status === "paid" ? "recorded payment" : "voided invoice");
  return getInvoice(id)!;
}
