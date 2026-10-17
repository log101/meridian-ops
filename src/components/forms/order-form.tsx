"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";
import { FormError, FormField, NativeSelect } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createOrderAction, type ActionResult } from "@/lib/actions";
import { formatMoney } from "@/lib/format";
import type { Customer, Product } from "@/lib/types";

type Line = { key: number; productId: number; quantity: number };

export function OrderForm({
  customers,
  products,
  defaultCustomerId,
}: {
  customers: Pick<Customer, "id" | "name">[];
  products: Product[];
  defaultCustomerId?: number;
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createOrderAction, {});
  const [lines, setLines] = useState<Line[]>([{ key: 1, productId: products[0]?.id ?? 0, quantity: 1 }]);
  const priceOf = (id: number) => products.find((p) => p.id === id)?.unit_price_cents ?? 0;
  const total = lines.reduce((sum, l) => sum + priceOf(l.productId) * (l.quantity || 0), 0);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  return (
    <form action={action}>
      <Card className="max-w-3xl">
        <CardContent className="grid gap-6">
          <FormField label="Customer" htmlFor="customer_id" className="max-w-sm">
            <NativeSelect id="customer_id" name="customer_id" defaultValue={defaultCustomerId ?? customers[0]?.id} required>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <div className="grid gap-2">
            <div className="text-sm font-medium">Lines</div>
            <div className="grid gap-2">
              {lines.map((line) => (
                <div key={line.key} className="grid grid-cols-[1fr_6rem_7rem_2.5rem] items-center gap-2">
                  <NativeSelect
                    name="product_id"
                    value={line.productId}
                    onChange={(e) => update(line.key, { productId: Number(e.target.value) })}
                    aria-label="Product"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} · {p.name} ({formatMoney(p.unit_price_cents)}, {p.stock} in stock)
                      </option>
                    ))}
                  </NativeSelect>
                  <Input
                    name="quantity"
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => update(line.key, { quantity: Number(e.target.value) })}
                    aria-label="Quantity"
                  />
                  <div className="text-right text-sm tabular-nums">{formatMoney(priceOf(line.productId) * (line.quantity || 0))}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((l) => l.key !== line.key))}
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setLines((ls) => [...ls, { key: (ls.at(-1)?.key ?? 0) + 1, productId: products[0]?.id ?? 0, quantity: 1 }])
                }
              >
                <PlusIcon className="size-4" /> Add line
              </Button>
              <div className="text-sm">
                Total <span className="ml-2 font-semibold tabular-nums">{formatMoney(total)}</span>
              </div>
            </div>
          </div>

          <FormField label="Notes" htmlFor="notes" hint="Delivery instructions, PO numbers, anything the warehouse should know.">
            <Textarea id="notes" name="notes" rows={3} />
          </FormField>
          <FormError error={state.error} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            Create draft order
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
