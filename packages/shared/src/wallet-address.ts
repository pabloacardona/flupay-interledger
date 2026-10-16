/**
 * Accepts a wallet address as an https URL or as a payment pointer
 * (`$ilp.interledger-test.dev/alice`) and returns the https URL.
 */
export function normalizeWalletAddress(input: string): string {
  const value = input.trim();
  if (value.startsWith("$")) return `https://${value.slice(1)}`;
  return value;
}
