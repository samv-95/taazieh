import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import ProtectedRoute from "../components/ProtectedRoute";
import { supabase } from "../lib/supabase";

function MediaList() {
  const [scripts, setScripts] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("scripts")
        .select("id, title, media_type, media_url")
        .neq("media_type", "none")
        .order("created_at", { ascending: false });
      setScripts(data || []);
    })();
  }, []);

  return (
    <div className="container">
      <p className="eyebrow">صوت و تصویر</p>
      <h1 className="page-title">مدیا</h1>
      <p className="page-subtitle">مجالسی که فایل صوتی یا ویدئویی دارند.</p>

      {scripts === null && <p>در حال بارگذاری…</p>}
      {scripts?.length === 0 && <div className="empty-state">هنوز مدیایی ثبت نشده است.</div>}

      <div className="script-list">
        {scripts?.map((s) => (
          <Link key={s.id} href={`/scripts/${s.id}`} className="script-list-item">
            <h3>{s.title}</h3>
            <div className="meta">{s.media_type === "video" ? "🎬 ویدئو" : "🎙 صوت"}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function MediaPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <MediaList />
      </Layout>
    </ProtectedRoute>
  );
}
