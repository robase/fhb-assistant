import { List } from "@phosphor-icons/react/dist/icons/List";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./shadcdn/ui/sheet";
import React from "react";

export const WithMobileSidebar = ({
  children,
  sidebarContent: SidebarContent,
  mobileDashboardHeader: MobileDashboardHeader,
}: {
  children: React.ReactNode;
  sidebarContent: () => JSX.Element;
  mobileDashboardHeader?: () => JSX.Element;
}) => {
  return (
    <>
      <Sheet>
        <div className="flex md:hidden p-3 bg-neutral-100">
          <div className="flex flex-1">{MobileDashboardHeader && <MobileDashboardHeader />}</div>
          <SheetTrigger className="text-black hover:bg-neutral-200 p-1 rounded-lg">
            <List className="h-8 w-8 text-neutral-400" />
          </SheetTrigger>
        </div>
        <SheetContent className="p-0 pt-12 bg-neutral-50" side="left">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      {children}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const WithDesktopSidebar = ({
  children,
  sidebarContent: SidebarContent,
}: {
  children: React.ReactNode;
  sidebarContent: () => JSX.Element;
}) => {
  return (
    <div className="mx-auto w-full h-screen flex-1 items-start md:grid md:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="fixed top-14 z-30 hidden h-screen w-full shrink-0 md:sticky md:block border-r border-neutral-400">
        <div className="h-full">
          <SidebarContent />
        </div>
      </aside>
      {children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export const WithSidebar = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  sidebarContent: () => JSX.Element;
  mobileDashboardHeader?: () => JSX.Element;
}) => {
  return (
    <WithDesktopSidebar {...props}>
      <WithMobileSidebar {...props}>{children}</WithMobileSidebar>
    </WithDesktopSidebar>
  );
};
