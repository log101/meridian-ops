import type { DatabaseSync } from "node:sqlite";
import { daysAgo } from "../dates";

// Demo data for Meridian Supply Co. Dates are relative to today so the
// dashboard always shows live-looking aging, overdue invoices and pending
// approvals. The generator is deterministic: the same seed every time.

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const staff = [
  ["Maya Chen", "maya@meridiansupply.example", "Operations Manager", "Operations"],
  ["Daniel Okafor", "daniel@meridiansupply.example", "Finance Lead", "Finance"],
  ["Priya Nair", "priya@meridiansupply.example", "Account Executive", "Sales"],
  ["Tom Lindqvist", "tom@meridiansupply.example", "Warehouse Supervisor", "Warehouse"],
  ["Sofia Alvarez", "sofia@meridiansupply.example", "Customer Success", "Sales"],
  ["Ben Carter", "ben@meridiansupply.example", "Office Manager", "Operations"],
] as const;

const customers = [
  ["Harbor Lights Café", "Elena Rossi", "Portland", "US", "retail", 5000],
  ["Northgate Grocers", "Sam Whitfield", "Seattle", "US", "wholesale", 25000],
  ["Birchwood Hotels", "Amara Diallo", "Vancouver", "CA", "wholesale", 40000],
  ["Pine & Co. Bakery", "Jonas Keller", "Boise", "US", "retail", 3000],
  ["Cedar Valley Schools", "Grace Park", "Spokane", "US", "wholesale", 15000],
  ["Lumen Coworking", "Felix Brandt", "Austin", "US", "retail", 8000],
  ["Riverstone Clinics", "Dr. Naomi Osei", "Denver", "US", "wholesale", 30000],
  ["The Daily Grind", "Marco Bianchi", "San Francisco", "US", "retail", 4000],
  ["Summit Outdoor Supply", "Lars Nygaard", "Calgary", "CA", "wholesale", 20000],
  ["Greenfield Farmstand", "Hannah Doyle", "Eugene", "US", "retail", 2500],
  ["Blue Door Studio", "Yuki Tanaka", "Los Angeles", "US", "online", 6000],
  ["Oakridge Senior Living", "Patrick Byrne", "Tacoma", "US", "wholesale", 18000],
  ["Kite & Anchor", "Imani Walker", "Brooklyn", "US", "online", 7500],
  ["Marlow Street Deli", "Omar Haddad", "Chicago", "US", "retail", 3500],
] as const;

const products = [
  ["MS-1001", "Recycled Copy Paper, 5 reams", "Office", 3450, 140, 40],
  ["MS-1002", "Ballpoint Pens, box of 50", "Office", 1290, 22, 30],
  ["MS-1003", "Sticky Notes, 12 pads", "Office", 890, 310, 50],
  ["MS-2001", "Compostable Coffee Cups 12oz, 500", "Foodservice", 5900, 64, 25],
  ["MS-2002", "Napkins, case of 3000", "Foodservice", 2750, 18, 20],
  ["MS-2003", "Paper Straws, 2000", "Foodservice", 2200, 95, 30],
  ["MS-2004", "Takeout Boxes Medium, 200", "Foodservice", 4800, 41, 20],
  ["MS-3001", "Nitrile Gloves Medium, 1000", "Cleaning", 7900, 12, 15],
  ["MS-3002", "Multi-Surface Cleaner, 4 gal", "Cleaning", 3100, 57, 20],
  ["MS-3003", "Trash Liners 55gal, 100", "Cleaning", 2690, 130, 30],
  ["MS-3004", "Hand Soap Refill, 6 x 1L", "Cleaning", 2400, 9, 15],
  ["MS-4001", "Shipping Boxes 12x9x6, 25", "Packaging", 1950, 220, 60],
  ["MS-4002", "Packing Tape, 36 rolls", "Packaging", 4100, 48, 20],
  ["MS-4003", "Bubble Mailers #2, 250", "Packaging", 3600, 76, 25],
  ["MS-5001", "First Aid Kit, 50 person", "Safety", 5400, 15, 10],
  ["MS-5002", "Hi-Vis Vests, 10", "Safety", 2300, 33, 10],
] as const;

type OrderStatus = "draft" | "confirmed" | "shipped" | "invoiced" | "cancelled";

