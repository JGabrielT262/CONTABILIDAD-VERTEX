import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const isValid = token ? await verifySessionToken(token) : false;

  if (!isValid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo|.*\\.png$).*)"],
};
