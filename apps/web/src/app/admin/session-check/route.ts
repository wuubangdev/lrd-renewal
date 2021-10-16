import { NextRequest, NextResponse } from "next/server";
import { backend, sessionCookie, safeAdminPath } from "@/lib/server-api";
export async function GET(request: NextRequest) {
  const next = safeAdminPath(request.nextUrl.searchParams.get("next"));
  const cookie = request.cookies.get(sessionCookie)?.value;
  const upstream = await fetch(backend + "/api/v1/auth/route-context", {
    headers: { Cookie: cookie ? sessionCookie + "=" + encodeURIComponent(cookie) : "" },
    cache: "no-store",
  });
  if (!upstream.ok && upstream.status !== 401) {
    return new NextResponse("Không thể xác minh phiên đăng nhập. Vui lòng thử lại.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const response = NextResponse.redirect(
    new URL(
      upstream.ok ? next : "/admin/login?next=" + encodeURIComponent(next),
      process.env.SITE_URL ?? request.url,
    ),
  );
  for (const value of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", value);
  if (!upstream.ok) {
    response.cookies.delete(sessionCookie);
    response.cookies.delete("LRD_ROUTE");
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
