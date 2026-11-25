"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Globe, ShieldAlert, Bell, FileText, Users, History, Settings, BookOpen, Search, HelpCircle,
  PanelLeftClose, PanelLeftOpen, ChevronDown, Check, LogOut, Compass, Map, Keyboard, Scale, Sparkles, Menu, X, Plus,
  CircleDot, ShieldCheck, ChevronRight, Command,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, useApi } from "@/lib/api";
import { runTour, tourForPath, TOUR_PATHS, TOURS } from "@/lib/tours";
import { cn, RAG } from "@/lib/utils";
import { Avatar, Dropdown, MenuItem, Modal, Button, Kbd, ease } from "./ui";

// ---------------- Tour context ----------------
const TourCtx = createContext(null);
export const useTour = () => useContext(TourCtx);
const PENDING = "pa.pendingTour";

export function TourProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const start = useCallback((key) => {
    const path = TOUR_PATHS[key];
    if (key === "platform" || key === "site" || !path || pathname === path) return runTour(key);
    try { sessionStorage.setItem(PENDING, key); } catch {}
    router.push(path);
  }, [pathname, router]);

  useEffect(() => {
    let key = null;
    try { key = sessionStorage.getItem(PENDING); } catch {}
    if (!key) return;
    const timer = setTimeout(() => {
      try { sessionStorage.removeItem(PENDING); } catch {}
      runTour(key);
    }, 900);
    return () => clearTimeout(timer);
  }, [pathname]);

  const startPage = useCallback(() => runTour(tourForPath(pathname)), [pathname]);
  return <TourCtx.Provider value={{ start, startPage }}>{children}</TourCtx.Provider>;
}

// ---------------- Navigation ----------------
const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, tour: "nav-overview" },
  { href: "/sites", label: "Websites", icon: Globe, tour: "nav-sites" },
  { href: "/findings", label: "Findings", icon: ShieldAlert, tour: "nav-findings" },
  { href: "/alerts", label: "Alerts", icon: Bell, tour: "nav-alerts", badge: "alerts" },
];
const NAV2 = [
  { href: "/reports", label: "Reports", icon: FileText, tour: "nav-reports" },
  { href: "/team", label: "Team & roles", icon: Users, tour: "nav-team" },
  { href: "/activity", label: "Activity log", icon: History, tour: "nav-activity", perm: "activity:read" },
  { href: "/settings", label: "Settings", icon: Settings, tour: "nav-settings" },
  { href: "/guide", label: "Guide", icon: BookOpen, tour: "nav-guide" },
];
const ALL_PAGES = [...NAV, ...NAV2];

