"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adjustStockAction, type ActionResult } from "@/lib/actions";

/** Inline "+10 / -3" adjustment next to a product row. */
export function StockAdjustForm({ productId }: { productId: number }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(adjustStockAction.bind(null, productId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="flex items-center justify-end gap-1">
      <Input name="delta" type="number" placeholder="+/-" className="h-8 w-20 text-right" required aria-label="Stock adjustment" />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Apply
      </Button>
    </form>
  );
}
