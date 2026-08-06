import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Layout from "../../components/Layout";
import ProtectedRoute from "../../components/ProtectedRoute";
import MediaPlayer from "../../components/MediaPlayer";
import ScriptCard, { PrintBooklet, PrintJongDocument } from "../../components/ScriptCard";
import { supabase } from "../../lib/supabase";

function PrintOptions({ segments, isJong, sizeMode, setSizeMode, selectedKeys, setSelectedKeys }) {
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);

  const filteredSegments = useMemo(() => {
    const q = filter.trim();
    if (!q) return segments;
    // هم روی نقش، هم روی بخشی از خود متن (حتی یک مصرع ناقص) جست‌وجو می‌کند.
    return segments.filter((s) => s.role?.includes(q) || s.body?.includes(q));
  }, [segments, filter]);

  const allSelected = selectedKeys.size === segments.length;
  const toggleAll = () => {
    if (allSelected) setSelectedKeys(new Set());
    else setSelectedKeys(new Set(segments.map((s) => s._key)));
  };
  const toggleOne = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const selectOnlyFiltered = () => setSelectedKeys(new Set(filteredSegments.map((s) => s._key)));

  return (
    <div className="print-options no-print">
      <button type="button" className="btn" onClick={() => setOpen((v) => !v)}>
        ⚙️ گزینه‌های خروجی کاغذی {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="print-options-panel">
          {!isJong && (
            <div className="print-options-row">
              <span className="print-options-label">اندازه‌ی خروجی:</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {["eighth", "quarter"].map((key) => (
                  <label key={key} className="print-size-option">
                    <input
                      type="radio"
                      name="sizeMode"
                      checked={sizeMode === key}
                      onChange={() => setSizeMode(key)}
                    />
                    {key === "eighth" ? "۱/۸ برگه‌ی A4 (معمولی)" : "۱/۴ برگه‌ی A4 = نصف A5 (فونت درشت‌تر)"}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="print-options-row">
            <span className="print-options-label">
              انتخاب کارت‌ها برای خروجی ({selectedKeys.size} از {segments.length}):
            </span>
            <input
              type="text"
              className="category-search-input"
              placeholder="جست‌وجو با نقش یا حتی بخشی از یک مصرع…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={toggleAll}>
                {allSelected ? "هیچ‌کدام" : "همه"}
              </button>
              {filter.trim() && (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "4px 10px", fontSize: 12 }}
                  onClick={selectOnlyFiltered}
                >
                  فقط نتیجه‌های این جست‌وجو
                </button>
              )}
            </div>

            <div className="print-options-list">
              {filteredSegments.length === 0 && <p className="hint">چیزی پیدا نشد.</p>}
              {filteredSegments.map((s) => (
                <label key={s._key} className="print-options-item">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(s._key)}
                    onChange={() => toggleOne(s._key)}
                  />
                  <span>
                    {s.role && <strong>{s.role}: </strong>}
                    {(s.body || "").slice(0, 60)}
                    {(s.body || "").length > 60 ? "…" : ""}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .print-options-panel {
          margin-top: 10px;
          background: var(--color-surface-raised);
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 14px;
        }
        .print-options-row {
          margin-bottom: 14px;
        }
        .print-options-row:last-child {
          margin-bottom: 0;
        }
        .print-options-label {
          display: block;
          font-size: 13px;
          color: var(--color-gold-bright);
          margin-bottom: 8px;
        }
        .print-size-option {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }
        .print-options-list {
          max-height: 260px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius);
          padding: 8px;
        }
        .print-options-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          padding: 4px;
          border-radius: 4px;
        }
        .print-options-item:hover {
          background: var(--color-surface);
        }
        .print-options-item input {
          margin-top: 3px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

function ScriptDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [script, setScript] = useState(null);
  const [segments, setSegments] = useState(null);
  const [sizeMode, setSizeMode] = useState("eighth");
  const [selectedKeys, setSelectedKeys] = useState(new Set());

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
      const withKeys = (segs || []).map((s, i) => ({ ...s, _key: s.id || `seg_${i}` }));
      setSegments(withKeys);
      setSelectedKeys(new Set(withKeys.map((s) => s._key)));
    })();
  }, [id]);

  if (!script || !segments) return <div className="container">در حال بارگذاری…</div>;

  // اگر هنوز قطعه‌ای ثبت نشده (مثلاً نسخه‌ای که قبل از افزودن این قابلیت ساخته شده)،
  // متن قدیمی script.body را به‌عنوان یک قطعه‌ی تک نمایش بده تا صفحه خالی نباشد.
  const displaySegments =
    segments.length > 0
      ? segments
      : script.body?.trim()
      ? [{ role: null, body: script.body, _key: "single" }]
      : [];

  // فقط کارت‌های انتخاب‌شده وارد خروجی چاپی می‌شوند؛ نمایش عادی داخل
  // برنامه (ScriptCard بالای همین صفحه) همیشه کامل و بدون فیلتر می‌ماند.
  const printSegments = displaySegments.filter((s) => selectedKeys.has(s._key));

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
        {script.role_name && <p className="page-subtitle no-print">{script.role_name}</p>}

        <div className="no-print" style={{ margin: "16px 0" }}>
          <button className="btn" onClick={() => window.print()} disabled={printSegments.length === 0}>
            🖨 خروجی کاغذی
          </button>
          {displaySegments.length > 0 && (
            <PrintOptions
              segments={displaySegments}
              isJong={isJong}
              sizeMode={sizeMode}
              setSizeMode={setSizeMode}
              selectedKeys={selectedKeys}
              setSelectedKeys={setSelectedKeys}
            />
          )}
        </div>

        {displaySegments.length === 0 ? (
          <div className="empty-state no-print">متنی برای این نسخه ثبت نشده است.</div>
        ) : (
          <div className="no-print">
            <ScriptCard segments={displaySegments} />
          </div>
        )}
      </div>

      {printSegments.length > 0 &&
        (isJong ? (
          <PrintJongDocument script={script} segments={printSegments} />
        ) : (
          <PrintBooklet script={script} segments={printSegments} sizeMode={sizeMode} />
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
