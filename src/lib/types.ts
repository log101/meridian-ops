export type Staff = {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
};

export type CustomerSegment = "retail" | "wholesale" | "online";

export type Customer = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  segment: CustomerSegment;
  credit_limit_cents: number;
  created_at: string;
};

export type CustomerNote = {
  id: number;
  customer_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
};

export type Product = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit_price_cents: number;
  stock: number;
  reorder_level: number;
};

export const ORDER_STATUSES = ["draft", "confirmed", "shipped", "invoiced", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type Order = {
  id: number;
  number: string;
  customer_id: number;
  customer_name: string;
  status: OrderStatus;
  created_by: number;
  created_by_name: string;
  notes: string;
  total_cents: number;
  line_count: number;
  created_at: string;
  updated_at: string;
};

export type OrderLine = {
  id: number;
  order_id: number;
  product_id: number;
  sku: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
};

export const INVOICE_STATUSES = ["open", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export type Invoice = {
  id: number;
  number: string;
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  status: InvoiceStatus;
  total_cents: number;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  /** True when the invoice is open and past its due date. */
  overdue: boolean;
};

export const EXPENSE_CATEGORIES = ["travel", "meals", "software", "equipment", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export const EXPENSE_STATUSES = ["pending", "approved", "rejected"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export type Expense = {
  id: number;
  staff_id: number;
  staff_name: string;
  category: ExpenseCategory;
  description: string;
  amount_cents: number;
  incurred_at: string;
  status: ExpenseStatus;
  submitted_at: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string;
  rejection_note: string | null;
};

export type Activity = {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  kind: string;
  subject: string;
  href: string;
  message: string;
  created_at: string;
};
