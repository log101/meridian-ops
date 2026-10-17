import { AlertTriangleIcon, ClockIcon, PackageIcon, ReceiptIcon, ShoppingCartIcon, TrendingUpIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listActivity } from "@/lib/data/activity";
import { dashboardStats } from "@/lib/data/dashboard";
import { listExpenses } from "@/lib/data/expenses";
import { formatMoney, relativeTime } from "@/lib/format";
import { currentUser } from "@/lib/session";

export default async function DashboardPage() {
  const me = await currentUser();
  const stats = dashboardStats();
  const pending = listExpenses({ status: "pending" }).slice(0, 5);
  const activity = listActivity(8);
  const change =
    stats.paidPreviousMonth.total > 0
      ? Math.round(((stats.paidThisMonth.total - stats.paidPreviousMonth.total) / stats.paidPreviousMonth.total) * 100)
      : null;

  return (
    <>
      <PageHeader title={`Good day, ${me.name.split(" ")[0]}`} description="Here is what needs attention across Meridian Supply Co. today." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Open orders"
          value={stats.openOrders.n}
          hint={`${formatMoney(stats.openOrders.total)} in the pipeline`}
          icon={ShoppingCartIcon}
        />
        <StatCard
          title="Collected, last 30 days"
          value={formatMoney(stats.paidThisMonth.total)}
          hint={change === null ? `${stats.paidThisMonth.n} invoices paid` : `${change >= 0 ? "+" : ""}${change}% vs. previous 30 days`}
          tone="success"
          icon={TrendingUpIcon}
        />
        <StatCard
          title="Overdue receivables"
          value={formatMoney(stats.receivables.overdue_cents)}
          hint={`${stats.receivables.overdue_count} of ${stats.receivables.open_count} open invoices`}
          tone={stats.receivables.overdue_count > 0 ? "danger" : "default"}
          icon={AlertTriangleIcon}
        />
        <StatCard
          title="Awaiting approval"
          value={stats.pendingExpenses.count}
          hint={`${formatMoney(stats.pendingExpenses.total_cents)} in expense claims`}
          tone={stats.pendingExpenses.count > 0 ? "warning" : "default"}
          icon={ReceiptIcon}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent orders</CardTitle>
            <Button variant="ghost" size="sm" render={<Link href="/orders" />}>
              View all
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6 font-medium">
                      <Link href={`/orders/${o.id}`} className="hover:underline">
                        {o.number}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(o.total_cents)}</TableCell>
                    <TableCell className="pr-6 text-right text-muted-foreground">{relativeTime(o.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClockIcon className="size-4 text-muted-foreground" /> Pending approvals
              </CardTitle>
              <Button variant="ghost" size="sm" render={<Link href="/expenses" />}>
                Review
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting on you.</p> : null}
              {pending.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.staff_name} · {relativeTime(e.submitted_at)}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums">{formatMoney(e.amount_cents)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="size-4 text-muted-foreground" /> Low stock
              </CardTitle>
              <Button variant="ghost" size="sm" render={<Link href="/products" />}>
                Inventory
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {stats.lowStock.length === 0 ? <p className="text-sm text-muted-foreground">Everything is above its reorder level.</p> : null}
              {stats.lowStock.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-red-600 dark:text-red-400">
                    {p.stock} / {p.reorder_level}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {activity.map((a) => (
            <div key={a.id} className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate">
                <span className="font-medium">{a.actor_name ?? "System"}</span>{" "}
                <span className="text-muted-foreground">{a.message}</span>{" "}
                {a.href ? (
                  <Link href={a.href} className="font-medium hover:underline">
                    {a.subject}
                  </Link>
                ) : (
                  <span className="font-medium">{a.subject}</span>
                )}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(a.created_at)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
