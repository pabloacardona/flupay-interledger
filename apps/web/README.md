# @flupay/web

Merchant platform at **https://useflupay.space** (Vercel project `flupay-web`, Neon Postgres via the Vercel Marketplace).

- **Dashboard:** sign up with an Open Payments wallet address, get a secret API key (also the login); Overview, Products, Charges (live) and Developers sections.
- **Charges API** (`/api/v1/*`, `Authorization: Bearer sk_...`): create a charge (an incoming payment on the merchant's wallet), check its status, verify and consume the agent's proof of payment (single use).
- **Hosted agent checkout** (`/api/stores/:slug/products`, `/api/stores/:slug/checkout`): zero-code store for agents, built on the same charges logic. Answers 402 with `Payment-Required` until paid.

Money goes from the agent's wallet straight to the merchant's wallet. FluPay only creates incoming payments (no approval needed from the merchant to receive) and verifies them.

## Run locally

```bash
cd apps/web
vercel env pull .env.local --yes   # Neon URLs, ENCRYPTION_KEY, FLUPAY_CLIENT_*
pnpm dev                           # http://localhost:3001
```
