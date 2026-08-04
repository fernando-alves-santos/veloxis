'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { commissionFor, emptyVehicleData, formatPlaca, todayISO, Arquivo } from '@/lib/veloxis';
import FileUploader from './FileUploader';
import ExtractFromFile from './ExtractFromFile';

const up = (s: string) => s.toUpperCase();

export default function NovoVeiculoForm({ onDone }: { onDone: () => void }) {
  const supabase = createClient();
  const [vehicleId] = useState(() => crypto.randomUUID());
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [origem, setOrigem] = useState('compra');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [versao, setVersao] = useState('');
  const [transmissao, setTransmissao] = useState('MANUAL');
  const [anoFabricacao, setAnoFabricacao] = useState('');
  const [anoModelo, setAnoModelo] = useState('');
  const [cor, setCor] = useState('');
  const [km, setKm] = useState('');
  const [placa, setPlaca] = useState('');
  const [renavam, setRenavam] = useState('');
  const [chassi, setChassi] = useState('');
  const [cidade, setCidade] = useState('');
  const [dataEntrada, setDataEntrada] = useState(todayISO());
  const [valorEntrada, setValorEntrada] = useState('');
  const [propriedade, setPropriedade] = useState('titular');
  const [propDetalhe, setPropDetalhe] = useState('');
  const [temSocio, setTemSocio] = useState(false);
  const [nomeSocio, setNomeSocio] = useState('');
  const [percentualSocio, setPercentualSocio] = useState('');
  const [apNome, setApNome] = useState('');
  const [apCpf, setApCpf] = useState('');
  const [apRg, setApRg] = useState('');
  const [apTelefone, setApTelefone] = useState('');
  const [apEmail, setApEmail] = useState('');
  const [apEndereco, setApEndereco] = useState('');
  const [comissao, setComissao] = useState(1200);
  const [colado, setColado] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleExtracted(d: any) {
    if (d.marca) setMarca(up(d.marca));
    if (d.modelo) setModelo(up(d.modelo));
    if (d.versao) setVersao(up(d.versao));
    if (d.transmissao) setTransmissao(up(d.transmissao) === 'AUTOMÁTICO' || up(d.transmissao) === 'AUTOMATICO' ? 'AUTOMÁTICO' : 'MANUAL');
    if (d.anoFabricacao) setAnoFabricacao(String(d.anoFabricacao));
    if (d.anoModelo) setAnoModelo(String(d.anoModelo));
    if (d.cor) setCor(up(d.cor));
    if (d.km) setKm(String(d.km));
    if (d.placa) setPlaca(formatPlaca(d.placa));
    if (d.renavam) setRenavam(up(d.renavam));
    if (d.chassi) setChassi(up(d.chassi));
    if (d.cidade) setCidade(up(d.cidade));
    if (d.dataEntrada) setDataEntrada(d.dataEntrada);
    if (d.valorEntrada) setValorEntrada(String(d.valorEntrada));
    const ap = d.antigoProprietario || {};
    if (ap.nome) setApNome(up(ap.nome));
    if (ap.cpf) setApCpf(up(ap.cpf));
    if (ap.rg) setApRg(up(ap.rg));
    if (ap.telefone) setApTelefone(up(ap.telefone));
    if (ap.email) setApEmail(up(ap.email));
    if (ap.endereco) setApEndereco(up(ap.endereco));
  }

  async function handleSave() {
    if (!placa.trim()) { setError('Informe ao menos a placa do veículo.'); return; }
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    const vehicleData = emptyVehicleData();
    vehicleData.versao = versao;
    vehicleData.transmissao = transmissao;
    vehicleData.anoFabricacao = anoFabricacao;
    vehicleData.anoModelo = anoModelo;
    vehicleData.cor = cor;
    vehicleData.km = km;
    vehicleData.renavam = renavam;
    vehicleData.chassi = chassi;
    vehicleData.cidade = cidade;
    vehicleData.propriedade = {
      situacao: propriedade, detalhe: propDetalhe,
      temSocio, nomeSocio, percentualSocio: parseFloat(percentualSocio) || 0,
    };
    vehicleData.antigoProprietario = { nome: apNome, cpf: apCpf, rg: apRg, telefone: apTelefone, email: apEmail, endereco: apEndereco };
    vehicleData.comissaoLoja = comissao;
    vehicleData.arquivos = arquivos;
    vehicleData.historico = [{ data: new Date().toISOString(), acao: 'CADASTRO', detalhe: 'VEÍCULO CADASTRADO NO ESTOQUE.' }];

    const { error } = await supabase.from('vehicles').insert({
      id: vehicleId,
      created_by: user?.id,
      status: 'estoque',
      origem,
      placa,
      marca,
      modelo,
      data_entrada: dataEntrada || todayISO(),
      valor_entrada: parseFloat(valorEntrada) || 0,
      data: vehicleData,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    onDone();
  }

  return (
    <div>
      <div className="vx-topbar">
        <div>
          <div className="vx-h1">Novo veículo</div>
          <div className="vx-sub">Cadastro manual</div>
        </div>
        <button className="vx-btn secondary" onClick={onDone}>Cancelar</button>
      </div>

      <div className="vx-card">
        <h3>Arquivos de compra</h3>
        <div className="vx-note" style={{ marginBottom: 12 }}>Recibo de compra, contrato, comprovante — envie aqui, mesmo antes de salvar o cadastro.</div>
        <FileUploader vehicleId={vehicleId} arquivos={arquivos} contexto="COMPRA" onChange={setArquivos} />
        <ExtractFromFile tipo="compra" onExtracted={handleExtracted} />
      </div>

      <div className="vx-card">
        <h3>Colar informações (rascunho)</h3>
        <div className="vx-hint">Cole aqui qualquer texto — depois é só copiar e colar nos campos que quiser. Não fica salvo.</div>
        <textarea className="vx-input" style={{ minHeight: 90 }} value={colado} onChange={e => setColado(e.target.value)} placeholder="Cole aqui o texto do documento, recibo, anúncio..." />
      </div>

      <div className="vx-card">
        <h3>Dados do veículo</h3>
        <div className="vx-fieldgrid">
          <div className="vx-field">
            <label>Origem</label>
            <select className="vx-input" value={origem} onChange={e => { setOrigem(e.target.value); setComissao(commissionFor(e.target.value)); }}>
              <option value="compra">COMPRA DIRETA</option>
              <option value="troca_carro">TROCA (CARRO RECEBIDO)</option>
              <option value="troca_moto">TROCA (MOTO RECEBIDA)</option>
            </select>
          </div>
          <div className="vx-field"><label>Marca</label><input className="vx-input" value={marca} onChange={e => setMarca(up(e.target.value))} /></div>
          <div className="vx-field"><label>Modelo</label><input className="vx-input" value={modelo} onChange={e => setModelo(up(e.target.value))} /></div>
          <div className="vx-field"><label>Versão</label><input className="vx-input" value={versao} onChange={e => setVersao(up(e.target.value))} /></div>
          <div className="vx-field">
            <label>Transmissão</label>
            <select className="vx-input" value={transmissao} onChange={e => setTransmissao(e.target.value)}>
              <option value="MANUAL">MANUAL</option>
              <option value="AUTOMÁTICO">AUTOMÁTICO</option>
            </select>
          </div>
          <div className="vx-field"><label>Ano de fabricação</label><input className="vx-input" value={anoFabricacao} onChange={e => setAnoFabricacao(e.target.value)} /></div>
          <div className="vx-field"><label>Ano modelo</label><input className="vx-input" value={anoModelo} onChange={e => setAnoModelo(e.target.value)} /></div>
          <div className="vx-field"><label>Cor</label><input className="vx-input" value={cor} onChange={e => setCor(up(e.target.value))} /></div>
          <div className="vx-field"><label>KM</label><input className="vx-input" type="number" value={km} onChange={e => setKm(e.target.value)} /></div>
          <div className="vx-field"><label>Placa</label><input className="vx-input" value={placa} onChange={e => setPlaca(formatPlaca(e.target.value))} placeholder="XXX-0000" maxLength={8} /></div>
          <div className="vx-field"><label>Renavam</label><input className="vx-input" value={renavam} onChange={e => setRenavam(up(e.target.value))} /></div>
          <div className="vx-field"><label>Chassi</label><input className="vx-input" value={chassi} onChange={e => setChassi(up(e.target.value))} /></div>
          <div className="vx-field"><label>Cidade</label><input className="vx-input" value={cidade} onChange={e => setCidade(up(e.target.value))} /></div>
          <div className="vx-field"><label>Data de entrada</label><input className="vx-input" type="date" value={dataEntrada} onChange={e => setDataEntrada(e.target.value)} /></div>
          <div className="vx-field"><label>Valor de entrada (R$)</label><input className="vx-input" type="number" step="0.01" value={valorEntrada} onChange={e => setValorEntrada(e.target.value)} /></div>
        </div>
      </div>

      <div className="vx-card">
        <h3>Dados do antigo proprietário (vendedor)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>Nome</label><input className="vx-input" value={apNome} onChange={e => setApNome(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>CPF</label><input className="vx-input" value={apCpf} onChange={e => setApCpf(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>RG</label><input className="vx-input" value={apRg} onChange={e => setApRg(up(e.target.value))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="vx-field" style={{ flex: '2 1 200px' }}><label>E-mail</label><input className="vx-input" value={apEmail} onChange={e => setApEmail(up(e.target.value))} /></div>
            <div className="vx-field" style={{ flex: '0.6 1 96px' }}><label>Telefone</label><input className="vx-input" value={apTelefone} onChange={e => setApTelefone(up(e.target.value))} /></div>
          </div>
          <div className="vx-field"><label>Endereço</label><input className="vx-input" value={apEndereco} onChange={e => setApEndereco(up(e.target.value))} /></div>
        </div>
      </div>

      <div className="vx-card">
        <h3>Situação de propriedade</h3>
        <div className="vx-fieldgrid">
          <div className="vx-field">
            <label>Em nome de</label>
            <select className="vx-input" value={propriedade} onChange={e => setPropriedade(e.target.value)}>
              <option value="titular">EU (TITULAR)</option>
              <option value="outra_pessoa">OUTRA PESSOA</option>
              <option value="procuracao">PROCURAÇÃO</option>
              <option value="antigo_proprietario">ANTIGO PROPRIETÁRIO</option>
            </select>
          </div>
          <div className="vx-field"><label>Detalhe (nome, se aplicável)</label><input className="vx-input" value={propDetalhe} onChange={e => setPropDetalhe(up(e.target.value))} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 10 }}>
            <input type="checkbox" checked={temSocio} onChange={e => setTemSocio(e.target.checked)} /> ESTE VEÍCULO TEM SÓCIO (não é só meu)
          </label>
          {temSocio && (
            <div className="vx-fieldgrid">
              <div className="vx-field"><label>Nome do sócio</label><input className="vx-input" value={nomeSocio} onChange={e => setNomeSocio(up(e.target.value))} /></div>
              <div className="vx-field"><label>Porcentagem da sociedade (%)</label><input className="vx-input" type="number" step="1" value={percentualSocio} onChange={e => setPercentualSocio(e.target.value)} placeholder="Ex: 50" /></div>
            </div>
          )}
        </div>
      </div>

      <div className="vx-card">
        <h3>Comissão da loja</h3>
        <div className="vx-fieldgrid">
          <div className="vx-field"><label>Valor (R$)</label><input className="vx-input" type="number" step="0.01" value={comissao} onChange={e => setComissao(parseFloat(e.target.value) || 0)} /></div>
        </div>
      </div>

      {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button className="vx-btn" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Criar pasta do veículo'}</button>
    </div>
  );
}
