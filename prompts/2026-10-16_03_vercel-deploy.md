# Session 2026-10-16_03: MCP server on useflupay.space and test wallets

Tool: Claude Code (Claude Opus 5.5)

_Prompts are verbatim except for spelling and punctuation fixes; content is unchanged. Secrets the user pasted are redacted._

## Prompt 1

> Listo, para hacer el MCP server necesitamos que esté en un dominio. Para eso compramos useflupay.space. Podemos utilizar el CLI de Vercel, que es el host del dominio; ya la credencial está agregada, así que ya puedes realizar la configuración.

## Prompt 2

> ¿Qué necesitamos de Interledger en tema de wallets?

## Prompt 3

> Mira: $ilp.interledger-test.dev/wallet_cop_agent

## Prompt 4

> Mira: `-----BEGIN PRIVATE KEY----- [REDACTED: test-network Ed25519 private key] -----END PRIVATE KEY-----`

(The key was saved only in the git-ignored `keys/` folder and in Vercel environment variables. It must never be committed.)

## Prompt 5

> Mira: [screenshot of the test wallet showing the Key ID and public key]

## Prompt 6

> [The same screenshot again] Mira esto, ahí está esto.

## Result

- Vercel project `flupay-agent-wallet` (root `apps/agent-wallet`, Fastify), domain `mcp.useflupay.space`.
- SQLite does not persist on serverless Functions, so the agent wallet moved to Neon Postgres (Vercel Marketplace) with `@prisma/adapter-pg`; migrations run on build.
- Activity feed moved from memory to a table; the Open Payments private key can come from an env var; `@flupay/shared` compiles to `dist/`; `app.listen()` is not awaited at top level.
- Test wallet `wallet_cop_agent` (COP, scale 2). Key pair checked against the published JWKS (`kid` matches) and a signed non-interactive quote grant succeeded.
- Wallet addresses accept the payment-pointer form (`$ilp…`).
- Demo agent registered in production; the demo runs in COP.
