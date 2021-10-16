import { NextRequest, NextResponse } from "next/server";
import { importSPKI, jwtVerify } from "jose";
const cookieName = process.env.SESSION_COOKIE ?? "LRD_SESSION";
const publicKey = process.env.AUTH_PUBLIC_KEY ?? "";
const key = publicKey
  ? importSPKI("-----BEGIN PUBLIC KEY-----\n" + publicKey + "\n-----END PUBLIC KEY-----", "RS256")
  : null;
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (/^\/(vi|en)(\/|$)/.test(path)) {
    const headers = new Headers(request.headers);
    headers.set("x-lrd-locale", path.startsWith("/en") ? "en" : "vi");
    return NextResponse.next({ request: { headers } });
  }
  if (
    path === "/admin/login" ||
    path === "/admin/session-check" ||
    path === "/admin/reset-password"
  )
    return NextResponse.next();
  const destination = path + request.nextUrl.search;
  if (!request.cookies.get(cookieName)?.value) {
    return NextResponse.redirect(
      new URL(
        "/admin/login?next=" + encodeURIComponent(destination),
        process.env.SITE_URL ?? request.url,
      ),
    );
  }
  try {
    const token = request.cookies.get("LRD_ROUTE")?.value;
    if (!token || !key) throw new Error("Missing hint");
    const { payload } = await jwtVerify(token, await key, {
      issuer: "lrd-api",
      audience: "lrd-web",
      algorithms: ["RS256"],
    });
    const permission = /^\/admin\/(users|roles)(\/|$)/.test(path)
      ? "identity:manage"
      : /^\/admin\/integrations(\/|$)/.test(path)
        ? "integrations:manage"
        : /^\/admin\/editorial(\/|$)/.test(path)
          ? "editorial:manage"
          : /^\/admin\/research(\/|$)/.test(path)
            ? "research:manage"
            : /^\/admin\/(staff|laboratories)(\/|$)/.test(path)
              ? "directory:manage"
              : /^\/admin\/categories(\/|$)/.test(path)
                ? "site:manage"
                : /^\/admin\/(programs|admissions)(\/|$)/.test(path)
                  ? "academics:manage"
                  : /^\/admin\/site(\/|$)/.test(path)
                    ? "site:manage"
                    : /^\/admin\/media(\/|$)/.test(path)
                      ? "media:upload"
                      : /^\/admin\/content(\/|$)/.test(path)
                        ? "content:create"
                        : null;
    if (
      !Array.isArray(payload.permissions) ||
      (permission && !payload.permissions.includes(permission))
    ) {
      return NextResponse.redirect(
        new URL("/admin/forbidden", process.env.SITE_URL ?? request.url),
      );
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(
      new URL(
        "/admin/session-check?next=" + encodeURIComponent(destination),
        process.env.SITE_URL ?? request.url,
      ),
    );
  }
}
export const config = { matcher: ["/admin/:path*", "/vi/:path*", "/en/:path*"] };
