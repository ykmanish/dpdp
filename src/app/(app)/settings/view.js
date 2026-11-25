"use client";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Building2, User, KeyRound, Eye, Lock, Compass, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth, Can } from "@/lib/auth";
import { useTour } from "@/components/shell";
import { PageHeader, Card, Button, Field, Input, Select } from "@/components/ui";

function Section({ icon: Icon, title, desc, children, tour, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} data-tour={tour}>
      <Card className="grid gap-5 p-5 md:grid-cols-[240px_1fr]">
        <div>
          <div className="flex items-center gap-2 font-display text-[16px] font-semibold"><Icon className="size-4" />{title}</div>
          <p className="mt-1 text-[12.5px] text-ink-3">{desc}</p>
        </div>
        <div>{children}</div>
      </Card>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { session, reload, can } = useAuth();
  const { start } = useTour();
  const [ws, setWs] = useState({ name: "", scanFrequencyDays: 30 });
  const [name, setName] = useState("");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!session) return;
    setWs({ name: session.workspace.name, scanFrequencyDays: session.workspace.settings?.scanFrequencyDays ?? 30 });
    setName(session.user.name);
  }, [session]);

  const run = async (key, fn, msg) => {
    setBusy(key);
    try { await fn(); toast.success(msg); reload(); } catch (e) { toast.error(e.message); } finally { setBusy(""); }
  };
  const editable = can("settings:manage");

  return (
    <div>
      <PageHeader title="Settings" description="Workspace configuration and your profile." />
      <div className="space-y-3">
        <Section icon={Building2} title="Workspace" desc={editable ? "Name and Watcher schedule." : "Only owners and admins can change workspace settings."} tour="st-workspace">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Workspace name"><Input value={ws.name} disabled={!editable} onChange={(e) => setWs({ ...ws, name: e.target.value })} /></Field>
            <Field label="Watcher re-scan frequency" hint="How often every monitored site is re-audited automatically.">
              <Select value={ws.scanFrequencyDays} disabled={!editable} onChange={(e) => setWs({ ...ws, scanFrequencyDays: Number(e.target.value) })}>
                <option value={7}>Weekly</option><option value={14}>Every 2 weeks</option><option value={30}>Monthly (recommended)</option><option value={90}>Quarterly</option>
              </Select>
            </Field>
          </div>
          {editable ? (
            <Button className="mt-4" variant="primary" loading={busy === "ws"} onClick={() => run("ws", () => api("/workspace", { method: "PATCH", body: { name: ws.name, settings: { scanFrequencyDays: ws.scanFrequencyDays } } }), "Workspace saved")}>Save workspace</Button>
          ) : <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-3"><Lock className="size-3.5" />Read-only for your role ({session?.role}).</p>}
        </Section>

        <Section icon={User} title="Profile" desc="How you appear to your team." tour="st-profile" delay={0.05}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><Input value={session?.user?.email || ""} disabled /></Field>
          </div>
          <Button className="mt-4" loading={busy === "me"} onClick={() => run("me", () => api("/auth/me", { method: "PATCH", body: { name } }), "Profile saved")}>Save profile</Button>
        </Section>

        <Section icon={KeyRound} title="Password" desc="Use at least 8 characters." delay={0.1}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Current password"><Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} /></Field>
            <Field label="New password"><Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></Field>
          </div>
          <Button className="mt-4" loading={busy === "pw"} disabled={!pw.currentPassword || pw.newPassword.length < 8}
            onClick={() => run("pw", async () => { await api("/auth/me", { method: "PATCH", body: pw }); setPw({ currentPassword: "", newPassword: "" }); }, "Password updated")}>Update password</Button>
        </Section>

        <Section icon={Compass} title="Onboarding" desc="Replay the welcome and guided tours." delay={0.15}>
          <div className="flex flex-wrap gap-2">
            <Button icon={Compass} onClick={() => start("platform")}>Start platform tour</Button>
            <Button icon={RotateCcw} onClick={() => run("onb", () => api("/auth/me", { method: "PATCH", body: { onboarded: false } }), "Welcome screen will show again")}>Show welcome again</Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
