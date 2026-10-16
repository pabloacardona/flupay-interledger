import "server-only";
import { normalizeWalletAddress, randomToken, sha256, toMinor } from "@flupay/shared";
import type { Merchant } from "@/generated/prisma/client";
import { db } from "./db";
import { ApiError, ApiErrorCode } from "./errors";
import { describeOpError, op } from "./op";

function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "store";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; ; i++) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    if (!(await db.merchant.findUnique({ where: { slug } }))) return slug;
  }
}

/** Creates a merchant from its wallet address. Returns the secret API key once. */
export async function createMerchant(input: { name: string; email?: string; walletAddress: string }) {
  const url = normalizeWalletAddress(input.walletAddress);
  let wallet;
  try {
    wallet = await (await op()).walletAddress.get({ url });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(ApiErrorCode.OPEN_PAYMENTS_ERROR, `Wallet address not found: ${describeOpError(err)}`);
  }
  const apiKey = `sk_${randomToken(24)}`;
  const merchant = await db.merchant.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name),
      email: input.email || null,
      walletAddress: wallet.id,
      authServer: wallet.authServer,
      resourceServer: wallet.resourceServer,
      assetCode: wallet.assetCode,
      assetScale: wallet.assetScale,
      apiKeyHash: sha256(apiKey),
      apiKeyLast4: apiKey.slice(-4),
    },
  });
  return { merchant, apiKey };
}

export function findMerchantByApiKey(apiKey: string): Promise<Merchant | null> {
  return db.merchant.findUnique({ where: { apiKeyHash: sha256(apiKey) } });
}

/** Authenticates a merchant API request (`Authorization: Bearer sk_...`). */
export async function authenticate(request: Request): Promise<Merchant> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, key] = header.split(" ");
  const merchant = scheme === "Bearer" && key ? await findMerchantByApiKey(key) : null;
  if (!merchant) throw new ApiError(ApiErrorCode.UNAUTHORIZED, "Invalid or missing API key", 401);
  return merchant;
}

/** Rotates the secret key; the old one stops working immediately. */
export async function rotateApiKey(merchantId: string): Promise<string> {
  const apiKey = `sk_${randomToken(24)}`;
  await db.merchant.update({ where: { id: merchantId }, data: { apiKeyHash: sha256(apiKey), apiKeyLast4: apiKey.slice(-4) } });
  return apiKey;
}

export async function createProduct(merchant: Merchant, input: { name: string; description?: string; price: string }) {
  return db.product.create({
    data: {
      merchantId: merchant.id,
      name: input.name,
      description: input.description || null,
      priceMinor: Number(toMinor(input.price, merchant.assetScale)),
    },
  });
}
