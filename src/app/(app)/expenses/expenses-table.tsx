"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reviewExpenseAction } from "@/lib/actions";
import { formatDate, formatMoney } from "@/lib/format";
import type { Expense } from "@/lib/types";

export function aggregateSelectedExpenses(
  claims: Array<{ id: number; amount_cents: number }>,
  selectedIds?: Iterable<number>,
): { count: number; total_cents: number } {
  if (!selectedIds) {
    const total_cents = claims.reduce((sum, c) => sum + (c.amount_cents || 0), 0);
    return { count: claims.length, total_cents };
  }
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  let count = 0;
  let total_cents = 0;
  for (const claim of claims) {
    if (selectedSet.has(claim.id)) {
      count += 1;
      total_cents += claim.amount_cents;
    }
  }
  return { count, total_cents };
}

export const calculateSelectedExpenses = aggregateSelectedExpenses;
export const calculateSelectedExpenseTotals = aggregateSelectedExpenses;

interface ExpensesTableProps {
  expenses: Expense[];
  currentUserId: number;
}

export function ExpensesTable({ expenses, currentUserId }: ExpensesTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Only consider selected IDs that are present in the visible expenses list
  const visibleIdSet = useMemo(() => new Set(expenses.map((e) => e.id)), [expenses]);
  const effectiveSelectedIds = useMemo(() => {
    const next = new Set<number>();
    for (const id of selectedIds) {
      if (visibleIdSet.has(id)) next.add(id);
    }
    return next;
  }, [selectedIds, visibleIdSet]);

  const allSelected = expenses.length > 0 && effectiveSelectedIds.size === expenses.length;
  const someSelected = effectiveSelectedIds.size > 0 && effectiveSelectedIds.size < expenses.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const { count: selectedCount, total_cents: selectedTotalCents } = useMemo(
    () => aggregateSelectedExpenses(expenses, effectiveSelectedIds),
    [expenses, effectiveSelectedIds],
  );

  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map((e) => e.id)));
    }
  }

  function handleToggleRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {selectedCount > 0 ? (
        <div
          role="region"
          aria-label="Selection summary"
          aria-live="polite"
          className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2.5 text-sm"
        >
          <span className="font-medium text-foreground">
            {selectedCount} {selectedCount === 1 ? "claim" : "claims"} selected with a combined total of {formatMoney(selectedTotalCents)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4 pr-0">
                <input
                  type="checkbox"
                  ref={headerCheckboxRef}
                  aria-label="Select all claims"
                  className="h-4 w-4 rounded border-input text-primary accent-primary cursor-pointer align-middle"
                  checked={allSelected}
                  onChange={handleToggleAll}
                />
              </TableHead>
              <TableHead>Submitted by</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => {
              const isSelected = effectiveSelectedIds.has(e.id);
              return (
                <TableRow key={e.id} data-state={isSelected ? "selected" : undefined}>
                  <TableCell className="w-10 pl-4 pr-0">
                    <input
                      type="checkbox"
                      aria-label={`Select claim: ${e.description}`}
                      className="h-4 w-4 rounded border-input text-primary accent-primary cursor-pointer align-middle"
                      checked={isSelected}
                      onChange={() => handleToggleRow(e.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{e.staff_name}</TableCell>
                  <TableCell>
                    <div>{e.description}</div>
                    {e.review_note ? <div className="text-xs text-muted-foreground">Note: {e.review_note}</div> : null}
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">{e.category}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(e.incurred_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(e.amount_cents)}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                    {e.reviewed_by_name ? <div className="mt-0.5 text-xs text-muted-foreground">by {e.reviewed_by_name}</div> : null}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    {e.status === "pending" && e.staff_id !== currentUserId ? (
                      <div className="flex justify-end gap-1">
                        <ActionButton size="sm" action={reviewExpenseAction.bind(null, e.id, "approved", "")} success="Expense approved">
                          Approve
                        </ActionButton>
                        <ActionButton
                          size="sm"
                          variant="outline"
                          action={reviewExpenseAction.bind(null, e.id, "rejected", "")}
                          success="Expense rejected"
                        >
                          Reject
                        </ActionButton>
                      </div>
                    ) : e.status === "pending" ? (
                      <span className="text-xs text-muted-foreground">Your claim</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
