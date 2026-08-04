-- VELOXIS - esquema inicial do banco de dados
-- Este arquivo pode ser rodado várias vezes sem erro (é seguro reexecutar).

-- 1) Perfis de usuário (criado automaticamente quando alguém se cadastra)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  nome text,
  role text not null default 'employee' check (role in ('admin','employee')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "usuarios veem todos os perfis" on public.profiles;
drop policy if exists "usuario ve o proprio perfil" on public.profiles;
create policy "usuario ve o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "usuario edita o proprio perfil" on public.profiles;
create policy "usuario edita o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2) Veículos
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users,
  status text not null default 'estoque' check (status in ('estoque','vendido','devolvido')),
  origem text,
  placa text,
  marca text,
  modelo text,
  data_entrada date,
  valor_entrada numeric default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.vehicles enable row level security;

drop policy if exists "usuarios logados veem veiculos" on public.vehicles;
drop policy if exists "usuarios veem apenas seus veiculos" on public.vehicles;
create policy "usuarios veem apenas seus veiculos"
  on public.vehicles for select
  using (auth.uid() = created_by);

drop policy if exists "usuarios logados criam veiculos" on public.vehicles;
drop policy if exists "usuarios criam seus veiculos" on public.vehicles;
create policy "usuarios criam seus veiculos"
  on public.vehicles for insert
  with check (auth.uid() = created_by);

drop policy if exists "usuarios logados atualizam veiculos" on public.vehicles;
drop policy if exists "usuarios atualizam seus veiculos" on public.vehicles;
create policy "usuarios atualizam seus veiculos"
  on public.vehicles for update
  using (auth.uid() = created_by);

drop policy if exists "usuarios logados apagam veiculos" on public.vehicles;
drop policy if exists "usuarios apagam seus veiculos" on public.vehicles;
create policy "usuarios apagam seus veiculos"
  on public.vehicles for delete
  using (auth.uid() = created_by);

-- 3) Depois de criar seu primeiro usuário (cadastro pelo app), rode:
-- update public.profiles set role = 'admin' where email = 'seuemail@exemplo.com';

-- 4) Armazenamento de arquivos (documentos, recibos, fotos) — grátis até 1GB no plano Free do Supabase.
insert into storage.buckets (id, name, public)
values ('veiculo-arquivos', 'veiculo-arquivos', false)
on conflict (id) do nothing;

drop policy if exists "usuarios leem seus arquivos" on storage.objects;
create policy "usuarios leem seus arquivos"
  on storage.objects for select
  using (bucket_id = 'veiculo-arquivos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "usuarios sobem seus arquivos" on storage.objects;
create policy "usuarios sobem seus arquivos"
  on storage.objects for insert
  with check (bucket_id = 'veiculo-arquivos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "usuarios apagam seus arquivos" on storage.objects;
create policy "usuarios apagam seus arquivos"
  on storage.objects for delete
  using (bucket_id = 'veiculo-arquivos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5) Controle de uso do preenchimento automático (IA) — limite diário por usuário,
--    para nunca deixar o custo/cota da IA disparar mesmo se alguém abusar do recurso.
create table if not exists public.ia_extracoes (
  user_id uuid references auth.users on delete cascade,
  dia date not null,
  count int not null default 0,
  primary key (user_id, dia)
);

alter table public.ia_extracoes enable row level security;

drop policy if exists "usuario ve seu proprio uso de ia" on public.ia_extracoes;
create policy "usuario ve seu proprio uso de ia"
  on public.ia_extracoes for select
  using (auth.uid() = user_id);

drop policy if exists "usuario registra seu proprio uso de ia" on public.ia_extracoes;
create policy "usuario registra seu proprio uso de ia"
  on public.ia_extracoes for insert
  with check (auth.uid() = user_id);

drop policy if exists "usuario atualiza seu proprio uso de ia" on public.ia_extracoes;
create policy "usuario atualiza seu proprio uso de ia"
  on public.ia_extracoes for update
  using (auth.uid() = user_id);
