import { createFileRoute, Outlet, redirect, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Sun, Moon, Monitor, Menu, X } from "lucide-react";
import {
  ClientsIcon, VendorsIcon, InvoicesIcon, PurchaseOrdersIcon,
  BillsIcon, ExpensesIcon, ReconciliationIcon, ReportsIcon, SettingsIcon,
} from "@/components/dark-slate-icons";
import CleanSweepsLogo from "@/components/CleanSweepsLogo";

const DashboardNavIcon = ({ size = 20 }: { size?: number }) => (
  <CleanSweepsLogo width={20} height={20} color="#D8E5D2" />
);
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
  { to: "/dashboard", label: "Dashboard", icon: DashboardNavIcon },
  { to: "/clients", label: "Clients", icon: ClientsIcon },
  { to: "/vendors", label: "Vendors", icon: VendorsIcon },
  { to: "/invoices", label: "Invoices", icon: InvoicesIcon },
  { to: "/purchase-orders", label: "Purchase Orders", icon: PurchaseOrdersIcon },
  { to: "/bills", label: "Bills", icon: BillsIcon },
  { to: "/expenses", label: "Expenses", icon: ExpensesIcon },
  { to: "/reconciliation", label: "Reconciliation", icon: ReconciliationIcon },
  { to: "/reports", label: "Reports", icon: ReportsIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
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
        style={{ background: "#2D3838", borderRight: "1px solid rgba(212, 229, 210, 0.1)" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(212, 229, 210, 0.1)" }}
        >
          <Link to="/dashboard" className="flex items-center" style={{ color: "#D8E5D2", fontWeight: 500 }}>
            <CleanSweepsLogo width={72} height={72} />
            <span style={{ letterSpacing: "0.05em", marginLeft: 16 }}>Dark Slate</span>
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
          <span className="font-semibold" style={{ letterSpacing: "0.05em" }}>Dark Slate</span>
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
      className="flex items-center rounded-md text-sm font-medium"
      style={{
        gap: 10,
        color: active || hover ? "#D8E5D2" : "#A39E96",
        background: active ? "rgba(216, 229, 210, 0.15)" : "transparent",
        borderLeft: active ? "3px solid #D8E5D2" : "3px solid transparent",
        paddingLeft: active ? 9 : 12,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
        transition: "color 0.3s ease, background-color 0.3s ease, border-color 0.3s ease",
      }}
    >
      <Icon size={18} />
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
          style={{ background: "#232929", color: "#D8E5D2" }}
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
