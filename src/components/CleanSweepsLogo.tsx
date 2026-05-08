export default function CleanSweepsLogo({
  width = 32,
  height = 32,
  color = "#D8E5D2",
  accentColor,
}: {
  width?: number;
  height?: number;
  color?: string;
  accentColor?: string;
}) {
  const accent = accentColor ?? "#C8D7C0";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="212" y="166" width="168" height="44" rx="22" fill={color} />
      <rect x="132" y="234" width="168" height="44" rx="22" fill={color} />
      <rect x="312" y="234" width="68" height="44" rx="22" fill={accent} />
      <rect x="180" y="302" width="200" height="44" rx="22" fill={color} />
    </svg>
  );
}
