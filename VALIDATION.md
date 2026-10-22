# Validation

- 16 behavioral tests pass under Node.js 24.14.0.
- Forward collection: 60 paired snapshots, three markets, October 22, 2026 23:45:03–23:47:10 UTC.
- Strategy source and test hashes match the freeze file created before the first forward observation. No tuning was performed on that forward capture.
- Exact deterministic replay matches every persisted event and the complete ledger.
- Forward simulation: two first-leg entries, eight waits, two timeout exits, 48 skips. Cash $995.94; realized simulation P&L −$4.06; open cost $0; no completed hedge and no live order.
- Immediate-pair baseline: $33.99 acquisition cost for 30 paired shares; conditional pair P&L −$3.99. No-trade baseline: $0 realized P&L.
- Public-wallet source checks: 195 returned rows, all buys, six markets; preserved the distinct fill rows.
- Dashboard browser check: six views, no page errors, expected final cash, no key in HTML. Performed in an isolated headless Chrome process, without the user's profile.
- Credential scan checks distributable text against the actual local key and token-shaped secrets without printing either.

Scope: snapshot-based local simulation, not real execution, calibrated predictive edge, lifetime wallet reconstruction or profitability proof. See DESIGN.md for the explicit fee-reserve mismatch and fill assumptions.
