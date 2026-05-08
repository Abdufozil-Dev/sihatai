-- SihatAI: Supabase schema (users, reminders, payments)
-- 1) Supabase project yarating
-- 2) SQL Editor’da shu faylni ishlating
-- 3) .env ga SUPABASE_URL va SUPABASE_SERVICE_ROLE_KEY kiriting

create table if not exists public.users (
  id text primary key,                        -- Telegram user id (string)
  display_name text,
  username text,
  email text,
  photo_url text,
  phone text,
  gender text,
  age integer,
  height double precision,
  weight double precision,
  blood_group text,
  blood_pressure text,
  chronic_diseases text[],
  allergies text[],
  subscription text default 'none',
  expires_at timestamptz,
  trial_used boolean default false,
  daily_request_count integer default 0,
  last_request_date text,
  is_blocked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  medicine_name text not null,
  dosage text,
  time text not null,
  days text[] default '{}'::text[],
  is_active boolean default true,
  created_at timestamptz default now()
);
create index if not exists reminders_user_id_idx on public.reminders(user_id);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  telegram_id text,
  user_display_name text,
  plan_id text,
  plan_name text not null,
  amount text not null,
  payer_name text not null,
  screenshot_base64 text not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
create index if not exists payment_requests_status_idx on public.payment_requests(status);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create table if not exists public.medicine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  medicine_name text not null,
  taken_at timestamptz default now()
);
create index if not exists medicine_logs_user_id_idx on public.medicine_logs(user_id);
create index if not exists medicine_logs_taken_at_idx on public.medicine_logs(taken_at desc);

-- Eslatma:
-- Bu loyiha hozir auth/RLS ishlatmaydi; server service-role key bilan ishlaydi.
-- Agar keyin RLS qo‘shmoqchi bo‘lsangiz, client to‘g‘ridan-to‘g‘ri DBga chiqmasin — faqat server API orqali ishlasin.
