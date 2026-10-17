# FluPay gateway

Reverse proxy that puts any HTTP API behind `HTTP 402 Payment Required` for AI agents, with no code changes in the API. People in a browser keep free access; agents pay per request from their FluPay MCP wallet.

The gateway holds no Open Payments keys and no database. It uses the FluPay charges API (`apps/web`) with the merchant's `sk_` key: FluPay creates the incoming payment on the merchant's wallet and enforces single use.

```
agent ──> gateway :8080 ──> upstream API (apps/demo-api :3000)
             │
             └──> FluPay charges API (useflupay.space)
                    POST /api/v1/charges          no proof  -> 402 + Payment-Required
                    POST /api/v1/charges/verify   proof     -> pass once
```

## Request flow

| Request | Response |
| --- | --- |
| Free route, or `/_gateway/*` | Forwarded |
| Priced route, person in a browser (`charge: agents`) | Forwarded, `X-FluPay-Visitor: human` |
| Priced route, agent, no proof | `402`, `Payment-Required: {wallet, incoming, amount, assetCode, assetScale, expiresAt}` |
| Priced route, `Authorization: OpenPayments <incoming url>`, paid | Forwarded once, `Payment-Receipt: <incoming url>`; the proof is not sent upstream |
| Proof unpaid, used, unknown, or for another route or price | New `402` with `rejected: <reason>` |
| FluPay down / currency mismatch | `503` / `500` |

A proof only unlocks the route pattern it was issued for (stored as the charge `reference`), in the same currency and for at least the configured price.

## Agent detection

In order: `X-Agent-Id` (sent by the FluPay agent wallet), a payment proof, published AI user agents (GPTBot, ClaudeBot, PerplexityBot…), HTTP clients (curl, python-requests, node…), bot words, missing user agent. A visitor counts as a person only with a `Mozilla/…` user agent plus `Accept-Language`. User agents can be faked, so this is a pricing policy, not a security boundary; signed agent requests are future work.

## Configuration

`gateway.yaml`:

```yaml
upstream: http://localhost:3000
charge: agents          # or "everyone"
routes:                 # first match wins; unmatched paths are free
  - path: /api/premium/*
    price: 200 COP      # currency of the merchant wallet
  - path: /api/*
    price: 50 COP
  - path: /*
    price: free
```

`.env` at the repo root:

| Variable | Required | Meaning |
| --- | --- | --- |
| `GATEWAY_FLUPAY_API_KEY` | yes | Merchant key (`sk_…`) from useflupay.space, shown once at sign-up |
| `GATEWAY_FLUPAY_URL` | no | Default `https://useflupay.space` |
| `GATEWAY_PORT` | no | Default `8080` |
| `GATEWAY_CONFIG_PATH` | no | Default `./gateway.yaml` |
| `GATEWAY_ADMIN_KEY` | no | Enables `GET /_gateway/stats` with `Authorization: Bearer <key>` |

## Run

```bash
pnpm dev:demo-api                          # terminal 1
pnpm dev:gateway                           # terminal 2
curl -i http://localhost:8080/api/weather  # 402 + Payment-Required
pnpm --filter @flupay/gateway tunnel       # terminal 3: public https URL for the hosted MCP wallet
pnpm --filter @flupay/gateway test         # unit and integration tests (fake charges API)
```

The hosted MCP wallet (`mcp.useflupay.space`) cannot reach `localhost`, so a demo with a real agent needs the tunnel URL: ask the agent to `paid_fetch` `https://<tunnel>/api/weather`.

## Files

| File | Role |
| --- | --- |
| `src/index.ts` | Entry point |
| `src/app.ts` | Fastify app: health, stats, paywall hook, proxy |
| `src/config.ts` | Env and `gateway.yaml` validation (zod) |
| `src/pricing.ts` | Route matching |
| `src/detect.ts` | Agent or person |
| `src/paywall.ts` | 402 issuance and proof verification |
| `src/flupay.ts` | Charges API client |
| `src/stats.ts` | In-memory counters |
