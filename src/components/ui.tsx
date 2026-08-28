import type { ReactNode, ButtonHTMLAttributes } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-edge bg-surface p-5 ${className}`}>{children}</div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wider text-muted mb-4">{children}</h2>;
}

const BUTTON_STYLES = {
  primary: "bg-primary text-white hover:bg-primary/85",
  accent: "bg-accent text-background hover:bg-accent/85",
  ghost: "bg-transparent border border-edge text-foreground hover:bg-surface-2",
  danger: "bg-danger/15 border border-danger/40 text-danger hover:bg-danger/25",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_STYLES }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

const BADGE_STYLES: Record<string, string> = {
  queued: "bg-surface-2 text-muted",
  scraping: "bg-primary/15 text-primary",
  analyzing: "bg-primary/15 text-primary",
  generating: "bg-accent/15 text-accent",
  rendering: "bg-accent/15 text-accent",
  running: "bg-primary/15 text-primary",
  completed: "bg-success/15 text-success",
  ready: "bg-success/15 text-success",
  succeeded: "bg-success/15 text-success",
  partial: "bg-accent/15 text-accent",
  failed: "bg-danger/15 text-danger",
  timed_out: "bg-danger/15 text-danger",
  dead: "bg-danger/15 text-danger",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[status] ?? "bg-surface-2 text-muted"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted mt-1">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/60";

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-edge py-20 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
