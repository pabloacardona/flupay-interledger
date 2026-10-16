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

## Files with little or no AI involvement

_To be filled in as the team writes code by hand._

## Verification

All Open Payments SDK calls are checked against [openpayments.dev](https://openpayments.dev/es/) and the official `@interledger/open-payments` SDK, since AI can invent or use outdated APIs.

## Prompt log

Every prompt, in order. Full session notes live in [`prompts/`](prompts).

### Gateway, session [2026-10-16_03](prompts/2026-10-16_03_gateway.md)

**Prompt 1**
> 'c:\Users\pc\Desktop\Idea - Peaje IA con Open Payments.pdf' 'c:\Users\pc\Desktop\Peaje IA - Proyecto.md' Estoy desarrollando esta herramienta con otro programador, estoy trabajando en una rama separada llamada proxyFlupay, soy el encargado de la parte del proxy, debo desarrollarlo completamente de forma independiente para después integrarlo a todo lo demás para no tener conflictos. ¿Cómo empiezo? Guíame en todo el proceso y explícame qué hace cada cosa.

Result: step-by-step guide for the gateway (phases 0–9), no code.

**Prompt 2**
> ¿Cada cuánto ejecutas la disciplina de git y el almacenamiento de los prompts en AI_USAGE?

Result: proposed git and AI-log cadence.

**Prompt 3**
> Pero, ¿cada cuánto haces todos esos pasos? Necesito que cada prompt que escriba lo almacenes en AI_USAGE.md y que cada vez que completes una fase del proceso que planificaste arriba, subas el commit. Necesito traer los cambios de mi compañero permanentemente.

Result: rules applied from now on: merge `origin/main` and log the prompt on every prompt; one commit + push per verified phase.

**Prompt 4**
> Sí, arranca la fase 0 y la fase 1, ya confirmé que demo-api me corresponde a mí.

Result: phase 0 done (pnpm 10.34.7 installed per user with npm because `corepack enable` needs admin on Windows; `pnpm install` and `pnpm typecheck` pass, lockfile unchanged). Phase 1 in progress.
