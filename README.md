# کتابخانه دیجیتال نسخ تعزیه (PWA — React/Next.js + Supabase)

اپلیکیشن وب پیش‌رونده (PWA) ماژولار برای هیئت‌های تعزیه: ثبت متن نسخ، پخش صوت/ویدئوی
مرتبط (سنجاق‌شده در بالای صفحه)، خروجی چاپی به اندازه‌ی یک‌هشتم A4، و داشبورد مدیریت
مخصوص موبایل با دو سطح دسترسی: **مدیر** (افزودن/ویرایش/حذف) و **مشترک** (فقط مشاهده).
تم بصری: **قرمز-مشکی**.

## پشته فناوری
- **Next.js** (React) — با پشتیبانی PWA از طریق `next-pwa`
- **Supabase**: Authentication (ایمیل/رمز) + Postgres (جدول نسخ) + Storage (فایل صوت/ویدئو) + Row Level Security

## راه‌اندازی

### ۱. ساخت پروژه Supabase
1. در [supabase.com](https://supabase.com) یک پروژه جدید بسازید.
2. به **SQL Editor** بروید و کل محتوای فایل `sql/schema.sql` را اجرا کنید.
   این کار جدول‌ها، سیاست‌های امنیتی (RLS) و باکت Storage به‌نام `media` را می‌سازد.
3. از **Project Settings → API**، مقادیر `Project URL` و `anon public key` را کپی کنید.

### ۲. تنظیم پروژه محلی
```bash
cp .env.local.example .env.local
# مقادیر NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY را وارد کنید
npm install
npm run dev
```
سپس روی `http://localhost:3000` باز کنید.

### ۳. ساخت کاربر مدیر
1. یک کاربر از طریق فرم ورود امتحان کنید یا از Supabase Dashboard → Authentication → Add user بسازید.
2. به‌محض ساخت کاربر، یک ردیف در جدول `profiles` با نقش `subscriber` به‌صورت خودکار ساخته می‌شود.
3. برای ارتقا به مدیر، در **Table Editor → profiles** مقدار ستون `role` همان کاربر را به `admin` تغییر دهید.

### ۴. دیپلوی
Vercel ساده‌ترین گزینه است: مخزن را وصل کرده و متغیرهای محیطی را در تنظیمات پروژه وارد کنید.

## ساختار پروژه
```
pages/
  index.jsx            فهرست نسخ (برای مدیر و مشترک)
  login.jsx             صفحه ورود
  scripts/[id].jsx       نمایش یک نسخه: مدیای sticky + کارت متن + دکمه چاپ
  admin/index.jsx        داشبورد مدیریت (فهرست + ویرایش/حذف)
  admin/new.jsx           افزودن نسخه جدید
  admin/edit/[id].jsx     ویرایش نسخه
components/
  MediaPlayer.jsx         پخش‌کننده sticky بالای صفحه
  ScriptCard.jsx           کارت متن به اندازه یک‌هشتم A4 (پیش‌نمایش + چاپ)
  ScriptForm.jsx           فرم مشترک افزودن/ویرایش
  Layout.jsx / ProtectedRoute.jsx
context/AuthContext.jsx    ورود/خروج و بررسی نقش کاربر (Supabase Auth)
lib/supabase.js             اتصال Supabase
styles/globals.css           توکن‌های طراحی — تم قرمز-مشکی
styles/print.css             چیدمان چاپ (۸ کارت در هر برگه A4)
sql/schema.sql                 جدول‌ها + Row Level Security + باکت media
```

## نکته درباره‌ی اندازه‌ی چاپ
هر کارت متن دقیقاً **۱۰۵mm × ۷۴٫۲۵mm** است (یک‌هشتم دقیق کاغذ A4). هنگام چاپ یک نسخه،
همان کارت به‌صورت خودکار ۸ بار در یک برگه A4 چیده می‌شود (۲ ستون × ۴ ردیف).

## امنیت دسترسی
سطح دسترسی مدیر/مشترک با **Row Level Security در خود دیتابیس Supabase** اعمال می‌شود،
نه فقط در کد فرانت‌اند؛ یعنی حتی با دستکاری کد کلاینت، بدون نقش «admin» نوشتن/حذف ممکن نیست.

## توسعه بعدی (پیشنهادی)
- افزودن جست‌وجو/دسته‌بندی نسخ
- دعوت مشترک جدید مستقیماً از پنل مدیریت (نیازمند Supabase Edge Function)
- آپلود چند فایل مدیا برای هر نسخه
