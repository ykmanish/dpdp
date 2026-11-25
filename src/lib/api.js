"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const WS_KEY = "pa.workspace";

export function getWorkspaceId() {
  try { return localStorage.getItem(WS_KEY) || ""; } catch { return ""; }
}
export function setWorkspaceId(id) {
  try { localStorage.setItem(WS_KEY, id); } catch {}
}

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = "GET", body, raw } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      "x-workspace-id": getWorkspaceId(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/auth/login")) onUnauthorized?.();
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

// Download a file from an authenticated endpoint.
export async function download(path, filename) {
  const res = await api(path, { raw: true });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new ApiError(j.error || "Export failed", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Tiny SWR-like hook: fetch on mount, optional polling, manual mutate.
export function useApi(path, { poll = 0, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!!path && enabled);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!path || !enabled) return;
    try {
      const d = await api(path);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    load();
    const onWs = () => load();
    window.addEventListener("pa:refresh", onWs);
    return () => { alive.current = false; window.removeEventListener("pa:refresh", onWs); };
  }, [load]);

  useEffect(() => {
    if (!poll) return;
    const t = setInterval(load, poll);
    return () => clearInterval(t);
  }, [poll, load]);

  return { data, error, loading, reload: load, setData };
}

export const refreshAll = () => window.dispatchEvent(new Event("pa:refresh"));
