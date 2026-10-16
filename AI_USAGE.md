# AI Usage

This project follows the [Interledger Hackathon AI policy](https://interledger.org/es/hackathon/ai-policy/). Every AI-generated file is read, run and understood by a team member before it lands on `main`. The exact text of every coding prompt lives in [`prompts/`](prompts), one file per session.

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code (Claude Opus 5.5) | Monorepo scaffolding; shared 402 contract; agent-wallet REST API and MCP server |

## Files with AI involvement

| File / area | Session | What the AI did | Reviewed by |
| --- | --- | --- | --- |
| Root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`) | [2026-10-16_01](prompts/2026-10-16_01_base-structure.md) | Generated from the PRD | _pending_ |
| `README.md`, `AI_USAGE.md` | 2026-10-16_01 | Initial draft | _pending_ |
| `apps/*/package.json`, `packages/shared/package.json`, `apps/gateway/gateway.yaml` | 2026-10-16_01 | Skeletons, no logic | _pending_ |
| `packages/shared/src/*` (`protocol402.ts`, `money.ts`, `crypto.ts`, `op-client.ts`) | [2026-10-16_02](prompts/2026-10-16_02_mcp-server.md) | 402 contract (zod), minor-unit money helpers, AES-256-GCM, OP client factory | _pending_ |
| `apps/agent-wallet/**` (Prisma schema, grants, payments, REST routes, MCP server) | 2026-10-16_02 | Full implementation, checked against the installed SDK type definitions | _pending_ |
| `apps/web/**` (merchant portal, charges API, hosted agent checkout, Prisma schema) | [2026-10-16_04](prompts/2026-10-16_04_merchant-platform.md) | Full implementation; scaffold from create-next-app | _pending_ |
| Vercel deployment (`.vercelignore`, Postgres migration, env-based private key, DB-backed activity feed) | [2026-10-16_03](prompts/2026-10-16_03_vercel-deploy.md) | Moved SQLite to Neon Postgres, configured project, domain and env vars with the Vercel CLI | _pending_ |

## Files with little or no AI involvement

_To be filled in as the team writes code by hand._

## Verification

All Open Payments SDK calls are checked against [openpayments.dev](https://openpayments.dev/es/) and the official `@interledger/open-payments` SDK, since AI can invent or use outdated APIs.