function NavItem({ item, collapsed, active, badge, onClick }) {
  return (
    <Link href={item.href} onClick={onClick} data-tour={item.tour} title={collapsed ? item.label : undefined}
      className={cn("group relative flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13.5px] transition-colors", active ? "text-ink" : "text-ink-2 hover:text-ink hover:bg-white/60")}>
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-white border border-line shadow-[0_1px_2px_rgba(16,24,40,.06)]" transition={{ type: "spring", bounce: 0.15, duration: 0.45 }} />}
      <item.icon className="relative size-[17px] shrink-0" strokeWidth={1.7} />
      {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
      {!!badge && (
        <span className={cn("relative grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10.5px] font-semibold text-white", collapsed && "absolute -right-0.5 -top-0.5")}>{badge}</span>
      )}
    </Link>
  );
}

function Section({ title, collapsed, children, open: initial = true }) {
  const [open, setOpen] = useState(initial);
  if (collapsed) return <div className="mt-3 space-y-0.5 border-t border-line pt-3">{children}</div>;
  return (
    <div className="mt-5">
      <button onClick={() => setOpen(!open)} className="mb-1 flex items-center gap-1 px-2.5 text-[12.5px] font-medium text-ink-3 hover:text-ink-2">
        {title} <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease }} className="space-y-0.5 overflow-hidden">
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WorkspaceSwitcher({ collapsed }) {
  const { session, switchWorkspace } = useAuth();
  return (
    <Dropdown width={260} trigger={({ toggle }) => (
      <button onClick={toggle} data-tour="brand" className="flex min-w-0 items-center gap-2.5 rounded-xl p-1 pr-2 hover:bg-white/60 transition">
        <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-ink text-white shadow-sm"><ShieldCheck className="size-[18px]" strokeWidth={2} /></span>
        {!collapsed && (
          <span className="min-w-0 text-left">
            <span className="block truncate font-display text-[16px] font-semibold leading-tight">{session?.workspace?.name}</span>
            <span className="block text-[11px] text-ink-3 leading-tight">Privacy Auditor · DPDP</span>
          </span>
        )}
      </button>
    )}>
      <div className="px-2.5 pb-1.5 pt-1 text-[11.5px] font-medium text-ink-3">Workspaces</div>
      {session?.workspaces?.map((w) => (
        <MenuItem key={w.id} icon={w.id === session.workspace.id ? Check : CircleDot} onClick={() => w.id !== session.workspace.id && switchWorkspace(w.id)} hint={w.role} active={w.id === session.workspace.id}>
          <span className="truncate">{w.name}</span>
        </MenuItem>
      ))}
    </Dropdown>
  );
}

export function Sidebar({ collapsed, setCollapsed, mobile, onNavigate }) {
  const pathname = usePathname();
  const { session, can, logout } = useAuth();
  const { data } = useApi("/sites");
  const atRisk = (data?.sites || []).filter((s) => s.lastRag && s.lastRag !== "green").slice(0, 3);
  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  return (
    <motion.aside animate={{ width: collapsed ? 76 : 248 }} transition={{ duration: 0.3, ease }}
      className={cn("flex h-full shrink-0 flex-col px-3 py-4", mobile && "w-[272px]!")}>
      <div className={cn("flex items-center justify-between gap-2 px-1", collapsed && "flex-col")}>
        <WorkspaceSwitcher collapsed={collapsed} />
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="rounded-lg p-1.5 text-ink-3 hover:bg-white/70 hover:text-ink" aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
          {NAV.map((n) => <NavItem key={n.href} item={n} collapsed={collapsed} active={isActive(n.href)} onClick={onNavigate} badge={n.badge === "alerts" ? session?.unreadAlerts : 0} />)}
        </div>

        {atRisk.length > 0 && (
          <Section title="Needs attention" collapsed={collapsed}>
            {atRisk.map((s) => (
              <Link key={s.id} href={`/sites/${s.id}`} onClick={onNavigate} title={s.name}
                className={cn("flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] text-ink-2 hover:bg-white/60 hover:text-ink transition-colors", pathname === `/sites/${s.id}` && "bg-white border border-line text-ink")}>
                <span className="grid size-[17px] shrink-0 place-items-center">
                  <span className="size-3 rounded-full border-[3px]" style={{ borderColor: RAG[s.lastRag].color }} />
                </span>
                {!collapsed && <span className="truncate">{s.name}</span>}
              </Link>
            ))}
          </Section>
        )}

        <Section title="Workspace" collapsed={collapsed}>
          {NAV2.filter((n) => !n.perm || can(n.perm)).map((n) => <NavItem key={n.href} item={n} collapsed={collapsed} active={isActive(n.href)} onClick={onNavigate} />)}
        </Section>
      </nav>

      <Dropdown align="left" width={232} className="mt-3" trigger={({ toggle }) => (
        <button onClick={toggle} data-tour="user" className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-white/70 transition">
          <Avatar name={session?.user?.name} size={34} />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium leading-tight">{session?.user?.name}</span>
              <span className="block truncate text-[11.5px] text-ink-3 leading-tight">{session?.user?.email}</span>
            </span>
          )}
        </button>
      )}>
        <div className="px-2.5 py-2">
          <div className="text-[12px] text-ink-3">Signed in as</div>
          <div className="text-[13px] font-medium truncate">{session?.user?.email}</div>
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold capitalize text-accent">{session?.role}</div>
        </div>
        <div className="my-1 h-px bg-line" />
        <Link href="/settings" data-close onClick={onNavigate}><MenuItem icon={Settings}>Settings</MenuItem></Link>
        <MenuItem icon={LogOut} danger onClick={logout}>Sign out</MenuItem>
      </Dropdown>
    </motion.aside>
  );
}

