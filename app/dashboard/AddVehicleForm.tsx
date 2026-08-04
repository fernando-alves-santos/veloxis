'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AddVehicleForm() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [placa, setPlaca] = useState('');
  const [valorEntrada, setValorEntrada] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('vehicles').insert({
      created_by: user?.id,
      status: 'estoque',
      marca, modelo, placa,
      valor_entrada: parseFloat(valorEntrada) || 0,
      data_entrada: new Date().toISOString().slice(0, 10),
      data: {},
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMarca(''); setModelo(''); setPlaca(''); setValorEntrada('');
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button className="vx-btn" onClick={() => setOpen(true)}>+ Novo veículo</button>;
  }

  return (
    <form onSubmit={handleSubmit} className="vx-card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>Marca</label>
        <input className="vx-input" value={marca} onChange={e => setMarca(e.target.value)} required />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>Modelo</label>
        <input className="vx-input" value={modelo} onChange={e => setModelo(e.target.value)} required />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>Placa</label>
        <input className="vx-input" value={placa} onChange={e => setPlaca(e.target.value)} required />
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--muted)' }}>Valor de entrada</label>
        <input className="vx-input" type="number" step="0.01" value={valorEntrada} onChange={e => setValorEntrada(e.target.value)} />
      </div>
      {error && <div style={{ color: 'var(--red)', fontSize: 12, width: '100%' }}>{error}</div>}
      <button className="vx-btn" type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
      <button type="button" onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>Cancelar</button>
    </form>
  );
}
