# Session 2026-10-16_01: base monorepo structure

Tool: Claude Code (Claude Opus 5.5)

## Prompt 1

> Vamos a empezar este preyecto para una hackathon te paso el siguiente archivo para crear la base del proyecto; '/Users/kevinmanotas/Downloads/PRD Pagos para agentes con Open Payments.md'

(The attached PRD describes the gateway, agent wallet, demo API, dashboard, 402 protocol, data model and phase plan.)

## Prompt 2

> mira nada de peaje, tood el cidido yfilleros debe ser en ingles

## Result

- pnpm monorepo: `packages/shared`, `apps/gateway`, `apps/agent-wallet`, `apps/demo-api`, `apps/web`, `scripts/`.
- All code, file names and docs in English. Naming map from the Spanish PRD: Peaje → gateway, Billetera → agent-wallet, `fetch_pagado` → `paid_fetch`, `pagar` → `pay`, `consultar_saldo` → `get_balance`.
- No business logic yet; skeletons only.
