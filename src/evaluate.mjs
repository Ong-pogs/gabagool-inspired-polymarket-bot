import {initial,step,report,validate,quote,round,CONFIG} from './engine.mjs';
export function evaluate(snapshots){
 const state=initial(),frames=[];const latest={};
 for(const s of snapshots){const before=report(state,latest);const decision=step(state,s);latest[s.market.id]=s.books;frames.push({snapshot:s,before,decision,after:report(state,latest)});}
 // Baseline buys the same size on both sides at the first eligible snapshot of each market.
 // It uses the same displayed-depth participation, fee policy and adverse-price reserves.
 const naive=[];const seen=new Set();let baselineCash=CONFIG.bankroll;
 for(const s of snapshots){if(seen.has(s.market.id)||validate(s))continue;seen.add(s.market.id);
  const qs=s.books.map(b=>quote(b,'buy',CONFIG.shares,s.market.fee));const q=Math.min(...qs.map(x=>x.shares));
  if(q<=0)continue;const fills=s.books.map(b=>quote(b,'buy',q,s.market.fee));const cost=round(fills.reduce((v,x)=>v+x.total,0));
  if(cost>baselineCash)continue;baselineCash=round(baselineCash-cost);naive.push({marketId:s.market.id,title:s.market.title,shares:q,cost,conditionalPairPnl:round(q-cost)});
 }
 return {frames,state,report:report(state,latest),baselines:{noTrade:{cash:CONFIG.bankroll,realized:0},immediatePair:{cash:baselineCash,markets:naive,conditionalPairPnl:round(naive.reduce((v,m)=>v+m.conditionalPairPnl,0))}},snapshotCount:snapshots.length};
}
