import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import SplashScreen from "./SplashScreen";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requireAdmin && !isAdmin) {
      router.replace("/");
    }
  }, [user, isAdmin, loading, requireAdmin, router]);

  if (loading) {
    return <SplashScreen />;
  }
  if (!user || (requireAdmin && !isAdmin)) {
    return null;
  }
  return children;
}