"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormError } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addNoteAction, type ActionResult } from "@/lib/actions";

export function NoteForm({ customerId }: { customerId: number }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(addNoteAction.bind(null, customerId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-2">
      <Textarea name="body" placeholder="Add a note about this customer" rows={3} required />
      <FormError error={state.error} />
      <Button type="submit" size="sm" className="justify-self-end" disabled={pending}>
        Add note
      </Button>
    </form>
  );
}
