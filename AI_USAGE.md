# AI Usage

This project follows the [Interledger Hackathon AI policy](https://interledger.org/es/hackathon/ai-policy/). Every AI-generated file is read, run and understood by a team member before it lands on `main`. The exact text of every coding prompt lives in [`prompts/`](prompts), one file per session.

## Tools

| Tool | Used for |
| --- | --- |
| Claude Code (Claude Opus 5.5) | Monorepo scaffolding; code generation (to be logged per session) |

## Files with AI involvement

| File / area | Session | What the AI did | Reviewed by |
| --- | --- | --- | --- |
| Root config (`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`) | [2026-10-16_01](prompts/2026-10-16_01_base-structure.md) | Generated from the PRD | _pending_ |
| `README.md`, `AI_USAGE.md` | 2026-10-16_01 | Initial draft | _pending_ |
| `apps/*/package.json`, `packages/shared/package.json`, `apps/gateway/gateway.yaml` | 2026-10-16_01 | Skeletons, no logic | _pending_ |

## Files with little or no AI involvement

_To be filled in as the team writes code by hand._

## Verification

All Open Payments SDK calls are checked against [openpayments.dev](https://openpayments.dev/es/) and the official `@interledger/open-payments` SDK, since AI can invent or use outdated APIs.
