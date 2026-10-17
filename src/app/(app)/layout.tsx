import { AppSidebar } from "@/components/app-sidebar";
import { RequestChangeButton } from "@/components/request-change-button";
import { UserSwitcher } from "@/components/user-switcher";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { listStaff } from "@/lib/data/staff";
import { currentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, staff] = await Promise.all([currentUser(), listStaff()]);
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <div className="ml-auto flex items-center gap-2">
            <RequestChangeButton />
            <UserSwitcher me={me} staff={staff} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
