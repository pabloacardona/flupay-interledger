# Session 2026-10-16_03: deploy the MCP server on Vercel

Tool: Claude Code (Claude Opus 5.5)

_Prompts are verbatim except for spelling and punctuation fixes; content is unchanged._

## Prompt 1

> Listo, para hacer el MCP server necesitamos que esté en un dominio. Para eso compramos useflupay.space. Podemos utilizar el CLI de Vercel, que es el host del dominio; ya la credencial está agregada, así que ya puedes realizar la configuración.

## Result

- Vercel project `flupay-agent-wallet`, root directory `apps/agent-wallet`, framework Fastify. Domain `mcp.useflupay.space` attached.
- SQLite does not persist on serverless Functions, so the agent wallet moved to Neon Postgres (Vercel Marketplace) with `@prisma/adapter-pg`. New `init` migration; migrations run on build.
- The activity feed moved from memory to a database table (instances do not share memory).
- The Open Payments private key can come from an env var (PEM or base64) instead of a file; OP credentials are optional at boot so health and MCP handshake work before keys exist.
- `@flupay/shared` now compiles to `dist/` on install, because Vercel does not compile TypeScript from workspace packages.
- `app.listen()` is no longer awaited at top level (matches Vercel's Fastify example; the awaited version crashed the Function).
- `ENCRYPTION_KEY`, `AGENT_WALLET_PUBLIC_URL`, `DASHBOARD_URL` set in Vercel. Preview deployment verified (`/health`, MCP auth).
