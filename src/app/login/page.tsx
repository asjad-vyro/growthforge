"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Growth<span className="text-accent">Forge</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Trend-driven marketing assets for early-stage founders
          </p>
        </div>
        <div className="rounded-xl border border-edge bg-surface p-6">
          {sent ? (
            <p className="text-center text-sm">
              Check your inbox — we sent a magic link to <b>{email}</b>.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <Field label="Email">
                <input
                  type="email"
                  className={inputClass}
                  placeholder="founder@startup.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && email && sendMagicLink()}
                />
              </Field>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button onClick={sendMagicLink} disabled={!email || loading}>
                {loading ? "Sending…" : "Send magic link"}
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted">
                <div className="h-px flex-1 bg-edge" /> or <div className="h-px flex-1 bg-edge" />
              </div>
              <Button variant="ghost" onClick={signInWithGoogle}>
                Continue with Google
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
