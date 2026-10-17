import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="grid gap-4">
      <EmptyState title="Not found" description="That record does not exist or was removed." />
      <Button variant="outline" className="justify-self-center" render={<Link href="/" />}>
        Back to dashboard
      </Button>
    </div>
  );
}
