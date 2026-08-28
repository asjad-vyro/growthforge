import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next 16: `proxy` replaces `middleware`. Refreshes the Supabase session
// cookie and gates the app routes behind auth.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  // Local-only bypass — see DEV_SKIP_AUTH in requireUser(). Never set in a deployed environment.
  if (process.env.DEV_SKIP_AUTH === "true") {
    if (path === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // The marketing landing page is public — short-circuit before touching
  // Supabase so it renders with no auth config at all.
  if (path === "/") return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = Boolean(user);
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  if (!isAuthed && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAuthed && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, API webhooks/cron (secret-gated), and files
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/jobs|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp4|mp3)$).*)",
  ],
};
