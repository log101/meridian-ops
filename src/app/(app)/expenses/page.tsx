import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/action-button";
import { EmptyState } from "@/components/empty-state";
import { FilterTabs } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reviewExpenseAction } from "@/lib/actions";
import { countPendingExpenses, listExpenses, summarizeExpenses } from "@/lib/data/expenses";
import { formatDate, formatMoney } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/lib/types";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw = "all" } = await searchParams;
  const status = (EXPENSE_STATUSES as readonly string[]).includes(raw) ? (raw as ExpenseStatus) : "all";
  const [me, expenses, summary] = await Promise.all([
    currentUser(),
    listExpenses({ status }),
    summarizeExpenses({ status }),
  ]);
  const pending = countPendingExpenses();

  return (
    <>
      <PageHeader
        title="Expenses"
        description={`${pending.count} claim${pending.count === 1 ? "" : "s"} waiting for review, ${formatMoney(pending.total_cents)} in total. Anyone except the submitter can approve.`}
      >
        <Button render={<Link href="/expenses/new" />}>
          <PlusIcon className="size-4" /> Submit expense
        </Button>
      </PageHeader>
      <FilterTabs
        param="status"
        value={status}
        basePath="/expenses"
        options={[{ value: "all", label: "All" }, ...EXPENSE_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))]}
      />
      {expenses.length === 0 ? (
        <EmptyState title="No expenses here" />
      ) : (
        <Card className="gap-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Submitted by</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-4 font-medium">{e.staff_name}</TableCell>
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
                    {e.status === "pending" && e.staff_id !== me.id ? (
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
              ))}
            </TableBody>
          </Table>
          <CardFooter className="border-t px-4 py-3 text-sm text-muted-foreground">
            {summary.count} claim{summary.count === 1 ? "" : "s"} and {formatMoney(summary.total_cents)}
          </CardFooter>
        </Card>
      )}
    </>
  );
}
