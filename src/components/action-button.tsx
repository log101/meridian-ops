"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/actions";

type ButtonProps = React.ComponentProps<typeof Button>;

/**
 * A button that runs a server action and shows the result as a toast.
 * Pass `confirm` to ask before running (uses a plain confirm dialog).
 */
export function ActionButton({
  action,
  success,
  confirm: confirmText,
  children,
  ...props
}: Omit<ButtonProps, "onClick"> & {
  action: () => Promise<ActionResult>;
  success?: string;
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirmText && !window.confirm(confirmText)) return;
        start(async () => {
          const res = await action();
          if (res?.error) toast.error(res.error);
          else if (success) toast.success(success);
        });
      }}
    >
      {children}
    </Button>
  );
}
