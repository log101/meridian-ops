import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { FilterTabs } from "@/components/filter-tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { countOrdersByStatus, listOrders } from "@/lib/data/orders";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw = "all" } = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(raw) ? (raw as OrderStatus) : "all";
  const orders = listOrders({ status });
  const counts = countOrdersByStatus();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader title="Orders" description="Sales orders move from draft to confirmed, shipped and invoiced.">
        <Button render={<Link href="/orders/new" />}>
          <PlusIcon className="size-4" /> New order
        </Button>
      </PageHeader>
      <FilterTabs
        param="status"
        value={status}
        basePath="/orders"
        options={[
          { value: "all", label: "All", count: total },
          ...ORDER_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: counts[s] })),
        ]}
      />
      {orders.length === 0 ? (
        <EmptyState title="No orders here" description="Orders with this status will show up in this list." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Placed by</TableHead>
                <TableHead>Placed</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="pr-4 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="pl-4 font-medium">
                    <Link href={`/orders/${o.id}`} className="hover:underline">
                      {o.number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/customers/${o.customer_id}`} className="hover:underline">
                      {o.customer_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.created_by_name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">{o.line_count}</TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">{formatMoney(o.total_cents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
