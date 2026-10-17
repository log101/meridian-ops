import { q } from "@/lib/db";
import { nowIso } from "@/lib/dates";
import type { Customer, CustomerNote } from "@/lib/types";

export type CustomerSummary = Customer & {
  order_count: number;
  open_balance_cents: number;
  last_order_at: string | null;
};

const summarySelect = `
  SELECT c.*,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status != 'cancelled') AS order_count,
    (SELECT COALESCE(SUM(i.total_cents), 0) FROM invoices i WHERE i.customer_id = c.id AND i.status = 'open') AS open_balance_cents,
    (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order_at
  FROM customers c`;

export function listCustomers(query = ""): CustomerSummary[] {
  const term = query.trim();
  if (!term) return q(`${summarySelect} ORDER BY c.name`).all() as CustomerSummary[];
  const like = `%${term}%`;
  return q(`${summarySelect} WHERE c.name LIKE ? OR c.contact_name LIKE ? OR c.city LIKE ? ORDER BY c.name`)
    .all(like, like, like) as CustomerSummary[];
}

export function getCustomer(id: number): CustomerSummary | null {
  return (q(`${summarySelect} WHERE c.id = ?`).get(id) as CustomerSummary | undefined) ?? null;
}

export function listCustomerNotes(customerId: number): CustomerNote[] {
  return q(
      `SELECT n.*, s.name AS author_name FROM customer_notes n JOIN staff s ON s.id = n.author_id
       WHERE n.customer_id = ? ORDER BY n.created_at DESC, n.id DESC`,
    )
    .all(customerId) as CustomerNote[];
}

export function addCustomerNote(customerId: number, authorId: number, body: string): CustomerNote {
  const text = body.trim();
  if (!text) throw new Error("Note cannot be empty");
  const res = q("INSERT INTO customer_notes (customer_id, author_id, body, created_at) VALUES (?, ?, ?, ?)")
    .run(customerId, authorId, text, nowIso());
  return q("SELECT n.*, s.name AS author_name FROM customer_notes n JOIN staff s ON s.id = n.author_id WHERE n.id = ?")
    .get(Number(res.lastInsertRowid)) as CustomerNote;
}

export type NewCustomer = Pick<Customer, "name" | "contact_name" | "email" | "phone" | "city" | "country" | "segment"> & {
  credit_limit_cents?: number;
};

export function createCustomer(input: NewCustomer): Customer {
  if (!input.name.trim()) throw new Error("Company name is required");
  if (!input.contact_name.trim()) throw new Error("Contact name is required");
  const res = q(
      `INSERT INTO customers (name, contact_name, email, phone, city, country, segment, credit_limit_cents, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      input.contact_name.trim(),
      input.email.trim(),
      input.phone.trim(),
      input.city.trim(),
      input.country.trim() || "US",
      input.segment,
      input.credit_limit_cents ?? 0,
      nowIso(),
    );
  return q("SELECT * FROM customers WHERE id = ?").get(Number(res.lastInsertRowid)) as Customer;
}
