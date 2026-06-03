import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const svgBase = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
});

/** Dashboard — 3 offset rounded bars (mini Clean Sweeps). Unchanged. */
export function DashboardIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <rect x="8" y="3" width="8" height="2.5" rx="1.25" />
      <rect x="5" y="7" width="8" height="2.5" rx="1.25" />
      <rect x="7" y="11" width="8" height="2.5" rx="1.25" />
    </svg>
  );
}

export function ClientsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <circle cx="12" cy="7" r="3.5" stroke="currentColor" strokeWidth="2" />
      <rect x="6" y="13" width="12" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

export function VendorsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <rect x="5" y="5" width="4" height="14" rx="2" fill="currentColor" />
      <rect x="5" y="15" width="14" height="4" rx="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function InvoicesIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <rect x="5" y="4" width="10" height="3" rx="1.5" fill="currentColor" />
      <rect x="5" y="9" width="14" height="3" rx="1.5" fill="currentColor" />
      <rect x="5" y="14" width="14" height="3" rx="1.5" fill="currentColor" />
      <rect x="16" y="18" width="5" height="2" rx="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function PurchaseOrdersIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
      <rect x="8" y="8" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function BillsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <rect x="9" y="4" width="10" height="3" rx="1.5" fill="currentColor" />
      <rect x="5" y="9" width="14" height="3" rx="1.5" fill="currentColor" />
      <rect x="5" y="14" width="14" height="3" rx="1.5" fill="currentColor" />
      <rect x="3" y="18" width="5" height="2" rx="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function ExpensesIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <rect x="6" y="4" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="6" y="17" width="3" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="10.5" y="17" width="3" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
      <rect x="15" y="17" width="3" height="3" rx="1.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function ReconciliationIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

export function ReportsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <rect x="4" y="12" width="4" height="8" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="10" y="7" width="4" height="13" rx="2" fill="currentColor" opacity="0.75" />
      <rect x="16" y="4" width="4" height="16" rx="2" fill="currentColor" />
    </svg>
  );
}

export function SettingsIcon({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...svgBase(size)} {...rest}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <rect x="11" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="11" y="16" width="2" height="4" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="4" y="11" width="4" height="2" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="16" y="11" width="4" height="2" rx="1" fill="currentColor" opacity="0.7" />
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
