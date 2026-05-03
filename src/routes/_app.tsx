import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Users, Truck, FileText, ClipboardList, Receipt,
  CreditCard, Banknote, BarChart3, Settings, LogOut, Sun, Moon, Monitor, Menu, X, Wallet,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/vendors", label: "Vendors", icon: Truck },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { to: "/bills", label: "Bills", icon: Receipt },
  { to: "/expenses", label: "Expenses", icon: CreditCard },
  { to: "/reconciliation", label: "Reconciliation", icon: Banknote },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const { session, loading } = useAuth();
  const nav2 = useNavigate();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!session) {
    nav2({ to: "/login" });
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col transition-transform",
          open ? "flex translate-x-0" : "-translate-x-full lg:translate-x-0 lg:flex"
        )}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <Wallet className="h-4 w-4" />
            </div>
            Finance OS
          </Link>
          <button className="lg:hidden text-sidebar-foreground" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {nav.map((item) => (
            <NavLink key={item.to} {...item} onClick={() => setOpen(false)} />
          ))}
        </nav>
        <UserMenu />
      </aside>

      {open && <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-20 h-14 bg-background/80 backdrop-blur border-b border-border flex items-center px-4 gap-3">
          <button onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="font-semibold">Finance OS</span>
        </header>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavLink({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = path === to || path.startsWith(to + "/");
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary/10 text-sidebar-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function UserMenu() {
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  return (
    <div className="border-t border-sidebar-border p-3 space-y-2">
      <div className="flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-full bg-sidebar-accent text-sidebar-accent-foreground grid place-items-center text-xs font-semibold">
          {session?.user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-sidebar-foreground/60 truncate">{session?.user?.email}</p>
        </div>
      </div>
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 justify-start text-sidebar-foreground/80">
              {theme === "light" ? <Sun className="h-4 w-4 mr-2" /> : theme === "dark" ? <Moon className="h-4 w-4 mr-2" /> : <Monitor className="h-4 w-4 mr-2" />}
              Theme
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="h-4 w-4 mr-2" /> Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="h-4 w-4 mr-2" /> Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}><Monitor className="h-4 w-4 mr-2" /> System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => { await supabase.auth.signOut(); nav({ to: "/login" }); }}
          className="text-sidebar-foreground/80"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
