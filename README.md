# FluPay

**Your API charges. Your agent pays. Nobody clicks "approve".**

FluPay lets websites and APIs charge AI agents with `HTTP 402 Payment Required`, and lets agents pay on their own through an MCP wallet, within a spending cap their owner approves once. Everything runs on [Open Payments](https://openpayments.dev) (Interledger) on the test network.

Built for the Open Payments Hackathon, Medellín, October 16–17, 2026.

| Component | Side | What it does |
| --- | --- | --- |
| `apps/gateway` | Seller | Reverse proxy in front of an API. On a priced route it answers 402 with an incoming payment; when proof of payment arrives, it verifies it and forwards the request. |
| `apps/agent-wallet` | Buyer | REST API + MCP server with `paid_fetch`, `pay` and `get_balance`. Pays using the owner's grant, which has a monthly cap. |
| `apps/demo-api` | Seller | Sample API behind the gateway. Knows nothing about payments. |
| `apps/web` | Both | Dashboard: site revenue, agent spending, live demo console. |
| `packages/shared` | Both | Open Payments client, 402 protocol contract (zod), money and crypto helpers. |

## 402 protocol

Gateway response when payment is missing:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
Payment-Required: {"wallet":"<site wallet>","incoming":"<incoming payment url>","amount":"5","assetCode":"USD","assetScale":2,"expiresAt":"<ISO>"}

{ "error": "payment_required", "price": "0.05 USD", "incoming": "<incoming payment url>" }
```

Agent retry with proof of payment:

```http
GET /api/premium/report HTTP/1.1
Authorization: OpenPayments <incoming payment url>
```

## Ports

| Service | Port |
| --- | --- |
| demo-api | 3000 |
| web | 3001 |
| agent-wallet | 4000 |
| gateway | 8080 |

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in wallets and keys from wallet.interledger-test.dev
pnpm dev
```

Private keys go in `keys/` (git-ignored).

## AI usage

See [AI_USAGE.md](AI_USAGE.md) and the [`prompts/`](prompts) folder, as required by the hackathon AI policy.
