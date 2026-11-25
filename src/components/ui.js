"use client";
import { useEffect, useRef, useState, forwardRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, animate } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { cn, RAG, SEVERITY, initials, avatarColor } from "@/lib/utils";

export const ease = [0.22, 1, 0.36, 1];

export const Button = forwardRef(function Button({ variant = "secondary", size = "md", loading, icon: Icon, className, children, ...p }, ref) {
  const v = {
    primary: "bg-ink text-white hover:bg-black shadow-[0_1px_0_rgba(255,255,255,.15)_inset,0_1px_2px_rgba(0,0,0,.2)]",
    secondary: "bg-white text-ink border border-line hover:bg-soft",
    ghost: "text-ink-2 hover:bg-soft hover:text-ink",
    accent: "bg-accent text-white hover:brightness-105 shadow-[0_6px_16px_-6px_rgba(242,107,29,.7)]",
    danger: "bg-red-soft text-red hover:bg-red hover:text-white",
  }[variant];
  const s = { sm: "h-8 px-2.5 text-[12.5px] gap-1.5 rounded-[10px]", md: "h-9 px-3.5 text-[13px] gap-2 rounded-xl", lg: "h-11 px-5 text-sm gap-2 rounded-xl" }[size];
  return (
    <motion.button ref={ref} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
      className={cn("inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none", v, s, className)}
      disabled={loading || p.disabled} {...p}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" strokeWidth={1.8} /> : null}
      {children}
    </motion.button>
  );
});

export function Card({ className, children, hover, ...p }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white", hover && "transition-all hover:shadow-[0_12px_32px_-16px_rgba(16,24,40,.22)] hover:-translate-y-0.5", className)} {...p}>
      {children}
    </div>
  );
}

export function Pill({ color = "var(--ink-2)", soft = "var(--soft)", className, children, dot, icon: Icon }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium whitespace-nowrap", className)} style={{ color, background: soft }}>
      {dot && <span className="size-1.5 rounded-full" style={{ background: color }} />}
      {Icon && <Icon className="size-3.5" strokeWidth={2} />}
      {children}
    </span>
  );
}

export const RagPill = ({ rag, className, label }) => {
  const r = RAG[rag] || RAG.none;
  return <Pill dot color={r.color} soft={r.soft} className={className}>{label || r.label}</Pill>;
};

export const SeverityPill = ({ severity }) => {
  const s = SEVERITY[severity] || SEVERITY.low;
  return <Pill color={s.color} soft={s.soft}>{s.label}</Pill>;
};

export function CountUp({ value, duration = 0.9, className, suffix = "", style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (value == null || !ref.current) return;
    const ctrl = animate(0, value, { duration, ease, onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v) + suffix; } });
    return () => ctrl.stop();
  }, [value, duration, suffix]);
  return <span ref={ref} className={className} style={style}>{value == null ? "—" : 0}</span>;
}

export function ScoreRing({ score, rag, size = 120, stroke = 10, label = "/100" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = (RAG[rag] || RAG.none).color;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-2)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c - (c * (score ?? 0)) / 100 }} transition={{ duration: 1.1, ease }} />
      </svg>
      <div className="absolute text-center">
        <CountUp value={score} className="font-display text-[28px] font-semibold leading-none" style={{ fontSize: size * 0.27 }} />
        <div className="text-[11px] text-ink-3 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// Segmented progress bar like the reference design.
export function SegmentBar({ value, total, segments = 14, color = "var(--accent)" }) {
  const filled = total ? Math.round((value / total) * segments) : 0;
  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: segments }).map((_, i) => (
        <motion.span key={i} initial={{ scaleY: 0.3, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ delay: i * 0.025, duration: 0.3 }}
          className="h-2.5 w-[5px] rounded-[2px]" style={{ background: i < filled ? color : "var(--line)" }} />
      ))}
    </div>
  );
}

