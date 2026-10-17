"use client";

import { useActionState } from "react";
import { FormError, FormField, NativeSelect } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitExpenseAction, type ActionResult } from "@/lib/actions";
import { EXPENSE_CATEGORIES } from "@/lib/types";

export function ExpenseForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(submitExpenseAction, {});
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action}>
      <Card className="max-w-xl">
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Category" htmlFor="category">
            <NativeSelect id="category" name="category" defaultValue="travel">
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Amount (USD)" htmlFor="amount">
            <Input id="amount" name="amount" type="number" min={0.01} step={0.01} required />
          </FormField>
          <FormField label="Date" htmlFor="incurred_at">
            <Input id="incurred_at" name="incurred_at" type="date" defaultValue={today} max={today} required />
          </FormField>
          <FormField label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" rows={3} placeholder="What was it for?" required />
          </FormField>
          <div className="sm:col-span-2">
            <FormError error={state.error} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            Submit for approval
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
