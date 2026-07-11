import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // "admin" | "subscriber" | null
  const [loading, setLoading] = useState(true);

  const loadRole = async (currentUser) => {
    if (!currentUser) {
      setRole(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    setRole(data?.role || "subscriber");
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user || null);
      await loadRole(session?.user || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        await loadRole(session?.user || null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider
      value={{ user, role, loading, login, logout, isAdmin: role === "admin" }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
