import { useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError("ورود ناموفق بود. ایمیل یا رمز عبور را بررسی کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container" style={{ maxWidth: 380, paddingTop: 60 }}>
        <p className="eyebrow">هیئت تعزیه</p>
        <h1 className="page-title">ورود به کتابخانه</h1>
        <p className="page-subtitle">
          ورود مخصوص مدیران و مشترکان هیئت است.
        </p>

        <form onSubmit={handleSubmit} className="card">
          <div className="field">
            <label htmlFor="email">ایمیل</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">رمز عبور</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting ? "در حال ورود…" : "ورود"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </form>
      </div>
    </Layout>
  );
}
