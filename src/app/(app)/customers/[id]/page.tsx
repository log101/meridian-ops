import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NoteForm } from "@/components/forms/note-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCustomer, listCustomerNotes } from "@/lib/data/customers";
import { listInvoices } from "@/lib/data/invoices";
import { listOrders } from "@/lib/data/orders";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = getCustomer(Number(id));
  if (!customer) notFound();
  const orders = listOrders({ customerId: customer.id });
  const invoices = listInvoices("all", customer.id);
  const notes = listCustomerNotes(customer.id);

  return (
    <>
      <PageHeader
        title={customer.name}
        description={
          <>
            {customer.contact_name} · {customer.email} · {customer.phone || "no phone"}
          </>
        }
      >
        <Badge variant="secondary" className="capitalize">
          {customer.segment}
        </Badge>
        <Button render={<Link href={`/orders/new?customer=${customer.id}`} />}>
          <PlusIcon className="size-4" /> New order
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Open balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{formatMoney(customer.open_balance_cents)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Credit limit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">{formatMoney(customer.credit_limit_cents)}</CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-muted-foreground">Customer since</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatDate(customer.created_at)}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {orders.length === 0 ? <p className="px-6 text-sm text-muted-foreground">No orders yet.</p> : null}
              {orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Placed</TableHead>
                      <TableHead className="pr-6 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="pl-6 font-medium">
                          <Link href={`/orders/${o.id}`} className="hover:underline">
                            {o.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={o.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                        <TableCell className="pr-6 text-right tabular-nums">{formatMoney(o.total_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {invoices.length === 0 ? <p className="px-6 text-sm text-muted-foreground">No invoices yet.</p> : null}
              {invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Invoice</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="pr-6 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="pl-6 font-medium">
                          <Link href={`/invoices/${i.id}`} className="hover:underline">
                            {i.number}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={i.overdue ? "overdue" : i.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(i.due_at)}</TableCell>
                        <TableCell className="pr-6 text-right tabular-nums">{formatMoney(i.total_cents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <NoteForm customerId={customer.id} />
            {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : null}
            {notes.map((n) => (
              <div key={n.id} className="rounded-md border p-3 text-sm">
                <p>{n.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n.author_name} · {formatDateTime(n.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
