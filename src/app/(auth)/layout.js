"use client";
import { motion } from "motion/react";
import { ShieldCheck, Globe, Search, ShieldAlert, Gauge, Eye } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];
const STEPS = [
  { icon: Globe, t: "Discovery", d: "Fetch site, policy & cookies" },
  { icon: Search, t: "Investigator", d: "Quote trackers, banner, clauses" },
  { icon: ShieldAlert, t: "Challenger", d: "Re-check every claim" },
  { icon: Gauge, t: "Risk score", d: "Red / Amber / Green" },
  { icon: Eye, t: "Watcher", d: "Monthly re-scan & alerts" },
];

export default function AuthLayout({ children }) {
  return (
    <div className="scenery min-h-screen p-3 sm:p-6 grid place-items-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
        className="grid w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/70 bg-window shadow-[0_50px_100px_-40px_rgba(30,50,80,.45)] lg:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-white lg:flex">
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-blue/25 blur-3xl" />
          <div className="relative flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-ink"><ShieldCheck className="size-5" /></span>
            <span className="font-display text-xl font-semibold">Privacy Auditor</span>
          </div>
          <div className="relative">
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6, ease }} className="font-display text-[34px] leading-[1.1] font-semibold">
              Is your website<br />DPDP-ready?
            </motion.h2>
            <p className="mt-3 max-w-sm text-[14px] text-white/70">Paste a URL. Agents read the trackers, cookie banner and privacy notice, quote the proof, double-check it and score it.</p>
            <div className="mt-8 space-y-2">
              {STEPS.map((s, i) => (
                <motion.div key={s.t} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.09, duration: 0.5, ease }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur">
                  <span className="grid size-8 place-items-center rounded-xl bg-white/10"><s.icon className="size-4" /></span>
                  <span className="text-[13.5px] font-medium">{s.t}</span>
                  <span className="ml-auto text-[12px] text-white/55">{s.d}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <p className="relative text-[12px] text-white/45">Checks against the Digital Personal Data Protection Act, 2023 (India).</p>
        </div>
        <div className="bg-white p-7 sm:p-12">{children}</div>
      </motion.div>
    </div>
  );
}
