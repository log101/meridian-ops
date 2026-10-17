"use client";

import {
  BoxesIcon,
  CompassIcon,
  ContactIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptIcon,
  SettingsIcon,
  ShoppingCartIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const sections = [
  {
    label: "Work",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboardIcon },
      { title: "Welcome", href: "/welcome", icon: SparklesIcon },
      { title: "Orders", href: "/orders", icon: ShoppingCartIcon },
      { title: "Invoices", href: "/invoices", icon: FileTextIcon },
      { title: "Expenses", href: "/expenses", icon: ReceiptIcon },
    ],
  },
  {
    label: "Records",
    items: [
      { title: "Customers", href: "/customers", icon: ContactIcon },
      { title: "Inventory", href: "/products", icon: BoxesIcon },
      { title: "Team", href: "/team", icon: UsersIcon },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CompassIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Meridian Ops</span>
                <span className="truncate text-xs text-muted-foreground">Meridian Supply Co.</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive(item.href)} tooltip={item.title} render={<Link href={item.href} />}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={isActive("/settings")} tooltip="Settings" render={<Link href="/settings" />}>
              <SettingsIcon />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
