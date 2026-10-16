"use client";

import { useState } from "react";

const steps = [
  {
    key: "Catalog",
    icon: "⋮⋮",
    request: "GET /api/stores/cafe-andino/products",
    status: "200 OK",
    tone: "text-ok",
    body: `{ "products": [{ "id": "prd_8f2", "name": "Café de origen 250 g", "price": "200.00 COP" }] }`,
    note: "The agent reads the catalog for free.",
  },
  {
    key: "Checkout",
    icon: "⋯",
    request: `POST /api/stores/cafe-andino/checkout  { "product_id": "prd_8f2" }`,
    status: "402 Payment Required",
    tone: "text-warn",
    body: `Payment-Required: { "incoming": "https://ilp…/incoming-payments/7c1…", "amount": "20000", "assetCode": "COP", "assetScale": 2 }`,
    note: "FluPay creates an Open Payments charge on the store's wallet.",
  },
  {
    key: "Pay",
    icon: "⁘",
    request: "quote.create → outgoingPayment.create (owner's capped grant)",
    status: "completed",
    tone: "text-ok",
    body: `{ "debit": "200.00 COP", "remaining_budget": "600.00 COP" }`,
    note: "The agent pays from its own wallet, inside the cap its owner approved once.",
  },
  {
    key: "Order",
    icon: "✓",
    request: "POST /checkout  Authorization: OpenPayments https://ilp…/incoming-payments/7c1…",
    status: "200 OK",
    tone: "text-ok",
    body: `{ "status": "confirmed", "order": { "product": "Café de origen 250 g", "paid": "200.00 COP" } }`,
    note: "Proof verified and consumed once. The money is already in the store's wallet.",
  },
];

export function FlowDemo() {
  const [i, setI] = useState(1);
  const step = steps[i]!;
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-line bg-surface text-left shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="font-mono text-xs text-muted">agent</span>
        <code className="min-w-0 flex-1 truncate font-mono text-sm">{step.request}</code>
      </div>
      <div className="space-y-2 px-5 py-4">
        <p className={`font-mono text-sm font-semibold ${step.tone}`}>{step.status}</p>
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-muted">{step.body}</pre>
        <p className="text-sm">{step.note}</p>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <div className="flex gap-1 rounded-xl bg-bg p-1">
          {steps.map((s, idx) => (
            <button
              key={s.key}
              onClick={() => setI(idx)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
                idx === i ? "bg-surface font-medium shadow-sm" : "text-muted hover:text-ink"
              }`}
            >
              <span className={idx === i ? "text-brand" : ""}>{s.icon}</span>
              {s.key}
            </button>
          ))}
        </div>
        <button
          aria-label="Next step"
          onClick={() => setI((i + 1) % steps.length)}
          className="grid h-11 w-16 place-items-center rounded-xl bg-brand text-brand-ink hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
