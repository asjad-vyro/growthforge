"use client";

import type { ReactNode } from "react";

/* Shared brain.market design primitives, ported from the Claude Design canvas
   (React landing page setup). Tokens live in globals.css under --bm-*. */

export const BM_TAGLINE = "You stay calm. We handle what matters.";
export const BM_NAME = "brain.market";

/** The brain mark — two mirrored lobes around a centre stem. */
export function BrainMark({ size = 22, color = "#0871E7" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none" }}
      aria-hidden
    >
      <path d="M12 5.6v12.8" />
      <path d="M12 7.2a3 3 0 0 0-5.5-1.7A2.6 2.6 0 0 0 4 8a2.7 2.7 0 0 0 .7 1.8A2.8 2.8 0 0 0 4.2 14 2.9 2.9 0 0 0 7 17.4 3 3 0 0 0 12 16" />
      <path d="M12 7.2a3 3 0 0 1 5.5-1.7A2.6 2.6 0 0 1 20 8a2.7 2.7 0 0 1-.7 1.8 2.8 2.8 0 0 1 .5 4.2 2.9 2.9 0 0 1-2.8 3.4 3 3 0 0 1-5-1.4" />
    </svg>
  );
}

/** Logo lockup: mark + wordmark, optionally with the tagline beneath. */
export function Logo({
  size = 24,
  markSize = 22,
  tagline = false,
  onClick,
}: {
  size?: number;
  markSize?: number;
  tagline?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-[9px]"
      style={{ cursor: onClick ? "pointer" : undefined }}
    >
      <BrainMark size={markSize} />
      <div className="flex flex-col gap-px">
        <span
          className="font-instrument leading-[1.1] tracking-[-0.01em] text-[#1a1a1a]"
          style={{ fontSize: size }}
        >
          {BM_NAME}
        </span>
        {tagline && (
          <span className="text-[10px] leading-[1.3] text-[#1a1a1a]/45">{BM_TAGLINE}</span>
        )}
      </div>
    </div>
  );
}

/**
 * The primary blue button. The "glint" is an absolutely positioned gradient bar
 * along the top edge that widens on hover — straight from the design spec.
 */
export function GlintButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
  radius = "9999px",
  padding = "13px 28px",
  fontSize = 14,
  lift = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  radius?: string;
  padding?: string;
  fontSize?: number;
  lift?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden border-0 font-medium text-white transition-transform active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      style={{
        cursor: disabled ? "not-allowed" : "pointer",
        padding,
        borderRadius: radius,
        background: "var(--bm-blue)",
        fontSize,
        lineHeight: 1,
        boxShadow: lift
          ? "inset 0 -4px 4px rgba(255,255,255,0.39), 0 8px 16px rgba(8,113,231,0.18)"
          : "inset 0 -4px 4px rgba(255,255,255,0.39)",
        outline: "1px solid var(--bm-blue)",
        outlineOffset: "-1px",
      }}
    >
      <span
        className="pointer-events-none absolute left-[10%] top-px h-4 w-[80%] rounded-[12px] transition-transform duration-300 group-hover:scale-x-105"
        style={{ background: "linear-gradient(to bottom, #DEF0FC, rgba(222,240,252,0))" }}
      />
      <span className="relative">{children}</span>
    </button>
  );
}

/** Outline/secondary button (Back, Regenerate, Edit ad…). */
export function GhostButton({
  children,
  onClick,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "blue";
  className?: string;
}) {
  const blue = tone === "blue";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-[10px] bg-white/90 transition-colors hover:bg-white ${className}`}
      style={{
        padding: "12px 30px",
        fontSize: 13.5,
        border: `1px solid ${blue ? "rgba(8,113,231,0.35)" : "rgba(0,0,0,0.10)"}`,
        color: blue ? "var(--bm-blue)" : "var(--bm-ink)",
      }}
    >
      {children}
    </button>
  );
}

/** Small pill link used for "Edit" affordances on cards and summary rows. */
export function EditPill({ children = "Edit", onClick }: { children?: ReactNode; onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className="cursor-pointer self-start rounded-lg px-3 py-[5px] text-[11.5px] text-[#0871E7] transition-colors hover:bg-[#0871E7]/5"
      style={{ border: "1px solid rgba(8,113,231,0.28)" }}
    >
      {children}
    </span>
  );
}

/** Serif display heading used on every onboarding step. */
export function StepTitle({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <div className="relative inline-block">
      <span className="font-instrument text-[clamp(30px,3vw,40px)] leading-[1.06] tracking-[-0.02em] text-[#1a1a1a]">
        {children}
      </span>
      {badge && (
        <span className="absolute left-full top-1 ml-2 whitespace-nowrap rounded-full bg-[#0871E7]/10 px-[9px] py-1 text-[10.5px] text-[#0871E7]">
          {badge}
        </span>
      )}
    </div>
  );
}

const FIELD_BASE =
  "w-full rounded-[10px] bg-white/90 px-[15px] text-[13.5px] text-[#1a1a1a] outline-none transition-colors focus:border-[#0871E7]/50";

/** Labelled text input with helper text, matching the canvas field spec. */
export function Field({
  label,
  required,
  hint,
  optional,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[6px]">
      <span className="text-[12.5px] font-medium text-[#1a1a1a]/75">
        {label}
        {required && <span className="text-[#0871E7]"> *</span>}
        {optional && <span className="text-[#1a1a1a]/45"> (optional)</span>}
      </span>
      {children}
      {hint && <span className="text-[11.5px] text-[#1a1a1a]/45">{hint}</span>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={FIELD_BASE + " py-[13px]"}
      style={{ border: "1px solid rgba(0,0,0,0.10)", ...props.style }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={FIELD_BASE + " resize-none py-[13px] leading-[1.5]"}
      style={{ border: "1px solid rgba(0,0,0,0.10)", ...props.style }}
    />
  );
}

/** Blinking LCD caret used on the Nokia screen. */
export function LcdCaret({ w = 6, h = 12 }: { w?: number; h?: number }) {
  return (
    <span
      className="ml-1 inline-block align-middle"
      style={{ width: w, height: h, background: "var(--bm-lcd)", animation: "dotBlink 0.8s linear infinite" }}
    />
  );
}
