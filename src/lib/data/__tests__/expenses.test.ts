import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "@/lib/db";
import {
  aggregateSelectedExpenses,
  countPendingExpenses,
  listExpenses,
  reviewExpense,
  submitExpense,
} from "@/lib/data/expenses";
import { aggregateSelectedExpenses as aggregateFromTable } from "@/app/(app)/expenses/expenses-table";
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

  it("aggregating a selection of expense claims correctly calculates the count and combined total amount in cents across multiple selected items and resets to zero when no claims are selected", () => {
    const claims = [
      { id: 101, amount_cents: 4500 },
      { id: 102, amount_cents: 12000 },
      { id: 103, amount_cents: 3000 },
    ];

    // Selecting a claim for $45.00 and a claim for $120.00
    const twoSelected = aggregateSelectedExpenses(claims, [101, 102]);
    expect(twoSelected.count).toBe(2);
    expect(twoSelected.total_cents).toBe(16500);

    // Unchecking one of the claims ($45.00), leaving the $120.00 claim
    const oneSelected = aggregateSelectedExpenses(claims, [102]);
    expect(oneSelected.count).toBe(1);
    expect(oneSelected.total_cents).toBe(12000);

    // Unchecking all claims / no claims selected resets to zero
    const noneSelected = aggregateSelectedExpenses(claims, []);
    expect(noneSelected.count).toBe(0);
    expect(noneSelected.total_cents).toBe(0);

    const emptySetSelected = aggregateSelectedExpenses(claims, new Set());
    expect(emptySetSelected.count).toBe(0);
    expect(emptySetSelected.total_cents).toBe(0);

    // Switching filters or having selected IDs not in visible list ignores non-visible items
    const visibleOnly = aggregateSelectedExpenses(claims.slice(1), [101, 102]);
    expect(visibleOnly.count).toBe(1);
    expect(visibleOnly.total_cents).toBe(12000);

    // Direct subset aggregation without selectedIds argument
    const direct = aggregateSelectedExpenses([claims[0], claims[1]]);
    expect(direct.count).toBe(2);
    expect(direct.total_cents).toBe(16500);

    // Ensure helper exported by expenses-table produces the exact same results
    expect(aggregateFromTable(claims, [101, 102])).toEqual(twoSelected);
    expect(aggregateFromTable(claims, [])).toEqual(noneSelected);
  });
});
