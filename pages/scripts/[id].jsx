import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import ProtectedRoute from "../../components/ProtectedRoute";
import MediaPlayer from "../../components/MediaPlayer";
import ScriptCard, { PrintBooklet, PrintJongDocument } from "../../components/ScriptCard";
import { supabase } from "../../lib/supabase";

function ScriptDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [script, setScript] = useState(null);
  const [segments, setSegments] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("scripts").select("*").eq("id", id).single();
      setScript(data || null);
      const { data: segs } = await supabase
        .from("script_segments")
        .select("*")
        .eq("script_id", id)
        .order("position", { ascending: true });
      setSegments(segs || []);
    })();
  }, [id]);

  if (!script || !segments) return <div className="container">در حال بارگذاری…</div>;

  // اگر هنوز قطعه‌ای ثبت نشده (مثلاً نسخه‌ای که قبل از افزودن این قابلیت ساخته شده)،
  // متن قدیمی script.body را به‌عنوان یک قطعه‌ی تک نمایش بده تا صفحه خالی نباشد.
  const displaySegments =
    segments.length > 0
      ? segments
      : script.body?.trim()
      ? [{ role: null, body: script.body }]
      : [];

  const isJong = script.type === "jong";

  return (
    <>
      <Head>
        <title>{script.title}</title>
      </Head>

      {script.banner_url && (
        <div className="script-banner no-print">
          <img src={script.banner_url} alt={script.title} />
        </div>
      )}

      <MediaPlayer mediaType={script.media_type} mediaUrl={script.media_url} title={script.title} />

      <div className="container no-print">
        <p className="eyebrow no-print">{isJong ? "جُنگ" : "مجلس تعزیه"}</p>
        <h1 className="page-title no-print">{script.title}</h1>
        {(script.role_name || script.topic) && (
          <p className="page-subtitle no-print">
            {script.role_name}
            {script.role_name && script.topic ? " از " : ""}
            {script.topic}
          </p>
        )}

        <div className="no-print" style={{ margin: "16px 0" }}>
          <button className="btn" onClick={() => window.print()}>
            🖨 خروجی کاغذی
          </button>
        </div>

        {displaySegments.length === 0 ? (
          <div className="empty-state no-print">متنی برای این نسخه ثبت نشده است.</div>
        ) : (
          <div className="no-print">
            <ScriptCard segments={displaySegments} />
          </div>
        )}
      </div>

      {displaySegments.length > 0 &&
        (isJong ? (
          <PrintJongDocument script={script} segments={displaySegments} />
        ) : (
          <PrintBooklet script={script} segments={displaySegments} />
        ))}
    </>
  );
}

export default function ScriptPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <ScriptDetail />
      </Layout>
    </ProtectedRoute>
  );
}
