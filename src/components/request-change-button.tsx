import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Where "Request a change" sends people: the Theseus workspace this app is
// connected to. Baked in at build time; empty hides the button.
const THESEUS_URL = process.env.NEXT_PUBLIC_THESEUS_URL ?? "";

export function RequestChangeButton() {
  if (!THESEUS_URL) return null;
  return (
    <Button size="sm" variant="outline" render={<a href={THESEUS_URL} target="_blank" rel="noreferrer" />}>
      <SparklesIcon className="size-4" />
      <span className="hidden sm:inline">Request a change</span>
    </Button>
  );
}