// ---------------- Help menu ----------------
const PRIMER = [
  ["Data Principal", "The person whose personal data is processed (your website visitor)."],
  ["Data Fiduciary", "You — the business deciding why and how data is processed."],
  ["Notice (S.5)", "Before or at collection, tell people what data, for what purpose, how to withdraw consent, and how to complain to the Board."],
  ["Consent (S.6)", "Free, specific, informed, unconditional and unambiguous, given by a clear affirmative action — and as easy to withdraw as to give."],
  ["Rights (S.11–14)", "Access a summary, correction & erasure, grievance redressal and nomination."],
  ["Children (S.9)", "Verifiable parental consent for under-18s; no tracking or targeted ads aimed at children."],
  ["Penalties", "Up to ₹250 crore per instance for failing to take reasonable security safeguards; up to ₹200 crore for children's-data breaches."],
];

const SHORTCUTS = [["Ctrl / ⌘ K", "Search & jump"], ["?", "Tour this page"], ["G then O", "Overview"], ["G then S", "Websites"], ["G then F", "Findings"], ["G then R", "Reports"]];

export function HelpMenu() {
  const { start, startPage } = useTour();
  const router = useRouter();
  const pathname = usePathname();
  const [modal, setModal] = useState(null);
  const pageTour = TOURS[tourForPath(pathname)];
  return (
    <>
      <Dropdown align="right" width={284} trigger={({ toggle, open }) => (
        <button onClick={toggle} data-tour="help" className={cn("flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[13px] text-ink-2 hover:text-ink transition", open && "bg-soft")}>
          <HelpCircle className="size-4" strokeWidth={1.8} /> <span className="hidden sm:inline">Help</span>
        </button>
      )}>
        <div className="rounded-xl bg-gradient-to-br from-accent-soft to-white p-3 mb-1">
          <div className="flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-accent" /> New here?</div>
          <p className="mt-0.5 text-[12px] text-ink-2">Take a quick guided tour of the whole platform.</p>
          <Button data-close size="sm" variant="primary" className="mt-2 w-full" icon={Compass} onClick={() => start("platform")}>Start platform tour</Button>
        </div>
        <MenuItem icon={Map} onClick={startPage} hint="?">Tour this page{pageTour && pageTour !== TOURS.platform ? ` · ${pageTour.title.replace(" tour", "")}` : ""}</MenuItem>
        <MenuItem icon={BookOpen} onClick={() => router.push("/guide")}>Guide & how-tos</MenuItem>
        <MenuItem icon={Scale} onClick={() => setModal("primer")}>DPDP Act in 2 minutes</MenuItem>
        <MenuItem icon={Keyboard} onClick={() => setModal("keys")}>Keyboard shortcuts</MenuItem>
      </Dropdown>

      <Modal open={modal === "primer"} onClose={() => setModal(null)} title="The DPDP Act in 2 minutes" description="Digital Personal Data Protection Act, 2023 — what this auditor checks for." width={600}
        footer={<Button variant="primary" onClick={() => { setModal(null); router.push("/guide#dpdp"); }}>Read the full clause list</Button>}>
        <div className="space-y-2.5">
          {PRIMER.map(([k, v], i) => (
            <motion.div key={k} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex gap-3 rounded-xl bg-soft/70 p-3">
              <div className="w-32 shrink-0 text-[13px] font-semibold">{k}</div>
              <div className="text-[13px] text-ink-2">{v}</div>
            </motion.div>
          ))}
        </div>
      </Modal>
      <Modal open={modal === "keys"} onClose={() => setModal(null)} title="Keyboard shortcuts" width={420}>
        <div className="divide-y divide-line">
          {SHORTCUTS.map(([k, v]) => <div key={k} className="flex items-center justify-between py-2.5 text-[13px]"><span className="text-ink-2">{v}</span><Kbd>{k}</Kbd></div>)}
        </div>
      </Modal>
    </>
  );
}

