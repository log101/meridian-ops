import { beforeEach, describe, expect, it } from "vitest";
import { q, resetDatabase } from "@/lib/db";
import { countPendingExpenses, listExpenses, reviewExpense, submitExpense, summarizeExpenses } from "@/lib/data/expenses";
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

  it("calculates the total count and dollar amount for all claims and updates accurately when filtered by status", () => {
    const all = summarizeExpenses();
    expect(all.count).toBe(12);
    expect(all.total_cents).toBe(162220);

    const pending = summarizeExpenses({ status: "pending" });
    expect(pending.count).toBe(4);
    expect(pending.total_cents).toBe(57800);

    const approved = summarizeExpenses({ status: "approved" });
    expect(approved.count).toBe(7);
    expect(approved.total_cents).toBe(94520);

    const rejected = summarizeExpenses({ status: "rejected" });
    expect(rejected.count).toBe(1);
    expect(rejected.total_cents).toBe(9900);

    // Filter by string status as well
    expect(summarizeExpenses("pending")).toEqual(pending);
    expect(summarizeExpenses("all")).toEqual(all);
  });

  it("handles empty lists cleanly with zero count and amount", () => {
    const empty = summarizeExpenses({ staffId: 99999 });
    expect(empty.count).toBe(0);
    expect(empty.total_cents).toBe(0);
  });

  it("matches acceptance example: 5 claims totaling $1,250.00 and 2 pending totaling $350.00", () => {
    q("DELETE FROM expenses").run();
    submitExpense({ staffId: 1, category: "travel", description: "Trip A", amountCents: 20000, incurredAt: "2026-01-01" });
    submitExpense({ staffId: 1, category: "meals", description: "Trip B", amountCents: 15000, incurredAt: "2026-01-02" });
    const e3 = submitExpense({ staffId: 1, category: "software", description: "Sub", amountCents: 30000, incurredAt: "2026-01-03" });
    const e4 = submitExpense({ staffId: 1, category: "equipment", description: "Desk", amountCents: 40000, incurredAt: "2026-01-04" });
    const e5 = submitExpense({ staffId: 1, category: "other", description: "Misc", amountCents: 20000, incurredAt: "2026-01-05" });
    reviewExpense(e3.id, "approved", 2);
    reviewExpense(e4.id, "approved", 2);
    reviewExpense(e5.id, "rejected", 2);

    const all = summarizeExpenses();
    expect(all.count).toBe(5);
    expect(all.total_cents).toBe(125000);

    const pending = summarizeExpenses({ status: "pending" });
    expect(pending.count).toBe(2);
    expect(pending.total_cents).toBe(35000);
  });
});
