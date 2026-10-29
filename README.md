# Gabagool-inspired Polymarket bot with the Predictefy API

An original inventory-balancing strategy reconstructed from public wallet patterns. It reads real Polymarket depth through the [Predictefy Prediction Market API](https://predictefy.com/en/prediction-market-api?utm_source=github&utm_medium=readme&utm_campaign=gabagool-inspired-polymarket-bot), simulates small first-leg purchases, and buys the complement only when the actual modeled pair cost meets its edge rule.

**This is a research simulator.** It does not contain a signer or a live order route, and it does not reproduce Gabagool's private code or hidden entry signal.

## Recorded result

The rules were frozen before a forward capture on **October 22, 2026, 23:45:03–23:47:10 UTC**. The checked-in evidence contains 60 paired snapshots from three Bitcoin markets, 121 authenticated requests and 601 Predictefy credits.

| Policy on the same snapshots | Result | Meaning |
|---|---:|---|
| Inventory bot | **−$4.06** | Local realized simulation P&L after two entries and two timeout exits |
| Buy both outcomes immediately | **−$3.99** | Conditional settlement P&L for 30 paired shares; not realized cash |
| No trade | **$0.00** | Realized P&L |

No complementary hedge qualified in that short forward sample. No inventory remained open at the end. These results do not establish a profitable strategy. The full forward ledger replays exactly from the saved snapshots; successful test scenarios are separate, explicitly synthetic inputs.

## Run

Requires **Node.js 24 or newer**. There are no runtime dependencies and no install step.

```powershell
git clone https://github.com/Ong-pogs/gabagool-inspired-polymarket-bot
cd gabagool-inspired-polymarket-bot
npm test
npm run demo
npm run verify
npm run dashboard
```

Open `http://127.0.0.1:8850` yourself. The dashboard uses the bundled evidence and does not require an API key. It supports snapshot playback, market selection, inventory and execution inspection, deterministic scenarios, original wallet evidence, and configuration details. It binds only to localhost and exposes no credential route.

For a new capture, create `.env` from `.env.example` and edit the key privately:

```powershell
copy .env.example .env
# Edit .env locally: PREDICTEFY_API_KEY=your key
node src/cli.mjs scan --cycles 20 --markets 3 --interval 4000 --out runs/my-capture
node src/cli.mjs replay runs/my-capture/snapshots.json
node src/cli.mjs status runs/my-capture
```

New captures consume credits. The default scan makes one discovery call and two book reads per market per cycle, plus retries if needed. It also verifies market identity and fee metadata with public Polymarket endpoints. It does not mutate a venue or a hosted paper account. Preserve the original evidence; `npm run verify` checks the published capture, not any replacement data.

## Strategy

1. Verify both tokens belong to one active, ordinary binary condition.
2. Start with at most 10 shares at an effective acquisition price of 40¢ or less. The threshold is our hypothesis.
3. While unmatched, buy the missing side only if its depth cost plus the held lot's cost and reserves leaves at least 1.5¢ per paired share.
4. After 30 seconds, sell the unmatched leg into available bids. A partial exit remains exposed and is retried; reseeding stays disabled.
5. Hold complete pairs separately from realized cash. A test settlement requires verified closed status and exactly one winning token. Live settlement is not automated in this version.

Displayed depth participation is capped at 25%, with 1¢ adverse-price reserve per share. Source timestamps must be at most five seconds old, within two seconds of one another. There is a $10 unmatched-acquisition cap, $200 per-market acquisition cap and shared $1,000 local ledger. A single-writer lock, atomic file replacement, duplicate detection and restart tests protect the local state. Restart a scan using the same output directory to continue its ledger; stale lock files after a crash require checking that the old PID has exited before removing the lock.

## Fee assumptions and limitations

The [current official fee documentation](https://docs.polymarket.com/trading/fees) gives a crypto curve. The captured live v1 metadata instead reports `base_fee=1000`. That scalar does not establish complete fee accounting. Each modeled consumed level reserves the **larger** of `shares × 0.07 × p × (1-p)` and `shares × p × base_fee / 10000`, rounded upward to four decimals. The latter reserves 10% of trade value in this capture. These reserves are conservative budgeting assumptions, **not exact venue fees**. They apply to modeled buys and sells; no maker/taker rebates are credited.

Snapshot execution cannot prove real fills, maker queue priority or network latency. The one-cent reserve and depth haircut are configurable approximations, not measured execution distributions. There is no directional predictor, calibration claim, profitability validation or live-trading readiness claim. Do not infer the original trader's profits from average historical entry prices. The public wallet sample contains only the returned pages, not a lifetime portfolio.

## Files

- `src/engine.mjs`: deterministic strategy, depth consumption, costs, inventory and settlement checks.
- `src/collect.mjs`: fresh authenticated Predictefy reads and public venue verification.
- `src/evaluate.mjs`: replay and same-data baselines.
- `src/store.mjs`: atomic persistence and single-writer lock.
- `src/server.mjs`, `public/`: read-only evidence dashboard.
- `test/engine.test.mjs`: 16 behavioral tests, including partial fills, missing hedge, partial exit, stale books, fees, restarts and rejected execution routes.
- `data/examples/forward/`: raw normalized snapshots, discovery evidence, decisions and ledger.
- `data/examples/frozen-rules.json`: source hashes and freeze time before forward collection.
- `data/examples/wallet-page-*.json`: public Predictefy wallet responses used for the inference.
- [Build prompt](build-prompt.txt), [design and assumptions](DESIGN.md), [validation](VALIDATION.md).

## Predictefy API and SDK resources

This project uses REST directly. For market discovery and order-book integration, see the [API quickstart](https://docs.predictefy.com/quickstart/), [order-book contract](https://docs.predictefy.com/api/operations/fetchorderbook/), and [trader intelligence](https://docs.predictefy.com/reference/trader-intelligence/). The [TypeScript SDK](https://docs.predictefy.com/guides/sdk/) and [Python SDK](https://docs.predictefy.com/guides/python-sdk/) are alternative integration paths, not dependencies of this repository. [Plan and credit requirements](https://docs.predictefy.com/guides/credits/) apply to new requests; this bot does not use the separately gated arbitrage feed or history replay.

Code is MIT licensed. The official Polymarket logo is an unmodified third-party trademark, retained only to identify the venue. No affiliation with the trader or Polymarket is claimed.
