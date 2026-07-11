import Layout from "../../components/Layout";
import ProtectedRoute from "../../components/ProtectedRoute";
import ScriptForm from "../../components/ScriptForm";

function NewScript() {
  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <p className="eyebrow">پنل مدیریت</p>
      <h1 className="page-title">افزودن نسخه جدید</h1>
      <p className="page-subtitle">
        می‌توانید یک «مجلس» معمولی یا یک «جُنگ» (ترکیبی از نقش‌های مجالس مختلف) بسازید.
      </p>
      <ScriptForm />
    </div>
  );
}

export default function NewScriptPage() {
  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <NewScript />
      </Layout>
    </ProtectedRoute>
  );
}
