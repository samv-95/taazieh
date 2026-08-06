import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import CategoryAccordion from "../components/CategoryAccordion";
import { groupByTopic } from "../lib/categorize";
import { supabase } from "../lib/supabase";
import { cacheMedia, isMediaCached, removeCachedMedia } from "../lib/mediaCache";

const OFFLINE_PREFIX = "offline_script_";

function readOfflineIds() {
  if (typeof window === "undefined") return [];
  return Object.keys(window.localStorage)
    .filter((k) => k.startsWith(OFFLINE_PREFIX))
    .map((k) => k.slice(OFFLINE_PREFIX.length));
}

function Downloads() {
  const [scripts, setScripts] = useState(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [offlineIds, setOfflineIds] = useState([]);
  const [cachedMediaUrls, setCachedMediaUrls] = useState([]);
  const [savingMediaId, setSavingMediaId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title, media_type, media_url, role_name, topic")
        .order("created_at", { ascending: false });
      setScripts(data || []);

      // چک می‌کنیم کدام رسانه‌ها قبلاً برای پخش آفلاین در خودِ برنامه
      // ذخیره شده‌اند (نه به‌عنوان فایل روی حافظه‌ی گوشی).
      const mediaUrls = (data || []).map((s) => s.media_url).filter(Boolean);
      const cachedFlags = await Promise.all(mediaUrls.map((url) => isMediaCached(url)));
      setCachedMediaUrls(mediaUrls.filter((_, i) => cachedFlags[i]));
    })();
    setOfflineIds(readOfflineIds());
  }, []);

  const filtered = useMemo(() => {
    if (!scripts) return [];
    const q = query.trim();
    return q ? scripts.filter((s) => s.role_name?.includes(q)) : scripts;
  }, [scripts, query]);

  const categories = useMemo(() => groupByTopic(filtered), [filtered]);

  const saveOffline = async (id) => {
    setSavingId(id);
    try {
      const { data: script } = await supabase.from("scripts").select("*").eq("id", id).single();
      const { data: segments } = await supabase
        .from("script_segments")
        .select("*")
        .eq("script_id", id)
        .order("position", { ascending: true });
      window.localStorage.setItem(
        OFFLINE_PREFIX + id,
        JSON.stringify({ script, segments: segments || [], savedAt: Date.now() })
      );
      setOfflineIds(readOfflineIds());
    } catch (err) {
      alert("ذخیره برای آفلاین با خطا مواجه شد: " + (err.message || ""));
    } finally {
      setSavingId(null);
    }
  };

  const removeOffline = (id) => {
    window.localStorage.removeItem(OFFLINE_PREFIX + id);
    setOfflineIds(readOfflineIds());
  };

  // دانلود صوت/ویدئو فقط داخل خودِ برنامه (Cache Storage) — نه با
  // دیالوگ «ذخیره در Downloads» سیستم‌عامل. فایل هیچ‌وقت به‌صورت یک
  // فایل قابل‌مشاهده در گالری/فایل‌منیجر گوشی کاربر نمی‌رود؛ فقط از
  // همین صفحه و از پلیر داخل صفحه‌ی مجلس قابل پخش است.
  const saveMediaOffline = async (mediaUrl) => {
    setSavingMediaId(mediaUrl);
    try {
      await cacheMedia(mediaUrl);
      setCachedMediaUrls((prev) => (prev.includes(mediaUrl) ? prev : [...prev, mediaUrl]));
    } catch (err) {
      alert("ذخیره‌ی رسانه با خطا مواجه شد: " + (err.message || ""));
    } finally {
      setSavingMediaId(null);
    }
  };

  const removeMediaOffline = async (mediaUrl) => {
    await removeCachedMedia(mediaUrl);
    setCachedMediaUrls((prev) => prev.filter((u) => u !== mediaUrl));
  };

  const offlineScripts = scripts?.filter((s) => offlineIds.includes(s.id)) || [];

  return (
    <div className="container">
      <p className="page-subtitle" style={{ marginBottom: 16 }}>
        صوت/ویدئوی هر مجلس را برای پخش آفلاین در همین برنامه ذخیره کنید (بدون دانلود جدا روی گوشی)، برای خروجی
        کاغذی (PDF) وارد صفحه‌ی مجلس شوید، یا متن را برای خواندن بدون اینترنت ذخیره کنید.
      </p>

      <input
        type="text"
        className="category-search-input"
        placeholder="جست‌وجوی نقش اصلی…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {offlineScripts.length > 0 && (
        <>
          <h2 className="section-title">متن‌های ذخیره‌شده برای آفلاین ({offlineScripts.length})</h2>
          <div className="category-body-admin" style={{ marginBottom: 24 }}>
            {offlineScripts.map((s) => (
              <div key={s.id} className="script-list-item">
                <div className="admin-row">
                  <h3>{s.role_name?.trim() || s.title}</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Link href={`/offline/${s.id}`} className="btn" style={{ padding: "6px 12px", fontSize: 13 }}>
                      مشاهده آفلاین
                    </Link>
                    <button
                      className="btn btn-danger"
                      style={{ padding: "6px 12px", fontSize: 13 }}
                      onClick={() => removeOffline(s.id)}
                    >
                      حذف از آفلاین
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {scripts === null && <p>در حال بارگذاری…</p>}

      {scripts !== null && (
        <CategoryAccordion
          categories={categories}
          renderItem={(s) => {
            const mediaSaved = s.media_url && cachedMediaUrls.includes(s.media_url);
            const mediaSaving = savingMediaId === s.media_url;
            return (
              <div key={s.id} className="script-list-item">
                <div className="admin-row">
                  <div>
                    <h3>{s.role_name?.trim() || s.title}</h3>
                    <div className="meta">
                      {s.media_type === "video" ? "🎬 ویدئو" : s.media_type === "audio" ? "🎙 صوت" : "📄 فقط متن"}
                      {mediaSaved && " · ✅ برای آفلاین ذخیره شده"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {s.media_url &&
                      (mediaSaved ? (
                        <button
                          className="btn btn-danger"
                          style={{ padding: "6px 12px", fontSize: 13 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMediaOffline(s.media_url);
                          }}
                        >
                          حذف رسانه‌ی آفلاین
                        </button>
                      ) : (
                        <button
                          className="btn"
                          style={{ padding: "6px 12px", fontSize: 13 }}
                          disabled={mediaSaving}
                          onClick={(e) => {
                            e.stopPropagation();
                            saveMediaOffline(s.media_url);
                          }}
                        >
                          {mediaSaving ? "در حال ذخیره…" : "🎧 ذخیره برای پخش آفلاین"}
                        </button>
                      ))}
                    <Link href={`/scripts/${s.id}`} className="btn" style={{ padding: "6px 12px", fontSize: 13 }}>
                      خروجی کاغذی
                    </Link>
                    <button
                      className="btn"
                      style={{ padding: "6px 12px", fontSize: 13 }}
                      disabled={savingId === s.id}
                      onClick={() => saveOffline(s.id)}
                    >
                      {offlineIds.includes(s.id)
                        ? "به‌روزرسانی آفلاین"
                        : savingId === s.id
                        ? "در حال ذخیره…"
                        : "ذخیره متن برای آفلاین"}
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Downloads />
      </Layout>
    </ProtectedRoute>
  );
}
