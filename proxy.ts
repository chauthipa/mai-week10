import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  hasSupabaseConfig,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/supabase/env";

const protectedPaths = new Set(["/team", "/tasks", "/my"]);

// ทำงานก่อนทุกหน้า: รีเฟรช session การล็อกอินของ Supabase ให้ไม่หลุด
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/$/, "");
  const isPageRequest = request.method === "GET" || request.method === "HEAD";
  const requiresAccount = isPageRequest && protectedPaths.has(path);

  if (!hasSupabaseConfig) {
    return requiresAccount
      ? NextResponse.redirect(new URL("/login", request.url))
      : NextResponse.next({ request });
  }

  const outgoingCookies: Parameters<SetAllCookies>[0] = [];
  const authHeaders = new Headers();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        outgoingCookies.push(...cookiesToSet);
        Object.entries(headers).forEach(([name, value]) =>
          authHeaders.set(name, value),
        );
      },
    },
  });

  // ตรวจและรีเฟรช token ของผู้ใช้ที่ล็อกอินอยู่
  const { data } = await supabase.auth.getClaims();

  const response = requiresAccount && !data?.claims.sub
    ? NextResponse.redirect(new URL("/login", request.url), { headers: authHeaders })
    : NextResponse.next({ request, headers: authHeaders });
  outgoingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options),
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
