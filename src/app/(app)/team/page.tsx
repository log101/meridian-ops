import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { listStaff } from "@/lib/data/staff";
import { initials } from "@/lib/format";

export const metadata = { title: "Team" };

export default function TeamPage() {
  const staff = listStaff();
  return (
    <>
      <PageHeader title="Team" description="Everyone who uses Meridian Ops. Switch who you are acting as from the top right." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <Card key={s.id} size="sm">
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback>{initials(s.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-sm text-muted-foreground">{s.role}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.department} · {s.email}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
