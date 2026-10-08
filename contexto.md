# VELOXIS — Contexto do Projeto

> Este arquivo existe para que qualquer IA (ou desenvolvedor) que abrir este projeto entenda rapidamente o que é, como funciona, e o que falta fazer — sem precisar reler todo o histórico de conversas.

## OBJETIVO

VELOXIS é um app de **controle financeiro para quem compra e vende veículos por conta própria** — não é um sistema para uma loja/revenda com múltiplos vendedores. É voltado para **uma pessoa física**, que pode vender consignado dentro de uma loja parceira, na rua, ou por qualquer outro meio, e que trabalha com um volume pequeno (na ordem de 4 a 8 veículos por mês).

O problema que resolve: hoje praticamente ninguém nesse perfil faz um controle financeiro sério — quando muito, anotam em papel; a maioria não controla nada. O app organiza, por veículo:
- Quanto foi investido (compra + despesas, incluindo comissão da loja quando aplicável)
- Dados completos do veículo, do antigo proprietário e da situação de propriedade (inclusive se há sociedade com outra pessoa, dividindo lucro/investimento proporcionalmente)
- A venda (comprador, valor, parcelas pendentes, troca, garantia de 3 meses, venda por repasse)
- Documentos e arquivos (PDFs/fotos) ligados a cada veículo
- Um fechamento mensal consolidado (quanto entrou, quanto foi investido, qual foi o lucro real)

Cada usuário só vê e mexe nos **seus próprios** veículos — logins são 100% independentes (sem compartilhamento de dados entre contas). A visão de longo prazo é que, no futuro, o app possa ajudar outras pessoas no mesmo perfil a terem esse controle rigoroso.

## TECH STACK

- **Frontend + Backend**: Next.js (App Router, TypeScript), hospedado gratuitamente na **Vercel**
- **Banco de dados + Autenticação**: **Supabase** (PostgreSQL + Supabase Auth), plano gratuito
  - Tabela `profiles` (perfil do usuário, criado automaticamente no cadastro)
  - Tabela `vehicles` (colunas principais + coluna `data` em JSONB com o restante das informações do veículo)
  - Row Level Security (RLS): cada usuário só enxerga/edita linhas onde `created_by = auth.uid()`
  - Supabase Storage: bucket `veiculo-arquivos` (privado) para upload real de PDFs/fotos, também isolado por usuário via política de storage
- **Versionamento/Deploy**: código no **GitHub**, conectado à Vercel — todo push na branch principal republica o app automaticamente
- Sem custo de infraestrutura no momento (tudo dentro dos planos gratuitos)

## REGRAS DE TRABALHO COM O USUÁRIO

- Nunca mencionar, repetir ou compartilhar chaves de API, senhas, URLs de projeto ou qualquer credencial sem consentimento explícito do usuário.
- Antes de alterar código de telas novas, mostrar como vai ficar (mockup) e esperar aprovação.
- Entregar só os arquivos alterados, já nas pastas corretas, e orientar passo a passo o envio ao GitHub (a Vercel republica sozinha). Enviar tudo no mesmo commit, para não gerar builds com erro.
- Idioma: português do Brasil. Interface do app majoritariamente em CAIXA ALTA.

## ESTRUTURA

Só `app/` e `lib/` têm código do app. Arquivos soltos na raiz com o mesmo nome de componentes são cópias antigas e devem ser apagados (ver lista no histórico de conversa). Ficam na raiz: `package.json`, `tsconfig.json`, `middleware.ts`, `next.config.mjs`, `next-env.d.ts`, `schema.sql`, `fix_isolamento.sql`, `README.md`, `LICENSE`, `.gitignore`, `.env.local.example`.

## STATUS ATUAL (07/10/2026)

Implementado e funcionando:
- Login/cadastro via Supabase Auth, isolamento total por usuário (RLS em `vehicles`, `ia_extracoes` e Storage).
- Cadastro completo do veículo, antigo proprietário, propriedade/sociedade, comissão da loja automática.
- Despesas (Valor | Descrição | Data) com IPVA em 5 parcelas dentro da aba Despesas; Documentos (ordem alfabética, tipos renomeados, vistorias); Arquivos reais no Storage.
- Venda: comprador, parcelas com baixa, troca (cria novo veículo), repasse (sem garantia), garantia de 90 dias.
- Telas: Meus veículos, Vendidos, Garantia, Pendências, Fechamento mensal.
- Preenchimento automático por IA (Gemini) em Novo veículo e Venda, com limite de 30/dia por usuário, validação de tipo/tamanho (~3 MB) e reserva do uso antes da chamada.
- **Aba FOTOS / DESCRIÇÃO** (nova): upload de várias fotos (comprimidas no navegador: 1600 px + miniatura 480 px, JPEG), estrela para foto principal, descrição com "LIMPAR E AJUSTAR" (remove emojis, alinha à esquerda, bullets viram "- ", remove links wa.me, troca o telefone do vendedor pelo contato do usuário), botão COMPARTILHAR.
- **Lista em cards** com a foto principal acima da placa e botão de compartilhar no canto superior direito da foto. Compartilhar usa a Web Share API (fotos + texto) no celular; no computador oferece baixar fotos e copiar texto.
- Contato do usuário (nome + WhatsApp) fica em `user_metadata` do Supabase Auth (`contato_nome`, `contato_telefone`) — não está no código.
- Data "hoje" usa o fuso local (não UTC). Excluir veículo apaga também fotos/arquivos do Storage.

Dados novos em `vehicles.data` (JSONB): `fotos[]` (`id, nome, path, thumbPath, data`), `fotoPrincipalId`, `descricao`.

## PENDÊNCIAS / DECISÕES EM ABERTO

1. Cadastro de contas está aberto a qualquer pessoa. Decidir se desliga novos cadastros no Supabase (Authentication → Sign In / Providers) ou mantém aberto para uso futuro por outras pessoas.
2. Papel `admin` existe em `profiles`, mas o app não o usa.
3. O limite diário da IA reduz, mas não elimina, corrida entre requisições simultâneas (só seria 100% atômico com uma função SQL/RPC).
4. A aba Histórico foi removida da tela, mas `data.historico` ainda é gravado (inofensivo).
5. Fotos antigas enviadas na aba Arquivos não aparecem na galeria de fotos.
6. Em modo "Ocultar dados" a placa e os valores são mascarados, mas a foto principal continua visível (pode mostrar a placa do carro).
