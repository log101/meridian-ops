import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/lib/db";
import { addCustomerNote, createCustomer, getCustomer, listCustomerNotes, listCustomers } from "@/lib/data/customers";
import { adjustStock, listLowStock } from "@/lib/data/products";

beforeEach(() => resetDatabase());

describe("customers", () => {
  it("searches by company, contact or city", () => {
    expect(listCustomers("harbor").map((c) => c.name)).toEqual(["Harbor Lights Café"]);
    expect(listCustomers("Elena")[0].name).toBe("Harbor Lights Café");
    expect(listCustomers("Calgary")[0].name).toBe("Summit Outdoor Supply");
    expect(listCustomers("zzz")).toHaveLength(0);
  });

  it("creates a customer and adds notes newest first", () => {
    const c = createCustomer({ name: "Acme Deli", contact_name: "Jo Acme", email: "jo@acme.example", phone: "", city: "Reno", country: "US", segment: "retail" });
    expect(getCustomer(c.id)!.order_count).toBe(0);
    addCustomerNote(c.id, 1, "first");
    addCustomerNote(c.id, 2, "second");
    expect(listCustomerNotes(c.id).map((n) => n.body)).toEqual(["second", "first"]);
    expect(() => addCustomerNote(c.id, 1, "  ")).toThrow(/empty/);
  });
});

describe("inventory", () => {
  it("flags products at or below their reorder level", () => {
    for (const p of listLowStock()) expect(p.stock).toBeLessThanOrEqual(p.reorder_level);
  });

  it("adjusts stock and never goes negative", () => {
    const p = adjustStock(1, 10);
    expect(adjustStock(1, -10).stock).toBe(p.stock - 10);
    expect(() => adjustStock(1, -100000)).toThrow(/in stock/);
    expect(() => adjustStock(1, 0)).toThrow(/non-zero/);
  });
});
