'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Vehicle, VehicleData, fmt, todayISO, folderName, despesasTotal, custoTotal, lucro, garantiaInfo,
  commissionFor, emptyVehicleData, meuLucro, formatPlaca, Arquivo,
} from '@/lib/veloxis';
import FileUploader from './FileUploader';
import ExtractFromFile from './ExtractFromFile';
import PlateBadge from './PlateBadge';
import FotosDescricao from './FotosDescricao';
import { BUCKET } from '@/lib/fotos';

const up = (s: string) => s.toUpperCase();

type Tab = 'dados' | 'despesas' | 'documentos' | 'venda' | 'arquivos' | 'fotos';

export default function VehicleModal({ vehicle, onClose, onSaved, onDeleted }: { vehicle: Vehicle; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('dados');
  const [v, setV] = useState<Vehicle>(vehicle);
  const [saving, setSaving] = useState(false);

  async function persist(next: Vehicle, historicoEntry?: { acao: string; detalhe: string }) {
    setSaving(true);
    const data: VehicleData = { ...next.data };
    if (historicoEntry) {
      data.historico = [...(data.historico || []), { data: new Date().toISOString(), ...historicoEntry }];
    }
    const updated = { ...next, data };
    const { error } = await supabase.from('vehicles').update({
      status: updated.status,
      placa: updated.placa,
      marca: updated.marca,
      modelo: updated.modelo,
      data_entrada: updated.data_entrada,
      valor_entrada: updated.valor_entrada,
      data: updated.data,
      updated_at: new Date().toISOString(),
    }).eq('id', updated.id);
    setSaving(false);
    if (error) { alert('Erro ao salvar: ' + error.message); return; }
    setV(updated);
    onSaved();
  }

  async function deleteVehicle() {
    const confirmMsg = v.status === 'estoque'
      ? 'Excluir este cadastro definitivamente? Essa ação não pode ser desfeita.'
      : 'Este veículo já foi VENDIDO/DEVOLVIDO. Tem certeza que quer excluir o cadastro inteiro (incluindo o histórico de venda)? Essa ação não pode ser desfeita.';
    if (!confirm(confirmMsg)) return;
    setSaving(true);
    const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
    setSaving(false);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    // Apaga também as fotos e arquivos do Storage, para não sobrar lixo ocupando espaço.
    const paths = [
      ...(v.data.fotos || []).flatMap(f => [f.path, f.thumbPath]),
      ...(v.data.arquivos || []).map(a => a.path),
    ].filter(Boolean);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    onDeleted();
    onClose();
  }

  return (
    <div className="vx-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="vx-modal">
        <div className="vx-modal-head">
          <div>
            <PlateBadge placa={v.placa} size="lg" />
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 8, fontFamily: 'ui-monospace,Menlo,Consolas,monospace' }}>{folderName(v)}</div>
            <div className="vx-sub">{v.status === 'estoque' ? 'Em estoque' : v.status === 'vendido' ? 'Vendido' : 'Devolvido ao estoque'}</div>
          </div>
          <button className="vx-close" onClick={onClose}>✕</button>
        </div>
        <div className="vx-tabs">
          {(['dados', 'despesas', 'documentos', 'venda', 'arquivos', 'fotos'] as Tab[]).map(t => (
            <button key={t} className={`vx-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'dados' ? 'DADOS' : t === 'despesas' ? 'DESPESAS' : t === 'documentos' ? 'DOCUMENTOS' : t === 'venda' ? 'VENDA' : t === 'arquivos' ? 'ARQUIVOS' : 'FOTOS / DESCRIÇÃO'}
            </button>
          ))}
        </div>

        {tab === 'dados' && <TabDados v={v} setV={setV} persist={persist} saving={saving} onDelete={deleteVehicle} />}
        {tab === 'despesas' && <TabDespesas v={v} persist={persist} />}
        {tab === 'documentos' && <TabDocumentos v={v} persist={persist} />}
        {tab === 'venda' && <TabVenda v={v} persist={persist} onSaved={onSaved} />}
        {tab === 'arquivos' && <TabArquivos v={v} persist={persist} />}
        {tab === 'fotos' && <FotosDescricao v={v} persist={persist} />}
      </div>
    </div>
  );
}

function TabDados({ v, setV, persist, saving, onDelete }: { v: Vehicle; setV: (v: Vehicle) => void; persist: (v: Vehicle, h?: { acao: string; detalhe: string }) => void; saving: boolean; onDelete: () => void }) {
  const d = v.data;
  const [local, setLocal] = useState({
    marca: v.marca, modelo: v.modelo, versao: d.versao || '', transmissao: d.transmissao || 'MANUAL',
    anoFabricacao: d.anoFabricacao || '', anoModelo: d.anoModelo || '', cor: d.cor || '', km: d.km || '',
    placa: v.placa, renavam: d.renavam || '', chassi: d.chassi || '', cidade: d.cidade || '',
    dataEntrada: v.data_entrada, valorEntrada: v.valor_entrada, comissao: d.comissaoLoja,
    propSituacao: d.propriedade.situacao, propDetalhe: d.propriedade.detalhe || '',
    temSocio: d.propriedade.temSocio || false, nomeSocio: d.propriedade.nomeSocio || '', percentualSocio: d.propriedade.percentualSocio || 0,
    apNome: d.antigoProprietario.nome || '', apCpf: d.antigoProprietario.cpf || '', apRg: d.antigoProprietario.rg || '',
    apTelefone: d.antigoProprietario.telefone || '', apEmail: d.antigoProprietario.email || '', apEndereco: d.antigoProprietario.endereco || '',
  });

  function field<K extends keyof typeof local>(key: K, val: typeof local[K]) {
    setLocal(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    const next: Vehicle = {
      ...v,
      marca: local.marca, modelo: local.modelo, placa: local.placa,
      data_entrada: local.dataEntrada, valor_entrada: Number(local.valorEntrada) || 0,
      data: {
        ...d,
        versao: local.versao, transmissao: local.transmissao, anoFabricacao: local.anoFabricacao, anoModelo: local.anoModelo,
        cor: local.cor, km: local.km, renavam: local.renavam, chassi: local.chassi, cidade: local.cidade,
        comissaoLoja: Number(local.comissao) || 0,
        propriedade: {
          situacao: local.propSituacao, detalhe: local.propDetalhe,
          temSocio: local.temSocio, nomeSocio: local.nomeSocio, percentualSocio: Number(local.percentualSocio) || 0,
        },
        antigoProprietario: { nome: local.apNome, cpf: local.apCpf, rg: local.apRg, telefone: local.apTelefone, email: local.apEmail, endereco: local.apEndereco },
      },
    };
    setV(next);
    persist(next, { acao: 'EDIÇÃO', detalhe: 'DADOS DO VEÍCULO ATUALIZADOS.' });
  }

  return (
    <div>
      <div className="vx-card">
        <h3>Dados do veículo</h3>
        <div className="vx-fieldgrid">
          <div className="vx-field"><label>Marca</label><input className="vx-input" value={local.marca} onChange={e => field('marca', up(e.target.value))} /></div>
          <div className="vx-field"><label>Modelo</label><input className="vx-input" value={local.modelo} onChange={e => field('modelo', up(e.target.value))} /></div>
          <div className="vx-field"><label>Versão</label><input className="vx-input" value={local.versao} onChange={e => field('versao', up(e.target.value))} /></div>
          <div className="vx-field">
            <label>Transmissão</label>
            <select className="vx-input" value={local.transmissao} onChange={e => field('transmissao', e.target.value)}>
              <option value="MANUAL">MANUAL</option>
              <option value="AUTOMÁTICO">AUTOMÁTICO</option>
            </select>
          </div>
          <div className="vx-field"><label>Ano de fabricação</label><input className="vx-input" value={local.anoFabricacao} onChange={e => field('anoFabricacao', e.target.value)} /></div>
          <div className="vx-field"><label>Ano modelo</label><input className="vx-input" value={local.anoModelo} onChange={e => field('anoModelo', e.target.value)} /></div>
          <div className="vx-field"><label>Cor</label><input className="vx-input" value={local.cor} onChange={e => field('cor', up(e.target.value))} /></div>
          <div className="vx-field"><label>KM</label><input className="vx-input" value={local.km} onChange={e => field('km', e.target.value)} /></div>
          <div className="vx-field"><label>Placa</label><input className="vx-input" value={local.placa} onChange={e => field('placa', formatPlaca(e.target.value))} maxLength={8} /></div>
          <div className="vx-field"><label>Renavam</label><input className="vx-input" value={local.renavam} onChange={e => field('renavam', up(e.target.value))} /></div>
          <div className="vx-field"><label>Chassi</label><input className="vx-input" value={local.chassi} onChange={e => field('chassi', up(e.target.value))} /></div>
          <div className="vx-field"><label>Cidade</label><input className="vx-input" value={local.cidade} onChange={e => field('cidade', up(e.target.value))} /></div>
          <div className="vx-field"><label>Data de entrada</label><input className="vx-input" type="date" value={local.dataEntrada} onChange={e => field('dataEntrada', e.target.value)} /></div>
          <div className="vx-field"><label>Valor de entrada (R$)</label><input className="vx-input" type="number" step="0.01" value={local.valorEntrada} onChange={e => field('valorEntrada', Number(e.target.value))} /></div>
          <div className="vx-field"><label>Comissão da loja (R$)</label><input className="vx-input" type="number" step="0.01" value={local.comissao} onChange={e => field('comissao', Number(e.target.value))} /></div>
        </div>
      </div>
      <div className="vx-card">
        <h3>Dados do antigo proprietário (vendedor)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>Nome</label><input className="vx-input" value={local.apNome} onChange={e => field('apNome', up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>CPF</label><input className="vx-input" value={local.apCpf} onChange={e => field('apCpf', up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>RG</label><input className="vx-input" value={local.apRg} onChange={e => field('apRg', up(e.target.value))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>E-mail</label><input className="vx-input" value={local.apEmail} onChange={e => field('apEmail', up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>Telefone</label><input className="vx-input" value={local.apTelefone} onChange={e => field('apTelefone', up(e.target.value))} /></div>
          </div>
          <div className="vx-field"><label>Endereço</label><input className="vx-input" value={local.apEndereco} onChange={e => field('apEndereco', up(e.target.value))} /></div>
        </div>
      </div>
      <div className="vx-card">
        <h3>Situação de propriedade</h3>
        <div className="vx-fieldgrid">
          <div className="vx-field">
            <label>Em nome de</label>
            <select className="vx-input" value={local.propSituacao} onChange={e => field('propSituacao', e.target.value)}>
              <option value="titular">EU (TITULAR)</option>
              <option value="outra_pessoa">OUTRA PESSOA</option>
              <option value="procuracao">PROCURAÇÃO</option>
              <option value="antigo_proprietario">ANTIGO PROPRIETÁRIO</option>
            </select>
          </div>
          <div className="vx-field"><label>Detalhe</label><input className="vx-input" value={local.propDetalhe} onChange={e => field('propDetalhe', up(e.target.value))} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={local.temSocio} onChange={e => field('temSocio', e.target.checked)} /> ESTE VEÍCULO TEM SÓCIO (não é só meu)
          </label>
          {local.temSocio && (
            <div className="vx-fieldgrid">
              <div className="vx-field"><label>Nome do sócio</label><input className="vx-input" value={local.nomeSocio} onChange={e => field('nomeSocio', up(e.target.value))} /></div>
              <div className="vx-field"><label>Porcentagem da sociedade (%)</label><input className="vx-input" type="number" step="1" value={local.percentualSocio} onChange={e => field('percentualSocio', Number(e.target.value))} /></div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="vx-btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar alterações'}</button>
        <button className="vx-btn danger" onClick={onDelete} disabled={saving}>Excluir cadastro</button>
      </div>
    </div>
  );
}

function TabDespesas({ v, persist }: { v: Vehicle; persist: (v: Vehicle, h?: { acao: string; detalhe: string }) => void }) {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(todayISO());
  const [descricao, setDescricao] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function startEdit(i: number) {
    const d = v.data.despesas[i];
    setEditingIndex(i);
    setValor(String(d.valor));
    setData(d.data);
    setDescricao(d.item);
  }
  function cancelEdit() {
    setEditingIndex(null);
    setValor(''); setDescricao(''); setData(todayISO());
  }

  function saveDespesa() {
    if (!descricao.trim()) { alert('Informe a descrição da despesa.'); return; }
    const registro = { item: descricao.toUpperCase(), valor: parseFloat(valor) || 0, data, descricao: descricao.toUpperCase() };
    if (editingIndex !== null) {
      const despesas = v.data.despesas.map((d, idx) => idx === editingIndex ? registro : d);
      const next: Vehicle = { ...v, data: { ...v.data, despesas } };
      persist(next, { acao: 'DESPESA EDITADA', detalhe: `Editado: ${registro.item} (${fmt(registro.valor)})` });
    } else {
      const next: Vehicle = { ...v, data: { ...v.data, despesas: [...v.data.despesas, registro] } };
      persist(next, { acao: 'DESPESA', detalhe: `Adicionado: ${registro.item} (${fmt(registro.valor)})` });
    }
    cancelEdit();
  }
  function delDespesa(i: number) {
    const next: Vehicle = { ...v, data: { ...v.data, despesas: v.data.despesas.filter((_, idx) => idx !== i) } };
    persist(next);
    if (editingIndex === i) cancelEdit();
  }

  return (
    <div>
      <div className="vx-card">
        <h3>Despesas do veículo</h3>
        {v.status === 'vendido' && <div className="vx-note" style={{ marginBottom: 12 }}>VEÍCULO JÁ VENDIDO — DESPESAS ADICIONADAS AQUI CONTAM COMO CUSTO DE GARANTIA E REDUZEM O LUCRO.</div>}
        <table className="vx-table">
          <thead><tr><th>Valor</th><th>Descrição</th><th>Data</th><th></th></tr></thead>
          <tbody>
            <tr><td>{fmt(v.data.comissaoLoja)}</td><td>COMISSÃO DA LOJA (FIXO POR ORIGEM {v.origem.toUpperCase()})</td><td>-</td><td></td></tr>
            {v.data.despesas.map((d, i) => (
              <tr key={i} style={editingIndex === i ? { background: 'var(--surface2)' } : undefined}>
                <td>{fmt(d.valor)}</td><td>{d.item}</td><td>{d.data}</td>
                <td style={{ display: 'flex', gap: 4 }}>
                  <button className="vx-iconbtn" onClick={() => startEdit(i)} title="Editar">✎</button>
                  <button className="vx-iconbtn" onClick={() => delDespesa(i)} title="Excluir">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="vx-total-line"><span>Despesa total</span><span>{fmt(despesasTotal(v))}</span></div>
        <div className="vx-total-line" style={{ borderTop: 'none', paddingTop: 0 }}><span>Custo atual</span><span>{fmt(custoTotal(v))}</span></div>
      </div>
      <div className="vx-card">
        <h3>{editingIndex !== null ? 'Editar despesa' : 'Adicionar despesa'}</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="vx-field" style={{ flex: '1 1 160px' }}><label>Valor (R$)</label><input className="vx-input" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} /></div>
          <div className="vx-field" style={{ flex: '1.5 1 240px' }}><label>Descrição</label><input className="vx-input" value={descricao} onChange={e => setDescricao(e.target.value)} /></div>
          <div className="vx-field" style={{ flex: '1 1 160px' }}><label>Data</label><input className="vx-input" type="date" value={data} onChange={e => setData(e.target.value)} /></div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="vx-btn" onClick={saveDespesa}>{editingIndex !== null ? 'Salvar edição' : '+ Adicionar'}</button>
          {editingIndex !== null && <button className="vx-btn secondary" onClick={cancelEdit}>Cancelar edição</button>}
        </div>
      </div>

      <IpvaSection v={v} persist={persist} />
    </div>
  );
}

function IpvaSection({ v, persist }: { v: Vehicle; persist: (v: Vehicle, h?: { acao: string; detalhe: string }) => void }) {
  const jaTemIpva = (v.data.ipva || []).some(p => p.pago || Number(p.valor) > 0);
  const [ativo, setAtivo] = useState(jaTemIpva);

  return (
    <div className="vx-card">
      <h3>IPVA</h3>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
        <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)} /> ATIVAR CONTROLE DE IPVA DESTE VEÍCULO
      </label>
      {!ativo && <div className="vx-note" style={{ marginTop: 10 }}>Ative para lançar as parcelas do IPVA. Ao marcar uma parcela como paga e salvar, o valor entra automaticamente nas despesas acima.</div>}
      {ativo && <IpvaBlock v={v} persist={persist} />}
    </div>
  );
}

function IpvaBlock({ v, persist }: { v: Vehicle; persist: (v: Vehicle, h?: { acao: string; detalhe: string }) => void }) {
  const [parcelas, setParcelas] = useState(v.data.ipva.length ? v.data.ipva : [1, 2, 3, 4, 5].map(n => ({ numero: n, valor: 0, data: '', pago: false })));

  function update(i: number, patch: Partial<typeof parcelas[0]>) {
    setParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  }
  function save() {
    // remove despesas de IPVA lançadas automaticamente antes, e relança conforme o que está marcado como pago agora
    const semIpvaAntigo = v.data.despesas.filter(d => !d.item.startsWith('IPVA - PARCELA'));
    const novasIpvaDespesas = parcelas
      .filter(p => p.pago && Number(p.valor) > 0)
      .map(p => ({
        item: `IPVA - PARCELA ${p.numero}`,
        valor: Number(p.valor) || 0,
        data: p.data || todayISO(),
        descricao: 'LANÇADO AUTOMATICAMENTE AO MARCAR O IPVA COMO PAGO',
      }));
    const next: Vehicle = { ...v, data: { ...v.data, ipva: parcelas, despesas: [...semIpvaAntigo, ...novasIpvaDespesas] } };
    persist(next, { acao: 'IPVA', detalhe: 'IPVA ATUALIZADO — PARCELAS PAGAS LANÇADAS EM DESPESAS.' });
  }

  return (
    <div style={{ marginTop: 14 }}>
      <table className="vx-table">
        <thead><tr><th>Parcela</th><th>Valor</th><th>Data</th><th>Pago</th></tr></thead>
        <tbody>
          {parcelas.map((p, i) => (
            <tr key={i}>
              <td>{p.numero}ª</td>
              <td><input className="vx-input" type="number" step="0.01" style={{ width: 100 }} value={p.valor} onChange={e => update(i, { valor: Number(e.target.value) })} /></td>
              <td><input className="vx-input" type="date" value={p.data} onChange={e => update(i, { data: e.target.value })} /></td>
              <td><input type="checkbox" checked={p.pago} onChange={e => update(i, { pago: e.target.checked })} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="vx-btn" style={{ marginTop: 14 }} onClick={save}>Salvar IPVA</button>
    </div>
  );
}

function TabDocumentos({ v, persist }: { v: Vehicle; persist: (v: Vehicle) => void }) {
  const tipos = [
    'CNH DO PROPRIETÁRIO',
    'COMPROVANTE DE ENDEREÇO',
    'DOCUMENTO DO VEÍCULO',
    'OUTRO',
    'PDF DA SAÍDA (LOJA)',
    'PDF DE ENTRADA (LOJA)',
    'PESQUISA DETRAN',
    'PESQUISA DO VEÍCULO',
    'RECIBO DO VEÍCULO',
    'TRANSFERÊNCIA BANCÁRIA',
    'VISTORIA CAUTELAR',
    'VISTORIA DE TRANSFERÊNCIA',
  ];
  const [tipo, setTipo] = useState(tipos[0]);
  const [link, setLink] = useState('');

  function add() {
    const next: Vehicle = { ...v, data: { ...v.data, documentos: [...v.data.documentos, { tipo, link }] } };
    persist(next);
    setLink('');
  }
  function del(i: number) {
    const next: Vehicle = { ...v, data: { ...v.data, documentos: v.data.documentos.filter((_, idx) => idx !== i) } };
    persist(next);
  }

  return (
    <div>
      <div className="vx-card">
        <h3>Documentos do veículo</h3>
        <div className="vx-note" style={{ marginBottom: 12 }}>Guardamos apenas anotações e links (ex: pasta do Google Drive) — para enviar o arquivo de verdade, use a aba Arquivos.</div>
        <table className="vx-table">
          <thead><tr><th>Tipo</th><th>Link</th><th></th></tr></thead>
          <tbody>
            {v.data.documentos.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--muted)' }}>Nenhum documento anotado ainda.</td></tr>}
            {v.data.documentos.map((doc, i) => (
              <tr key={i}>
                <td>{doc.tipo}</td>
                <td>{doc.link && <a href={doc.link} target="_blank" rel="noopener">{doc.link}</a>}</td>
                <td><button className="vx-iconbtn" onClick={() => del(i)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="vx-card">
        <h3>Anotar documento</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="vx-field" style={{ flex: '1 1 160px' }}>
            <label>Tipo</label>
            <select className="vx-input" value={tipo} onChange={e => setTipo(e.target.value)}>
              {tipos.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="vx-field" style={{ flex: '1.5 1 240px' }}><label>Link (opcional)</label><input className="vx-input" value={link} onChange={e => setLink(e.target.value)} /></div>
        </div>
        <button className="vx-btn" style={{ marginTop: 12 }} onClick={add}>+ Adicionar</button>
      </div>
    </div>
  );
}

function TabVenda({ v, persist, onSaved }: { v: Vehicle; persist: (v: Vehicle, h?: { acao: string; detalhe: string }) => void; onSaved: () => void }) {
  const supabase = createClient();
  const venda = v.data.venda;
  const [colado, setColado] = useState('');

  const [nome, setNome] = useState(venda?.comprador.nome || '');
  const [cpf, setCpf] = useState(venda?.comprador.cpf || '');
  const [rg, setRg] = useState(venda?.comprador.rg || '');
  const [tel, setTel] = useState(venda?.comprador.telefone || '');
  const [email, setEmail] = useState(venda?.comprador.email || '');
  const [endereco, setEndereco] = useState(venda?.comprador.endereco || '');
  const [dataVenda, setDataVenda] = useState(venda?.dataVenda || todayISO());
  const [valorVenda, setValorVenda] = useState(String(venda?.valorVenda || ''));
  const [parcelas, setParcelas] = useState<{ valor: number; data: string; pago?: boolean }[]>(venda?.parcelasFaltante || []);
  const [repasse, setRepasse] = useState(venda?.metodoRepasse || false);
  const [pValor, setPValor] = useState('');
  const [pData, setPData] = useState('');
  const [trocaCheck, setTrocaCheck] = useState(false);
  const [trocaTipo, setTrocaTipo] = useState('troca_carro');
  const [trocaMarca, setTrocaMarca] = useState('');
  const [trocaModelo, setTrocaModelo] = useState('');
  const [trocaPlaca, setTrocaPlaca] = useState('');
  const [trocaRenavam, setTrocaRenavam] = useState('');
  const [trocaCor, setTrocaCor] = useState('');
  const [trocaAnoFab, setTrocaAnoFab] = useState('');
  const [trocaAnoMod, setTrocaAnoMod] = useState('');
  const [trocaKm, setTrocaKm] = useState('');
  const [trocaCidade, setTrocaCidade] = useState('');
  const [trocaValor, setTrocaValor] = useState('');
  const [trocaMesmoComprador, setTrocaMesmoComprador] = useState(true);

  const valorFaltanteTotal = parcelas.filter(p => !p.pago).reduce((s, p) => s + Number(p.valor || 0), 0);

  function addParcela() {
    if (!pValor || !pData) { alert('Informe o valor e a data da parcela.'); return; }
    setParcelas(prev => [...prev, { valor: parseFloat(pValor) || 0, data: pData, pago: false }]);
    setPValor(''); setPData('');
  }
  function delParcela(i: number) {
    setParcelas(prev => prev.filter((_, idx) => idx !== i));
  }
  function togglePago(i: number) {
    const novasParcelas = parcelas.map((p, idx) => idx === i ? { ...p, pago: !p.pago } : p);
    setParcelas(novasParcelas);
    if (v.status === 'vendido' && venda) {
      const novoTotal = novasParcelas.filter(p => !p.pago).reduce((s, p) => s + Number(p.valor || 0), 0);
      const novaVenda = {
        comprador: { nome, cpf, rg, telefone: tel, email, endereco },
        dataVenda: dataVenda || venda.dataVenda || todayISO(),
        valorVenda: parseFloat(valorVenda) || 0,
        valorFaltante: novoTotal,
        parcelasFaltante: novasParcelas,
        metodoRepasse: repasse,
      };
      const next: Vehicle = { ...v, data: { ...v.data, venda: novaVenda } };
      persist(next, { acao: 'PARCELA ATUALIZADA', detalhe: `Parcela ${i + 1} marcada como ${novasParcelas[i].pago ? 'PAGA' : 'NÃO PAGA'}.` });
    }
  }

  async function confirmarVenda() {
    if (!nome.trim()) { alert('Informe o nome do comprador.'); return; }
    const novaVenda = {
      comprador: { nome, cpf, rg, telefone: tel, email, endereco },
      dataVenda: dataVenda || todayISO(),
      valorVenda: parseFloat(valorVenda) || 0,
      valorFaltante: valorFaltanteTotal,
      parcelasFaltante: parcelas,
      metodoRepasse: repasse,
    };
    const next: Vehicle = { ...v, status: 'vendido', data: { ...v.data, venda: novaVenda } };
    persist(next, { acao: 'VENDA', detalhe: `VENDIDO PARA ${nome} POR ${fmt(novaVenda.valorVenda)}.` });

    if (trocaCheck) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('vehicles').insert({
        created_by: user?.id,
        status: 'estoque',
        origem: trocaTipo,
        placa: trocaPlaca,
        marca: trocaMarca,
        modelo: trocaModelo,
        data_entrada: novaVenda.dataVenda,
        valor_entrada: parseFloat(trocaValor) || 0,
        data: {
          ...emptyVehicleData(),
          anoFabricacao: trocaAnoFab, anoModelo: trocaAnoMod, cor: trocaCor, km: trocaKm,
          renavam: trocaRenavam, cidade: trocaCidade || v.data.cidade,
          comissaoLoja: commissionFor(trocaTipo),
          propriedade: { situacao: 'antigo_proprietario', detalhe: '', temSocio: false, nomeSocio: '', percentualSocio: 0 },
          antigoProprietario: trocaMesmoComprador
            ? { nome, cpf, telefone: tel, rg: '', email: '', endereco: '' }
            : {},
          historico: [{ data: new Date().toISOString(), acao: 'CADASTRO (TROCA)', detalhe: `RECEBIDO NA TROCA DA VENDA DO VEÍCULO ${v.placa}.` }],
        },
      });
      onSaved();
    }
  }

  function handleExtractedVenda(d: any) {
    if (d.nome) setNome(up(d.nome));
    if (d.cpf) setCpf(up(d.cpf));
    if (d.rg) setRg(up(d.rg));
    if (d.telefone) setTel(up(d.telefone));
    if (d.email) setEmail(up(d.email));
    if (d.endereco) setEndereco(up(d.endereco));
    if (d.dataVenda) setDataVenda(d.dataVenda);
    if (d.valorVenda) setValorVenda(String(d.valorVenda));
  }

  function desfazerVenda() {
    if (!confirm('Desfazer a venda e devolver este veículo ao estoque?')) return;
    const next: Vehicle = { ...v, status: 'estoque', data: { ...v.data, venda: null } };
    persist(next, { acao: 'VENDA DESFEITA', detalhe: `VENDA PARA ${venda?.comprador.nome || ''} CANCELADA/DEVOLVIDA.` });
  }

  function salvarEdicaoVenda() {
    const novaVenda = {
      comprador: { nome, cpf, rg, telefone: tel, email, endereco },
      dataVenda: dataVenda || venda?.dataVenda || todayISO(),
      valorVenda: parseFloat(valorVenda) || 0,
      valorFaltante: valorFaltanteTotal,
      parcelasFaltante: parcelas,
      metodoRepasse: repasse,
    };
    const next: Vehicle = { ...v, data: { ...v.data, venda: novaVenda } };
    persist(next, { acao: 'VENDA EDITADA', detalhe: 'DADOS DA VENDA ATUALIZADOS.' });
  }

  const temSocio = v.data.propriedade?.temSocio;

  if (v.status === 'vendido' && venda) {
    const g = garantiaInfo(v);
    const pct = g ? Math.max(0, Math.min(100, (g.diasRestantes / 90) * 100)) : 0;
    const lucroTotalVal = lucro(v);
    const lucroMeuVal = meuLucro(v);
    return (
      <>
      <div className="vx-card">
        <h3>Dados da venda</h3>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
          {repasse ? (
            <div className="vx-note">VENDA POR REPASSE — NÃO ENTRA NO CONTROLE DE GARANTIA.</div>
          ) : (
            <>
              <div className="vx-ring-wrap">
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--surface2)" strokeWidth="6" />
                  <circle cx="28" cy="28" r="24" fill="none" stroke={g?.ativa ? 'var(--amber)' : 'var(--muted)'} strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - pct / 100)} strokeLinecap="round" />
                </svg>
                <div className="vx-ring-label">{g ? (g.ativa ? g.diasRestantes + 'd' : '0d') : '-'}</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{g?.ativa ? 'GARANTIA EM VIGOR' : 'GARANTIA EXPIRADA'}</div>
                <div className="vx-sub">3 MESES A PARTIR DE {venda.dataVenda}</div>
              </div>
            </>
          )}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 14 }}>
          <input type="checkbox" checked={repasse} onChange={e => setRepasse(e.target.checked)} /> VENDIDO POR REPASSE (não entra na aba de garantia)
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>Nome</label><input className="vx-input" value={nome} onChange={e => setNome(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>CPF</label><input className="vx-input" value={cpf} onChange={e => setCpf(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>RG</label><input className="vx-input" value={rg} onChange={e => setRg(up(e.target.value))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>E-mail</label><input className="vx-input" value={email} onChange={e => setEmail(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>Telefone</label><input className="vx-input" value={tel} onChange={e => setTel(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>Data da venda</label><input className="vx-input" type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} /></div>
          </div>
          <div className="vx-field"><label>Endereço</label><input className="vx-input" value={endereco} onChange={e => setEndereco(up(e.target.value))} /></div>
          <div className="vx-field" style={{ flex: '0.6 1 96px', maxWidth: 200 }}><label>Valor de venda (R$)</label><input className="vx-input" type="number" step="0.01" value={valorVenda} onChange={e => setValorVenda(e.target.value)} /></div>
        </div>

        <ParcelasFaltante parcelas={parcelas} pValor={pValor} setPValor={setPValor} pData={pData} setPData={setPData} addParcela={addParcela} delParcela={delParcela} togglePago={togglePago} total={valorFaltanteTotal} />

        <div className="vx-total-line"><span>Lucro total apurado</span><span style={{ color: lucroTotalVal >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(lucroTotalVal)}</span></div>
        {temSocio && (
          <div className="vx-total-line" style={{ borderTop: 'none', paddingTop: 0 }}>
            <span>Seu lucro (após sociedade de {v.data.propriedade.percentualSocio}% com {v.data.propriedade.nomeSocio?.toUpperCase() || 'SÓCIO'})</span>
            <span style={{ color: lucroMeuVal >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(lucroMeuVal)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button className="vx-btn" onClick={salvarEdicaoVenda}>Salvar alterações</button>
          <button className="vx-btn danger" onClick={desfazerVenda}>Desfazer venda / cliente devolveu</button>
        </div>
      </div>

      <div className="vx-card">
        <h3>Arquivos da venda</h3>
        <div className="vx-note" style={{ marginBottom: 12 }}>Recibo de venda, contrato, comprovante de transferência — envie aqui.</div>
        <FileUploader vehicleId={v.id} arquivos={v.data.arquivos || []} contexto="VENDA" onChange={arqs => persist({ ...v, data: { ...v.data, arquivos: arqs } })} />
      </div>
    </>
    );
  }

  return (
    <div>
      <div className="vx-card">
        <h3>Arquivos da venda</h3>
        <div className="vx-note" style={{ marginBottom: 12 }}>Recibo de venda, contrato, comprovante — envie aqui, mesmo antes de confirmar a venda.</div>
        <FileUploader vehicleId={v.id} arquivos={v.data.arquivos || []} contexto="VENDA" onChange={arqs => persist({ ...v, data: { ...v.data, arquivos: arqs } })} />
        <ExtractFromFile tipo="venda" onExtracted={handleExtractedVenda} />
      </div>
      <div className="vx-card">
        <h3>Colar informações (rascunho)</h3>
        <div className="vx-hint">Cole aqui qualquer texto — depois é só copiar e colar nos campos que quiser. Não fica salvo.</div>
        <textarea className="vx-input" style={{ minHeight: 90 }} value={colado} onChange={e => setColado(e.target.value)} placeholder="Cole aqui uma mensagem, anúncio, dados do comprador..." />
      </div>
      <div className="vx-card">
        <h3>Dados do novo proprietário (comprador)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>Nome</label><input className="vx-input" value={nome} onChange={e => setNome(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>CPF</label><input className="vx-input" value={cpf} onChange={e => setCpf(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>RG</label><input className="vx-input" value={rg} onChange={e => setRg(up(e.target.value))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>E-mail</label><input className="vx-input" value={email} onChange={e => setEmail(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>Telefone</label><input className="vx-input" value={tel} onChange={e => setTel(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>Data da venda</label><input className="vx-input" type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} /></div>
          </div>
          <div className="vx-field"><label>Endereço</label><input className="vx-input" value={endereco} onChange={e => setEndereco(up(e.target.value))} /></div>
          <div className="vx-field" style={{ flex: '0.6 1 96px', maxWidth: 200 }}><label>Valor de venda (R$)</label><input className="vx-input" type="number" step="0.01" value={valorVenda} onChange={e => setValorVenda(e.target.value)} /></div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginTop: 12 }}>
          <input type="checkbox" checked={repasse} onChange={e => setRepasse(e.target.checked)} /> VENDIDO POR REPASSE (não entra na aba de garantia)
        </label>
      </div>

      <ParcelasFaltante parcelas={parcelas} pValor={pValor} setPValor={setPValor} pData={pData} setPData={setPData} addParcela={addParcela} delParcela={delParcela} total={valorFaltanteTotal} />

      <div className="vx-card">
        <h3>Recebeu veículo/moto na troca?</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 10 }}>
          <input type="checkbox" checked={trocaCheck} onChange={e => setTrocaCheck(e.target.checked)} /> SIM, HOUVE TROCA
        </label>
        {trocaCheck && (
          <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={trocaMesmoComprador} onChange={e => setTrocaMesmoComprador(e.target.checked)} /> O VEÍCULO DA TROCA ESTÁ NO MESMO NOME DO COMPRADOR ACIMA (preenche sozinho o antigo proprietário)
          </label>
          <div className="vx-fieldgrid">
            <div className="vx-field">
              <label>Tipo</label>
              <select className="vx-input" value={trocaTipo} onChange={e => setTrocaTipo(e.target.value)}>
                <option value="troca_carro">CARRO</option>
                <option value="troca_moto">MOTO</option>
              </select>
            </div>
            <div className="vx-field"><label>Marca</label><input className="vx-input" value={trocaMarca} onChange={e => setTrocaMarca(up(e.target.value))} /></div>
            <div className="vx-field"><label>Modelo</label><input className="vx-input" value={trocaModelo} onChange={e => setTrocaModelo(up(e.target.value))} /></div>
            <div className="vx-field"><label>Placa</label><input className="vx-input" value={trocaPlaca} onChange={e => setTrocaPlaca(formatPlaca(e.target.value))} maxLength={8} /></div>
            <div className="vx-field"><label>Renavam</label><input className="vx-input" value={trocaRenavam} onChange={e => setTrocaRenavam(up(e.target.value))} /></div>
            <div className="vx-field"><label>Cor</label><input className="vx-input" value={trocaCor} onChange={e => setTrocaCor(up(e.target.value))} /></div>
            <div className="vx-field"><label>Ano de fabricação</label><input className="vx-input" value={trocaAnoFab} onChange={e => setTrocaAnoFab(e.target.value)} /></div>
            <div className="vx-field"><label>Ano modelo</label><input className="vx-input" value={trocaAnoMod} onChange={e => setTrocaAnoMod(e.target.value)} /></div>
            <div className="vx-field"><label>KM</label><input className="vx-input" value={trocaKm} onChange={e => setTrocaKm(e.target.value)} /></div>
            <div className="vx-field"><label>Cidade</label><input className="vx-input" value={trocaCidade} onChange={e => setTrocaCidade(up(e.target.value))} /></div>
            <div className="vx-field"><label>Valor avaliado (R$)</label><input className="vx-input" type="number" step="0.01" value={trocaValor} onChange={e => setTrocaValor(e.target.value)} /></div>
          </div>
          </>
        )}
      </div>
      <button className="vx-btn" onClick={confirmarVenda}>Confirmar venda</button>
    </div>
  );
}

function ParcelasFaltante({ parcelas, pValor, setPValor, pData, setPData, addParcela, delParcela, togglePago, total }: {
  parcelas: { valor: number; data: string; pago?: boolean }[]; pValor: string; setPValor: (s: string) => void;
  pData: string; setPData: (s: string) => void; addParcela: () => void; delParcela: (i: number) => void;
  togglePago?: (i: number) => void; total: number;
}) {
  return (
    <div className="vx-card">
      <h3>Valor faltante (em quantas vezes e quando)</h3>
      <table className="vx-table">
        <thead><tr><th>#</th><th>Valor</th><th>Data combinada</th><th>Paga</th><th></th></tr></thead>
        <tbody>
          {parcelas.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--muted)' }}>Nenhuma parcela pendente — venda já quitada ou não usa este controle.</td></tr>}
          {parcelas.map((p, i) => (
            <tr key={i} style={p.pago ? { opacity: 0.5 } : undefined}>
              <td>{i + 1}ª</td><td>{fmt(p.valor)}</td><td>{p.data}</td>
              <td>
                <input type="checkbox" checked={!!p.pago} onChange={() => togglePago && togglePago(i)} disabled={!togglePago} />
              </td>
              <td><button className="vx-iconbtn" onClick={() => delParcela(i)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="vx-total-line"><span>Total faltante (não pago)</span><span>{fmt(total)}</span></div>
      <div className="vx-fieldgrid" style={{ marginTop: 12 }}>
        <div className="vx-field"><label>Valor da parcela (R$)</label><input className="vx-input" type="number" step="0.01" value={pValor} onChange={e => setPValor(e.target.value)} /></div>
        <div className="vx-field"><label>Data combinada</label><input className="vx-input" type="date" value={pData} onChange={e => setPData(e.target.value)} /></div>
      </div>
      <button className="vx-btn" style={{ marginTop: 10 }} onClick={addParcela}>+ Adicionar parcela</button>
    </div>
  );
}

function TabArquivos({ v, persist }: { v: Vehicle; persist: (v: Vehicle) => void }) {
  const arquivos = v.data.arquivos || [];
  function handleChange(novos: Arquivo[]) {
    persist({ ...v, data: { ...v.data, arquivos: novos } });
  }
  return (
    <div className="vx-card">
      <h3>Todos os arquivos do veículo</h3>
      <div className="vx-note" style={{ marginBottom: 12 }}>Envie aqui qualquer PDF ou foto: documento do veículo, CNH, comprovante, recibo, o que você tiver em mãos. Tudo o que for enviado nesta aba, ou na aba Venda, aparece junto aqui.</div>
      <FileUploader vehicleId={v.id} arquivos={arquivos} contexto="GERAL" onChange={handleChange} showContextoBadge />
    </div>
  );
}

