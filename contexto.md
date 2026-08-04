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

## STATUS ATUAL

Já implementado e funcionando:
- Login/cadastro reais via Supabase Auth, com isolamento total de dados por usuário
- Cadastro completo de veículo: marca, modelo, versão, transmissão, ano de fabricação/modelo, cor, km, placa (formatada estilo Mercosul, ex: `ABC-1D23`), renavam, chassi, cidade, data e valor de entrada
- Dados do antigo proprietário (nome, CPF, RG, telefone, e-mail, endereço)
- Situação de propriedade: em nome de (Fernando / outra pessoa / procuração / antigo proprietário) + controle de sociedade (sócio e percentual, com lucro e investimento reais divididos automaticamente)
- Comissão da loja automática por origem (compra, troca de carro, troca de moto)
- Despesas do veículo (valor, descrição, data), com edição e exclusão, e "Custo atual" calculado
- Controle de IPVA (5 parcelas) — marcar uma parcela como paga já lança o valor automaticamente em Despesas
- Documentos (tipo + link/observação) e Arquivos reais (upload de PDF/foto para o Supabase Storage)
- Venda: dados do comprador, valor, parcelas do valor faltante com marcação de "paga" (atualiza a aba de pendências sozinho), opção de troca (cria automaticamente uma nova pasta de veículo, podendo puxar os dados do antigo proprietário direto do comprador), opção de venda por repasse (não entra no controle de garantia), garantia de 3 meses com contagem visual
- Exclusão de veículo cadastrado
- Telas: Meus veículos, Veículos vendidos, Garantia ativa, Minhas pendências, Fechamento mensal (KPIs + gráfico + tabela por mês)
- Identidade visual própria: tema azul/prata, logo próprio do usuário (arquivo real, fundo tratado para ficar transparente e integrar com o app), placas estilo Mercosul, app majoritariamente em caixa alta

## PRÓXIMO PASSO

Ajustes pedidos pelo usuário e ainda **pendentes de implementação** no código (última rodada de pedidos):
1. Tela "Novo veículo": adicionar os mesmos blocos que já existem em "Venda" — upload de arquivos de compra e caixa de "colar informações" (rascunho)
2. Aba Despesas: renomear campo "Item" para "Descrição", reordenar como Valor | Descrição | Data (na tabela e no formulário de adicionar), remover o campo de descrição antigo (redundante), e renomear o rótulo "Custo atual (entrada + despesas)" para apenas "Custo atual"
3. Mover o controle de IPVA para **dentro** da aba Despesas (como uma seção que se ativa por uma caixa de seleção), posicionada logo abaixo de "Adicionar despesa" — removendo a aba IPVA separada
4. Aba Documentos: colocar os tipos em ordem alfabética e maiúsculo; incluir "Vistoria de Transferência" e "Vistoria Cautelar"; renomear "Recibo de compra" → "Recibo do Veículo", "Recibo de venda" → "PDF da Saída (loja)", "Comprovante de transferência bancária" → "Transferência Bancária"; remover o campo de observação (manter só tipo e link)
5. Remover a aba "Histórico" por completo
6. Ajustar layout dos campos do antigo proprietário: caixas de CPF, RG e Telefone 40% mais estreitas; caixa de Nome do mesmo tamanho da caixa de E-mail; ordem: Nome / (CPF, RG, Telefone) / Endereço
7. Na lista de "Veículos vendidos", mostrar a palavra "REPASSE" em vermelho quando a venda tiver sido por repasse
8. Remover os emojis do menu lateral, deixando só o texto em maiúsculo
9. (Decisão em aberto com o usuário) Preenchimento automático de campos a partir de PDF/foto usando IA — precisa definir se via API paga da Anthropic ou via cota gratuita do Google Gemini

Depois de implementar, sempre: rodar `npm run build` localmente para validar, empacotar o projeto, e instruir o usuário a subir os arquivos no GitHub (a Vercel republica sozinha). Mudanças de banco de dados (RLS, novas tabelas/políticas) são feitas direto no SQL Editor do Supabase e **não** dependem de novo deploy do código.
