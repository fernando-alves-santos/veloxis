-- CORREÇÃO URGENTE: cada usuário só pode ver/editar os PRÓPRIOS veículos.

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
