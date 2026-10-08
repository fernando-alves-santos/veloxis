export type Contato = { nome: string; telefone: string };

export function formatarTelefone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return (raw || '').trim();
}

export function linhaContato(c: Contato): string {
  const nome = (c.nome || '').trim();
  return `WhatsApp ${formatarTelefone(c.telefone)}${nome ? ' ' + nome : ''}`;
}

// Emojis, símbolos decorativos e seletores de variação.
const EMOJI_RE = new RegExp(
  '[\\p{Extended_Pictographic}\\u{1F1E6}-\\u{1F1FF}\\u{1F3FB}-\\u{1F3FF}\\uFE0E\\uFE0F\\u200D\\u20E3]',
  'gu'
);
// Marcadores de lista no começo da linha (viram "- ").
const BULLET_RE = new RegExp('^\\s*[▪▫◾◽◼◻•●○◦‣▸▹►▶➤➢➡➜➔✔✓✅☑➖]\\uFE0F?\\s*', 'u');
const LINK_WHATS_RE = /wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|whatsapp\.com\/send/i;
const TEL_RE = /(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?[\s.-]?\d{4}[\s.-]?\d{4}/;

function pareceTelefone(l: string): boolean {
  if (/R\$/i.test(l) || /\bkm\b/i.test(l)) return false;
  if (l.replace(/\D/g, '').length < 10) return false;
  return TEL_RE.test(l);
}

/**
 * Limpa o texto de anúncio colado do WhatsApp:
 * - remove emojis e alinha tudo à esquerda
 * - exclui links de contato do vendedor (wa.me etc.)
 * - troca o telefone do vendedor pelo contato do usuário
 */
export function limparDescricao(texto: string, contato: Contato): { texto: string; telefoneTrocado: boolean } {
  const temContato = !!(contato && contato.telefone && contato.telefone.replace(/\D/g, '').length >= 10);
  const minhaLinha = temContato ? linhaContato(contato) : '';
  const meuTel = temContato ? formatarTelefone(contato.telefone) : '';
  let trocado = false;
  const out: string[] = [];

  for (const bruta of (texto || '').replace(/\r\n?/g, '\n').split('\n')) {
    let l = bruta.replace(/\u00a0/g, ' ');
    if (LINK_WHATS_RE.test(l)) continue;

    let bullet = false;
    l = l.replace(BULLET_RE, () => { bullet = true; return ''; });
    l = l.replace(EMOJI_RE, '').replace(/[ \t]{2,}/g, ' ').trim();

    if (!l) {
      if (bruta.trim() === '') out.push('');
      continue;
    }
    if (bullet) l = '- ' + l;

    if (pareceTelefone(l)) {
      if (!temContato) continue;
      if (l.length <= 60) {
        if (!trocado) { out.push(minhaLinha); trocado = true; }
        continue;
      }
      l = l.replace(new RegExp(TEL_RE.source, 'g'), meuTel);
      trocado = true;
    }
    out.push(l);
  }

  let resultado = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!trocado && minhaLinha) {
    resultado = (resultado ? resultado + '\n\n' : '') + minhaLinha;
    trocado = true;
  }
  return { texto: resultado, telefoneTrocado: trocado };
}
