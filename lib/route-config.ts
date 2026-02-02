import { ROLES, RoleId } from "./roles";

/**
 * Route permissions configuration
 * Maps route patterns to allowed roles
 *
 * Pattern matching:
 * - Exact match: "/dashboard/admin" matches only that path
 * - Wildcard: "/dashboard/admin/*" matches all sub-paths
 * - Use most specific pattern first
 */
export const ROUTE_PERMISSIONS: Record<string, RoleId[]> = {
  // Admin routes - only Admin can access
  "/dashboard/admin": [ROLES.ADMIN],
  "/dashboard/admin/*": [ROLES.ADMIN],

  // Coordinator routes - only Coordinator can access
  "/dashboard/coordinator": [ROLES.COORDINATOR],
  "/dashboard/coordinator/*": [ROLES.COORDINATOR],

  // Inventory/Manager routes - only Manager can access
  "/dashboard/inventory": [ROLES.MANAGER],
  "/dashboard/inventory/*": [ROLES.MANAGER],
};

/**
 * Routes that require authentication but allow any authenticated user
 * (no specific role required)
 */
export const AUTH_REQUIRED_ROUTES: string[] = [
  // Add routes that just need login but no specific role
];

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES: string[] = [
  "/",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/unauthorized",
  "/about",
  "/download",
  "/news",
  "/faq",
];

/**
 * Check if a path matches a route pattern
 */
export function matchRoute(path: string, pattern: string): boolean {
  // Exact match
  if (pattern === path) {
    return true;
  }

  // Wildcard match (e.g., "/dashboard/admin/*")
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return path.startsWith(prefix + "/") || path === prefix;
  }

  return false;
}

/**
 * Get allowed roles for a specific path
 * Returns null if route is not in ROUTE_PERMISSIONS (public or auth-only)
 */
export function getAllowedRolesForPath(path: string): RoleId[] | null {
  // Check exact match first
  if (ROUTE_PERMISSIONS[path]) {
    return ROUTE_PERMISSIONS[path];
  }

  // Check wildcard patterns
  for (const [pattern, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (matchRoute(path, pattern)) {
      return roles;
    }
  }

  return null;
}

/**
 * Check if a path is a public route
 */
export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
}

/**
 * Check if a path requires authentication
 */
export function isProtectedRoute(path: string): boolean {
  // Check if it's in route permissions
  if (getAllowedRolesForPath(path) !== null) {
    return true;
  }

  // Check if it's in auth-required routes
  return AUTH_REQUIRED_ROUTES.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
}
