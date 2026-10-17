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
| [06](prompts/2026-10-16_06_gateway.md) | Gateway (reverse proxy) and demo API, branch `proxyFlupay` |

## Files with AI involvement

| File / area | Session | What the AI did | Reviewed by |
| --- | --- | --- | --- |
| Root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.vercelignore`, `.env.example`) | 01, 03 | Generated from the PRD; deployment ignores | _pending_ |
| `README.md`, `AI_USAGE.md`, `apps/*/README.md` | all | Drafts | _pending_ |
| `packages/shared/src/*` (`protocol402.ts`, `money.ts`, `crypto.ts`, `op-client.ts`, `wallet-address.ts`) | 02, 03 | 402 contract (zod), minor-unit money, AES-256-GCM, OP client factory, payment pointers | _pending_ |
| `apps/agent-wallet/**` (Prisma schema and migrations, grants, payments, REST routes, MCP server) | 02, 03, 05 | Full implementation, checked against the installed SDK type definitions | _pending_ |
| `apps/web/**` (Prisma schema and migrations, charges API, hosted checkout, merchant and owner dashboards) | 04, 05 | Full implementation; scaffold from `create-next-app` | _pending_ |
| `apps/gateway/**` (`config.ts`, `pricing.ts`, `flupay.ts`, `paywall.ts`, `detect.ts`, `stats.ts`, `app.ts`, `index.ts`, tests, `gateway.yaml`, `README.md`), gateway section of `.env.example` | 01, 06 | Config loading with zod, per-route pricing, reverse proxy, 402 paywall over the FluPay charges API, agent detection, stats, docs, tunnel script, e2e test | _pending_ |
| `apps/demo-api/src/index.ts`, `apps/demo-api/package.json` | 06 | Sample Fastify API (free and priced routes, static demo data), `.env` loading in scripts | _pending_ |

## Files with little or no AI involvement

_To be filled in as the team writes code by hand (gateway / agent detection)._

## Verification

- Open Payments SDK calls are checked against [openpayments.dev](https://openpayments.dev/es/) and the installed `@interledger/open-payments` type definitions, since AI can invent or use outdated APIs.
- Each feature was exercised against the Interledger test network (real incoming payments, signed grant requests) or production endpoints before being committed; what was not tested is stated in the session log.

## Prompt log

Every prompt, in order. Full session notes live in [`prompts/`](prompts).

### Gateway, session [2026-10-16_06](prompts/2026-10-16_06_gateway.md)

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

Result: phase 0 done (pnpm 10.34.7 installed per user with npm because `corepack enable` needs admin on Windows; `pnpm install` and `pnpm typecheck` pass, lockfile unchanged). Phase 1 done: `apps/demo-api` with `/`, `/health`, `/api/weather`, `/api/premium/report`.

**Prompt 5**
> Cada vez que terminas una fase, quiero que hagas pull para traer los cambios de mi compañero.

Result: rule extended: pull `origin/main` at the start of every prompt, before every phase commit and again after every phase push.

**Prompt 6**
> OK, continúa con la fase 2. [interrupted] Haz pull correctamente de todo el proyecto hasta el momento.

Result: merged `origin/main` (10 teammate commits: Vercel/Neon deploy, merchant platform in `apps/web`, agent owners). Only conflict: `AI_USAGE.md`, resolved keeping the teammate's structure plus the gateway rows and this prompt log. Gateway session file renamed from `_03_` to `_06_` because the teammate already used 03–05.

**Prompt 7**
> Cambiamos el enfoque del proyecto. Lee el README y todo el proyecto nuevamente para continuar con la fase de configuración del gateway.

Result: re-read the project after the teammate's merge. New approach: the gateway charges through the FluPay charges API of `apps/web` (`POST /api/v1/charges`, `POST /api/v1/charges/verify`) with the merchant `sk_` key, so it needs no Open Payments keys or database of its own. Configuration phase done: `gateway.yaml` (upstream + COP prices), `config.ts`, `pricing.ts`, proxy passthrough, 6 unit tests.

**Prompt 8**
> Sí.

(Answer to: start the paywall phase, 402 through `/api/v1/charges` and proof verification through `/api/v1/charges/verify`, testing against a fake charges API until the merchant key exists.)

Result: paywall phase done. Priced routes answer 402 with the `Payment-Required` header from `POST /api/v1/charges`; proofs go to `POST /api/v1/charges/verify` and must match the route pattern, currency and price; proof never forwarded upstream; `Payment-Receipt` on success; 502 when FluPay fails. 18 tests with a fake charges API; smoke test against useflupay.space with an invalid key gives 502 (FluPay 401) as expected. Not yet tested with a real merchant key.

**Prompt 9**
> ¿De dónde extraigo ese sk?

Result: explained how to get a merchant `sk_` key from the FluPay dashboard (sign up as a business with a COP test wallet address; the key is shown once, "Regenerar" in API keys issues a new one). No code changes.

**Prompt 10**
> El botón regenerar no funciona, pero recuerda que solo me corresponde hacer el gateway y el demo-api, ¿puedo arreglarlo sin problema?

Result: advice only: `apps/web` belongs to the teammate, so report the bug to them instead of fixing it on `proxyFlupay`; workaround is a new merchant sign-up. No code changes.

**Prompt 11**
> Continúa el resto de las fases y después concluyes qué falta. Tenemos solamente 3 horas para terminar todo el proyecto.

Result: agent detection + stats phase and docs/demo phase done (`detect.ts`, `stats.ts`, `GET /_gateway/stats`, `charge: agents|everyone`, `apps/gateway/README.md`, `tunnel` script with a cloudflared quick tunnel, checked live from the internet). 27 tests, workspace typecheck clean. Pending: real `sk_` key, real paid request, PR to `main`.

**Prompt 12**
> Continúa en todas las tareas sin el sk por el momento. Tómate todo el tiempo hasta que las termines todas. Después haz la lista de pendientes.

Result: hardening (`e2e.test.ts` over real HTTP, `503` instead of `502` because Cloudflare tunnels replace 502 bodies, re-verify `not_paid` proofs after 1 s and 2 s), demo script in `apps/gateway/README.md`, issue #1 for the "Regenerar" button in `apps/web`, PR `proxyFlupay` → `main`. 30 tests. Pending: real `sk_` key and a real paid request.

**Prompt 13**
> Wallet address not found: Error opening file ".../@interledger/open-payments/dist/openapi/specs/wallet-address-server.yaml" ENOENT: no such file or directory ... ¿Por qué me sale este error al momento de poner la wallet address?

Result: merchant sign-up failed in production because `createAuthenticatedClient` reads its OpenAPI YAML specs from `node_modules` at runtime and the Vercel bundle does not ship them. Fix: `validateResponses: false` in `packages/shared/src/op-client.ts`, on its own branch `fix/op-yaml-vercel` from `main` with PR #3, so it can be merged without waiting for the gateway PR.

**Prompt 14**
> Wallet address not found: Error opening file "/var/task/node_modules/.pnpm/@interledger+open-payments@7.4.0/.../wallet-address-server.yaml" ENOENT ... Cuando ingreso el wallet address me aparece ese error, ¿por qué si ya lo corregimos con los commits que subí?

Result: the fix (`validateResponses: false`, PR #3) is correct and merged in `main`, and the installed SDK skips loading the YAML specs with it, but Vercel is not connected to GitHub (no deployments or commit statuses), so production keeps the old build until someone runs a production deploy of `flupay-web` (and `flupay-agent-wallet`, which uses the same client). No code changes.

**Prompt 15**
> Ya el compañero hizo el redeploy, ahora ¿cómo continuamos con los pendientes?

Result: merged `main` (partner's GitHub Actions deploy workflow, runs green), confirmed the production charges API answers `401` without a key, created a local ignored `.env` with the gateway variables and a generated `GATEWAY_ADMIN_KEY` (the `sk_` stays empty for the user to paste locally). Next: merchant sign-up, `sk_` in `.env`, real `402`, then a paid request through the tunnel.
