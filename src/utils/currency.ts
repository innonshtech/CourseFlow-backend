/**
 * Formats a numerical price into Indian Rupee (₹) string.
 * Examples:
 *   formatPrice(0) -> "Free"
 *   formatPrice(499) -> "₹499"
 *   formatPrice(1299) -> "₹1,299"
 */
export function formatPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  if (amount === 0) return "Free";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  return `₹${amount.toLocaleString("en-IN")}`;
}
