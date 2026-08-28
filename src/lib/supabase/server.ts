import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Per-request Supabase client for Server Components / Route Handlers /
// Server Actions. Uses the anon key + the user's auth cookies (RLS applies).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — session refresh is handled by proxy.ts
          }
        },
      },
    },
  );
}

// Fixed no-op UUID for local dev — see DEV_SKIP_AUTH below. Never set in a deployed environment.
const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

export async function requireUser(): Promise<{ id: string }> {
  if (process.env.DEV_SKIP_AUTH === "true") return { id: DEV_USER_ID };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}
