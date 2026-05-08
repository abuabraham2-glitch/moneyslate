import * as React from "react";

type Props = {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * "The Clean Sweeps" mark.
 * 3 rows of pill-shaped bars:
 *   - Row 1: full-width
 *   - Row 2: two 40% bars (left + right) with a center gap
 *   - Row 3: full-width
 * Bar height 8, vertical gap 8 → viewBox 100x40.
 */
export default function CleanSweepsLogo({
  width = 32,
  height = 32,
  color = "#D8E5D2",
  className,
  style,
}: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 40"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Top bar: full width */}
      <rect x="0" y="0" width="100" height="8" rx="4" fill={color} />
      {/* Middle left: 40% width, 10% left margin */}
      <rect x="10" y="16" width="36" height="8" rx="4" fill={color} />
      {/* Middle right: 40% width, 10% right margin */}
      <rect x="54" y="16" width="36" height="8" rx="4" fill={color} />
      {/* Bottom bar: full width */}
      <rect x="0" y="32" width="100" height="8" rx="4" fill={color} />
    </svg>
  );
}
