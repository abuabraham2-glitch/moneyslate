import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
});

/** Dashboard — 2x2 grid of offset bars (mini logo). */
export function DashboardIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="3" y1="7" x2="10" y2="7" />
      <line x1="13" y1="7" x2="20" y2="7" />
      <line x1="5" y1="13" x2="11" y2="13" />
      <line x1="14" y1="13" x2="21" y2="13" />
      <line x1="3" y1="19" x2="9" y2="19" />
      <line x1="12" y1="19" x2="19" y2="19" />
    </svg>
  );
}

/** Clients — detached circle (head) + arc (shoulders). */
export function ClientsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c1.4-3.6 4-5.4 7-5.4s5.6 1.8 7 5.4" />
    </svg>
  );
}

/** Vendors — stylized box/warehouse using three parallel lines for depth. */
export function VendorsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 8l8-4 8 4v10l-8 4-8-4V8z" />
      <line x1="4" y1="8" x2="12" y2="12" />
      <line x1="20" y1="8" x2="12" y2="12" />
      <line x1="12" y1="12" x2="12" y2="22" />
    </svg>
  );
}

/** Invoices — document with outgoing arrow (kept conventional). */
export function InvoicesIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <line x1="9.5" y1="13" x2="15.5" y2="13" />
      <line x1="9.5" y1="17" x2="13.5" y2="17" />
    </svg>
  );
}

/** Purchase Orders — reversed invoice: arrow pointing INTO a document frame. */
export function PurchaseOrdersIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M9 4h11v16H9" />
      <line x1="3" y1="12" x2="14" y2="12" />
      <polyline points="11 8 15 12 11 16" />
    </svg>
  );
}

/** Bills — ticket with single notched edge. */
export function BillsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 6h16v5a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V6z" />
      <line x1="13" y1="9" x2="13" y2="15" />
    </svg>
  );
}

/** Expenses — downward diagonal arrow crossing a horizontal line. */
export function ExpensesIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="6" y1="5" x2="18" y2="19" />
      <polyline points="13 19 18 19 18 14" />
    </svg>
  );
}

/** Reconciliation — two parallel lines linked by a vertical (Equalizer). */
export function ReconciliationIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="3" y1="8" x2="21" y2="8" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="12" y1="8" x2="12" y2="16" />
    </svg>
  );
}

/** Reports — three vertical bars, varying heights, bottom-aligned. */
export function ReportsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="12" y1="20" x2="12" y2="9" />
      <line x1="18" y1="20" x2="18" y2="5" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  );
}

/** Settings — minimal gear (kept simple). */
export function SettingsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}

/** Logo — "The Clean Sweeps" mark. */
import cleanSweepsLogo from "@/assets/clean-sweeps-logo-transparent.png";
export function CleanSweepsLogo({ size = 20, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={cleanSweepsLogo}
      alt="Dark Slate"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", ...style }}
    />
  );
}
