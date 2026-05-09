-- SihatAI: To'liq Supabase sxemasi

-- 1. FOYDALANUVCHILAR
create table if not exists public.users (
  id text primary key,                        -- Telegram user id
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
  pulse text,
  chronic_diseases text[],
  allergies text[],
  subscription text default 'none',
  expires_at timestamptz,
  trial_used boolean default false,
  daily_request_count integer default 0,
  last_request_date text,
  is_blocked boolean default false,
  role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. ESLATMALAR
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

-- 3. TO'LOVLAR
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  telegram_id text,
  user_display_name text,
  plan_name text not null,
  amount text not null,
  payer_name text not null,
  screenshot_base64 text not null,
  status text not null default 'pending', -- pending | approved | rejected
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
create index if not exists payment_requests_status_idx on public.payment_requests(status);
create index if not exists payment_requests_created_at_idx on public.payment_requests(created_at desc);

-- 4. BILDIRISHNOMALAR
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 5. DORI JURNALI
create table if not exists public.medicine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  medicine_name text not null,
  taken_at timestamptz default now()
);

-- 6. AI SUHBATLAR TARIXI
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  expert_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 7. FOYDALANUVCHI FAOLLIGI (LOGS)
create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  activity_type text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 8. KLINIKALAR VA SHIFOKORLAR
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text,
  services text[],
  photo_url text,
  description text,
  working_hours text,
  location_url text,
  created_at timestamptz default now()
);

create table if not exists public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  name text not null,
  specialty text not null,
  phone text,
  photo_url text,
  experience text,
  education text,
  bio text,
  availability text[],
  created_at timestamptz default now()
);

-- 9. TIZIM SOZLAMALARI
create table if not exists public.system_settings (
  id text primary key default 'global',
  data jsonb not null default '{
    "aiSystemPrompt": "Siz malakali tibbiy yordamchisiz. Foydalanuvchi simptomlarini tahlil qiling va ehtimoliy sabablarni ayting.",
    "basicLimit": 5,
    "proLimit": 20
  }'::jsonb,
  updated_at timestamptz default now()
);

insert into public.system_settings (id) values ('global') on conflict (id) do nothing;
