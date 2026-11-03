-- ═══════════════════════════════════════════════════════════════════
-- Ukurra — skema database
-- Jalankan sekali di Supabase → SQL Editor.
--
-- Hitungan jatah uji coba WAJIB di sini, bukan di peramban. Kalau
-- disimpan lokal, pengguna tinggal menghapus data peramban dan jatahnya
-- kembali penuh.
-- ═══════════════════════════════════════════════════════════════════

-- ── profil & jatah ────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  plan          text not null default 'free',   -- 'free' | 'pro'
  pro_until     timestamptz,                    -- null + plan='pro' = selamanya
  missions_used int  not null default 0,
  projects_used int  not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Pengguna hanya boleh MEMBACA profilnya sendiri.
-- Sengaja tidak ada policy UPDATE: jatah hanya boleh diubah lewat
-- fungsi di bawah, supaya tidak bisa dinolkan sendiri dari peramban.
drop policy if exists "baca profil sendiri" on public.profiles;
create policy "baca profil sendiri"
  on public.profiles for select
  using (auth.uid() = id);

-- ── profil dibuat otomatis saat daftar ────────────────────────────
create or replace function public.ukurra_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.ukurra_new_user();

-- ── pemakaian jatah ───────────────────────────────────────────────
-- security definer: menembus RLS, tapi HANYA bisa menambah satu dan
-- hanya untuk pengguna yang sedang login. Tidak bisa dipakai menurunkan.
create or replace function public.ukurra_use_quota(kind text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'harus login';
  end if;

  if kind = 'missions_used' then
    update public.profiles set missions_used = missions_used + 1 where id = uid;
  elsif kind = 'projects_used' then
    update public.profiles set projects_used = projects_used + 1 where id = uid;
  else
    raise exception 'jenis jatah tidak dikenal: %', kind;
  end if;
end;
$$;

revoke all on function public.ukurra_use_quota(text) from public;
grant execute on function public.ukurra_use_quota(text) to authenticated;

-- ── misi tersimpan (opsional, untuk nanti) ────────────────────────
create table if not exists public.missions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  drone      text,
  params     jsonb,
  polygon    jsonb,
  created_at timestamptz not null default now()
);

alter table public.missions enable row level security;

drop policy if exists "kelola misi sendiri" on public.missions;
create policy "kelola misi sendiri"
  on public.missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- Aktivasi manual (cadangan) lewat SQL Editor, kalau webhook di bawah
-- gagal atau pembeli belum pernah login (profiles-nya belum ada):
--
--   update public.profiles
--      set plan = 'pro',
--          pro_until = now() + interval '1 year'   -- hapus baris ini untuk lifetime
--    where email = 'pembeli@gmail.com';
-- ═══════════════════════════════════════════════════════════════════

-- Dipakai Edge Function supabase/functions/mayar-webhook supaya satu
-- notifikasi pembayaran yang sama (dikirim ulang oleh Mayar) tidak
-- memperpanjang masa aktif dua kali. RLS diaktifkan tanpa policy sama
-- sekali — hanya service_role (dipakai Edge Function) yang bisa
-- menyentuhnya, klien web/app tidak pernah mengaksesnya langsung.
create table if not exists public.mayar_webhook_log (
  id         text primary key,
  created_at timestamptz not null default now()
);

alter table public.mayar_webhook_log enable row level security;
