import { SearchIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StockAdjustForm } from "@/components/forms/stock-adjust-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listLowStock, listProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Inventory" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const products = listProducts(q);
  const low = listLowStock().length;
  return (
    <>
      <PageHeader
        title="Inventory"
        description={low > 0 ? `${low} product${low === 1 ? "" : "s"} at or below the reorder level.` : "Every product is above its reorder level."}
      >
        <form className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search SKU, name or category" className="w-64 pl-8" />
        </form>
      </PageHeader>
      {products.length === 0 ? (
        <EmptyState title="No products match" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                <TableHead className="text-right">In stock</TableHead>
                <TableHead className="text-right">Reorder at</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-4 font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(p.unit_price_cents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.stock}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{p.reorder_level}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.stock <= p.reorder_level ? "low" : "ok"} />
                  </TableCell>
                  <TableCell className="pr-4">
                    <StockAdjustForm productId={p.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
