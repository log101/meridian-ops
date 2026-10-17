import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/lib/db";
import { countPendingExpenses, listExpenses, reviewExpense, submitExpense } from "@/lib/data/expenses";
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
});
