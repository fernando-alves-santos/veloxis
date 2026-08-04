# VELOXIS — versão hospedada (grátis)

Esta é a primeira versão real do VELOXIS: um app com login de verdade e banco de
dados na nuvem, que atualiza sozinho entre o celular e o notebook. Ainda é uma
base (login + cadastro simples de veículo) — vamos completando as outras telas
(despesas, venda, IPVA, fechamento mensal etc.) nas próximas etapas.

Tudo abaixo usa **apenas contas gratuitas**.

## Passo 1 — Criar o banco de dados (Supabase)

1. Crie uma conta grátis em https://supabase.com (pode entrar com GitHub ou Google).
2. Clique em **New project**. Escolha um nome (ex: `veloxis`) e uma senha para o
   banco (guarde essa senha, mas você não vai precisar dela no dia a dia).
3. Espere o projeto ser criado (leva 1-2 minutos).
4. No menu lateral, vá em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo,
   cole no editor e clique em **Run**.
6. Vá em **Settings → API**. Você vai precisar de duas informações mais à frente:
   - **Project URL**
   - **anon public key**

## Passo 2 — Colocar o código no GitHub

1. Crie uma conta grátis em https://github.com (se ainda não tiver).
2. Crie um repositório novo, ex: `veloxis-app` (pode ser privado).
3. Suba todos os arquivos desta pasta para esse repositório (pelo site do
   GitHub mesmo: **Add file → Upload files**, arraste tudo e clique em
   **Commit changes**).

## Passo 3 — Publicar o app (Vercel)

1. Crie uma conta grátis em https://vercel.com, entrando com o **GitHub**.
2. Clique em **Add New → Project** e escolha o repositório `veloxis-app`.
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` → cole o **Project URL** do Passo 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → cole a **anon public key** do Passo 1
   - `GEMINI_API_KEY` → veja como conseguir de graça logo abaixo (Passo 3.1)
4. Clique em **Deploy**. Em cerca de 1 minuto, a Vercel te dá um endereço tipo:
   `https://veloxis-app.vercel.app`

### Passo 3.1 — Chave grátis para o preenchimento automático (IA)

O recurso "preencher automaticamente" (ler PDF/foto e completar os campos
sozinho, em Novo Veículo e em Venda) usa o Gemini do Google, que tem uma cota
gratuita generosa.

1. Acesse https://aistudio.google.com/apikey com sua conta Google.
2. Clique em **Create API key** (não precisa cartão de crédito).
3. Copie a chave gerada e cole na variável `GEMINI_API_KEY` na Vercel
   (Settings → Environment Variables, se você já publicou o app).
4. Depois de adicionar/alterar essa variável, clique em **Redeploy** na
   Vercel para ela valer.

Se essa variável não estiver configurada, o app continua funcionando
normalmente — só o botão de preenchimento automático mostra um aviso.

Pronto — esse endereço é o seu app na nuvem. Abra ele no celular e no notebook:
como os dois usam o mesmo banco de dados (Supabase), tudo que for cadastrado
em um aparece automaticamente no outro.

## Passo 4 — Criar sua conta e virar administrador

1. Acesse o endereço `.vercel.app`, clique em **Criar conta**, coloque seu
   e-mail e uma senha.
2. Volte no Supabase → **SQL Editor** → rode:
   ```sql
   update public.profiles set role = 'admin' where email = 'seuemail@exemplo.com';
   ```
   (troque pelo e-mail que você cadastrou)

Por enquanto todo usuário logado enxerga os mesmos veículos (é assim que
outra pessoa da loja vai poder usar também, cada um com seu próprio login).
Permissões diferentes por papel (admin vs funcionário) entram numa próxima
etapa, junto com o restante das telas do protótipo.

## Rodando no seu computador (opcional, para quem quiser mexer no código)

```bash
npm install
cp .env.local.example .env.local   # depois preencha com os dados do Supabase
npm run dev
```

## Segurança

Nenhuma chave de API ou dado sensível deve ser commitado no repositório —
tudo isso fica em variáveis de ambiente (`.env.local`), que já está no
`.gitignore` e nunca vai pro GitHub.
