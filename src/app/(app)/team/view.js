"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { UserPlus, Check, Minus, Trash2, Copy, Crown, ShieldCheck, Search, Eye, KeyRound } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Can, useAuth } from "@/lib/auth";
import { cn, timeAgo } from "@/lib/utils";
import { PageHeader, Card, Button, Avatar, Modal, Field, Input, Select, Skeleton, Pill } from "@/components/ui";

const ROLE_ICON = { owner: Crown, admin: ShieldCheck, auditor: Search, viewer: Eye };
const PERM_LABELS = {
  "site:read": "View websites & audits", "site:create": "Add & edit websites", "site:delete": "Delete websites", "audit:run": "Run audits",
  "finding:decide": "Decide on findings", "alert:manage": "Manage alerts", "report:export": "Export reports", "member:read": "See team members",
  "member:manage": "Invite & manage members", "settings:manage": "Workspace settings", "activity:read": "View activity log", "workspace:delete": "Delete workspace",
};

export default function TeamPage() {
  const { data, loading, reload } = useApi("/members");
  const { data: roles } = useApi("/roles");
  const { session, can } = useAuth();
  const [invite, setInvite] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "auditor" });
  const [busy, setBusy] = useState(false);
  const [temp, setTemp] = useState(null);
  const [remove, setRemove] = useState(null);
  const members = data?.members || [];

  const add = async () => {
    setBusy(true);
    try {
      const r = await api("/members", { method: "POST", body: form });
      toast.success(`${r.member.name} added as ${form.role}`);
      setInvite(false); setForm({ name: "", email: "", role: "auditor" }); reload();
      if (r.tempPassword) setTemp({ email: r.member.email, password: r.tempPassword });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const changeRole = async (m, role) => {
    try { await api(`/members/${m.id}`, { method: "PATCH", body: { role } }); toast.success(`${m.name} is now ${role}`); reload(); } catch (e) { toast.error(e.message); }
  };
  const doRemove = async () => {
    try { await api(`/members/${remove.id}`, { method: "DELETE" }); toast.success(`${remove.name} removed`); setRemove(null); reload(); } catch (e) { toast.error(e.message); }
  };
  const assignable = (r) => session.role === "owner" || r !== "owner";

  return (
    <div>
      <PageHeader title="Team & roles" description={`Who can see and change what in ${session?.workspace?.name}.`}>
        <Can perm="member:manage"><Button variant="primary" icon={UserPlus} onClick={() => setInvite(true)} data-tour="tm-invite">Add member</Button></Can>
      </PageHeader>

      <Card className="overflow-hidden" data-tour="tm-members">
        {loading && !data ? <div className="space-y-2 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div> : (
          <div className="divide-y divide-line-2">
            {members.map((m, i) => {
              const RI = ROLE_ICON[m.role];
              const editable = can("member:manage") && m.id !== session.user.id && assignable(m.role);
              return (
                <motion.div key={m.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <Avatar name={m.name} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13.5px] font-medium">{m.name}{m.id === session.user.id && <Pill>You</Pill>}{m.mustChangePassword && <Pill color="var(--amber)" soft="var(--amber-soft)">Pending first login</Pill>}</div>
                    <div className="text-[12px] text-ink-3">{m.email} · {m.lastLoginAt ? `active ${timeAgo(m.lastLoginAt)}` : "never signed in"}</div>
                  </div>
                  {editable ? (
                    <Select value={m.role} onChange={(e) => changeRole(m, e.target.value)} className="h-9 w-36 py-0 capitalize">
                      {(roles?.roles || []).filter((r) => assignable(r.key)).map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                    </Select>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-2.5 py-1 text-[12px] font-medium capitalize text-ink-2"><RI className="size-3.5" />{m.role}</span>
                  )}
                  {editable && <button onClick={() => setRemove(m)} className="rounded-lg p-2 text-ink-3 hover:bg-red-soft hover:text-red" aria-label="Remove"><Trash2 className="size-4" /></button>}
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>

      <h3 className="mb-3 mt-8 font-display text-[17px] font-semibold">Role permissions</h3>
      <Card className="overflow-hidden" data-tour="tm-roles">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="bg-soft/60 text-left">
                <th className="px-4 py-3 text-[12px] font-medium text-ink-3">Permission</th>
                {(roles?.roles || []).map((r) => {
                  const RI = ROLE_ICON[r.key];
                  return <th key={r.key} className={cn("px-4 py-3 text-center", r.key === session.role && "bg-accent-soft/60")}><div className="inline-flex items-center gap-1.5 font-semibold"><RI className="size-3.5" />{r.label}</div><div className="mx-auto mt-0.5 max-w-[150px] text-[11px] font-normal text-ink-3">{r.description}</div></th>;
                })}
              </tr>
            </thead>
            <tbody>
              {Object.entries(roles?.permissions || {}).map(([p, allowed], i) => (
                <motion.tr key={p} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-t border-line-2">
                  <td className="px-4 py-2.5 text-ink-2">{PERM_LABELS[p] || p}<span className="ml-2 font-mono text-[10.5px] text-ink-3">{p}</span></td>
                  {roles.roles.map((r) => (
                    <td key={r.key} className={cn("px-4 py-2.5 text-center", r.key === session.role && "bg-accent-soft/30")}>
                      {allowed.includes(r.key) ? <Check className="mx-auto size-4 text-green" /> : <Minus className="mx-auto size-4 text-line" />}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={invite} onClose={() => setInvite(false)} title="Add a team member" description="If they don't have an account yet, we'll create one with a one-time password."
        footer={<><Button variant="ghost" onClick={() => setInvite(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={add} disabled={!form.email}>Add member</Button></>}>
        <div className="space-y-3">
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.in" /></Field>
          <Field label="Role" hint={roles?.roles?.find((r) => r.key === form.role)?.description}>
            <div className="grid grid-cols-2 gap-2">
              {(roles?.roles || []).filter((r) => assignable(r.key)).map((r) => {
                const RI = ROLE_ICON[r.key];
                return (
                  <button type="button" key={r.key} onClick={() => setForm({ ...form, role: r.key })}
                    className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13px] transition", form.role === r.key ? "border-ink bg-soft" : "border-line hover:bg-soft/60")}>
                    <RI className="size-4" />{r.label}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
      </Modal>

      <Modal open={!!temp} onClose={() => setTemp(null)} title="Share these sign-in details" description="Shown once. Ask them to change the password after signing in (Settings → Profile)."
        footer={<Button variant="primary" onClick={() => setTemp(null)}>Done</Button>}>
        <div className="space-y-2 rounded-xl bg-soft p-3 font-mono text-[13px]">
          <div>{temp?.email}</div>
          <div className="flex items-center gap-2"><KeyRound className="size-4 text-ink-3" />{temp?.password}
            <button onClick={() => { navigator.clipboard?.writeText(temp.password); toast.success("Copied"); }} className="ml-auto rounded-lg p-1.5 hover:bg-white" aria-label="Copy"><Copy className="size-3.5" /></button>
          </div>
        </div>
      </Modal>

      <Modal open={!!remove} onClose={() => setRemove(null)} title={`Remove ${remove?.name}?`} description="They lose access to this workspace immediately. Their past activity stays in the log."
        footer={<><Button variant="ghost" onClick={() => setRemove(null)}>Cancel</Button><Button variant="danger" onClick={doRemove}>Remove</Button></>} />
    </div>
  );
}
