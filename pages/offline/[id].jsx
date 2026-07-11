import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../components/Layout";
import ProtectedRoute from "../../components/ProtectedRoute";
import ScriptCard from "../../components/ScriptCard";

const OFFLINE_PREFIX = "offline_script_";

function OfflineReader() {
  const router = useRouter();
  const { id } = router.query;
  const [entry, setEntry] = useState(undefined); // undefined = در حال چک، null = پیدا نشد

  useEffect(() => {
    if (!id || typeof window === "undefined") return;
    const raw = window.localStorage.getItem(OFFLINE_PREFIX + id);
    setEntry(raw ? JSON.parse(raw) : null);
  }, [id]);

  if (entry === undefined) return <div className="container">در حال بارگذاری…</div>;

  if (entry === null) {
    return (
      <div className="container">
        <div className="empty-state">
          این نسخه هنوز برای آفلاین ذخیره نشده. از صفحه‌ی «دانلودها» دکمه‌ی «ذخیره برای آفلاین» رو بزنید.
        </div>
        <Link href="/downloads" className="btn" style={{ marginTop: 12 }}>
          بازگشت به دانلودها
        </Link>
      </div>
    );
  }

  const { script, segments } = entry;
  const displaySegments =
    segments?.length > 0 ? segments : script.body?.trim() ? [{ role: null, body: script.body }] : [];

  return (
    <div className="container">
      <p className="eyebrow">مشاهده‌ی آفلاین</p>
      <h1 className="page-title">{script.title}</h1>
      {(script.role_name || script.topic) && (
        <p className="page-subtitle">
          {script.role_name}
          {script.role_name && script.topic ? " از " : ""}
          {script.topic}
        </p>
      )}
      <ScriptCard segments={displaySegments} />
    </div>
  );
}

export default function OfflinePage() {
  return (
    <ProtectedRoute>
      <Layout>
        <OfflineReader />
      </Layout>
    </ProtectedRoute>
  );
}