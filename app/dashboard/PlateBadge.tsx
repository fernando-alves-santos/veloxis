import { maskPlaca } from '@/lib/veloxis';

export default function PlateBadge({ placa, size = 'sm', hide = false }: { placa: string; size?: 'sm' | 'lg'; hide?: boolean }) {
  const p = hide ? maskPlaca(placa) : (placa || '---').toUpperCase();
  return (
    <span className={`vx-plate vx-plate-${size}`}>
      <span className="vx-plate-top"><span>BRASIL</span></span>
      <span className="vx-plate-num">{p}</span>
    </span>
  );
}
