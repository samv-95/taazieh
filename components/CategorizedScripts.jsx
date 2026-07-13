import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function CategorizedScripts() {
  const [scripts, setScripts] = useState(null);
  const [query, setQuery] = useState("");
  const [openCategories, setOpenCategories] = useState({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title, type, media_type, banner_url, role_name, topic")
        .order("created_at", { ascending: false });
      setScripts(data || []);
    })();
  }, []);

  // دسته‌بندی از روی «موضوع مجلس» (topic) است.
  const categories = useMemo(() => {
    if (!scripts) return [];
    const map = new Map();
    scripts.forEach((s) => {
      const key = s.topic?.trim() || "دسته‌بندی‌نشده";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [scripts]);

  // جست‌وجو هم روی نام نقش هم روی عنوان انجام می‌شود؛ مثلاً تایپ
  // «امام» باید نسخه‌ای با role_name = «امام» را پیدا کند، حتی اگر
  // عنوان کامل آن نسخه شامل کلمه‌ی «امام» نباشد.
  const filteredCategories = useMemo(() => {
    const q = query.trim();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((s) => s.role_name?.includes(q) || s.title?.includes(q)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [categories, query]);

  // موقع تایپ در جست‌وجو، دسته‌های نتیجه‌دار خودکار باز می‌شوند.
  useEffect(() => {
    if (!query.trim()) return;
    setOpenCategories((prev) => {
      const next = { ...prev };
      filteredCategories.forEach((c) => {
        next[c.name] = true;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggle = (name) => setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }));

  if (!scripts) return <p>در حال بارگذاری…</p>;

  // اسم نمایشی هر نسخه: «نقش از موضوع» — اگر یکی از این دو نبود، همان
  // یکی که هست؛ اگر هیچ‌کدام نبود، عنوان کامل.
  const displayName = (s) => {
    if (s.role_name?.trim() && s.topic?.trim()) return `${s.role_name.trim()} از ${s.topic.trim()}`;
    return s.role_name?.trim() || s.topic?.trim() || s.title;
  };

  return (
    <div className="category-search">
      <input
        type="text"
        className="category-search-input"
        placeholder="جست‌وجوی نقش یا عنوان… مثلاً: امام"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filteredCategories.length === 0 && <p className="hint">چیزی پیدا نشد.</p>}

      <div className="category-list">
        {filteredCategories.map((cat) => (
          <div className="category-box" key={cat.name}>
            <button type="button" className="category-header" onClick={() => toggle(cat.name)}>
              <span>
                {cat.name} <span className="category-count">({cat.items.length})</span>
              </span>
              <span className={"category-chevron" + (openCategories[cat.name] ? " open" : "")}>▾</span>
            </button>

            {openCategories[cat.name] && (
              <div className="category-body">
                {cat.items.map((s) => (
                  <Link key={s.id} href={`/scripts/${s.id}`} className="script-list-item">
                    {s.banner_url && (
                      <img
                        src={s.banner_url}
                        alt={s.title}
                        style={{ width: "100%", borderRadius: 6, marginBottom: 10, maxHeight: 140, objectFit: "cover" }}
                      />
                    )}
                    <h3>{displayName(s)}</h3>
                    <div className="meta">
                      {s.type === "jong" ? "جُنگ" : "مجلس"}
                      {" · "}
                      {s.media_type === "video" ? "🎬 ویدئو" : s.media_type === "audio" ? "🎙 صوت" : "📄 فقط متن"}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
