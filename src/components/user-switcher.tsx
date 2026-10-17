"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchUser } from "@/lib/actions";
import { initials } from "@/lib/format";
import type { Staff } from "@/lib/types";

/** Who is acting. There is no login: pick a teammate and everything you do is attributed to them. */
export function UserSwitcher({ me, staff }: { me: Staff; staff: Staff[] }) {
  const pathname = usePathname();
  const [pending, start] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="gap-2 px-2" disabled={pending} />
        }
      >
        <Avatar className="size-6">
          <AvatarFallback className="text-[10px]">{initials(me.name)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-sm sm:inline">{me.name}</span>
        <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="text-xs text-muted-foreground">Acting as</div>
          <div className="text-sm font-medium">{me.name}</div>
          <div className="text-xs text-muted-foreground">{me.role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {staff.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => start(() => switchUser(s.id, pathname))}>
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials(s.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col">
              <span>{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.role}</span>
            </div>
            {s.id === me.id ? <CheckIcon className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
