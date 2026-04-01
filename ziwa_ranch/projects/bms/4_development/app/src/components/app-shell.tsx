"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  MessageSquare,
  CreditCard,
  Settings,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { isAdminRole, type UserRole } from "@/types/forms";
import type { Database } from "@/types/database";
import { OfflineProvider } from "@/components/offline-provider";
import { SyncIndicator } from "@/components/sync-indicator";
import { cacheProfile } from "@/lib/offline/db";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

interface AppShellProps {
  profile: UserRow;
  orgName: string;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: ClipboardList },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/communication", label: "Messages", icon: MessageSquare },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: typeof NAV_ITEMS;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ profile, orgName, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAdmin = isAdminRole(profile.role as UserRole);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isAdmin
  );

  // Cache user profile to IndexedDB for offline access
  useEffect(() => {
    cacheProfile({
      id: profile.id,
      orgId: profile.org_id,
      fullName: profile.full_name,
      role: profile.role,
      departmentId: profile.department_id,
      email: profile.email,
    }).catch(() => {});
  }, [profile]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <OfflineProvider>
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
            <div className="mb-6">
              <p className="font-bold text-lg">BMS</p>
              <p className="text-xs text-muted-foreground">{orgName}</p>
            </div>
            <NavLinks items={visibleNav} pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-auto pt-6">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        <p className="font-bold">BMS</p>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-muted/30 md:min-h-screen md:p-4">
          <div className="mb-6">
            <p className="font-bold text-lg">BMS</p>
            <p className="text-xs text-muted-foreground">{orgName}</p>
          </div>
          <NavLinks items={visibleNav} pathname={pathname} />
          <div className="mt-auto pt-6 border-t">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start gap-2 text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl pb-14">{children}</main>
      </div>
      <SyncIndicator />
    </div>
    </OfflineProvider>
  );
}
