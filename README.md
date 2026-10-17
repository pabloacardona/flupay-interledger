# FluPay

**Your store charges. The agent pays. Nobody clicks "approve".**

AI agents already browse stores but cannot check out. FluPay lets a business charge AI agents with `HTTP 402 Payment Required`, and lets agents pay on their own from an MCP wallet, inside a spending cap their owner approves once. Money moves wallet to wallet on [Open Payments](https://openpayments.dev) (Interledger); FluPay never holds funds.

Built for the Open Payments Hackathon, Medellín, October 16–17, 2026. Runs on the Interledger test network.

## Live

| Service | URL |
| --- | --- |
| Dashboard (merchants and agent owners) + charges API | https://useflupay.space |
| Agent wallet MCP server | https://mcp.useflupay.space/mcp/&lt;agent key&gt; |
| Demo store (Café Andino) | https://tienda.useflupay.space |

## How it works

1. **Merchant** signs up with its Open Payments wallet address, lists products and gets an `sk_…` key. It sells through the hosted agent checkout (`/api/stores/:slug/checkout`) or calls the charges API from its own backend.
2. **Agent owner** signs up, registers an agent with the agent's wallet, approves a monthly cap in the wallet (interactive GNAP grant) and pastes the agent's connector URL into Claude.
3. **Agent** calls `paid_fetch`. The checkout answers 402 with `Payment-Required`; the MCP wallet quotes, pays from the agent's wallet under the cap, and retries with `Authorization: OpenPayments <incoming payment>`. The merchant verifies the proof once and returns the order.

| Component | Side | What it does |
| --- | --- | --- |
| `apps/web` | Seller + owners | Dashboard (Spanish UI), charges API (`/api/v1`), hosted agent checkout, agent-owner pages. Next.js 16, Neon Postgres. |
| `apps/agent-wallet` | Buyer | MCP server (`paid_fetch`, `pay`, `get_balance`) and owner REST API: capped grants, quotes, outgoing payments, typed errors. Fastify, Neon Postgres. |
| `packages/shared` | Both | 402 contract (zod), money in minor units, AES-256-GCM, Open Payments client. |
| `apps/store` | Seller | Demo store "Café Andino": storefront for people, agent catalog, 402 checkout and `llms.txt`, integrated with the charges API. |
| `apps/gateway` | Seller | Reverse proxy that charges per route and detects agents (built by teammates). |
| `apps/demo-api` | Seller | Sample API behind the gateway. |

## 402 protocol

```http
HTTP/1.1 402 Payment Required
Payment-Required: {"wallet":"<merchant wallet>","incoming":"<incoming payment url>","amount":"20000","assetCode":"COP","assetScale":2,"expiresAt":"<ISO>"}
```

```http
POST /api/stores/<store>/checkout
Authorization: OpenPayments <incoming payment url>
```

## Deployments

Every push to `main` deploys to Vercel through [GitHub Actions](.github/workflows/deploy.yml): `apps/agent-wallet` → mcp.useflupay.space and `apps/web` → useflupay.space and `apps/store` → tienda.useflupay.space, only when their files (or `packages/shared`) change. Run it by hand from the Actions tab (*Deploy to Vercel → Run workflow*). It needs one repository secret, `VERCEL_TOKEN`.

## Run locally

```bash
pnpm install
vercel env pull .env.local --yes                      # agent wallet: Neon + ENCRYPTION_KEY (repo root linked to flupay-agent-wallet)
(cd apps/web && vercel env pull .env.local --yes)     # web: its own Neon + keys (apps/web linked to flupay-web)
cp .env.example .env                                  # Open Payments identity; private key in keys/ (git-ignored)
pnpm dev:agent-wallet    # http://localhost:4000
pnpm dev:web             # http://localhost:3001
```

## Demo

Script, checklist and troubleshooting: [DEMO.md](DEMO.md).

## AI usage

See [AI_USAGE.md](AI_USAGE.md) and [`prompts/`](prompts), as required by the hackathon AI policy.
