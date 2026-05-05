import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, User, Building2, FileText, FileCheck, FileSpreadsheet,
  Scale, CheckCircle2, TrendingUp, Settings, LogOut, Sun, Moon, Monitor, Menu, X, Wallet,
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
  { to: "/clients", label: "Clients", icon: User },
  { to: "/vendors", label: "Vendors", icon: Building2 },
  { to: "/invoices", label: "Invoices", icon: FileText },
  { to: "/purchase-orders", label: "Purchase Orders", icon: FileCheck },
  { to: "/bills", label: "Bills", icon: FileSpreadsheet },
  { to: "/expenses", label: "Expenses", icon: Scale },
  { to: "/reconciliation", label: "Reconciliation", icon: CheckCircle2 },
  { to: "/reports", label: "Reports", icon: TrendingUp },
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
    <div className="min-h-screen flex" style={{ background: "#232929" }}>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex-col transition-transform",
          open ? "flex translate-x-0" : "-translate-x-full lg:translate-x-0 lg:flex"
        )}
        style={{ background: "#232929", borderRight: "1px solid rgba(212, 229, 210, 0.1)" }}
      >
        <div
          className="h-16 px-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(212, 229, 210, 0.1)" }}
        >
          <Link to="/dashboard" className="flex items-center gap-2" style={{ color: "#D8E5D2", fontWeight: 500 }}>
            <div
              className="h-8 w-8 rounded-lg grid place-items-center"
              style={{ background: "#D8E5D2", color: "#232929" }}
            >
              <Wallet className="h-4 w-4" />
            </div>
            Finance Flow
          </Link>
          <button className="lg:hidden" style={{ color: "#A39E96" }} onClick={() => setOpen(false)}>
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
        <header
          className="lg:hidden sticky top-0 z-20 h-14 backdrop-blur flex items-center px-4 gap-3"
          style={{ background: "rgba(35,41,41,0.8)", borderBottom: "1px solid rgba(212, 229, 210, 0.1)", color: "#D8E5D2" }}
        >
          <button onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <span className="font-semibold">Finance Flow</span>
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
  const [hover, setHover] = useState(false);
  return (
    <Link
      to={to}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
      style={{
        color: active || hover ? "#D8E5D2" : "#A39E96",
        background: active ? "rgba(216, 229, 210, 0.08)" : "transparent",
        borderLeft: active ? "2px solid #D8E5D2" : "2px solid transparent",
        paddingLeft: active ? 10 : 12,
      }}
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
    <div className="p-3 space-y-2" style={{ borderTop: "1px solid rgba(212, 229, 210, 0.1)" }}>
      <div className="flex items-center gap-2 px-2">
        <div
          className="h-8 w-8 rounded-full grid place-items-center text-xs font-semibold"
          style={{ background: "#2D3838", color: "#D8E5D2" }}
        >
          {session?.user?.email?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs truncate" style={{ color: "#A39E96" }}>{session?.user?.email}</p>
        </div>
      </div>
      <div className="flex gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex-1 justify-start hover:bg-transparent" style={{ color: "#A39E96" }}>
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
          style={{ color: "#A39E96" }}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
