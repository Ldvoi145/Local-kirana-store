import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED_PREFIXES = ["/vendor", "/orders", "/presets", "/shop", "/order", "/cart"];

export async function proxy(request: NextRequest) {
  let response: NextResponse;
  try {
    response = await updateSession(request);
  } catch {
    // Supabase not configured yet (no .env.local). Serve pages without
    // session refresh; data pages render their empty states.
    response = NextResponse.next({ request });
  }
  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
  if (!needsAuth) return response;

  // Optimistic check only; secure role checks happen against the database
  // inside each page via the Data Access Layer.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
