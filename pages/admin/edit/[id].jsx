import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import ProtectedRoute from "../../../components/ProtectedRoute";
import ScriptForm from "../../../components/ScriptForm";
import { supabase } from "../../../lib/supabase";

function EditScript() {
  const router = useRouter();
  const { id } = router.query;
  const [initial, setInitial] = useState(null);
  const [initialSegments, setInitialSegments] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("scripts").select("*").eq("id", id).single();
      setInitial(data || null);
      const { data: segs } = await supabase
        .from("script_segments")
        .select("*")
        .eq("script_id", id)
        .order("position", { ascending: true });
      setInitialSegments(segs || []);
    })();
  }, [id]);

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <p className="eyebrow">پنل مدیریت</p>
      <h1 className="page-title">ویرایش نسخه</h1>
      {initial && initialSegments ? (
        <ScriptForm initial={initial} scriptId={id} initialSegments={initialSegments} />
      ) : (
        <p>در حال بارگذاری…</p>
      )}
    </div>
  );
}

export default function EditScriptPage() {
  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <EditScript />
      </Layout>
    </ProtectedRoute>
  );
}
