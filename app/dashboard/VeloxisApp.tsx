'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Vehicle, fmt, daysBetween, todayISO, folderName, despesasTotal, custoTotal, meuLucro, garantiaInfo, valorFaltante, maskValor,
} from '@/lib/veloxis';
import SignOutButton from './SignOutButton';
import NovoVeiculoForm from './NovoVeiculoForm';
import VehicleModal from './VehicleModal';
import Fechamento from './Fechamento';
import PlateBadge from './PlateBadge';

type ViewKey = 'estoque' | 'vendidos' | 'garantias' | 'pendencias' | 'fechamento' | 'novo';

export default function VeloxisApp({ initialVehicles, userEmail }: { initialVehicles: Vehicle[]; userEmail: string }) {
  const supabase = createClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [view, setView] = useState<ViewKey>('estoque');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [hideData, setHideData] = useState(true);

  function selectView(v: ViewKey) {
    setView(v);
  }

  async function reload() {
    const { data } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    if (data) setVehicles(data as Vehicle[]);
  }

  useEffect(() => { reload(); }, []);

  const counts = useMemo(() => ({
    estoque: vehicles.filter(v => v.status === 'estoque').length,
    vendidos: vehicles.filter(v => v.status === 'vendido').length,
    garantias: vehicles.filter(v => v.status === 'vendido' && garantiaInfo(v)?.ativa).length,
    pendencias: vehicles.filter(v => v.status === 'vendido' && valorFaltante(v) > 0).length,
  }), [vehicles]);

  function matchesSearch(v: Vehicle) {
    if (!search) return true;
    const t = search.toLowerCase();
    return [v.placa, v.marca, v.modelo, v.data.cor, v.data.cidade, folderName(v)].join(' ').toLowerCase().includes(t);
  }

  function listFor(view: ViewKey): Vehicle[] {
    let list: Vehicle[] = [];
    if (view === 'estoque') list = vehicles.filter(v => v.status === 'estoque');
    else if (view === 'vendidos') list = vehicles.filter(v => v.status === 'vendido');
    else if (view === 'garantias') list = vehicles.filter(v => v.status === 'vendido' && garantiaInfo(v)?.ativa);
    else if (view === 'pendencias') list = vehicles.filter(v => v.status === 'vendido' && valorFaltante(v) > 0);
    list = list.filter(matchesSearch);
    return [...list].sort((a, b) => {
      const da = a.data.venda?.dataVenda || a.data_entrada || '';
      const db = b.data.venda?.dataVenda || b.data_entrada || '';
      return db.localeCompare(da);
    });
  }

  const titles: Record<string, [string, string]> = {
    estoque: ['Meus veículos', 'Veículos aguardando venda'],
    vendidos: ['Veículos vendidos', 'Histórico de vendas e lucro'],
    garantias: ['Garantia ativa', 'Vendidos há menos de 90 dias'],
    pendencias: ['Minhas pendências', 'Saldo a receber de clientes'],
  };

  const openVehicle = vehicles.find(v => v.id === openId) || null;

  const navItems: { key: ViewKey; label: string; count?: number }[] = [
    { key: 'estoque', label: 'Meus veículos', count: counts.estoque },
    { key: 'vendidos', label: 'Vendidos', count: counts.vendidos },
    { key: 'garantias', label: 'Garantia', count: counts.garantias },
    { key: 'pendencias', label: 'Pendências', count: counts.pendencias },
    { key: 'fechamento', label: 'Fechamento' },
  ];

  return (
    <div className="vx-app">
      {/* Barra fixa no topo, visível apenas no celular: logo + navegação horizontal */}
      <div className="vx-mobile-topbar">
        <div className="vx-mobile-topbar-brand">
          <img src="/logo.png" alt="VELOXIS" width={112} height={107} />
        </div>
        <SignOutButton />
      </div>
      <div className="vx-mobile-nav">
        {navItems.map(item => (
          <button
            key={item.key}
            className={`vx-mobile-navpill ${view === item.key ? 'active' : ''}`}
            onClick={() => selectView(item.key)}
          >
            {item.label}{item.count !== undefined ? ` (${item.count})` : ''}
          </button>
        ))}
      </div>

      <div className="vx-sidebar">
        <div className="vx-brandrow">
          <img src="/logo.png" alt="VELOXIS" width={160} height={153} style={{ height: 40, width: 'auto', display: 'block' }} />
        </div>
        <div className="vx-tagline">Controle. Organize. Lucre.</div>
        <div className="vx-user">{userEmail}</div>
        <div className="vx-glow"><div className="vx-glow-inner"><button className={`vx-navbtn ${view === 'estoque' ? 'active' : ''}`} onClick={() => selectView('estoque')}>MEUS VEÍCULOS ({counts.estoque})</button></div></div>
        <div className="vx-glow"><div className="vx-glow-inner"><button className={`vx-navbtn ${view === 'vendidos' ? 'active' : ''}`} onClick={() => selectView('vendidos')}>VEÍCULOS VENDIDOS ({counts.vendidos})</button></div></div>
        <div className="vx-glow"><div className="vx-glow-inner"><button className={`vx-navbtn ${view === 'garantias' ? 'active' : ''}`} onClick={() => selectView('garantias')}>GARANTIA ATIVA ({counts.garantias})</button></div></div>
        <div className="vx-glow"><div className="vx-glow-inner"><button className={`vx-navbtn ${view === 'pendencias' ? 'active' : ''}`} onClick={() => selectView('pendencias')}>MINHAS PENDÊNCIAS ({counts.pendencias})</button></div></div>
        <div className="vx-glow" style={{ marginTop: 'auto' }}><div className="vx-glow-inner"><button className={`vx-navbtn ${view === 'fechamento' ? 'active' : ''}`} onClick={() => selectView('fechamento')}>FECHAMENTO MENSAL</button></div></div>
        <div className="vx-sidebar-foot">
          <SignOutButton />
        </div>
      </div>

      <div className="vx-main">
        <div className="vx-watermark"><img src="/logo-icon.png" alt="" style={{ width: 340, height: 'auto' }} /></div>

        {view === 'novo' && (
          <NovoVeiculoForm onDone={() => { setView('estoque'); reload(); }} />
        )}

        {view === 'fechamento' && <Fechamento vehicles={vehicles} />}

        {(['estoque', 'vendidos', 'garantias', 'pendencias'] as ViewKey[]).includes(view) && (
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="vx-topbar">
              <div>
                <div className="vx-h1">{titles[view][0]}</div>
                <div className="vx-sub">{titles[view][1]}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="vx-search" placeholder="Buscar placa, modelo, cidade..." value={search} onChange={e => setSearch(e.target.value)} />
                <button className="vx-btn secondary" onClick={() => setHideData(h => !h)}>
                  {hideData ? <EyeOffIcon /> : <EyeIcon />}
                  {hideData ? 'Mostrar dados' : 'Ocultar dados'}
                </button>
                <button className="vx-btn" onClick={() => setView('novo')}>+ Novo veículo</button>
              </div>
            </div>
            <ListView list={listFor(view)} view={view} onOpen={setOpenId} hideData={hideData} />
          </div>
        )}
      </div>

      {openVehicle && (
        <VehicleModal vehicle={openVehicle} onClose={() => setOpenId(null)} onSaved={reload} onDeleted={reload} />
      )}
    </div>
  );
}

