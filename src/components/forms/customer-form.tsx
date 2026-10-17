"use client";

import { useActionState } from "react";
import { FormError, FormField, NativeSelect } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createCustomerAction, type ActionResult } from "@/lib/actions";

export function CustomerForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createCustomerAction, {});
  return (
    <form action={action}>
      <Card className="max-w-2xl">
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" required />
          </FormField>
          <FormField label="Contact name" htmlFor="contact_name">
            <Input id="contact_name" name="contact_name" required />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" />
          </FormField>
          <FormField label="Segment" htmlFor="segment">
            <NativeSelect id="segment" name="segment" defaultValue="retail">
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="online">Online</option>
            </NativeSelect>
          </FormField>
          <FormField label="City" htmlFor="city">
            <Input id="city" name="city" />
          </FormField>
          <FormField label="Country" htmlFor="country">
            <Input id="country" name="country" defaultValue="US" />
          </FormField>
          <FormField label="Credit limit (USD)" htmlFor="credit_limit">
            <Input id="credit_limit" name="credit_limit" type="number" min={0} step={100} defaultValue={5000} />
          </FormField>
          <div className="sm:col-span-2">
            <FormError error={state.error} />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            Create customer
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
