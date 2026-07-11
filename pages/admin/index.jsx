import Link from "next/link";
import Layout from "../../components/Layout";
import ProtectedRoute from "../../components/ProtectedRoute";
import AdminCategorizedScripts from "../../components/AdminCategorizedScripts";

function AdminDashboard() {
  return (
    <div className="container">
      <p className="eyebrow">پنل مدیریت</p>
      <div className="admin-row" style={{ marginBottom: 20 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          نسخ ثبت‌شده
        </h1>
        <Link href="/admin/new" className="btn btn-primary">
          + افزودن نسخه
        </Link>
        <Link href="/admin/banner" className="btn" style={{ marginInlineStart: 8 }}>
          بنر صفحه اصلی
        </Link>
      </div>

      <AdminCategorizedScripts />
    </div>
  );
}

export default function AdminIndexPage() {
  return (
    <ProtectedRoute requireAdmin>
      <Layout>
        <AdminDashboard />
      </Layout>
    </ProtectedRoute>
  );
}