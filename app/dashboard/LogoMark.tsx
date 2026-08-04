export default function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
      <path d="M20 20 L45 20 L60 50 L45 80 L20 80 L35 50 Z" fill="var(--brass)" />
      <path d="M62 20 L80 20 L55 80 L45 80 Z" fill="var(--silver)" />
    </svg>
  );
}
