"use client";

import { ActionButton } from "@/components/action-button";
import { resetDemoDataAction } from "@/lib/actions";

export function ResetDemoButton() {
  return (
    <ActionButton
      variant="outline"
      action={resetDemoDataAction}
      confirm="Reset all demo data? Every order, invoice, expense and note goes back to the sample set."
      success="Demo data reset"
    >
      Reset demo data
    </ActionButton>
  );
}
