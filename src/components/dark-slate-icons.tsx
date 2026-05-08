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

/** Dashboard — 3 offset rounded bars (mini Clean Sweeps). */
export function DashboardIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <rect x="8" y="3" width="8" height="2.5" rx="1.25" />
      <rect x="5" y="7" width="8" height="2.5" rx="1.25" />
      <rect x="7" y="11" width="8" height="2.5" rx="1.25" />
    </svg>
  );
}

/** Clients — generic minimal user silhouette. */
export function ClientsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <circle cx="10" cy="6" r="2.5" />
      <path d="M 5 14 Q 5 11 10 11 Q 15 11 15 14" fill="none" />
    </svg>
  );
}

/** Vendors — generic box with minimal perspective. */
export function VendorsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <rect x="4" y="6" width="12" height="10" rx="1" />
      <line x1="4" y1="10" x2="16" y2="10" strokeWidth={1} />
      <line x1="10" y1="6" x2="10" y2="16" strokeWidth={1} />
    </svg>
  );
}

/** Invoices — document with lines and outgoing arrow. */
export function InvoicesIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <path d="M 4 3 L 4 17 Q 4 18 5 18 L 14 18 Q 15 18 15 17 L 15 6 L 12 3 Z" fill="none" />
      <line x1="6" y1="7" x2="13" y2="7" strokeWidth={1} />
      <line x1="6" y1="10" x2="13" y2="10" strokeWidth={1} />
      <line x1="6" y1="13" x2="11" y2="13" strokeWidth={1} />
      <path d="M 14 15 L 17 15 M 17 15 L 16 14 M 17 15 L 16 16" fill="none" />
    </svg>
  );
}

/** Purchase Orders — document with PO label, lines, and check circle. */
export function PurchaseOrdersIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <path d="M 4 3 L 4 15 Q 4 16 5 16 L 12 16 Q 13 16 13 15 L 13 6 L 10 3 Z" fill="none" />
      <text x="5" y="7" fontSize="3" fontWeight="bold" fill="currentColor" stroke="none">PO</text>
      <line x1="6" y1="9" x2="12" y2="9" strokeWidth={0.8} />
      <line x1="6" y1="11" x2="12" y2="11" strokeWidth={0.8} />
      <circle cx="15" cy="13" r="2.5" fill="none" />
      <path d="M 14.2 13 L 15 13.8 L 15.8 12.2" strokeWidth={1.2} fill="none" />
    </svg>
  );
}

/** Bills — document with lines and arrow. */
export function BillsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <path d="M 4 3 L 4 17 Q 4 18 5 18 L 14 18 Q 15 18 15 17 L 15 6 L 12 3 Z" fill="none" />
      <line x1="6" y1="7" x2="13" y2="7" strokeWidth={1} />
      <line x1="6" y1="10" x2="13" y2="10" strokeWidth={1} />
      <line x1="6" y1="13" x2="11" y2="13" strokeWidth={1} />
      <path d="M 14 15 L 17 15 M 17 15 L 16 14 M 17 15 L 16 16" fill="none" />
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

/** Reconciliation — balance scale. */
export function ReconciliationIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <line x1="10" y1="5" x2="10" y2="9" />
      <path d="M 6 9 L 4 11 L 4 14 Q 4 14.5 4.5 14.5 L 7.5 14.5 Q 8 14.5 8 14 L 8 11 Z" fill="none" />
      <path d="M 14 9 L 16 11 L 16 14 Q 16 14.5 15.5 14.5 L 12.5 14.5 Q 12 14.5 12 14 L 12 11 Z" fill="none" />
      <line x1="4" y1="9" x2="16" y2="9" />
    </svg>
  );
}

/** Reports — upward trend arrow with bar chart. */
export function ReportsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <path d="M 4 14 L 8 10 L 11 12 L 16 6" fill="none" />
      <path d="M 14 6 L 16 6 L 16 8" fill="none" />
      <rect x="5" y="15" width="2" height="3" strokeWidth={1.2} fill="none" />
      <rect x="9" y="13" width="2" height="5" strokeWidth={1.2} fill="none" />
      <rect x="13" y="14" width="2" height="4" strokeWidth={1.2} fill="none" />
    </svg>
  );
}

/** Settings — gear with double outline. */
export function SettingsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} viewBox="0 0 20 20" strokeWidth={1.5} {...rest}>
      <circle cx="10" cy="10" r="3" fill="none" />
      <circle cx="10" cy="10" r="5.5" fill="none" />
      <circle cx="10" cy="3" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="3" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Logo — "The Clean Sweeps" mark. */
import cleanSweepsLogo from "@/assets/clean-sweeps-logo-transparent.png";
export function CleanSweepsLogo({ size = 20, className, style }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={cleanSweepsLogo}
      alt="Money Slate"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", ...style }}
    />
  );
}
