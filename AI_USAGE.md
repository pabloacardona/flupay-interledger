# AI Usage

This project follows the [Interledger Hackathon AI policy](https://interledger.org/es/hackathon/ai-policy/). Every AI-generated file is read, run and understood by a team member before it lands on `main`. The exact text of every coding prompt lives in [`prompts/`](prompts), one file per session (spelling fixed, secrets redacted).

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code (Claude Opus 5.5) | Monorepo scaffolding, shared 402 contract, agent wallet (REST + MCP server), merchant platform (charges API + dashboard), Vercel/Neon deployment, debugging from production logs |
| Vercel CLI (run by the assistant and the team) | Projects, domains, environment variables, Neon provisioning through the Vercel Marketplace, deployments |

## Sessions

| Session | Topic |
| --- | --- |
| [01](prompts/2026-10-16_01_base-structure.md) | Base monorepo, English naming |
| [02](prompts/2026-10-16_02_mcp-server.md) | Agent wallet: capped grants, 402 payments, MCP tools |
| [03](prompts/2026-10-16_03_vercel-deploy.md) | MCP server on mcp.useflupay.space, Neon Postgres, test wallets |
| [04](prompts/2026-10-16_04_merchant-platform.md) | Merchant platform: charges API, hosted agent checkout, dashboard UI |
| [05](prompts/2026-10-16_05_agent-owners.md) | Agent owners in the dashboard, MCP connector URL, API keys |

## Files with AI involvement

| File / area | Session | What the AI did | Reviewed by |
| --- | --- | --- | --- |
| Root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.vercelignore`, `.env.example`) | 01, 03 | Generated from the PRD; deployment ignores | _pending_ |
| `README.md`, `AI_USAGE.md`, `apps/*/README.md` | all | Drafts | _pending_ |
| `packages/shared/src/*` (`protocol402.ts`, `money.ts`, `crypto.ts`, `op-client.ts`, `wallet-address.ts`) | 02, 03 | 402 contract (zod), minor-unit money, AES-256-GCM, OP client factory, payment pointers | _pending_ |
| `apps/agent-wallet/**` (Prisma schema and migrations, grants, payments, REST routes, MCP server) | 02, 03, 05 | Full implementation, checked against the installed SDK type definitions | _pending_ |
| `apps/web/**` (Prisma schema and migrations, charges API, hosted checkout, merchant and owner dashboards) | 04, 05 | Full implementation; scaffold from `create-next-app` | _pending_ |
| `apps/gateway/**`, `apps/demo-api/**` | 01 | Skeletons only; the gateway is built by teammates | _pending_ |

## Files with little or no AI involvement

_To be filled in as the team writes code by hand (gateway / agent detection)._

## Verification

- Open Payments SDK calls are checked against [openpayments.dev](https://openpayments.dev/es/) and the installed `@interledger/open-payments` type definitions, since AI can invent or use outdated APIs.
- Each feature was exercised against the Interledger test network (real incoming payments, signed grant requests) or production endpoints before being committed; what was not tested is stated in the session log.
