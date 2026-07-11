import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import CategoryAccordion from "../components/CategoryAccordion";
import { groupByTopic } from "../lib/categorize";
import { supabase } from "../lib/supabase";

function Archive() {
  const [scripts, setScripts] = useState(null);
  const [type, setType] = useState("all"); // all | majles | jong
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title, type, media_type, role_name, topic")
        .order("created_at", { ascending: false });
      setScripts(data || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!scripts) return [];
    const q = query.trim();
    return scripts.filter((s) => {
      if (type !== "all" && s.type !== type) return false;
      if (q && !s.title?.includes(q)) return false;
      return true;
    });
  }, [scripts, type, query]);

  const categories = useMemo(() => groupByTopic(filtered), [filtered]);

  return (
    <div className="container">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[
          { key: "all", label: "همه" },
          { key: "majles", label: "مجلس‌ها" },
          { key: "jong", label: "جُنگ‌ها" },
        ].map((f) => (
          <button
            key={f.key}
            className="btn"
            style={{
              padding: "6px 14px",
              fontSize: 13,
              background: type === f.key ? "var(--color-crimson)" : "transparent",
              color: type === f.key ? "var(--color-text)" : "var(--color-gold-bright)",
            }}
            onClick={() => setType(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        className="category-search-input"
        placeholder="جست‌وجوی عنوان…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {scripts === null && <p>در حال بارگذاری…</p>}

      {scripts !== null && (
        <CategoryAccordion
          categories={categories}
          renderItem={(s) => (
            <Link key={s.id} href={`/scripts/${s.id}`} className="script-list-item">
              <h3>{s.role_name?.trim() || s.title}</h3>
              <div className="meta">
                {s.type === "jong" ? "جُنگ" : "مجلس"}
                {" · "}
                {s.media_type === "video" ? "🎬 ویدئو" : s.media_type === "audio" ? "🎙 صوت" : "📄 فقط متن"}
              </div>
            </Link>
          )}
        />
      )}
    </div>
  );
}

export default function ArchivePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <Archive />
      </Layout>
    </ProtectedRoute>
  );
}