export function Avatar({ name, size = 28, className }) {
  return (
    <span className={cn("inline-grid place-items-center rounded-full text-white font-semibold ring-2 ring-white shrink-0", className)}
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }} title={name}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names = [], max = 4, size = 26 }) {
  return (
    <div className="flex -space-x-2">
      {names.slice(0, max).map((n) => <Avatar key={n} name={n} size={size} />)}
      {names.length > max && <span className="inline-grid place-items-center rounded-full bg-soft text-[11px] text-ink-2 ring-2 ring-white" style={{ width: size, height: size }}>+{names.length - max}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, width = 520, footer }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-[#10131a]/30 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div role="dialog" aria-modal className="relative w-full rounded-2xl bg-white shadow-[0_40px_80px_-24px_rgba(16,24,40,.45)] border border-line"
            style={{ maxWidth: width }} initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} transition={{ duration: 0.28, ease }}>
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                {description && <p className="text-[13px] text-ink-3 mt-1">{description}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-soft hover:text-ink" aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="px-6 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-3.5 bg-soft/40 rounded-b-2xl">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11.5px] text-ink-3">{hint}</span>}
    </label>
  );
}

const widthOf = (c = "") => (/(^|\s)w-/.test(c) ? "" : "w-full");
export const inputCls = "rounded-xl border border-line bg-white px-3 py-2 text-[13.5px] outline-none transition placeholder:text-ink-3 focus:border-ink/30 focus:ring-4 focus:ring-ink/5";
export const Input = forwardRef(function Input({ className, ...p }, ref) { return <input ref={ref} className={cn(inputCls, widthOf(className), className)} {...p} />; });
export const Textarea = forwardRef(function Textarea({ className, ...p }, ref) { return <textarea ref={ref} className={cn(inputCls, widthOf(className), "resize-none", className)} {...p} />; });
export const Select = ({ className, children, ...p }) => <select className={cn(inputCls, widthOf(className), "appearance-none pr-8 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%238a8f98%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-no-repeat bg-[right_10px_center]", className)} {...p}>{children}</select>;

export const Skeleton = ({ className }) => <div className={cn("skeleton", className)} />;

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid place-items-center rounded-2xl border border-dashed border-line py-14 px-6 text-center dot-grid">
      {Icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-white border border-line shadow-sm"><Icon className="size-5 text-ink-2" strokeWidth={1.7} /></div>}
      <h4 className="font-display text-base font-semibold">{title}</h4>
      {children && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

export function PageHeader({ title, description, children, tour }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4" data-tour={tour}>
      <div>
        <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="font-display text-[26px] font-semibold leading-tight">{title}</motion.h1>
        {description && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }} className="mt-1 text-[14px] text-ink-2">{description}</motion.p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, id = "tabs" }) {
  return (
    <div className="flex gap-1 rounded-xl bg-soft p-1 w-fit overflow-x-auto no-scrollbar max-w-full">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} data-tour={t.tour}
          className={cn("relative rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition-colors whitespace-nowrap", value === t.value ? "text-ink" : "text-ink-3 hover:text-ink-2")}>
          {value === t.value && <motion.span layoutId={`${id}-pill`} className="absolute inset-0 rounded-[10px] bg-white shadow-sm border border-line" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />}
          <span className="relative flex items-center gap-1.5">{t.icon && <t.icon className="size-3.5" />}{t.label}{t.count != null && <span className="text-[11px] text-ink-3">{t.count}</span>}</span>
        </button>
      ))}
    </div>
  );
}

// Dropdown menu anchored to its trigger.
export function Dropdown({ trigger, children, align = "left", width = 220, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const k = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div className={cn("relative", className)} ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.16, ease }}
            className={cn("absolute z-50 mt-2 rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(16,24,40,.35)]", align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left")}
            style={{ width }} onClick={(e) => e.target.closest("[data-close]") && setOpen(false)}>
            {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onClick, hint, danger, active, ...p }) {
  return (
    <button data-close onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors", danger ? "text-red hover:bg-red-soft" : "text-ink-2 hover:bg-soft hover:text-ink", active && "bg-soft text-ink")} {...p}>
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={1.7} />}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[11px] text-ink-3">{hint}</span>}
    </button>
  );
}

export const Kbd = ({ children }) => <kbd className="rounded-md border border-line bg-soft px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">{children}</kbd>;

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease } } },
};
