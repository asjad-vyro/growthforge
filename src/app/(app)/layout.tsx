import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/library", label: "Library" },
  { href: "/settings", label: "Settings" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-edge bg-surface p-4 sm:flex">
        <Link href="/dashboard" className="mb-8 px-2 text-lg font-bold tracking-tight">
          Growth<span className="text-accent">Forge</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post" className="mt-auto">
          <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-2 cursor-pointer">
            Sign out
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 sm:p-10">{children}</main>
    </div>
  );
}
