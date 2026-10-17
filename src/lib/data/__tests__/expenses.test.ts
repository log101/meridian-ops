import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/lib/db";
import { countPendingExpenses, getExpense, listExpenses, rejectExpense, reviewExpense, submitExpense } from "@/lib/data/expenses";
import { listActivity } from "@/lib/data/activity";

beforeEach(() => resetDatabase());

describe("expenses", () => {
  it("submits a pending claim and records activity", () => {
    const before = countPendingExpenses().count;
    const e = submitExpense({ staffId: 3, category: "meals", description: "Client lunch", amountCents: 4200, incurredAt: "2026-01-05" });
    expect(e.status).toBe("pending");
    expect(countPendingExpenses().count).toBe(before + 1);
    expect(listActivity(1)[0].message).toContain("meals expense");
  });

  it("validates input", () => {
    expect(() => submitExpense({ staffId: 3, category: "fun", description: "x", amountCents: 100, incurredAt: "2026-01-05" })).toThrow(/category/);
    expect(() => submitExpense({ staffId: 3, category: "meals", description: " ", amountCents: 100, incurredAt: "2026-01-05" })).toThrow(/Describe/);
    expect(() => submitExpense({ staffId: 3, category: "meals", description: "x", amountCents: 0, incurredAt: "2026-01-05" })).toThrow(/greater than zero/);
  });

  it("lets a different person approve or reject, once", () => {
    const e = submitExpense({ staffId: 3, category: "travel", description: "Taxi", amountCents: 2500, incurredAt: "2026-01-05" });
    expect(() => reviewExpense(e.id, "approved", 3)).toThrow(/own expense/);
    const approved = reviewExpense(e.id, "approved", 2, "ok");
    expect(approved.status).toBe("approved");
    expect(approved.reviewed_by_name).toBe("Daniel Okafor");
    expect(() => reviewExpense(e.id, "rejected", 2)).toThrow(/already approved/);
  });

  it("sorts pending claims first", () => {
    const all = listExpenses();
    const firstNonPending = all.findIndex((e) => e.status !== "pending");
    expect(all.slice(0, firstNonPending).every((e) => e.status === "pending")).toBe(true);
    expect(all.slice(firstNonPending).every((e) => e.status !== "pending")).toBe(true);
  });

  it("fails to reject an expense without a note or with only whitespace with a descriptive validation error", () => {
    const e = submitExpense({ staffId: 3, category: "travel", description: "Train ride", amountCents: 1500, incurredAt: "2026-01-05" });
    expect(() => rejectExpense(e.id, 2, "")).toThrow(/note/i);
    expect(() => rejectExpense(e.id, 2, "   ")).toThrow(/note/i);
    expect(() => reviewExpense(e.id, "rejected", 2, "")).toThrow(/note/i);
    expect(() => reviewExpense(e.id, "rejected", 2, "   ")).toThrow(/note/i);
    expect(getExpense(e.id)?.status).toBe("pending");
  });

  it("rejecting an expense with a valid note transitions its status to rejected, stores the rejection note on the expense record, and includes the note when retrieving expenses", () => {
    const e = submitExpense({ staffId: 3, category: "meals", description: "Dinner with supplier", amountCents: 6500, incurredAt: "2026-01-05" });
    const note = "Missing receipt and out of policy";
    const rejected = rejectExpense(e.id, 2, note);
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejection_note).toBe(note);
    expect(rejected.review_note).toBe(note);
    expect(rejected.reviewed_by_name).toBe("Daniel Okafor");

    // Retrieving the expense directly
    const fetched = getExpense(e.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe("rejected");
    expect(fetched?.rejection_note).toBe(note);

    // Retrieving expenses in list
    const list = listExpenses({ status: "rejected" });
    const inList = list.find((item) => item.id === e.id);
    expect(inList).toBeDefined();
    expect(inList?.rejection_note).toBe(note);

    // Records activity
    expect(listActivity(1)[0].message).toContain("rejected");
  });
});
