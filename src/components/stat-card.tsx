import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

export function StatCard({
  title,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "warning" | "danger" | "success";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div
          className={cn("text-2xl font-semibold tabular-nums", {
            "text-red-600 dark:text-red-400": tone === "danger",
            "text-amber-600 dark:text-amber-400": tone === "warning",
            "text-emerald-600 dark:text-emerald-400": tone === "success",
          })}
        >
          {value}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
