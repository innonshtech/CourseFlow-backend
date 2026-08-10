import { clsx, type ClassValue } from "clsx";

/**
 * Utility to merge Tailwind class names conditionally.
 * Wraps `clsx` for a concise API: cn("base", condition && "extra", ...)
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}