// ---------------- Command palette ----------------
export function CommandPalette({ open, setOpen }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const { data } = useApi(open ? "/sites" : null);
  const { start } = useTour();
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const pages = ALL_PAGES.map((p) => ({ type: "Page", label: p.label, icon: p.icon, run: () => router.push(p.href) }));
    const sites = (data?.sites || []).map((s) => ({ type: "Website", label: s.name, sub: s.url, rag: s.lastRag, icon: Globe, run: () => router.push(`/sites/${s.id}`) }));
    const actions = [
      { type: "Action", label: "Add websites", icon: Plus, run: () => router.push("/sites?add=1") },
      { type: "Action", label: "Start platform tour", icon: Compass, run: () => start("platform") },
    ];
    const all = [...actions, ...pages, ...sites];
    const s = q.toLowerCase().trim();
    return s ? all.filter((i) => (i.label + " " + (i.sub || "")).toLowerCase().includes(s)) : all;
  }, [data, q, router, start]);

  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);
  useEffect(() => setIdx(0), [q]);

  const run = (i) => { setOpen(false); i?.run(); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(items.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter") run(items[idx]);
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-[#10131a]/25 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease }}
            className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_40px_90px_-30px_rgba(16,24,40,.5)]">
            <div className="flex items-center gap-2.5 border-b border-line px-4">
              <Search className="size-4 text-ink-3" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search websites, pages and actions…" className="h-12 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-3" />
              <Kbd>Esc</Kbd>
            </div>
            <div className="max-h-[360px] overflow-y-auto p-1.5 scrollbar-thin">
              {items.length === 0 && <div className="py-10 text-center text-[13px] text-ink-3">No results for “{q}”</div>}
              {items.map((i, n) => (
                <button key={i.type + i.label + n} onMouseEnter={() => setIdx(n)} onClick={() => run(i)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors", n === idx ? "bg-soft" : "")}>
                  <i.icon className="size-4 text-ink-3" strokeWidth={1.7} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px]">{i.label}</span>
                    {i.sub && <span className="block truncate text-[11.5px] text-ink-3">{i.sub}</span>}
                  </span>
                  {i.rag && <span className="size-2 rounded-full" style={{ background: RAG[i.rag].color }} />}
                  <span className="text-[11px] text-ink-3">{i.type}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------- Top bar ----------------
const LABELS = { overview: "Overview", sites: "Websites", findings: "Findings", alerts: "Alerts", reports: "Reports", team: "Team & roles", activity: "Activity log", settings: "Settings", guide: "Guide" };

export function Topbar({ onSearch, onMenu, crumb }) {
  const pathname = usePathname();
  const { session } = useAuth();
  const seg = pathname.split("/")[1];
  const page = ALL_PAGES.find((p) => p.href === "/" + seg);
  const Icon = page?.icon || LayoutDashboard;
  return (
    <div className="flex h-[58px] items-center gap-3 border-b border-line px-4 sm:px-6">
      <button className="lg:hidden rounded-lg p-1.5 hover:bg-soft" onClick={onMenu} aria-label="Open menu"><Menu className="size-5" /></button>
      <div className="flex min-w-0 items-center gap-1.5 text-[13.5px] text-ink-2">
        <Icon className="size-4 shrink-0" strokeWidth={1.7} />
        <Link href={"/" + seg} className="hover:text-ink truncate">{LABELS[seg]}</Link>
        {crumb && <><ChevronRight className="size-3.5 text-ink-3" /><span className="truncate text-ink">{crumb}</span></>}
      </div>
      <button onClick={onSearch} data-tour="search" className="ml-auto hidden md:flex h-9 w-[280px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] text-ink-3 hover:border-ink/15 transition">
        <Search className="size-4" /> Search…
        <span className="ml-auto flex items-center gap-0.5"><Kbd><Command className="inline size-2.5" /></Kbd><Kbd>K</Kbd></span>
      </button>
      <button onClick={onSearch} className="md:hidden ml-auto rounded-xl border border-line p-2" aria-label="Search"><Search className="size-4" /></button>
      <Link href="/alerts" data-tour="alerts-bell" className="relative grid size-9 place-items-center rounded-xl border border-line bg-white text-ink-2 hover:text-ink transition" aria-label="Alerts">
        <Bell className="size-4" strokeWidth={1.8} />
        {session?.unreadAlerts > 0 && <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-white">{session.unreadAlerts}</span>}
      </Link>
      <HelpMenu />
    </div>
  );
}

// ---------------- Crumb context (pages set a trailing breadcrumb) ----------------
const CrumbCtx = createContext(() => {});
export const useCrumb = (label) => {
  const set = useContext(CrumbCtx);
  useEffect(() => { set(label); return () => set(null); }, [label, set]);
};

// ---------------- Welcome ----------------
function Welcome() {
  const { session, reload } = useAuth();
  const { start } = useTour();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (session?.user && session.user.onboarded === false) setTimeout(() => setOpen(true), 500); }, [session?.user]);
  const finish = async (tour) => {
    setOpen(false);
    await api("/auth/me", { method: "PATCH", body: { onboarded: true } }).catch(() => {});
    reload();
    if (tour) setTimeout(() => start("platform"), 350);
  };
  const steps = [
    { icon: Globe, t: "Feed it URLs", d: "Add one or many websites." },
    { icon: ShieldAlert, t: "Agents audit", d: "Trackers, banner & notice vs DPDP." },
    { icon: Check, t: "You decide", d: "Remediate, accept or dismiss." },
    { icon: Bell, t: "Watcher", d: "Monthly re-scans & alerts." },
  ];
  return (
    <Modal open={open} onClose={() => finish(false)} width={560} title={`Welcome, ${session?.user?.name?.split(" ")[0] || ""}`}
      description={`You're signed in to ${session?.workspace?.name} as ${session?.role}. Here's how Privacy Auditor works.`}
      footer={<><Button variant="ghost" onClick={() => finish(false)}>Skip for now</Button><Button variant="primary" icon={Compass} onClick={() => finish(true)}>Take the tour</Button></>}>
      <div className="grid grid-cols-2 gap-2.5">
        {steps.map((s, i) => (
          <motion.div key={s.t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent text-[12px] font-bold">{i + 1}</span><s.icon className="size-4 text-ink-2" /></div>
            <div className="mt-2 text-[13.5px] font-semibold">{s.t}</div>
            <div className="text-[12.5px] text-ink-3">{s.d}</div>
          </motion.div>
        ))}
      </div>
    </Modal>
  );
}

// ---------------- App shell ----------------
export function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [crumb, setCrumb] = useState(null);
  const { startPage } = useTour();

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("pa.collapsed") === "1"); } catch {}
  }, []);
  const toggle = (v) => { setCollapsed(v); try { localStorage.setItem("pa.collapsed", v ? "1" : "0"); } catch {} };

  // Global shortcuts
  useEffect(() => {
    let g = false, gt;
    const h = (e) => {
      const typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); return; }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "?") { startPage(); return; }
      if (e.key.toLowerCase() === "g") { g = true; clearTimeout(gt); gt = setTimeout(() => (g = false), 900); return; }
      if (g) {
        const map = { o: "/overview", s: "/sites", f: "/findings", r: "/reports", a: "/alerts", t: "/team" };
        const to = map[e.key.toLowerCase()];
        if (to) router.push(to);
        g = false;
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [router, startPage]);

  useEffect(() => setMobileOpen(false), [pathname]);

  if (loading || !session) {
    return (
      <div className="scenery grid min-h-screen place-items-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-ink text-white shadow-lg pulse-ring"><ShieldCheck className="size-6" /></span>
          <span className="text-[13px] text-ink-2">Loading your workspace…</span>
        </motion.div>
      </div>
    );
  }

  return (
    <CrumbCtx.Provider value={setCrumb}>
      <div className="scenery min-h-screen p-0 lg:p-5">
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease }}
          className="mx-auto flex h-screen lg:h-[calc(100vh-40px)] max-w-[1600px] overflow-hidden bg-window lg:rounded-[26px] lg:border lg:border-white/70 lg:shadow-[0_50px_100px_-40px_rgba(30,50,80,.45)]">
          <div className="hidden lg:block"><Sidebar collapsed={collapsed} setCollapsed={toggle} /></div>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
                <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.3, ease }} className="relative h-full w-[272px] bg-window shadow-xl">
                  <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 hover:bg-white" aria-label="Close menu"><X className="size-4" /></button>
                  <Sidebar mobile collapsed={false} setCollapsed={() => {}} onNavigate={() => setMobileOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <main className="flex min-w-0 flex-1 flex-col lg:my-2 lg:mr-2 lg:rounded-[20px] lg:border lg:border-line bg-panel overflow-hidden">
            <Topbar onSearch={() => setPalette(true)} onMenu={() => setMobileOpen(true)} crumb={crumb} />
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease }}
                className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8 sm:py-7">
                {children}
              </motion.div>
            </div>
          </main>
        </motion.div>
      </div>
      <CommandPalette open={palette} setOpen={setPalette} />
      <Welcome />
    </CrumbCtx.Provider>
  );
}
