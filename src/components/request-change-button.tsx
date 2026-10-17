import { SparklesIcon } from "lucide-react";
import { ChangeRequestBox } from "@/components/change-request-box";
import { Button } from "@/components/ui/button";
import { theseusConfig } from "@/lib/theseus/client";

// Where "Request a change" sends people when the app is not wired to the
// Theseus API: the workspace this app is connected to. Baked in at build time.
const THESEUS_URL = process.env.NEXT_PUBLIC_THESEUS_URL ?? "";

/**
 * With THESEUS_API_URL and its integration settings present (read at runtime
 * on the server), the header opens a box to file and follow requests in place.
 * Otherwise it falls back to a plain link, and to nothing without one.
 */
export function RequestChangeButton() {
  if (theseusConfig()) return <ChangeRequestBox />;
  if (!THESEUS_URL) return null;
  return (
    <Button size="sm" variant="outline" render={<a href={THESEUS_URL} target="_blank" rel="noreferrer" />}>
      <SparklesIcon className="size-4" />
      <span className="hidden sm:inline">Request a change</span>
    </Button>
  );
}
