import { useEffect, useState } from "react";
import Link from "next/link";
import Layout from "../../components/Layout";
import ProtectedRoute from "../../components/ProtectedRoute";
import { supabase } from "../../lib/supabase";

async function uploadBannerImage(file) {
  const path = `site/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("banners").getPublicUrl(path);
  return data.publicUrl;
}

function BannerRow({ banner, isFirst, isLast, onMove, onChanged }) {
  const [text, setText] = useState(banner.banner_text || "");
  const [link, setLink] = useState(banner.banner_link || "");
  const [enabled, setEnabled] = useState(banner.enabled);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      let imageUrl = banner.banner_image_url;
      if (imageFile) imageUrl = await uploadBannerImage(imageFile);

      const { error: saveError } = await supabase
        .from("site_banners")
        .update({
          banner_text: text || null,
          banner_link: link || null,
          banner_image_url: imageUrl,
          enabled,
        })
        .eq("id", banner.id);
      if (saveError) throw saveError;

      setImageFile(null);
      onChanged();
    } catch (err) {
      setError("خطا: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("این اسلاید حذف شود؟")) return;
    await supabase.from("site_banners").delete().eq("id", banner.id);
    onChanged();
  };

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="field">
        <label>متن</label>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="field">
        <label>لینک (اختیاری)</label>
        <input type="text" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div className="field">
        <label>تصویر</label>
        {banner.banner_image_url && !imageFile && (
          <img src={banner.banner_image_url} alt="" className="banner-preview" />
        )}
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
      </div>
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          فعال (نمایش در اسلایدر)
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "در حال ذخیره…" : "ذخیره"}
        </button>
        <button type="button" className="btn" onClick={() => onMove(-1)} disabled={isFirst}>
          ▲ بالا
        </button>
        <button type="button" className="btn" onClick={() => onMove(1)} disabled={isLast}>
          ▼ پایین
        </button>
        <button type="button" className="btn" onClick={remove} style={{ color: "#d92630" }}>
          حذف
        </button>
      </div>
    </div>
  );
}

function NewBannerForm({ nextOrder, onAdded }) {
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadBannerImage(imageFile);

      const { error: insertError } = await supabase.from("site_banners").insert({
        banner_text: text || null,
        banner_link: link || null,
        banner_image_url: imageUrl,
        sort_order: nextOrder,
        enabled: true,
      });
      if (insertError) throw insertError;

      setText("");
      setLink("");
      setImageFile(null);
      onAdded();
    } catch (err) {
      setError("خطا: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={add} className="card">
      <h3 style={{ marginTop: 0 }}>افزودن اسلاید جدید</h3>
      <div className="field">
        <label>متن</label>
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="field">
        <label>لینک (اختیاری)</label>
        <input type="text" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div className="field">
        <label>تصویر (اختیاری)</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "در حال افزودن…" : "+ افزودن اسلاید"}
      </button>
    </form>
  );
}

function BannerAdmin() {
  const [banners, setBanners] = useState(null);

  const load = async () => {
    const { data } = await supabase.from("site_banners").select("*").order("sort_order", { ascending: true });
    setBanners(data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const move = async (index, dir) => {
    const target = index + dir;
    if (!banners || target < 0 || target >= banners.length) return;
    const a = banners[index];
    const b = banners[target];
    await supabase.from("site_banners").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("site_banners").update({ sort_order: a.sort_order }).eq("id", b.id);
    load();
  };

  if (!banners) return <p>در حال بارگذاری…</p>;

  const nextOrder = banners.length ? Math.max(...banners.map((b) => b.sort_order)) + 1 : 0;

  return (
    <>
      {banners.length === 0 && <p className="hint">هنوز اسلایدی اضافه نکرده‌اید.</p>}
      {banners.map((b, i) => (
        <BannerRow
          key={b.id}
          banner={b}
          isFirst={i === 0}
          isLast={i === banners.length - 1}
          onMove={(dir) => move(i, dir)}
          onChanged={load}
        />
      ))}
      <NewBannerForm nextOrder={nextOrder} onAdded={load} />
    </>
  );
}

export default function BannerAdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <div className="container">
          <p className="eyebrow">پنل مدیریت</p>
          <div className="admin-row" style={{ marginBottom: 20 }}>
            <h1 className="page-title" style={{ margin: 0 }}>
              اسلایدر بنر صفحه‌ی اصلی
            </h1>
            <Link href="/admin" className="btn">
              بازگشت
            </Link>
          </div>
          <p className="hint" style={{ marginBottom: 16 }}>
            اگه بیشتر از یک اسلاید فعال داشته باشید، توی صفحه‌ی اصلی خودکار (هر ۵ ثانیه) عوض می‌شن؛ کاربر هم می‌تونه
            روی موبایل با کشیدن انگشتش ورق بزنه.
          </p>
          <BannerAdmin />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}