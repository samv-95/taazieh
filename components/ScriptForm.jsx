import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

let uidCounter = 0;
const uid = () => `seg_${Date.now()}_${uidCounter++}`;

export default function ScriptForm({ initial, scriptId, initialSegments }) {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState(initial?.title || "");
  const [type, setType] = useState(initial?.type || "majles");
  const [topic, setTopic] = useState(initial?.topic || "");
  const [roleName, setRoleName] = useState(initial?.role_name || "");
  const [mediaType, setMediaType] = useState(initial?.media_type || "none");
  const [mediaFile, setMediaFile] = useState(null);
  const [existingMediaUrl] = useState(initial?.media_url || "");
  const [bannerFile, setBannerFile] = useState(null);
  const [existingBannerUrl] = useState(initial?.banner_url || "");
  const [printFontSizePt, setPrintFontSizePt] = useState(initial?.print_font_size_pt || "");

  // دسته‌بندی‌های (نقش/موضوع) موجود، برای پیشنهاد خودکار موقع تایپ —
  // تا نسخه‌ی جدید دقیقاً به همون دسته‌ی قبلی توی صفحه‌ی اصلی بپیونده.
  const [roleOptions, setRoleOptions] = useState([]);
  const [topicOptions, setTopicOptions] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("scripts").select("role_name, topic");
      if (!data) return;
      const roles = new Set();
      const topics = new Set();
      data.forEach((s) => {
        if (s.role_name?.trim()) roles.add(s.role_name.trim());
        if (s.topic?.trim()) topics.add(s.topic.trim());
      });
      setRoleOptions(Array.from(roles).sort());
      setTopicOptions(Array.from(topics).sort());
    })();
  }, []);


  // هر قطعه: { key, role, body, sourceSegmentId }
  const [segments, setSegments] = useState(
    initialSegments?.length
      ? initialSegments.map((s) => ({
          key: uid(),
          role: s.role || "",
          body: s.body || "",
          sourceSegmentId: s.source_segment_id || null,
        }))
      : [{ key: uid(), role: "", body: "", sourceSegmentId: null }]
  );

  // جست‌وجوی نقش برای جُنگ
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("script_segments")
        .select("id, role, body, script_id, scripts(title)")
        .or(`role.ilike.%${searchQuery.trim()}%,body.ilike.%${searchQuery.trim()}%`)
        .limit(20);
      if (active) {
        setSearchResults(data || []);
        setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [searchQuery, type]);

  const addSegment = (fromResult) => {
    if (fromResult) {
      setSegments((prev) => [
        ...prev,
        {
          key: uid(),
          role: fromResult.role || "",
          body: fromResult.body || "",
          sourceSegmentId: fromResult.id,
        },
      ]);
    } else {
      setSegments((prev) => [...prev, { key: uid(), role: "", body: "", sourceSegmentId: null }]);
    }
  };

  const updateSegment = (key, field, value) => {
    setSegments((prev) => prev.map((s) => (s.key === key ? { ...s, [field]: value } : s)));
  };

  const removeSegment = (key) => {
    setSegments((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  };

  const moveSegment = (index, dir) => {
    setSegments((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      let mediaUrl = existingMediaUrl;
      if (mediaType !== "none" && mediaFile) {
        setProgressText("در حال آپلود مدیا…");
        const path = `${Date.now()}_${mediaFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(path, mediaFile, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("media").getPublicUrl(path);
        mediaUrl = data.publicUrl;
      }

      let bannerUrl = existingBannerUrl;
      if (bannerFile) {
        setProgressText("در حال آپلود بنر…");
        const path = `${Date.now()}_${bannerFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("banners")
          .upload(path, bannerFile, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("banners").getPublicUrl(path);
        bannerUrl = data.publicUrl;
      }

      const fullBody = segments.map((s) => s.body).join("\n\n");

      const payload = {
        title,
        type,
        topic: topic || null,
        role_name: roleName || null,
        body: fullBody,
        media_type: mediaType,
        media_url: mediaType === "none" ? null : mediaUrl,
        banner_url: bannerUrl || null,
        print_font_size_pt: printFontSizePt ? Number(printFontSizePt) : null,
        updated_at: new Date().toISOString(),
      };

      let currentScriptId = scriptId;
      let saveError;
      if (scriptId) {
        ({ error: saveError } = await supabase.from("scripts").update(payload).eq("id", scriptId));
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("scripts")
          .insert({ ...payload, created_by: user?.id || null })
          .select("id")
          .single();
        saveError = insertError;
        currentScriptId = inserted?.id;
      }
      if (saveError) throw saveError;

      setProgressText("در حال ذخیره‌ی متن‌ها…");
      // ساده‌ترین راه برای همگام‌سازی قطعات: حذف قطعات قبلی و درج دوباره با ترتیب فعلی
      await supabase.from("script_segments").delete().eq("script_id", currentScriptId);
      const segmentRows = segments
        .filter((s) => s.body.trim())
        .map((s, i) => ({
          script_id: currentScriptId,
          role: s.role || null,
          body: s.body,
          position: i,
          source_segment_id: s.sourceSegmentId,
        }));
      if (segmentRows.length) {
        const { error: segError } = await supabase.from("script_segments").insert(segmentRows);
        if (segError) throw segError;
      }

      router.push("/admin");
    } catch (err) {
      setError("ذخیره‌سازی با خطا مواجه شد: " + (err.message || ""));
    } finally {
      setSaving(false);
      setProgressText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="field">
        <label htmlFor="type">نوع نسخه</label>
        <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="majles">مجلس</option>
          <option value="jong">جُنگ (ترکیبی از چند نقش)</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="title">عنوان</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثلاً: مجلس شهادت حضرت علی‌اکبر (ع)"
          required
        />
      </div>

<div className="field-row">
        <div className="field">
          <label htmlFor="roleName">نقش اصلی (برای صفحه‌ی جلد و دسته‌بندی)</label>
          <input
            id="roleName"
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="مثلاً: شمر"
            list="roleNameOptions"
          />
          <datalist id="roleNameOptions">
            {roleOptions.map((r) => (
              <option value={r} key={r} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="topic">موضوع مجلس (برای صفحه‌ی جلد و دسته‌بندی)</label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="مثلاً: شهادت امام"
            list="topicOptions"
          />
          <datalist id="topicOptions">
            {topicOptions.map((t) => (
              <option value={t} key={t} />
            ))}
          </datalist>
        </div>
      </div>
      <p className="hint">
        صفحه‌ی جلد در خروجی کاغذی به‌صورت «{roleName || "نقش"} از {topic || "موضوع"}» نمایش داده می‌شود. توی صفحه‌ی
        اصلی هم نسخه‌ها بر اساس همین «نقش اصلی» دسته‌بندی می‌شن — برای اینکه این نسخه توی دسته‌ی موجودی مثل «عابس»
        قرار بگیره، حین تایپ از لیست پیشنهادی همون اسم قبلی رو انتخاب کنید.
      </p>
      {type === "majles" && (
        <div className="field">
          <label htmlFor="printFontSizePt">سایز فونت خروجی کاغذی این نسخه (اختیاری)</label>
          <input
            id="printFontSizePt"
            type="number"
            min="8"
            max="40"
            step="0.5"
            value={printFontSizePt}
            onChange={(e) => setPrintFontSizePt(e.target.value)}
            placeholder="پیش‌فرض: ۱۸"
          />
          <p className="hint">
            اگه خالی بذارید، از سایز پیش‌فرض (۱۸) استفاده می‌شه. برای متن‌های طولانی‌تر می‌تونید عدد کوچیک‌تر بذارید
            تا صفحات کمتری لازم بشه.
          </p>
        </div>
      )}

      <div className="field">
        <label htmlFor="banner">بنر مجلس (تصویر)</label>
        {existingBannerUrl && !bannerFile && (
          <img src={existingBannerUrl} alt="بنر فعلی" className="banner-preview" />
        )}
        <input
          id="banner"
          type="file"
          accept="image/*"
          onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="field">
        <label htmlFor="mediaType">نوع مدیا (بالای متن نمایش داده می‌شود)</label>
        <select id="mediaType" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
          <option value="none">بدون مدیا</option>
          <option value="audio">صوت</option>
          <option value="video">ویدئو</option>
        </select>
      </div>

      {mediaType !== "none" && (
        <div className="field">
          <label htmlFor="mediaFile">
            فایل {mediaType === "video" ? "ویدئو" : "صوت"}
            {existingMediaUrl ? " (برای تغییر، فایل جدید انتخاب کنید)" : ""}
          </label>
          <input
            id="mediaFile"
            type="file"
            accept={mediaType === "video" ? "video/*" : "audio/*"}
            onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

{(
        <div className="jong-search-box">
          <label htmlFor="roleSearch">جست‌وجوی نقش یا متن در نسخه‌های دیگر (مجلس یا جُنگ)</label>
          <input
            id="roleSearch"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="مثلاً: شمر"
          />
          {searching && <p className="hint">در حال جست‌وجو…</p>}
          {searchResults.length > 0 && (
            <div className="jong-search-results">
              {searchResults.map((r) => (
                <div key={r.id} className="jong-search-result">
                  <div>
                    <strong>{r.role || "بدون نقش"}</strong>
                    <span className="meta"> — {r.scripts?.title}</span>
                    <p className="excerpt">{(r.body || "").slice(0, 90)}…</p>
                  </div>
                  <button type="button" className="btn" onClick={() => addSegment(r)}>
                    + افزودن
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="segments-editor">
        <label>متن {type === "jong" ? "(نقش‌ها و توصیف اکت)" : ""}</label>
        {segments.map((seg, i) => (
          <div key={seg.key}>
            <div className="segment-block">
              <div className="segment-block-header">
                <input
                  type="text"
                  className="segment-role-input"
                  value={seg.role}
                  onChange={(e) => updateSegment(seg.key, "role", e.target.value)}
                  placeholder="نام نقش (اختیاری، مثلاً: شمر یا توصیف صحنه)"
                />
                <div className="segment-block-actions">
                  <button type="button" className="btn-icon" onClick={() => moveSegment(i, -1)} title="جابه‌جایی به بالا">
                    ▲
                  </button>
                  <button type="button" className="btn-icon" onClick={() => moveSegment(i, 1)} title="جابه‌جایی به پایین">
                    ▼
                  </button>
                  <button
                    type="button"
                    className="btn-icon btn-icon-danger"
                    onClick={() => removeSegment(seg.key)}
                    title="حذف این قطعه"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <textarea
                value={seg.body}
                onChange={(e) => updateSegment(seg.key, "body", e.target.value)}
                placeholder={
                  type === "jong" ? "متن این نقش یا توصیف اکت بازیگر را بنویسید…" : "بخشی از متن مجلس را بنویسید…"
                }
              />
            </div>
            {i < segments.length - 1 && <div className="segment-divider" aria-hidden="true" />}
          </div>
        ))}
        <button type="button" className="btn" onClick={() => addSegment()}>
          + افزودن متن
        </button>
        <p className="hint">
          هر «افزودن متن» یک قطعه‌ی جدا می‌سازد که در فرم با خط‌چین از هم جدا نشان داده می‌شود، اما در خروجی کاغذی و
          نمایش نهایی به‌صورت متن پیوسته دیده می‌شود.
        </p>
      </div>

      <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
        {saving ? progressText || "در حال ذخیره…" : "ذخیره نسخه"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
