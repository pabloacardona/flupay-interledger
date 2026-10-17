/**
 * Demo setup: registers "Café Andino" as a FluPay merchant, creates its products,
 * stores the merchant key in the flupay-store Vercel project and in a git-ignored
 * local file (never printed), then redeploys the store.
 *
 * Run from apps/web (uses its DB and Open Payments identity):
 *   cd apps/web && ../../node_modules/.bin/tsx --conditions=react-server --env-file=.env.local \
 *     --tsconfig tsconfig.json ../../scripts/setup-demo-store.mts '$ilp.interledger-test.dev/<store wallet>'
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { db } from "../apps/web/src/lib/db.ts";
import { createMerchant, createProduct } from "../apps/web/src/lib/merchants.ts";

const STORE_PROJECT = { VERCEL_ORG_ID: "team_APjryfViHh0YGZ7ydJ4WWVpc", VERCEL_PROJECT_ID: "prj_y3Va3smMK1A7GsPWJv8rgsxHHXP1" };
const PRODUCTS = [
  { name: "Café de origen 250 g", description: "Huila · tostión media · notas de panela y cacao", price: "200" },
  { name: "Café descafeinado 250 g", description: "Proceso de agua de montaña · tostión media", price: "150" },
  { name: "Café de especialidad 500 g", description: "Antioquia · lavado · 86 puntos SCA", price: "300" },
];

const wallet = process.argv[2];
if (!wallet) throw new Error("Usage: setup-demo-store.mts <store wallet address>");

const existing = await db.merchant.findUnique({ where: { slug: "cafe-andino" } });
if (existing) throw new Error("Café Andino already exists (slug cafe-andino). Delete it first or reuse its key.");

const { merchant, apiKey } = await createMerchant({ name: "Café Andino", email: "hola@cafeandino.co", walletAddress: wallet });
console.log(`merchant: ${merchant.name} (${merchant.slug}) · ${merchant.walletAddress} · ${merchant.assetCode}`);
for (const p of PRODUCTS) {
  const product = await createProduct(merchant, p);
  console.log(`product: ${product.name} · ${p.price} ${merchant.assetCode} · ${product.id}`);
}

// Secret goes to Vercel through stdin and to a git-ignored local file; never to stdout.
const root = resolve(import.meta.dirname, "..");
for (const target of ["production", "preview"]) {
  execFileSync("vercel", ["env", "add", "FLUPAY_SECRET_KEY", target, "--force"], {
    input: apiKey,
    env: { ...process.env, ...STORE_PROJECT },
    cwd: "/tmp",
    stdio: ["pipe", "ignore", "ignore"],
  });
}
console.log("vercel: FLUPAY_SECRET_KEY set on flupay-store (production, preview)");
writeFileSync(resolve(root, "apps/store/.env.local"), `FLUPAY_SECRET_KEY=${apiKey}\nFLUPAY_API_URL=https://useflupay.space\n`);
writeFileSync(
  resolve(root, ".demo-credentials.local.md"),
  `# Demo credentials (git-ignored, test network only)\n\nCafé Andino merchant key (login at useflupay.space): ${apiKey}\n`,
);
console.log("local: apps/store/.env.local and .demo-credentials.local.md written");
process.exit(0);
