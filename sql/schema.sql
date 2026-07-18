-- ============================================================
-- کتابخانه تعزیه — اسکیمای Supabase
-- این فایل را در Supabase Dashboard > SQL Editor اجرا کنید.
-- ============================================================

-- جدول پروفایل کاربران (نقش: مدیر یا مشترک)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'subscriber' check (role in ('admin', 'subscriber')),
  display_name text,
  created_at timestamptz not null default now()
);

-- هر کاربر تازه‌ثبت‌نام‌شده به‌صورت پیش‌فرض «مشترک» می‌شود
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'subscriber');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- جدول نسخ تعزیه (شامل مجلس‌های معمولی و جُنگ‌ها)
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '', -- نگه‌داشته‌شده برای همخوانی با نسخه‌های قبلی؛ متن اصلی از script_segments خوانده می‌شود
  type text not null default 'majles' check (type in ('majles', 'jong')),
  topic text, -- موضوع مجلس (برای صفحه‌ی جلد)
  role_name text, -- نقش اصلی بازیگر (برای صفحه‌ی جلد، مثلاً «شمر»)
  banner_url text, -- بنر مجلس
  media_type text not null default 'none' check (media_type in ('none', 'audio', 'video')),
  media_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- اگر جدول از قبل با نسخه‌ی قدیمی ساخته شده، ستون‌های جدید را اضافه کن
alter table public.scripts add column if not exists type text not null default 'majles';
alter table public.scripts add column if not exists topic text;
alter table public.scripts add column if not exists role_name text;
alter table public.scripts add column if not exists banner_url text;
-- سایز فونت خروجی کاغذی مخصوص همین نسخه؛ خالی = استفاده از پیش‌فرض (۱۸)
alter table public.scripts add column if not exists print_font_size_pt numeric;
do $$ begin
  alter table public.scripts add constraint scripts_type_check check (type in ('majles', 'jong'));
exception when duplicate_object then null;
end $$;

-- جدول قطعات متن هر مجلس/جُنگ (هر «افزودن متن» یک ردیف است)
create table if not exists public.script_segments (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references public.scripts(id) on delete cascade,
  role text, -- نام نقش این قطعه متن (برای سرچ در جُنگ)
  body text not null default '',
  position int not null default 0,
  source_segment_id uuid references public.script_segments(id) on delete set null, -- در جُنگ: ارجاع به قطعه‌ی اصلی که از آن کپی شده
  created_at timestamptz not null default now()
);

create index if not exists script_segments_script_id_idx on public.script_segments(script_id);
create index if not exists script_segments_role_idx on public.script_segments using gin (to_tsvector('simple', coalesce(role, '')));

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.scripts enable row level security;
alter table public.script_segments enable row level security;

-- پروفایل: هر کاربر فقط پروفایل خودش را می‌بیند
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- تابع کمکی: آیا کاربر جاری مدیر است؟
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- نسخ تعزیه: همه‌ی کاربران واردشده می‌خوانند
drop policy if exists "scripts_select_authenticated" on public.scripts;
create policy "scripts_select_authenticated" on public.scripts
  for select using (auth.role() = 'authenticated');

-- نسخ تعزیه: فقط مدیر می‌نویسد/ویرایش/حذف می‌کند
drop policy if exists "scripts_insert_admin" on public.scripts;
create policy "scripts_insert_admin" on public.scripts
  for insert with check (public.is_admin());

drop policy if exists "scripts_update_admin" on public.scripts;
create policy "scripts_update_admin" on public.scripts
  for update using (public.is_admin());

drop policy if exists "scripts_delete_admin" on public.scripts;
create policy "scripts_delete_admin" on public.scripts
  for delete using (public.is_admin());

-- قطعات متن: همه‌ی کاربران واردشده می‌خوانند، فقط مدیر می‌نویسد
drop policy if exists "segments_select_authenticated" on public.script_segments;
create policy "segments_select_authenticated" on public.script_segments
  for select using (auth.role() = 'authenticated');

drop policy if exists "segments_insert_admin" on public.script_segments;
create policy "segments_insert_admin" on public.script_segments
  for insert with check (public.is_admin());

drop policy if exists "segments_update_admin" on public.script_segments;
create policy "segments_update_admin" on public.script_segments
  for update using (public.is_admin());

drop policy if exists "segments_delete_admin" on public.script_segments;
create policy "segments_delete_admin" on public.script_segments
  for delete using (public.is_admin());

-- ============================================================
-- Storage: باکت مدیا (صوت/ویدئو)
-- این بخش را در Storage > Create bucket با نام "media" هم می‌توانید بسازید،
-- یا همین کوئری را اجرا کنید.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media_read_authenticated" on storage.objects;
create policy "media_read_authenticated" on storage.objects
  for select using (bucket_id = 'media' and auth.role() = 'authenticated');

drop policy if exists "media_write_admin" on storage.objects;
create policy "media_write_admin" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_update_admin" on storage.objects;
create policy "media_update_admin" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_delete_admin" on storage.objects;
create policy "media_delete_admin" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- ============================================================
-- Storage: باکت بنر مجالس
-- ============================================================
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

drop policy if exists "banners_read_public" on storage.objects;
create policy "banners_read_public" on storage.objects
  for select using (bucket_id = 'banners');

drop policy if exists "banners_write_admin" on storage.objects;
create policy "banners_write_admin" on storage.objects
  for insert with check (bucket_id = 'banners' and public.is_admin());

drop policy if exists "banners_update_admin" on storage.objects;
create policy "banners_update_admin" on storage.objects
  for update using (bucket_id = 'banners' and public.is_admin());

drop policy if exists "banners_delete_admin" on storage.objects;
create policy "banners_delete_admin" on storage.objects
  for delete using (bucket_id = 'banners' and public.is_admin());
