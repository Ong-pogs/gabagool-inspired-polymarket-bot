# Approved scope

Reconstruct a testable strategy inspired by public gabagool22 fills, using Predictefy for read-only market discovery and depth. This is original code, not recovered private bot source. The public sample suggests inventory accumulation across complementary outcomes; it does not reveal the entry signal, all positions or profits.

## Rules frozen before forward collection

- Two verified tokens in the same ordinary binary condition; exclude negative-risk markets.
- Buy up to 10 shares of the cheaper outcome at 40 cents or less, at most one unmatched entry per market. This entry threshold is our hypothesis, not a recovered Gabagool parameter.
- Acquire the missing complement only when the unmatched lot's actual cost plus the complement's executable depth cost, fee reserve and slippage leaves at least 1.5 cents per matched pair.
- Never average down or increase an unmatched leg. After 30 seconds, attempt to sell it at available bids. A failed/partial exit remains open and blocks reseeding.
- Five-second source freshness, two-second inter-leg skew, 500ms future-clock tolerance, no synthetic books, 1 cent adverse-price reserve per share, 25% displayed-depth participation, $10 unmatched-cost cap, $200 per-market acquisition cap and a shared $1,000 local cash ledger.
- Filled quantities determine inventory, not requested quantities. Match FIFO costs. Paired payout is a conditional settlement floor, not realized profit or available cash. Settlement requires a separately verified terminal market response with exactly one winning token.

## Fee policy

Current Polymarket fee documentation describes a crypto curve `shares * 0.07 * p * (1-p)`. The inspected live CLOB v1 market instead reports `taker_base_fee=1000` and `base_fee=1000`; that scalar alone does not establish a complete fee model. We therefore reserve the larger of the documented curve and `shares * price * base_fee / 10000`, rounded upward to four decimals per consumed level. This is an intentionally conservative cash-reserve assumption, not an exact reconstruction of venue fee accounting. Unknown/missing fee metadata blocks new entries. No rebates are credited.

## Evidence and evaluation

Deterministic scenarios exercise a completed pair, failed second leg, partial entry, insufficient depth, stale/synthetic books, fees and restart. Forward snapshots are collected only after rules/tests are frozen. Their arrival times and source timestamps are saved. Same-seed replay must produce identical events and ledger. Compare with no-trade and immediate-pair baselines on exactly the same snapshots; report book-mark values separately from terminal settlements. Snapshot fills model taker execution; they cannot prove queue position or actual execution.

## Boundaries

Node 24, no runtime dependencies, allowlisted authenticated GET reads only. No signer, funding, wallet secret or order-submission route. API key stays server-side in ignored .env. Dashboard is localhost-only and exposes only sanitized evidence. All examples carry their source and capture dates.

## Video

After end-to-end validation, record actual dashboard actions and real terminal commands over saved official Predictefy API-page footage. Professional Pogs narration, at least eight minutes, direct cuts, short captions, official Polymarket assets/blue. Preserve the earlier analysis export. Do not access the user's Chrome profile or change their tabs.
