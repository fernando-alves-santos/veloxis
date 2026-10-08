export type Despesa = { item: string; valor: number; data: string; descricao?: string };
export type Documento = { tipo: string; link?: string; nota?: string };
export type IpvaParcela = { numero: number; valor: number; data: string; pago: boolean };
export type Historico = { data: string; acao: string; detalhe: string };
export type Venda = {
  comprador: { nome: string; cpf?: string; telefone?: string; rg?: string; email?: string; endereco?: string };
  dataVenda: string;
  valorVenda: number;
  valorFaltante: number;
  dataCombinadaPagamento?: string;
  parcelasFaltante?: { valor: number; data: string; pago?: boolean }[];
  veiculoTrocaId?: string;
  metodoRepasse?: boolean;
};
export type Propriedade = {
  situacao: string;
  detalhe?: string;
  temSocio?: boolean;
  nomeSocio?: string;
  percentualSocio?: number;
};
export type AntigoProprietario = {
  nome?: string; cpf?: string; rg?: string; telefone?: string; email?: string; endereco?: string;
};

export type Arquivo = { id: string; nome: string; path: string; contexto: string; data: string };
export type Foto = { id: string; nome: string; path: string; thumbPath: string; data: string };

export type VehicleData = {
  versao?: string;
  transmissao?: string;
  anoFabricacao?: string;
  anoModelo?: string;
  cor?: string;
  km?: string;
  renavam?: string;
  chassi?: string;
  cidade?: string;
  propriedade: Propriedade;
  antigoProprietario: AntigoProprietario;
  comissaoLoja: number;
  despesas: Despesa[];
  documentos: Documento[];
  ipva: IpvaParcela[];
  venda: Venda | null;
  historico: Historico[];
  arquivos: Arquivo[];
  fotos?: Foto[];
  fotoPrincipalId?: string;
  descricao?: string;
};

export type Vehicle = {
  id: string;
  status: 'estoque' | 'vendido' | 'devolvido';
  origem: string;
  placa: string;
  marca: string;
  modelo: string;
  data_entrada: string;
  valor_entrada: number;
  data: VehicleData;
  created_at?: string;
};

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}
export function fmt(n: number | undefined | null) {
  return 'R$ ' + (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function commissionFor(origem: string) {
  if (origem === 'compra') return 1200;
  if (origem === 'troca_carro') return 700;
  return 0;
}
export function folderName(v: Vehicle) {
  const dt = v.data_entrada ? v.data_entrada.slice(0, 7).replace('-', '.') : '0000.00';
  const parts = [v.marca, v.modelo, v.data.versao, v.data.cor, v.data.transmissao].filter(Boolean).join(' ').toUpperCase();
  const ano = v.data.anoModelo ? ` ${v.data.anoModelo}` : '';
  return `${dt} - ${parts}${ano} - ${(v.data.cidade || '').toUpperCase()}`;
}
export function maskPlaca(raw: string) {
  if (!raw) return '***-****';
  return formatPlaca(raw).replace(/[A-Z0-9]/g, '*');
}
export function maskValor() {
  return 'R$ ***,**';
}
export function despesasTotal(v: Vehicle) {
  return (v.data.despesas || []).reduce((s, d) => s + Number(d.valor || 0), 0) + Number(v.data.comissaoLoja || 0);
}
export function custoTotal(v: Vehicle) {
  return Number(v.valor_entrada || 0) + despesasTotal(v);
}
export function lucro(v: Vehicle) {
  if (!v.data.venda) return 0;
  return Number(v.data.venda.valorVenda || 0) - custoTotal(v);
}
export function meuLucro(v: Vehicle) {
  const total = lucro(v);
  const p = v.data.propriedade;
  if (p?.temSocio && p.percentualSocio) {
    return total * (1 - Number(p.percentualSocio) / 100);
  }
  return total;
}
export function meuInvestimento(v: Vehicle) {
  const total = custoTotal(v);
  const p = v.data.propriedade;
  if (p?.temSocio && p.percentualSocio) {
    return total * (1 - Number(p.percentualSocio) / 100);
  }
  return total;
}
export function formatPlaca(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const letters = clean.slice(0, 3).replace(/[^A-Z]/g, '');
  const rest = clean.slice(3, 7);
  if (!rest) return letters;
  return `${letters}-${rest}`;
}
export function garantiaInfo(v: Vehicle) {
  if (!v.data.venda?.dataVenda) return null;
  if (v.data.venda.metodoRepasse) return null;
  const dias = daysBetween(v.data.venda.dataVenda, todayISO());
  const restante = 90 - dias;
  return { diasPassados: dias, diasRestantes: restante, ativa: restante > 0 };
}
export function valorFaltante(v: Vehicle) {
  return v.data.venda ? Number(v.data.venda.valorFaltante || 0) : 0;
}

export const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MES_NOMES[parseInt(m) - 1]}/${y}`;
}
export function fechamentoMensal(vehicles: Vehicle[]) {
  const meses: Record<string, { key: string; qtd: number; investido: number; vendido: number; lucro: number }> = {};
  vehicles.forEach(v => {
    if (v.status === 'vendido' && v.data.venda?.dataVenda) {
      const key = v.data.venda.dataVenda.slice(0, 7);
      if (!meses[key]) meses[key] = { key, qtd: 0, investido: 0, vendido: 0, lucro: 0 };
      meses[key].qtd += 1;
      meses[key].investido += meuInvestimento(v);
      meses[key].vendido += Number(v.data.venda.valorVenda || 0);
      meses[key].lucro += meuLucro(v);
    }
  });
  return Object.values(meses).sort((a, b) => a.key.localeCompare(b.key));
}
export function emptyVehicleData(): VehicleData {
  return {
    propriedade: { situacao: 'titular', detalhe: '', temSocio: false, nomeSocio: '', percentualSocio: 0 },
    antigoProprietario: {},
    comissaoLoja: 0,
    despesas: [],
    documentos: [],
    ipva: [1, 2, 3, 4, 5].map(n => ({ numero: n, valor: 0, data: '', pago: false })),
    venda: null,
    historico: [],
    arquivos: [],
    fotos: [],
    fotoPrincipalId: '',
    descricao: '',
  };
}

export function fotoPrincipal(v: Vehicle): Foto | null {
  const fotos = v.data.fotos || [];
  return fotos.find(f => f.id === v.data.fotoPrincipalId) || fotos[0] || null;
}

// Fotos com a principal sempre em primeiro (ordem usada ao compartilhar).
export function fotosOrdenadas(v: Vehicle): Foto[] {
  const fotos = v.data.fotos || [];
  const p = fotoPrincipal(v);
  if (!p) return [];
  return [p, ...fotos.filter(f => f.id !== p.id)];
}
