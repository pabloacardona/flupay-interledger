# Demo · FluPay (5 minutes)

**One-liner:** AI agents already shop but cannot pay. With FluPay a store charges agents over `HTTP 402` and the agent pays from its own wallet, inside a cap its owner approved once. Open Payments moves the money wallet to wallet.

## Before going on stage (checklist)

- [ ] `https://useflupay.space` (dashboard) open in tab 1, signed in as **Café Andino** (its `sk_…` key).
- [ ] `https://useflupay.space` in a private window, signed in as the **agent owner** (`ok_…`), on the agent's page.
- [ ] `https://tienda.useflupay.space` in tab 2 and `https://tienda.useflupay.space/pedidos` in tab 3.
- [ ] Claude with the FluPay connector added (`https://mcp.useflupay.space/mcp/fpk_…` from *API keys → Generar URL*).
- [ ] The agent has an **active cap** and its wallet has test balance in COP.
- [ ] The store wallet (Café Andino) is a **different** wallet from the agent's, open in the test wallet to show the incoming money.
- [ ] Health: `curl https://mcp.useflupay.space/health` → `open_payments_configured: true`.
- [ ] Recorded backup video in case the network fails.

## Script

| Time | What | Screen |
| --- | --- | --- |
| 0:00 | **Problem (45 s).** Stores get traffic from agents that cannot check out; they block them or give content away. 402 exists since 1997 without an open payment system behind it. | Slide |
| 0:45 | **The store (45 s).** Café Andino sells coffee to people *and* agents. "Para agentes" shows the catalog, the 402 checkout and `llms.txt`. The store's backend only calls FluPay's charges API. | tienda.useflupay.space |
| 1:30 | **The owner approves a cap once (45 s).** Agent page: cap 800 COP / month → "Aprobar tope en la wallet" → approve in the test wallet → back with the cap active. Copy the connector URL from *API keys*. | Dashboard (owner) |
| 2:15 | **Live purchase (75 s).** Ask Claude: *"Cómprame el café de origen de 250 g en Café Andino (https://tienda.useflupay.space)"*. Claude reads `/api/productos`, calls `paid_fetch` on `/api/checkout`, gets 402, pays, retries and confirms the order. Show: the order in `/pedidos`, the charge "Pagado · entregado" in the merchant dashboard, the agent activity (402 → quote → payment → 200), the money in the store wallet. | Claude + 3 tabs |
| 3:30 | **The cap (30 s).** Ask for more coffees until the cap runs out: the agent gets `BUDGET_EXCEEDED`, nothing is charged, Claude explains it. Optional: revoke the cap → `GRANT_INACTIVE`. | Claude + owner dashboard |
| 4:00 | **Close (60 s).** Open and in local currency (vs. Cloudflare pay-per-crawl and x402 on crypto). A Medellín coffee shop charges in pesos without a card network or gateway. Non-custodial: FluPay never holds money. *"Tu tienda cobra. Tu agente paga. Nadie aprueba nada."* | Slide |

## Suggested prompts for Claude

- *"¿Cuánto me queda de presupuesto?"* → `get_balance`
- *"Mira qué cafés vende Café Andino en https://tienda.useflupay.space/api/productos"* → `paid_fetch` (free)
- *"Cómprame el café de origen de 250 g en https://tienda.useflupay.space/api/checkout"* → 402 → payment → order
- *"Compra 5 más"* → reaches the cap → `BUDGET_EXCEEDED`

## If something fails

| Symptom | Fix |
| --- | --- |
| Claude: "No se pudo registrar con el servicio de inicio de sesión" | The URL has the account key (`ok_…`). Use the agent connector URL (`fpk_…`) from *API keys*. |
| `GRANT_INACTIVE` | Approve the cap again on the agent page. |
| `PRICE_EXCEEDS_MAX` | Raise the agent's max per purchase or ask for a cheaper product. |
| `ASSET_MISMATCH` | Agent and store wallets must use the same currency (COP). |
| Store says "no está registrada en FluPay" | Register the merchant with the exact name **Café Andino** (slug `cafe-andino`). |

## Setup (once, all in the web)

1. **Store:** https://useflupay.space/signup → *Soy un negocio* → name **Café Andino** (the store finds it as `cafe-andino`), wallet `$ilp.interledger-test.dev/wallet_cop_agent`. Save the `sk_…` key (dashboard login).
2. **Products** (sidebar → Productos): Café de origen 250 g · 200 · Café descafeinado 250 g · 150 · Café de especialidad 500 g · 300.
3. Open https://tienda.useflupay.space: the three coffees appear by themselves. No keys or deploys needed.
4. **Agent:** owner account (`ok_…`), agent with wallet `$ilp.interledger-test.dev/flupaytestcop`, max per purchase ≥ 300, cap approved. *API keys → Generar URL* → add it in Claude as a custom connector.