export function seed(db: DatabaseSync): void {
  const rand = rng(42);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

  const insStaff = db.prepare("INSERT INTO staff (name, email, role, department) VALUES (?, ?, ?, ?)");
  for (const [name, email, role, dept] of staff) insStaff.run(name, email, role, dept);

  const insCustomer = db.prepare(
    `INSERT INTO customers (name, contact_name, email, phone, city, country, segment, credit_limit_cents, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  customers.forEach(([name, contact, city, country, segment, credit], i) => {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, "");
    insCustomer.run(
      name,
      contact,
      `${contact.split(" ")[0].toLowerCase()}@${slug}.example`,
      `+1 (${between(200, 989)}) ${between(200, 989)}-${String(between(0, 9999)).padStart(4, "0")}`,
      city,
      country,
      segment,
      credit * 100,
      daysAgo(400 - i * 23),
    );
  });

  const insProduct = db.prepare(
    "INSERT INTO products (sku, name, category, unit_price_cents, stock, reorder_level) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const p of products) insProduct.run(...p);

  const insOrder = db.prepare(
    `INSERT INTO orders (number, customer_id, status, created_by, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const insLine = db.prepare(
    "INSERT INTO order_lines (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)",
  );
  const insInvoice = db.prepare(
    `INSERT INTO invoices (number, order_id, customer_id, status, total_cents, issued_at, due_at, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insActivity = db.prepare(
    "INSERT INTO activity (actor_id, kind, subject, href, message, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  );

  // 32 orders over the last ~90 days. Older orders are mostly invoiced and
  // paid; recent ones are still moving through the pipeline.
  let orderNo = 1040;
  let invoiceNo = 2030;
  for (let i = 0; i < 32; i++) {
    const age = Math.round(90 - i * 2.8 - rand() * 2);
    const customerId = between(1, customers.length);
    const salesRep = pick([3, 5, 1] as const);
    let status: OrderStatus;
    if (age > 45) status = rand() < 0.08 ? "cancelled" : "invoiced";
    else if (age > 20) status = pick(["invoiced", "invoiced", "shipped", "cancelled"] as const);
    else if (age > 6) status = pick(["confirmed", "shipped", "shipped", "invoiced"] as const);
    else status = pick(["draft", "draft", "confirmed", "confirmed"] as const);

    const number = `ORD-${++orderNo}`;
    const created = daysAgo(age, between(8, 17));
    const res = insOrder.run(number, customerId, status, salesRep, "", created, created);
    const orderId = Number(res.lastInsertRowid);

    const lineCount = between(1, 4);
    const used = new Set<number>();
    let total = 0;
    for (let l = 0; l < lineCount; l++) {
      let productId = between(1, products.length);
      while (used.has(productId)) productId = between(1, products.length);
      used.add(productId);
      const qty = between(1, 12);
      const price = products[productId - 1][3];
      insLine.run(orderId, productId, qty, price);
      total += qty * price;
    }
    insActivity.run(salesRep, "order", number, `/orders/${orderId}`, `created order for ${customers[customerId - 1][0]}`, created);

    if (status === "invoiced") {
      const issued = daysAgo(Math.max(age - 3, 0), 11);
      const dueDays = 30;
      const due = daysAgo(Math.max(age - 3, 0) - dueDays);
      const overdue = new Date(due) < new Date();
      // Most old invoices are paid; a handful are left open and overdue.
      const paid = overdue ? rand() < 0.7 : rand() < 0.25;
      const invNumber = `INV-${++invoiceNo}`;
      insInvoice.run(
        invNumber,
        orderId,
        customerId,
        paid ? "paid" : "open",
        total,
        issued,
        due,
        paid ? daysAgo(Math.max(age - 3 - between(5, 28), 0), 14) : null,
      );
      insActivity.run(2, "invoice", invNumber, `/invoices/${orderId}`, `issued invoice for ${number}`, issued);
    }
  }

  // Sprinkle notes on a few customers.
  const insNote = db.prepare(
    "INSERT INTO customer_notes (customer_id, author_id, body, created_at) VALUES (?, ?, ?, ?)",
  );
  insNote.run(2, 3, "Prefers deliveries before 7am. Loading dock on the north side.", daysAgo(31));
  insNote.run(3, 5, "Renewal conversation scheduled for next quarter; interested in bulk cleaning supplies.", daysAgo(12));
  insNote.run(7, 2, "Net-45 terms approved by finance as an exception.", daysAgo(60));
  insNote.run(1, 3, "Owner Elena asked about compostable lids to pair with the 12oz cups.", daysAgo(4));

  // Expense claims: some pending, some already reviewed.
  const insExpense = db.prepare(
    `INSERT INTO expenses (staff_id, category, description, amount_cents, incurred_at, status, submitted_at, reviewed_by, reviewed_at, review_note, rejection_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const expenses: [number, string, string, number, number, "pending" | "approved" | "rejected", string][] = [
    [3, "travel", "Train to Seattle for Northgate quarterly review", 8600, 3, "pending", ""],
    [5, "meals", "Lunch with Birchwood Hotels procurement team", 12400, 2, "pending", ""],
    [4, "equipment", "Replacement pallet jack wheels", 21900, 5, "pending", ""],
    [6, "software", "Label printer firmware license (annual)", 14900, 1, "pending", ""],
    [3, "travel", "Mileage, Boise customer visits (210 mi)", 14070, 14, "approved", ""],
    [1, "meals", "Team lunch after inventory count", 18650, 20, "approved", ""],
    [5, "other", "Trade show banner reprint", 9900, 27, "rejected", "Please use the marketing budget code for this."],
    [4, "equipment", "Steel-toe boots", 11500, 33, "approved", ""],
    [6, "software", "Spreadsheet add-on, monthly", 1200, 40, "approved", ""],
    [3, "travel", "Parking, downtown client meetings", 3400, 48, "approved", ""],
    [2, "other", "Notary fees for bank documents", 4500, 55, "approved", ""],
    [1, "travel", "Flight to Calgary, Summit Outdoor onboarding", 41200, 62, "approved", ""],
  ];
  for (const [staffId, cat, desc, amount, ageDays, status, note] of expenses) {
    const incurred = daysAgo(ageDays + 1);
    const submitted = daysAgo(ageDays);
    const reviewed = status === "pending" ? null : daysAgo(Math.max(ageDays - 2, 0));
    insExpense.run(
      staffId,
      cat,
      desc,
      amount,
      incurred,
      status,
      submitted,
      status === "pending" ? null : 2,
      reviewed,
      note,
      status === "rejected" ? note : null,
    );
    insActivity.run(staffId, "expense", desc, "/expenses", `submitted a ${cat} expense`, submitted);
  }

  insActivity.run(null, "system", "Demo data", "/settings", "demo data was reset", daysAgo(0, 7));
  db.prepare("INSERT OR IGNORE INTO schema_version (version) VALUES (0)").run();
}
