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
 * Three offset horizontal bars: full-width top, two shorter stacked bars
 * right-of-center, full-width bottom. All pill-shaped.
 */
export default function CleanSweepsLogo({
  width = 32,
  height = 32,
  color = "#D8E5D2",
  className,
  style,
}: Props) {
  // viewBox 32x32. Bar height 4, radius 2 (pill). 4 rows total with 2px gaps.
  // Rows at y = 2, 10, 18, 26.
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* Top: full width */}
      <rect x="2" y="4" width="28" height="4" rx="2" fill={color} />
      {/* Middle upper: shorter, right of center */}
      <rect x="12" y="11" width="18" height="4" rx="2" fill={color} />
      {/* Middle lower: shorter, right of center */}
      <rect x="12" y="18" width="18" height="4" rx="2" fill={color} />
      {/* Bottom: full width */}
      <rect x="2" y="25" width="28" height="4" rx="2" fill={color} />
    </svg>
  );
}
