import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const geminiUrl = (model: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const PROMPT_COMPRA = `Você recebe um documento (PDF ou foto) relacionado à COMPRA de um veículo usado no Brasil: pode ser CRLV, recibo, contrato particular de compra e venda, nota fiscal, print de anúncio, etc.
Extraia o que conseguir encontrar e responda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois), no seguinte formato exato:
{
  "marca": "", "modelo": "", "versao": "", "transmissao": "MANUAL ou AUTOMÁTICO ou vazio",
  "anoFabricacao": "", "anoModelo": "", "cor": "", "km": "", "placa": "", "renavam": "", "chassi": "", "cidade": "",
  "dataEntrada": "AAAA-MM-DD ou vazio", "valorEntrada": 0,
  "antigoProprietario": { "nome": "", "cpf": "", "rg": "", "telefone": "", "email": "", "endereco": "" }
}
Regras: se não encontrar um campo, deixe como string vazia "" (ou 0 para números). Nunca invente dados. Datas sempre em formato AAAA-MM-DD. Valores numéricos sem "R$", sem pontos de milhar, usando ponto para decimais.`;

const PROMPT_VENDA = `Você recebe um documento (PDF ou foto) relacionado à VENDA de um veículo usado no Brasil: pode ser recibo, contrato particular de compra e venda, comprovante, print de conversa com o comprador, etc.
Extraia o que conseguir encontrar sobre o COMPRADOR e a venda, e responda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois), no seguinte formato exato:
{
  "nome": "", "cpf": "", "rg": "", "telefone": "", "email": "", "endereco": "",
  "dataVenda": "AAAA-MM-DD ou vazio", "valorVenda": 0
}
Regras: se não encontrar um campo, deixe como string vazia "" (ou 0 para números). Nunca invente dados. Datas sempre em formato AAAA-MM-DD. Valores numéricos sem "R$", sem pontos de milhar, usando ponto para decimais.`;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sessão expirada, faça login novamente.' }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Preenchimento automático não configurado (falta GEMINI_API_KEY no servidor).' }, { status: 500 });
    }

    const { fileBase64, mimeType, tipo } = await req.json();
    if (!fileBase64 || !mimeType) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 });
    }
    if (tipo !== 'compra' && tipo !== 'venda') {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 });
    }

    // Limite diário por usuário, para nunca deixar o custo/cota da IA disparar mesmo se alguém abusar do recurso.
    const LIMITE_DIARIO = 30;
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: uso } = await supabase.from('ia_extracoes').select('count').eq('user_id', user.id).eq('dia', hoje).maybeSingle();
    const usoAtual = uso?.count || 0;
    if (usoAtual >= LIMITE_DIARIO) {
      return NextResponse.json({ error: `Limite diário de ${LIMITE_DIARIO} preenchimentos automáticos atingido nesta conta. Tente novamente amanhã.` }, { status: 429 });
    }

    const prompt = tipo === 'compra' ? PROMPT_COMPRA : PROMPT_VENDA;

    let geminiRes: Response | null = null;
    let lastErrText = '';
    for (const model of GEMINI_MODELS) {
      const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: fileBase64 } },
            ],
          }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      });
      if (res.ok) { geminiRes = res; break; }
      lastErrText = await res.text();
      // Só tenta o próximo modelo se este estiver indisponível/depreciado; outros erros (ex: chave inválida) não adianta repetir.
      if (res.status !== 404 && res.status !== 400) { geminiRes = res; break; }
    }

    if (!geminiRes) {
      return NextResponse.json({ error: 'Erro ao consultar o serviço de IA: ' + lastErrText.slice(0, 300) }, { status: 502 });
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json({ error: 'Erro ao consultar o serviço de IA: ' + errText.slice(0, 300) }, { status: 502 });
    }

    const geminiJson = await geminiRes.json();
    const rawText: string | undefined = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json({ error: 'Não consegui ler nenhuma informação nesse arquivo.' }, { status: 200 });
    }

    const cleaned = rawText.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'A IA não devolveu um formato reconhecível. Tente outro arquivo ou preencha manualmente.' }, { status: 200 });
    }

    await registrarUso(supabase, user.id, hoje, usoAtual);
    return NextResponse.json({ data: parsed });
  } catch (e: any) {
    return NextResponse.json({ error: 'Erro inesperado: ' + (e?.message || String(e)) }, { status: 500 });
  }
}

async function registrarUso(supabase: ReturnType<typeof createClient>, userId: string, dia: string, usoAtual: number) {
  await supabase.from('ia_extracoes').upsert({ user_id: userId, dia, count: usoAtual + 1 }, { onConflict: 'user_id,dia' });
}
