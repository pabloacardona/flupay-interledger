// Finds the price of a request path from the configured route rules.
import type { Price, RouteRule } from "./config.js";

/** True when `path` matches `pattern`: exact match, or prefix match for patterns ending in "/*". */
export function matchesPattern(pattern: string, path: string): boolean {
  if (!pattern.endsWith("/*")) return path === pattern;
  const prefix = pattern.slice(0, -1); // "/api/*" -> "/api/"
  return path.startsWith(prefix) || path === prefix.slice(0, -1); // "/api" also matches "/api/*"
}

/**
 * Returns the matching rule and its price (null = free). First match wins.
 * Paths with no matching rule are free: the gateway only charges what is configured.
 */
export function priceFor(routes: RouteRule[], url: string): { rule: RouteRule | null; price: Price | null } {
  const path = url.split("?")[0] ?? "/";
  const rule = routes.find((r) => matchesPattern(r.path, path)) ?? null;
  return { rule, price: rule?.price ?? null };
}
