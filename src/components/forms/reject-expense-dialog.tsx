"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError, FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { rejectExpenseAction } from "@/lib/actions";

export function RejectExpenseDialog({
  expenseId,
  description,
}: {
  expenseId: number;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await rejectExpenseAction(expenseId, formData);
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Expense rejected");
        setOpen(false);
        setError(undefined);
        formRef.current?.reset();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(undefined);
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            Reject
          </Button>
        }
      />
      <DialogContent>
        <form ref={formRef} action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reject expense claim</DialogTitle>
            <DialogDescription>
              {description
                ? `Provide a note explaining why "${description}" is being rejected. A note is required.`
                : "Provide a note explaining why this expense claim is being rejected. A note is required."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FormField label="Rejection note" htmlFor={`rejection-note-${expenseId}`}>
              <Textarea
                id={`rejection-note-${expenseId}`}
                name="note"
                placeholder="Explain why this expense claim is being rejected..."
                rows={3}
                required
                autoFocus
              />
            </FormField>
            <FormError error={error} />
          </div>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Rejecting..." : "Reject claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
