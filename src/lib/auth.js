"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setUnauthorizedHandler, setWorkspaceId, getWorkspaceId, refreshAll } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const me = await api("/auth/me");
      if (me.workspace?.id && me.workspace.id !== getWorkspaceId()) setWorkspaceId(me.workspace.id);
      setSession(me);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      router.replace("/login");
    });
    load();
  }, [load, router]);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }, [router]);

  const switchWorkspace = useCallback(async (id) => {
    await api("/auth/switch", { method: "POST", body: { workspaceId: id } });
    setWorkspaceId(id);
    await load();
    refreshAll();
  }, [load]);

  const can = useCallback((perm) => !!session?.permissions?.includes(perm), [session]);

  return (
    <AuthCtx.Provider value={{ session, loading, reload: load, logout, switchWorkspace, can, user: session?.user, role: session?.role }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

// <Can perm="site:create">…</Can> renders children only when allowed.
export function Can({ perm, children, fallback = null }) {
  const { can } = useAuth();
  return can(perm) ? children : fallback;
}