function ListView({ list, view, onOpen, hideData }: { list: Vehicle[]; view: ViewKey; onOpen: (id: string) => void; hideData: boolean }) {
  if (list.length === 0) {
    return (
      <div className="vx-empty">
        <b>Nada por aqui ainda</b>
        {view === 'estoque' ? 'Cadastre um veículo para começar o controle.' : 'Assim que houver dados, eles aparecem aqui.'}
      </div>
    );
  }
  return (
    <div className="vx-list">
      {list.map(v => <VehicleRow key={v.id} v={v} onOpen={onOpen} hideData={hideData} />)}
    </div>
  );
}

function VehicleRow({ v, onOpen, hideData }: { v: Vehicle; onOpen: (id: string) => void; hideData: boolean }) {
  const val = (n: number) => (hideData ? maskValor() : fmt(n));
  let sub: React.ReactNode = null;
  let badges: React.ReactNode = null;
  if (v.status === 'estoque') {
    const dias = v.data_entrada ? daysBetween(v.data_entrada, todayISO()) : 0;
    sub = <>
      <span>Entrada: <b>{val(v.valor_entrada)}</b></span>
      <span>Despesas: <b>{val(despesasTotal(v))}</b></span>
      <span>Custo atual: <b>{val(custoTotal(v))}</b></span>
      <span>{dias} dia{dias === 1 ? '' : 's'} em estoque</span>
    </>;
  } else if (v.status === 'vendido' && v.data.venda) {
    const l = meuLucro(v);
    const g = garantiaInfo(v);
    const falt = valorFaltante(v);
    sub = <>
      <span>Venda: <b>{val(v.data.venda.valorVenda)}</b></span>
      <span>Lucro: <b style={{ color: l >= 0 ? 'var(--green)' : 'var(--red)' }}>{val(l)}</b></span>
    </>;
    badges = <>
      {v.data.venda.metodoRepasse && <span className="vx-badge red">REPASSE</span>}
      {g && <span className={`vx-badge ${g.ativa ? 'amber' : 'muted'}`}>{g.ativa ? `Garantia ${g.diasRestantes}d` : 'Garantia exp.'}</span>}
      {falt > 0 && <span className="vx-badge red">Falta {val(falt)}</span>}
    </>;
  }
  return (
    <div className="vx-glow">
      <div className="vx-glow-inner">
        <div className="vx-list-row" onClick={() => onOpen(v.id)}>
          <PlateBadge placa={v.placa} size="sm" hide={hideData} />
          <div className="vx-list-main">
            <div className="vx-list-title">{folderName(v)}</div>
            <div className="vx-list-sub">{sub}</div>
          </div>
          <div className="vx-list-badges">{badges}</div>
        </div>
      </div>
    </div>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
