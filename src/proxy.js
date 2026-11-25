import { NextResponse } from "next/server";

// Optimistic auth check only — the Express API is the real authority.
const PUBLIC = ["/login", "/register"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("pa_session");
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/overview" : "/login", request.url));
  }
  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/overview", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|fonts).*)"],
};
