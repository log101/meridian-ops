import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FilterTabs } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { countPendingExpenses, listExpenses } from "@/lib/data/expenses";
import { formatMoney } from "@/lib/format";
import { currentUser } from "@/lib/session";
import { EXPENSE_STATUSES, type ExpenseStatus } from "@/lib/types";
import { ExpensesTable } from "./expenses-table";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw = "all" } = await searchParams;
  const status = (EXPENSE_STATUSES as readonly string[]).includes(raw) ? (raw as ExpenseStatus) : "all";
  const [me, expenses] = await Promise.all([currentUser(), listExpenses({ status })]);
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
        <ExpensesTable key={status} expenses={expenses} currentUserId={me.id} />
      )}
    </>
  );
}
