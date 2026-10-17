// Database schema. Every table is created with IF NOT EXISTS, so adding a
// table here is safe; changing an existing table needs a statement in
// `migrations` below (they run in order and are recorded in schema_version).

export const schema = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  department TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  segment TEXT NOT NULL,            -- retail | wholesale | online
  credit_limit_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES staff(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL,             -- draft | confirmed | shipped | invoiced | cancelled
  created_by INTEGER NOT NULL REFERENCES staff(id),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_lines (
  id INTEGER PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL,             -- open | paid | void
  total_cents INTEGER NOT NULL,
  issued_at TEXT NOT NULL,
  due_at TEXT NOT NULL,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  category TEXT NOT NULL,           -- travel | meals | software | equipment | other
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  incurred_at TEXT NOT NULL,
  status TEXT NOT NULL,             -- pending | approved | rejected
  submitted_at TEXT NOT NULL,
  reviewed_by INTEGER REFERENCES staff(id),
  reviewed_at TEXT,
  review_note TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY,
  actor_id INTEGER REFERENCES staff(id),
  kind TEXT NOT NULL,               -- order | invoice | expense | customer | product | system
  subject TEXT NOT NULL,            -- e.g. "ORD-1042"
  href TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at);
`;

// Ordered, one-off statements for databases created by an earlier schema.
export const migrations: string[] = [];
