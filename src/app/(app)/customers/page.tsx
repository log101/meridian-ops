import { PlusIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCustomers } from "@/lib/data/customers";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const customers = listCustomers(q);
  return (
    <>
      <PageHeader title="Customers" description="Every account Meridian sells to, with open balances and recent activity.">
        <form className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search name, contact or city" className="w-64 pl-8" />
        </form>
        <Button render={<Link href="/customers/new" />}>
          <PlusIcon className="size-4" /> New customer
        </Button>
      </PageHeader>
      {customers.length === 0 ? (
        <EmptyState title="No customers match" description="Try a different search." />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Open balance</TableHead>
                <TableHead className="pr-4 text-right">Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-4 font-medium">
                    <Link href={`/customers/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{c.contact_name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </TableCell>
                  <TableCell>
                    {c.city}, {c.country}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {c.segment}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.order_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.open_balance_cents ? formatMoney(c.open_balance_cents) : "—"}</TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">{formatDate(c.last_order_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
