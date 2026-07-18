import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CategoryAccordion from "./CategoryAccordion";
import { groupByTopic } from "../lib/categorize";
import { supabase } from "../lib/supabase";

const displayName = (s) => {
  if (s.role_name?.trim() && s.topic?.trim()) return `${s.role_name.trim()} از ${s.topic.trim()}`;
  return s.role_name?.trim() || s.topic?.trim() || s.title;
};

export default function AdminCategorizedScripts() {
  const [scripts, setScripts] = useState(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("scripts")
      .select("id, title, type, media_type, role_name, topic")
      .order("created_at", { ascending: false });
    setScripts(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("این نسخه حذف شود؟")) return;
    await supabase.from("scripts").delete().eq("id", id);
    load();
  };

  const filtered = useMemo(() => {
    if (!scripts) return [];
    const q = query.trim();
    if (!q) return scripts;
    return scripts.filter((s) => s.role_name?.includes(q) || s.title?.includes(q));
  }, [scripts, query]);

  const majles = useMemo(() => filtered.filter((s) => s.type !== "jong"), [filtered]);
  const jong = useMemo(() => filtered.filter((s) => s.type === "jong"), [filtered]);

  const majlesCategories = useMemo(() => groupByTopic(majles), [majles]);
  const jongCategories = useMemo(() => groupByTopic(jong), [jong]);

  const renderItem = (s) => (
    <div key={s.id} className="script-list-item">
      <div className="admin-row">
        <div>
          <h3>{displayName(s)}</h3>
          <div className="meta">
            {s.media_type === "video" ? "🎬 ویدئو" : s.media_type === "audio" ? "🎙 صوت" : "📄 فقط متن"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/admin/edit/${s.id}`} className="btn" style={{ padding: "6px 12px", fontSize: 13 }}>
            ویرایش
          </Link>
          <button
            className="btn btn-danger"
            style={{ padding: "6px 12px", fontSize: 13 }}
            onClick={() => handleDelete(s.id)}
          >
            حذف
          </button>
        </div>
      </div>
    </div>
  );

  if (!scripts) return <p>در حال بارگذاری…</p>;
  if (scripts.length === 0) return <div className="empty-state">هنوز نسخه‌ای اضافه نکرده‌اید.</div>;

  return (
    <>
      <input
        type="text"
        className="category-search-input"
        placeholder="جست‌وجوی نقش یا عنوان… مثلاً: امام"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <h2 className="section-title">مجلس‌ها ({majles.length})</h2>
      <CategoryAccordion categories={majlesCategories} renderItem={renderItem} />

      <h2 className="section-title" style={{ marginTop: 28 }}>
        جُنگ‌ها ({jong.length})
      </h2>
      <CategoryAccordion categories={jongCategories} renderItem={renderItem} />
    </>
  );
}