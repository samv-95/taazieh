import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import CategoryAccordion from "../components/CategoryAccordion";
import { groupByTopic } from "../lib/categorize";
import { supabase } from "../lib/supabase";

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title, media_type, media_url, role_name, topic")
        .order("created_at", { ascending: false });
      setScripts(data || []);
    })();
    setOfflineIds(readOfflineIds());
  }, []);

  const filtered = useMemo(() => {
    if (!scripts) return [];
    const q = query.trim();
    return q ? scripts.filter((s) => s.title?.includes(q)) : scripts;
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

  const offlineScripts = scripts?.filter((s) => offlineIds.includes(s.id)) || [];

  return (
    <div className="container">
      <p className="page-subtitle" style={{ marginBottom: 16 }}>
        فایل صوتی/ویدئویی هر مجلس را مستقیم دانلود کنید، برای خروجی کاغذی (PDF) وارد صفحه‌ی مجلس شوید، یا متن را برای
        خواندن بدون اینترنت ذخیره کنید.
      </p>

      <input
        type="text"
        className="category-search-input"
        placeholder="جست‌وجوی عنوان…"
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
          renderItem={(s) => (
            <div key={s.id} className="script-list-item">
              <div className="admin-row">
                <div>
                  <h3>{s.role_name?.trim() || s.title}</h3>
                  <div className="meta">
                    {s.media_type === "video" ? "🎬 ویدئو" : s.media_type === "audio" ? "🎙 صوت" : "📄 فقط متن"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {s.media_url && (
                  <a
                    href={s.media_url}
                    download
                    className="btn"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    دانلود مدیا
                  </a>
                )}
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
                      : "ذخیره برای آفلاین"}
                  </button>
                </div>
              </div>
            </div>
          )}
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