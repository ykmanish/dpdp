"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Crown, ShieldCheck, Search, Eye as EyeIcon } from "lucide-react";
import { api, setWorkspaceId } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";

// Local demo accounts created by server/src/seed.js (development only).
const DEMO = process.env.NODE_ENV !== "production" ? [
  { role: "Owner", email: "owner@acme.demo", icon: Crown },
  { role: "Admin", email: "admin@acme.demo", icon: ShieldCheck },
  { role: "Auditor", email: "auditor@acme.demo", icon: Search },
  { role: "Viewer", email: "viewer@acme.demo", icon: EyeIcon },
] : [];
const DEMO_PASSWORD = "Demo@12345";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e, creds) => {
    e?.preventDefault();
    setError(""); setLoading(true);
    try {
      await api("/auth/login", { method: "POST", body: creds || { email, password } });
      setWorkspaceId("");
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/overview";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[380px]">
      <h1 className="font-display text-[28px] font-semibold">Welcome back</h1>
      <p className="mt-1 text-[14px] text-ink-2">Sign in to your privacy workspace.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Work email"><Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.in" /></Field>
        <Field label="Password">
          <div className="relative">
            <Input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pr-10" />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink" aria-label="Toggle password">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div>
        </Field>
        {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-red-soft px-3 py-2 text-[13px] text-red">{error}</motion.p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Sign in <ArrowRight className="size-4" /></Button>
      </form>

      {DEMO.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 text-[12px] text-ink-3"><span className="h-px flex-1 bg-line" />Explore with a demo role<span className="h-px flex-1 bg-line" /></div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO.map((d, i) => (
              <motion.button key={d.role} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileHover={{ y: -2 }}
                onClick={() => submit(null, { email: d.email, password: DEMO_PASSWORD })} disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-left hover:border-ink/20 hover:bg-soft transition">
                <d.icon className="size-4 text-accent" />
                <span><span className="block text-[13px] font-medium">{d.role}</span><span className="block text-[11px] text-ink-3">{d.email}</span></span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-[13px] text-ink-2">New here? <Link href="/register" className="font-medium text-ink underline-offset-4 hover:underline">Create a workspace</Link></p>
    </motion.div>
  );
}
