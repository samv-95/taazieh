import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

function groupByCategory(scripts) {
  const knownRoles = Array.from(new Set(scripts.map((s) => s.role_name?.trim()).filter(Boolean))).sort(
    (a, b) => a.length - b.length
  );

  const findCategory = (s) => {
    const searchText = [s.role_name, s.title, s.topic].filter(Boolean).join(" ");
    const match = knownRoles.find((role) => searchText.includes(role));
    return match || s.role_name?.trim() || s.topic?.trim() || "دسته‌بندی‌نشده";
  };

  const map = new Map();
  scripts.forEach((s) => {
    const key = findCategory(s);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  });
  return Array.from(map.entries())
      .map(([name, items]) => ({ name, items }))
      .sort((a, b) => a.name.localeCompare(b.name, "fa"));
  }

function CategoryAccordion({ categories, onDelete }) {
  const [open, setOpen] = useState({});
  const toggle = (name) => setOpen((prev) => ({ ...prev, [name]: !prev[name] }));

  if (categories.length === 0) return <p className="hint">چیزی نیست.</p>;

  return (
    <div className="category-list">
      {categories.map((cat) => (
        <div className="category-box" key={cat.name}>
          <button type="button" className="category-header" onClick={() => toggle(cat.name)}>
            <span>
              {cat.name} <span className="category-count">({cat.items.length})</span>
            </span>
            <span className={"category-chevron" + (open[cat.name] ? " open" : "")}>▾</span>
          </button>
          {open[cat.name] && (
            <div className="category-body category-body-admin">
              {cat.items.map((s) => (
                <div key={s.id} className="script-list-item">
                  <div className="admin-row">
                    <div>
                      <h3>{s.title}</h3>
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
                        onClick={() => onDelete(s.id)}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminCategorizedScripts() {
  const [scripts, setScripts] = useState(null);

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

  if (!scripts) return <p>در حال بارگذاری…</p>;
  if (scripts.length === 0) return <div className="empty-state">هنوز نسخه‌ای اضافه نکرده‌اید.</div>;

  const majles = scripts.filter((s) => s.type !== "jong");
  const jong = scripts.filter((s) => s.type === "jong");

  return (
    <>
      <h2 className="section-title">مجلس‌ها ({majles.length})</h2>
      <CategoryAccordion categories={groupByCategory(majles)} onDelete={handleDelete} />

      <h2 className="section-title" style={{ marginTop: 28 }}>
        جُنگ‌ها ({jong.length})
      </h2>
      <CategoryAccordion categories={groupByCategory(jong)} onDelete={handleDelete} />
    </>
  );
}
