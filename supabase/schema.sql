create table if not exists public.users (
  id text primary key,                        
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

-- 3. Eslatmalar jadvali
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

-- 4. To'lov so'rovlari
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

-- 5. Bildirishnomalar
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);

-- 6. Dori ichish jurnali
create table if not exists public.medicine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  reminder_id uuid references public.reminders(id) on delete set null,
  medicine_name text not null,
  taken_at timestamptz default now()
);
create index if not exists medicine_logs_user_id_idx on public.medicine_logs(user_id);

-- 7. AI bilan suhbatlar tarixi
create table if not exists public.chat_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  expert_id text not null,
  role text not null, -- 'user' | 'assistant'
  content text not null,
  created_at timestamptz default now()
);
create index if not exists chat_history_user_id_idx on public.chat_history(user_id);

-- 8. Foydalanuvchi faolligi (Logging)
create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.users(id) on delete cascade,
  activity_type text not null, 
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists user_activities_user_id_idx on public.user_activities(user_id);

-- 9. Klinikalar va Shifokorlar
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  phone text,
  photo_url text,
  description text,
  working_hours text,
  services text[],
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

-- 10. Tizim sozlamalari
create table if not exists public.system_settings (
  id text primary key default 'global',
  data jsonb not null default '{
    "aiSystemPrompt": "Siz malakali tibbiy yordamchisiz. Foydalanuvchi simptomlarini tahlil qiling va ehtimoliy sabablarni ayting. MUHIM: Har doim shifokorga murojaat qilishni tavsiya eting.",
    "basicLimit": 5,
    "proLimit": 20,
    "doctorSectionTitle": "HAQIQIY SHIFOKOR",
    "doctorSectionDescription": "Sun''iy intellekt yordami yetarli bo''lmasa yoki sizga chuqurroq tibbiy tahlil kerak bo''lsa, bizning malakali va ko''p yillik tajribaga ega shifokorlarimiz bilan bog''laning.",
    "doctorSectionTags": ["Professional tahlil", "Individual yondashuv", "24/7 Aloqa"],
    "doctorSectionIcon": "https://emojicdn.elk.sh/👩‍⚕️?style=apple"
  }'::jsonb,
  updated_at timestamptz default now()
);

-- Default sozlamalarni kiritish
insert into public.system_settings (id) values ('global') on conflict (id) do nothing;
