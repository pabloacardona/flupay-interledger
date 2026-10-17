// In-memory counters for GET /_gateway/stats. They reset on restart; the durable
// record of every charge lives in the FluPay dashboard (Cobros).
import { fromMinor } from "@flupay/shared";

export class GatewayStats {
  readonly startedAt = new Date().toISOString();
  requests = 0;
  free = 0;
  humans = 0;
  paymentRequired = 0;
  paid = 0;
  rejected: Record<string, number> = {};
  agents: Record<string, number> = {};
  /** Revenue per currency, summed in minor units. */
  private revenueMinor: Record<string, { value: bigint; scale: number }> = {};

  agent(reason: string) {
    this.agents[reason] = (this.agents[reason] ?? 0) + 1;
  }

  reject(reason: string) {
    this.rejected[reason] = (this.rejected[reason] ?? 0) + 1;
  }

  addRevenue(amountMinor: string, currency: string, scale: number) {
    const current = this.revenueMinor[currency] ?? { value: 0n, scale };
    this.revenueMinor[currency] = { value: current.value + BigInt(amountMinor), scale };
  }

  toJSON() {
    const revenue = Object.fromEntries(
      Object.entries(this.revenueMinor).map(([currency, { value, scale }]) => [currency, fromMinor(value, scale)]),
    );
    return {
      started_at: this.startedAt,
      requests: this.requests,
      free: this.free,
      humans_free: this.humans,
      payment_required: this.paymentRequired,
      paid: this.paid,
      rejected: this.rejected,
      agents_by_signal: this.agents,
      revenue,
    };
  }
}
