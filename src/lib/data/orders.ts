import { db, q } from "@/lib/db";
import { nowIso } from "@/lib/dates";
import type { Order, OrderLine, OrderStatus } from "@/lib/types";
import { recordActivity } from "./activity";

const orderSelect = `
  SELECT o.*, c.name AS customer_name, s.name AS created_by_name,
    (SELECT COALESCE(SUM(l.quantity * l.unit_price_cents), 0) FROM order_lines l WHERE l.order_id = o.id) AS total_cents,
    (SELECT COUNT(*) FROM order_lines l WHERE l.order_id = o.id) AS line_count
  FROM orders o
  JOIN customers c ON c.id = o.customer_id
  JOIN staff s ON s.id = o.created_by`;

export function listOrders(filter: { status?: OrderStatus | "all"; customerId?: number; limit?: number } = {}): Order[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.status && filter.status !== "all") {
    where.push("o.status = ?");
    args.push(filter.status);
  }
  if (filter.customerId) {
    where.push("o.customer_id = ?");
    args.push(filter.customerId);
  }
  const sql = `${orderSelect}${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY o.created_at DESC, o.id DESC${
    filter.limit ? ` LIMIT ${Number(filter.limit)}` : ""
  }`;
  return q(sql).all(...args) as Order[];
}

export function getOrder(id: number): Order | null {
  return (q(`${orderSelect} WHERE o.id = ?`).get(id) as Order | undefined) ?? null;
}

export function listOrderLines(orderId: number): OrderLine[] {
  return q(
      `SELECT l.*, p.sku, p.name AS product_name FROM order_lines l JOIN products p ON p.id = l.product_id
       WHERE l.order_id = ? ORDER BY l.id`,
    )
    .all(orderId) as OrderLine[];
}

export function countOrdersByStatus(): Record<OrderStatus, number> {
  const rows = q("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").all() as {
    status: OrderStatus;
    n: number;
  }[];
  const out: Record<OrderStatus, number> = { draft: 0, confirmed: 0, shipped: 0, invoiced: 0, cancelled: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

function nextNumber(prefix: string, table: "orders" | "invoices"): string {
  const row = q(`SELECT MAX(CAST(SUBSTR(number, ${prefix.length + 1}) AS INTEGER)) AS n FROM ${table}`).get() as {
    n: number | null;
  };
  return `${prefix}${(row.n ?? 1000) + 1}`;
}

export type NewOrderLine = { productId: number; quantity: number };

export function createOrder(input: { customerId: number; createdBy: number; notes?: string; lines: NewOrderLine[] }): Order {
  const lines = input.lines.filter((l) => l.productId && l.quantity > 0);
  if (lines.length === 0) throw new Error("Add at least one line to the order");
  const d = db();
  const customer = d.prepare("SELECT id FROM customers WHERE id = ?").get(input.customerId);
  if (!customer) throw new Error("Customer not found");
  const now = nowIso();
  const number = nextNumber("ORD-", "orders");
  d.exec("BEGIN");
  try {
    const res = d
      .prepare(
        "INSERT INTO orders (number, customer_id, status, created_by, notes, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?, ?)",
      )
      .run(number, input.customerId, input.createdBy, (input.notes ?? "").trim(), now, now);
    const orderId = Number(res.lastInsertRowid);
    const insLine = d.prepare(
      "INSERT INTO order_lines (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
    );
    for (const l of lines) {
      const p = d.prepare("SELECT unit_price_cents FROM products WHERE id = ?").get(l.productId) as
        | { unit_price_cents: number }
        | undefined;
      if (!p) throw new Error("Product not found");
      insLine.run(orderId, l.productId, Math.floor(l.quantity), p.unit_price_cents);
    }
    d.exec("COMMIT");
    const order = getOrder(orderId)!;
    recordActivity(input.createdBy, "order", number, `/orders/${orderId}`, `created order for ${order.customer_name}`);
    return order;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

/** Allowed status moves. Shipping deducts stock; cancelling a shipped order restores it. */
const transitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["invoiced", "cancelled"],
  invoiced: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from].includes(to);
}

export function transitionOrder(orderId: number, to: OrderStatus, actorId: number): Order {
  const order = getOrder(orderId);
  if (!order) throw new Error("Order not found");
  if (!canTransition(order.status, to)) throw new Error(`Cannot move an order from ${order.status} to ${to}`);
  if (to === "invoiced") throw new Error("Use createInvoice to invoice an order");
  const d = db();
  d.exec("BEGIN");
  try {
    if (to === "shipped") {
      for (const line of listOrderLines(orderId)) {
        const p = d.prepare("SELECT stock, name FROM products WHERE id = ?").get(line.product_id) as { stock: number; name: string };
        if (p.stock < line.quantity) throw new Error(`Not enough stock for ${p.name} (${p.stock} left, ${line.quantity} needed)`);
        d.prepare("UPDATE products SET stock = stock - ? WHERE id = ?").run(line.quantity, line.product_id);
      }
    }
    if (to === "cancelled" && order.status === "shipped") {
      for (const line of listOrderLines(orderId)) {
        d.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(line.quantity, line.product_id);
      }
    }
    d.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?").run(to, nowIso(), orderId);
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
  recordActivity(actorId, "order", order.number, `/orders/${orderId}`, `marked order ${to}`);
  return getOrder(orderId)!;
}

export { nextNumber };
