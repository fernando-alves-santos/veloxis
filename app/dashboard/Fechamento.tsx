'use client';

import { Vehicle, fmt, meuLucro, meuInvestimento, valorFaltante, fechamentoMensal, monthLabel } from '@/lib/veloxis';

export default function Fechamento({ vehicles }: { vehicles: Vehicle[] }) {
  const emEstoque = vehicles.filter(v => v.status === 'estoque');
  const vendidos = vehicles.filter(v => v.status === 'vendido');
  const valorInvestidoEstoque = emEstoque.reduce((s, v) => s + meuInvestimento(v), 0);
  const lucroTotal = vendidos.reduce((s, v) => s + meuLucro(v), 0);
  const pendentes = vendidos.filter(v => valorFaltante(v) > 0);
  const valorPendente = pendentes.reduce((s, v) => s + valorFaltante(v), 0);
  const meses = fechamentoMensal(vehicles);
  const maxValor = Math.max(1, ...meses.map(m => Math.max(m.investido, m.lucro)));

  return (
    <div>
      <div className="vx-topbar">
        <div>
          <div className="vx-h1">Fechamento mensal</div>
          <div className="vx-sub">Quanto foi investido, quanto entrou e o lucro de cada mês</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
        <div className="vx-kpi">
          <div className="vx-kpi-label">Em estoque hoje</div>
          <div className="vx-kpi-value">{emEstoque.length}</div>
          <div className="vx-kpi-sub">{fmt(valorInvestidoEstoque)} investidos</div>
        </div>
        <div className="vx-kpi">
          <div className="vx-kpi-label">Lucro total (histórico)</div>
          <div className="vx-kpi-value" style={{ color: lucroTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(lucroTotal)}</div>
          <div className="vx-kpi-sub">{vendidos.length} veículo(s) vendido(s)</div>
        </div>
        <div className="vx-kpi">
          <div className="vx-kpi-label">Pendências a receber</div>
          <div className="vx-kpi-value" style={{ color: valorPendente > 0 ? 'var(--red)' : undefined }}>{fmt(valorPendente)}</div>
          <div className="vx-kpi-sub">{pendentes.length} cliente(s)</div>
        </div>
      </div>

      <div className="vx-card">
        <h3>Lucro por mês</h3>
        {meses.length === 0 ? (
          <div className="vx-empty"><b>Sem vendas fechadas ainda</b>Assim que uma venda for registrada, o mês aparece aqui.</div>
        ) : (
          <>
            <div className="vx-bars">
              {meses.map(m => (
                <div key={m.key} className="vx-bar-group">
                  <div className="vx-bar-pair">
                    <div className="vx-bar" style={{ height: `${(m.investido / maxValor) * 100}%`, background: 'var(--muted)' }} title={`Investido: ${fmt(m.investido)}`} />
                    <div className="vx-bar" style={{ height: `${Math.max(0, (m.lucro / maxValor) * 100)}%`, background: 'var(--brass)' }} title={`Lucro: ${fmt(m.lucro)}`} />
                  </div>
                  <div className="vx-bar-label">{monthLabel(m.key)}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--muted)', borderRadius: 2, marginRight: 5 }} />Investido</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--brass)', borderRadius: 2, marginRight: 5 }} />Lucro</span>
            </div>
          </>
        )}
      </div>

      <div className="vx-card">
        <h3>Fechamento por mês</h3>
        <table className="vx-table">
          <thead><tr><th>Mês</th><th>Veículos vendidos</th><th>Total investido</th><th>Total vendido</th><th>Lucro do mês</th></tr></thead>
          <tbody>
            {meses.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Nenhum fechamento ainda.</td></tr>}
            {[...meses].reverse().map(m => (
              <tr key={m.key}>
                <td><b>{monthLabel(m.key)}</b></td>
                <td>{m.qtd}</td>
                <td>{fmt(m.investido)}</td>
                <td>{fmt(m.vendido)}</td>
                <td style={{ color: m.lucro >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fmt(m.lucro)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
