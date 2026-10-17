import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/action-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { invoiceOrderAction, transitionOrderAction } from "@/lib/actions";
import { getInvoiceForOrder } from "@/lib/data/invoices";
import { canTransition, getOrder, listOrderLines } from "@/lib/data/orders";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) notFound();
  const lines = listOrderLines(order.id);
  const invoice = getInvoiceForOrder(order.id);

  return (
    <>
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" render={<Link href="/orders" />}>
          <ArrowLeftIcon className="size-4" /> Orders
        </Button>
      </div>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {order.number} <StatusBadge status={order.status} className="text-sm" />
          </span>
        }
        description={
          <>
            <Link href={`/customers/${order.customer_id}`} className="font-medium text-foreground hover:underline">
              {order.customer_name}
            </Link>{" "}
            · placed by {order.created_by_name} on {formatDateTime(order.created_at)}
          </>
        }
      >
        {canTransition(order.status, "confirmed") ? (
          <ActionButton action={transitionOrderAction.bind(null, order.id, "confirmed")} success="Order confirmed">
            Confirm order
          </ActionButton>
        ) : null}
        {canTransition(order.status, "shipped") ? (
          <ActionButton action={transitionOrderAction.bind(null, order.id, "shipped")} success="Order shipped and stock updated">
            Mark shipped
          </ActionButton>
        ) : null}
        {order.status === "shipped" && !invoice ? (
          <ActionButton action={invoiceOrderAction.bind(null, order.id)} success="Invoice issued">
            Issue invoice
          </ActionButton>
        ) : null}
        {invoice ? (
          <Button variant="outline" render={<Link href={`/invoices/${invoice.id}`} />}>
            View {invoice.number}
          </Button>
        ) : null}
        {canTransition(order.status, "cancelled") ? (
          <ActionButton
            variant="outline"
            action={transitionOrderAction.bind(null, order.id, "cancelled")}
            confirm={`Cancel ${order.number}? This cannot be undone.`}
            success="Order cancelled"
          >
            Cancel
          </ActionButton>
        ) : null}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lines</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">SKU</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="pr-6 text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="pl-6 font-mono text-xs">{l.sku}</TableCell>
                    <TableCell>{l.product_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{l.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(l.unit_price_cents)}</TableCell>
                    <TableCell className="pr-6 text-right tabular-nums">{formatMoney(l.quantity * l.unit_price_cents)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} className="pl-6 text-right font-medium">
                    Total
                  </TableCell>
                  <TableCell className="pr-6 text-right font-semibold tabular-nums">{formatMoney(order.total_cents)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <Row label="Status">
              <StatusBadge status={order.status} />
            </Row>
            <Row label="Placed">{formatDate(order.created_at)}</Row>
            <Row label="Last updated">{formatDateTime(order.updated_at)}</Row>
            <Row label="Invoice">
              {invoice ? (
                <Link href={`/invoices/${invoice.id}`} className="font-medium hover:underline">
                  {invoice.number}
                </Link>
              ) : (
                <span className="text-muted-foreground">Not yet issued</span>
              )}
            </Row>
            <div>
              <div className="text-muted-foreground">Notes</div>
              <p className="mt-1 whitespace-pre-wrap">{order.notes || <span className="text-muted-foreground">None</span>}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
