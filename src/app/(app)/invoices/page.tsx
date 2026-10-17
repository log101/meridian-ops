import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FilterTabs } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listInvoices, receivables, type InvoiceFilter } from "@/lib/data/invoices";
import { daysUntil } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Invoices" };

const filters: InvoiceFilter[] = ["all", "open", "overdue", "paid", "void"];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw = "all" } = await searchParams;
  const filter = (filters as string[]).includes(raw) ? (raw as InvoiceFilter) : "all";
  const invoices = listInvoices(filter);
  const totals = receivables();

  return (
    <>
      <PageHeader
        title="Invoices"
        description={`${formatMoney(totals.open_cents)} outstanding across ${totals.open_count} open invoices, ${formatMoney(totals.overdue_cents)} of it overdue.`}
      />
      <FilterTabs
        param="status"
        value={filter}
        basePath="/invoices"
        options={filters.map((f) => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
      />
      {invoices.length === 0 ? (
        <EmptyState title="No invoices here" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => {
                const days = daysUntil(i.due_at);
                return (
                  <TableRow key={i.id}>
                    <TableCell className="pl-4 font-medium">
                      <Link href={`/invoices/${i.id}`} className="hover:underline">
                        {i.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/customers/${i.customer_id}`} className="hover:underline">
                        {i.customer_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/orders/${i.order_id}`} className="text-muted-foreground hover:underline">
                        {i.order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={i.overdue ? "overdue" : i.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(i.issued_at)}</TableCell>
                    <TableCell className={i.overdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                      {formatDate(i.due_at)}
                      {i.status === "open" ? (
                        <span className="ml-1 text-xs">{days < 0 ? `(${-days}d late)` : `(in ${days}d)`}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="pr-4 text-right tabular-nums">{formatMoney(i.total_cents)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
