import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setInvoiceStatusAction } from "@/lib/actions";
import { getCustomer } from "@/lib/data/customers";
import { getInvoice } from "@/lib/data/invoices";
import { listOrderLines } from "@/lib/data/orders";
import { daysUntil } from "@/lib/dates";
import { formatDate, formatMoney } from "@/lib/format";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = getInvoice(Number(id));
  if (!invoice) notFound();
  const customer = getCustomer(invoice.customer_id)!;
  const lines = listOrderLines(invoice.order_id);
  const days = daysUntil(invoice.due_at);

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" render={<Link href="/invoices" />}>
          <ArrowLeftIcon className="size-4" /> Invoices
        </Button>
      </div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {invoice.number} <StatusBadge status={invoice.overdue ? "overdue" : invoice.status} className="text-sm" />
          </span>
        }
        description={
          <>
            For{" "}
            <Link href={`/orders/${invoice.order_id}`} className="font-medium text-foreground hover:underline">
              {invoice.order_number}
            </Link>{" "}
            · issued {formatDate(invoice.issued_at)} · due {formatDate(invoice.due_at)}
            {invoice.status === "open" ? (days < 0 ? ` (${-days} days late)` : ` (in ${days} days)`) : ""}
          </>
        }
      >
        {invoice.status === "open" ? (
          <>
            <ActionButton action={setInvoiceStatusAction.bind(null, invoice.id, "paid")} success="Payment recorded">
              Record payment
            </ActionButton>
            <ActionButton
              variant="outline"
              action={setInvoiceStatusAction.bind(null, invoice.id, "void")}
              confirm={`Void ${invoice.number}? The order stays invoiced.`}
              success="Invoice voided"
            >
              Void
            </ActionButton>
          </>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="pr-6 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="pl-6">
                      {l.product_name} <span className="font-mono text-xs text-muted-foreground">{l.sku}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(l.unit_price_cents)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatMoney(l.quantity * l.unit_price_cents)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="pl-6 text-right font-medium">
                    Amount due
                  </TableCell>
                  <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatMoney(invoice.total_cents)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Bill to</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
              {customer.name}
            </Link>
            <span>{customer.contact_name}</span>
            <span className="text-muted-foreground">{customer.email}</span>
            <span className="text-muted-foreground">
              {customer.city}, {customer.country}
            </span>
            <div className="mt-3 grid gap-1 border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Terms</span>
                <span>Net 30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid on</span>
                <span>{formatDate(invoice.paid_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
