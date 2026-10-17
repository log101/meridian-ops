import Link from "next/link";
import { cn } from "cn";

/** Server-rendered segmented filter: each tab is a link that sets a query param. */
export function FilterTabs({
  param,
  value,
  options,
  basePath,
}: {
  param: string;
  value: string;
  options: { value: string; label: string; count?: number }[];
  basePath: string;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
      {options.map((o) => {
        const active = o.value === value;
        const href = o.value === "all" ? basePath : `${basePath}?${param}=${o.value}`;
        return (
          <Link
            key={o.value}
            href={href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined ? (
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-muted" : "bg-background/60")}>
                {o.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
