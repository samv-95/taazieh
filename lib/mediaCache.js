// ذخیره‌ی رسانه (صوت/ویدئو) برای پخش آفلاین، فقط داخل خودِ برنامه.
//
// چرا Cache Storage API؟ چون بر خلاف لینک <a download>، این روش هیچ
// دیالوگ «ذخیره در Downloads» سیستم‌عامل رو باز نمی‌کنه و فایل رو به
// حافظه‌ی گالری/فایل‌منیجر گوشی کاربر نمی‌فرسته. بایت‌های فایل فقط
// داخل فضای ذخیره‌سازی خصوصیِ همین اپ (PWA) می‌مونن و فقط از طریق
// همین برنامه قابل پخش‌اند — نه با «Save As» و نه با دیدن توی
// فایل‌منیجر گوشی.
//
// نکته‌ی مهم برای صداقت با کاربر نهایی: این روش دانلود مستقیم از
// طریق دیالوگ سیستم‌عامل رو حذف می‌کنه و کار رو برای کاربر عادی خیلی
// سخت‌تر می‌کنه، ولی چون همه‌چیز نهایتاً توی مرورگر اجرا می‌شه، هیچ
// راه وبی ۱۰۰٪ ضدضربه در برابر کاربر خیلی مصمم (مثلاً از طریق DevTools)
// وجود نداره.

const CACHE_NAME = "taazieh-media-v1";

function hasCacheApi() {
  return typeof window !== "undefined" && "caches" in window;
}

export async function isMediaCached(url) {
  if (!url || !hasCacheApi()) return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

// فایل رو می‌گیره و توی Cache Storage ذخیره می‌کنه — بدون هیچ دیالوگ
// دانلود سیستم‌عامل.
export async function cacheMedia(url) {
  if (!url) throw new Error("آدرس رسانه مشخص نیست");
  if (!hasCacheApi()) throw new Error("این مرورگر از ذخیره‌ی آفلاین پشتیبانی نمی‌کند");
  const cache = await caches.open(CACHE_NAME);
  await cache.add(url);
}

// اگر نسخه‌ی ذخیره‌شده وجود داشته باشد، یک blob URL برای پخش برمی‌گرداند؛
// وگرنه null.
export async function getCachedMediaUrl(url) {
  if (!url || !hasCacheApi()) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export async function removeCachedMedia(url) {
  if (!url || !hasCacheApi()) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(url);
  } catch {
    // نادیده گرفتن خطای حذف
  }
}
