# @flupay/agent-wallet

Buyer side of FluPay: a REST API for owners and an MCP server for agents. The agent pays HTTP 402 charges with Open Payments, inside a spending cap the owner approves once.

## Production

Deployed on Vercel (project `flupay-agent-wallet`, root directory `apps/agent-wallet`) at **https://mcp.useflupay.space**. MCP endpoint: `https://mcp.useflupay.space/mcp`. Data lives in Neon Postgres, provisioned through the Vercel Marketplace; migrations run on every build (`vercel-build`).

## Run locally

```bash
vercel env pull .env.local --yes      # Neon URLs + ENCRYPTION_KEY (from the repo root)
cp .env.example .env                  # AGENT_WALLET_CLIENT_* (Open Payments identity)
pnpm --filter @flupay/agent-wallet dev   # http://localhost:4000
```

## Owner flow (REST)

```bash
# 1. Register the agent. The MCP key is shown ONCE.
curl -s localhost:4000/agents -H 'content-type: application/json' -d '{
  "name": "Research agent",
  "wallet_address": "https://ilp.interledger-test.dev/<agent>",
  "max_price": "0.05"
}'

# 2. Ask for a capped grant, then open redirect_url and approve in the test wallet.
curl -s localhost:4000/agents/<id>/grants -H 'content-type: application/json' -d '{"budget":"0.20","period":"P1M"}'

# 3. Check cap / spent / remaining. Revoke with DELETE.
curl -s localhost:4000/agents/<id>
curl -s -X DELETE localhost:4000/agents/<id>/grants
```

| Method and route | What it does |
| --- | --- |
| `POST /agents` | Creates an agent (wallet address, `max_price`, `allowed_merchants`); returns `mcp_api_key` once |
| `GET /agents`, `GET /agents/:id` | Agent info plus cap, spent and remaining |
| `POST /agents/:id/grants` | Starts the interactive outgoing-payment grant; returns `redirect_url` |
| `GET /grants/callback` | Verifies the GNAP hash, continues the grant, redirects to the dashboard |
| `DELETE /agents/:id/grants` | Revokes the grant at the auth server |
| `GET /payments?agent_id=` | Payment history |
| `GET /activity?agent_id=&since=` | Step-by-step feed for the live demo console |

## MCP server

Streamable HTTP at `POST /mcp`, stateless, authenticated with the `x-agent-key` header.

| Tool | Input | Output |
| --- | --- | --- |
| `paid_fetch` | `url`, `method?`, `body?`, `max_price` | `{ status, body, paid, remaining_budget }` |
| `pay` | `payment_required` (raw header JSON), `max_price` | `{ status, already_paid, authorization, remaining_budget }` |
| `get_balance` | — | `{ status, budget, spent, remaining, interval }` |

Typed errors: `BUDGET_EXCEEDED`, `PRICE_EXCEEDS_MAX`, `MERCHANT_NOT_ALLOWED`, `GRANT_INACTIVE`, `PAYMENT_NOT_CONFIRMED`, `INVALID_PAYMENT_REQUIRED`, `ASSET_MISMATCH`, `OPEN_PAYMENTS_ERROR`. Tool results never contain access tokens, manage URLs or keys.

Connect from Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "flupay": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:4000/mcp", "--header", "x-agent-key:${FLUPAY_KEY}"],
      "env": { "FLUPAY_KEY": "fpk_..." }
    }
  }
}
```

Or from Claude Code: `claude mcp add --transport http flupay http://localhost:4000/mcp --header "x-agent-key: fpk_..."`.

Or test with MCP Inspector: `npx @modelcontextprotocol/inspector` → Streamable HTTP → `http://localhost:4000/mcp` with header `x-agent-key`.

## How a paid request works

1. `GET url` with `X-Agent-Id`. Not 402 → returned as is.
2. 402 → parse `Payment-Required` (shared zod schema), check asset, `max_price` (the lower of the tool's and the agent's), allowed merchants, active grant.
3. Idempotency: a charge already `completed` for this agent is not paid again.
4. Non-interactive `quote` grant (cached) → `quote.create` with `receiver: incoming`, `method: "ilp"`.
5. Budget pre-check with `outgoingPayment.getGrantSpentAmounts`; if over → `BUDGET_EXCEEDED`, nothing sent.
6. `outgoingPayment.create` with the owner's capped grant (token rotated once on 401). A 403 is mapped to `BUDGET_EXCEEDED`.
7. Poll the public incoming payment until `receivedAmount` covers the charge (max `PAYMENT_TIMEOUT_MS`).
8. Retry with `Authorization: OpenPayments <incoming url>` and return the response.
