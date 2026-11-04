
-- 1. Columnas nuevas en pedidos
alter table pedidos add column if not exists texto text;
alter table pedidos add column if not exists archivo_url text;

-- 2. ¿El usuario actual es del equipo?
create or replace function public.es_admin() returns boolean
language sql security definer set search_path = '' stable as $$
  select coalesce((select es_admin from public.perfiles where id = auth.uid()), false);
$$;

-- 3. Seguridad de perfiles: nadie puede convertirse en admin por su cuenta
revoke update on perfiles from authenticated, anon;
grant update (nombre, telefono, whatsapp, ciudad, mostrar_telefono) on perfiles to authenticated;
create policy "admin ve perfiles" on perfiles for select using (public.es_admin());

-- 4. Mascotas: el equipo puede verlas para preparar los pedidos
create policy "admin ve mascotas" on mascotas for select using (public.es_admin());

-- 5. Pedidos: el cliente crea, ve y cancela (solo si sigue "pendiente");
--    solo el equipo cambia el estado
drop policy if exists "gestionar mis pedidos" on pedidos;

create policy "ver mis pedidos" on pedidos for select
  using (exists (select 1 from mascotas m where m.id = mascota_id and m.dueno_id = auth.uid()));

create policy "crear mis pedidos" on pedidos for insert
  with check (exists (select 1 from mascotas m where m.id = mascota_id and m.dueno_id = auth.uid()));

create policy "cancelar mis pedidos" on pedidos for delete
  using (estado = 'pendiente' and exists (select 1 from mascotas m where m.id = mascota_id and m.dueno_id = auth.uid()));

create policy "admin ve pedidos" on pedidos for select using (public.es_admin());
create policy "admin cambia estado" on pedidos for update using (public.es_admin());

revoke insert, update on pedidos from authenticated, anon;
grant insert (mascota_id, forma, tamano_mm, texto, observaciones, archivo_url) on pedidos to authenticated;
grant update (estado) on pedidos to authenticated;

-- 6. Perfil público del QR: devuelve solo lo necesario para contactar al dueño
create or replace function public.perfil_publico(codigo text)
returns table (
  nombre text, especie text, raza text, color text, edad text, foto_url text,
  info_medica text, notas text, perdida boolean,
  dueno_nombre text, telefono text, whatsapp text, ciudad text
)
language sql security definer set search_path = '' stable as $$
  select m.nombre, m.especie, m.raza, m.color, m.edad, m.foto_url,
         m.info_medica, m.notas, m.perdida,
         p.nombre,
         case when p.mostrar_telefono then p.telefono end,
         case when p.mostrar_telefono then p.whatsapp end,
         p.ciudad
  from public.mascotas m
  join public.perfiles p on p.id = m.dueno_id
  where m.codigo_qr = codigo;
$$;

grant execute on function public.perfil_publico(text) to anon, authenticated;
