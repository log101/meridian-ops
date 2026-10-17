import { q } from "@/lib/db";
import { nowIso } from "@/lib/dates";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseStatus } from "@/lib/types";
import { recordActivity } from "./activity";

const expenseSelect = `
  SELECT e.*, s.name AS staff_name, r.name AS reviewed_by_name
  FROM expenses e
  JOIN staff s ON s.id = e.staff_id
  LEFT JOIN staff r ON r.id = e.reviewed_by`;

export function listExpenses(filter: { status?: ExpenseStatus | "all"; staffId?: number } = {}): Expense[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (filter.status && filter.status !== "all") {
    where.push("e.status = ?");
    args.push(filter.status);
  }
  if (filter.staffId) {
    where.push("e.staff_id = ?");
    args.push(filter.staffId);
  }
  return q(
      `${expenseSelect}${where.length ? " WHERE " + where.join(" AND ") : ""}
       ORDER BY CASE e.status WHEN 'pending' THEN 0 ELSE 1 END, e.submitted_at DESC, e.id DESC`,
    )
    .all(...args) as Expense[];
}

export function getExpense(id: number): Expense | null {
  return (q(`${expenseSelect} WHERE e.id = ?`).get(id) as Expense | undefined) ?? null;
}

export function countPendingExpenses(): { count: number; total_cents: number } {
  return q("SELECT COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS total_cents FROM expenses WHERE status = 'pending'")
    .get() as { count: number; total_cents: number };
}

export function submitExpense(input: {
  staffId: number;
  category: string;
  description: string;
  amountCents: number;
  incurredAt: string;
}): Expense {
  if (!EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory)) throw new Error("Pick a category");
  if (!input.description.trim()) throw new Error("Describe the expense");
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Amount must be greater than zero");
  if (Number.isNaN(Date.parse(input.incurredAt))) throw new Error("Enter the date of the expense");
  const res = q(
      `INSERT INTO expenses (staff_id, category, description, amount_cents, incurred_at, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    )
    .run(input.staffId, input.category, input.description.trim(), input.amountCents, input.incurredAt, nowIso());
  const id = Number(res.lastInsertRowid);
  recordActivity(input.staffId, "expense", input.description.trim(), "/expenses", `submitted a ${input.category} expense`);
  return getExpense(id)!;
}

export function reviewExpense(id: number, decision: "approved" | "rejected", reviewerId: number, note = ""): Expense {
  const e = getExpense(id);
  if (!e) throw new Error("Expense not found");
  if (e.status !== "pending") throw new Error(`Expense was already ${e.status}`);
  if (e.staff_id === reviewerId) throw new Error("You cannot review your own expense");
  if (decision === "rejected" && !note.trim()) {
    throw new Error("Provide a note explaining the rejection");
  }
  const rejectionNote = decision === "rejected" ? note.trim() : null;
  const reviewNote = note.trim();
  q("UPDATE expenses SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?, rejection_note = ? WHERE id = ?")
    .run(decision, reviewerId, nowIso(), reviewNote, rejectionNote, id);
  recordActivity(reviewerId, "expense", e.description, "/expenses", `${decision} ${e.staff_name}'s expense`);
  return getExpense(id)!;
}

export function rejectExpense(id: number, reviewerId: number, note: string): Expense;
export function rejectExpense(id: number, note: string, reviewerId?: number): Expense;
export function rejectExpense(
  id: number,
  reviewerIdOrNote: number | string,
  noteOrReviewerId?: string | number,
): Expense {
  let reviewerId: number;
  let note: string;
  if (typeof reviewerIdOrNote === "number") {
    reviewerId = reviewerIdOrNote;
    note = typeof noteOrReviewerId === "string" ? noteOrReviewerId : "";
  } else {
    note = reviewerIdOrNote;
    reviewerId = typeof noteOrReviewerId === "number" ? noteOrReviewerId : 0;
  }
  return reviewExpense(id, "rejected", reviewerId, note);
}

