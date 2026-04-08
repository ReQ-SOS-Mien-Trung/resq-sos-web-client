import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPublicRoute, isProtectedRoute } from "./lib/route-config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") // static files like .ico, .png, etc.
  ) {
    return NextResponse.next();
  }

  // Get token from cookies (set by your auth system)
  // Note: This assumes you store auth token in cookies
  // If using only localStorage, this check won't work and RoleGuard handles it
  const token = request.cookies.get("auth-token")?.value;

  // For protected routes, check if user has token
  if (isProtectedRoute(pathname)) {
    // If no token in cookie, we can't verify here
    // Let RoleGuard handle it (it can access localStorage)
    // This is a soft check - RoleGuard does the real verification
    return NextResponse.next();
  }

  // If user is logged in (has token) and trying to access auth pages
  // Redirect to dashboard
  if (token && (pathname === "/sign-in" || pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/dashboard/admin", request.url));
  }

  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|images|fonts).*)",
  ],
};
