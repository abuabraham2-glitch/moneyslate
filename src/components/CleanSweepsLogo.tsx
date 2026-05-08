export default function CleanSweepsLogo({ width = 32, height = 32 }: { width?: number; height?: number }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="212" y="166" width="168" height="44" rx="22" fill="#D8E5D2" />
      <rect x="132" y="234" width="168" height="44" rx="22" fill="#D8E5D2" />
      <rect x="312" y="234" width="68" height="44" rx="22" fill="#C8D7C0" />
      <rect x="180" y="302" width="200" height="44" rx="22" fill="#D8E5D2" />
    </svg>
  );
}
