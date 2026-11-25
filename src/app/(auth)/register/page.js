"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { api, setWorkspaceId } from "@/lib/api";
import { Button, Field, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [f, setF] = useState({ name: "", email: "", password: "", workspaceName: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const rules = [
    { ok: f.password.length >= 8, t: "8+ characters" },
    { ok: /[A-Z]/.test(f.password) && /[a-z]/.test(f.password), t: "Upper & lower case" },
    { ok: /\d/.test(f.password), t: "A number" },
  ];

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api("/auth/register", { method: "POST", body: f });
      setWorkspaceId("");
      window.location.href = "/overview";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-[380px]">
      <h1 className="font-display text-[28px] font-semibold">Create your workspace</h1>
      <p className="mt-1 text-[14px] text-ink-2">You&apos;ll be the owner. Invite your team after.</p>
      <form onSubmit={submit} className="mt-7 space-y-3.5">
        <Field label="Full name"><Input required value={f.name} onChange={set("name")} placeholder="Priya Sharma" autoComplete="name" /></Field>
        <Field label="Work email"><Input type="email" required value={f.email} onChange={set("email")} placeholder="you@company.in" autoComplete="email" /></Field>
        <Field label="Company / workspace name"><Input value={f.workspaceName} onChange={set("workspaceName")} placeholder="Acme Digital" /></Field>
        <Field label="Password">
          <Input type="password" required value={f.password} onChange={set("password")} placeholder="Create a password" autoComplete="new-password" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rules.map((r) => (
              <span key={r.t} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition-colors", r.ok ? "bg-green-soft text-green" : "bg-soft text-ink-3")}>
                <Check className="size-3" /> {r.t}
              </span>
            ))}
          </div>
        </Field>
        {error && <p className="rounded-xl bg-red-soft px-3 py-2 text-[13px] text-red">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Create workspace <ArrowRight className="size-4" /></Button>
      </form>
      <p className="mt-7 text-center text-[13px] text-ink-2">Already have an account? <Link href="/login" className="font-medium text-ink hover:underline underline-offset-4">Sign in</Link></p>
    </motion.div>
  );
}
