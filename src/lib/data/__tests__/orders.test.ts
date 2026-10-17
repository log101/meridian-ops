import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/lib/db";
import { createOrder, getOrder, listOrders, transitionOrder } from "@/lib/data/orders";
import { createInvoice, getInvoiceForOrder, listInvoices } from "@/lib/data/invoices";
import { getProduct } from "@/lib/data/products";

beforeEach(() => resetDatabase());

describe("orders", () => {
  it("creates a draft order priced from the current product prices", () => {
    const p = getProduct(1)!;
    const order = createOrder({ customerId: 1, createdBy: 3, lines: [{ productId: 1, quantity: 3 }] });
    expect(order.status).toBe("draft");
    expect(order.total_cents).toBe(3 * p.unit_price_cents);
    expect(order.number).toMatch(/^ORD-\d+$/);
    expect(listOrders({ status: "draft" }).some((o) => o.id === order.id)).toBe(true);
  });

  it("rejects an order without lines", () => {
    expect(() => createOrder({ customerId: 1, createdBy: 3, lines: [] })).toThrow(/at least one line/);
  });

  it("deducts stock when shipped and restores it when a shipped order is cancelled", () => {
    const before = getProduct(2)!.stock;
    const order = createOrder({ customerId: 2, createdBy: 3, lines: [{ productId: 2, quantity: 4 }] });
    transitionOrder(order.id, "confirmed", 1);
    transitionOrder(order.id, "shipped", 4);
    expect(getProduct(2)!.stock).toBe(before - 4);
    transitionOrder(order.id, "cancelled", 1);
    expect(getProduct(2)!.stock).toBe(before);
  });

  it("refuses to skip steps in the pipeline", () => {
    const order = createOrder({ customerId: 2, createdBy: 3, lines: [{ productId: 3, quantity: 1 }] });
    expect(() => transitionOrder(order.id, "shipped", 1)).toThrow(/Cannot move/);
  });

  it("invoices a shipped order with 30-day terms and marks the order invoiced", () => {
    const order = createOrder({ customerId: 3, createdBy: 3, lines: [{ productId: 4, quantity: 2 }] });
    transitionOrder(order.id, "confirmed", 1);
    transitionOrder(order.id, "shipped", 4);
    const invoice = createInvoice(order.id, 2);
    expect(invoice.status).toBe("open");
    expect(invoice.total_cents).toBe(order.total_cents);
    const days = (new Date(invoice.due_at).getTime() - new Date(invoice.issued_at).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
    expect(getOrder(order.id)!.status).toBe("invoiced");
    expect(getInvoiceForOrder(order.id)!.id).toBe(invoice.id);
    expect(() => createInvoice(order.id, 2)).toThrow(/already has an invoice/);
  });

  it("lists overdue invoices separately from open ones", () => {
    const overdue = listInvoices("overdue");
    expect(overdue.length).toBeGreaterThan(0);
    for (const inv of overdue) {
      expect(inv.status).toBe("open");
      expect(inv.overdue).toBe(true);
      expect(new Date(inv.due_at).getTime()).toBeLessThan(Date.now());
    }
  });
});
