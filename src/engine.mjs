import {createHash} from 'node:crypto';
export const CONFIG=Object.freeze({bankroll:1000,shares:10,seedMax:.40,minEdge:.015,slippage:.01,participation:.25,maxAgeMs:5000,maxSkewMs:2000,futureMs:500,unmatchedMs:30000,maxUnmatchedCost:10,marketBudget:200,minRemainingMs:45000});
export const round=n=>Math.round((n+Number.EPSILON)*1e6)/1e6;
const ceil4=n=>Math.ceil((n-1e-12)*10000)/10000;
export function feeReserve(q,p,fee){
  if(!fee||fee.mode!=='reserve'||!Number.isFinite(fee.curveRate)||fee.curveRate<0||!Number.isFinite(fee.notionalRate)||fee.notionalRate<0)throw Error('Unverified fee policy');
  return ceil4(Math.max(q*fee.curveRate*p*(1-p),q*p*fee.notionalRate));
}
export function validate(s,c=CONFIG){
  if(!s||!Number.isFinite(s.now)||!s.market||!s.books)return 'INVALID_SNAPSHOT';
  const m=s.market;
  if(m.status!=='open'||!Number.isFinite(m.end)||s.now>=m.end)return 'MARKET_CLOSED';
  if(m.verified!==true||m.negRisk!==false||!Array.isArray(m.tokens)||m.tokens.length!==2||new Set(m.tokens).size!==2)return 'IDENTITY_UNVERIFIED';
  try{feeReserve(1,.5,m.fee);}catch{return 'FEE_UNVERIFIED';}
  if(s.books.length!==2)return 'MISSING_BOOK';
  for(let i=0;i<2;i++){
    const b=s.books[i];
    if(!b||b.token!==m.tokens[i])return 'TOKEN_MISMATCH';
    if(b.synthetic!==false||!['venue-rest','predictefy-live','fixture'].includes(b.source))return 'SYNTHETIC_OR_UNKNOWN_BOOK';
    if(!Number.isFinite(b.timestamp)||s.now-b.timestamp>c.maxAgeMs)return 'STALE_BOOK';
    if(b.timestamp>s.now+c.futureMs)return 'FUTURE_BOOK';
    if(!Array.isArray(b.asks)||!Array.isArray(b.bids)||[...b.asks,...b.bids].some(l=>!Number.isFinite(l.price)||l.price<=0||l.price>=1||!Number.isFinite(l.size)||l.size<0))return 'INVALID_LEVEL';
    const ask=Math.min(...b.asks.filter(l=>l.size>0).map(l=>l.price)),bid=Math.max(...b.bids.filter(l=>l.size>0).map(l=>l.price));
    if(bid>=ask)return 'CROSSED_BOOK';
  }
  if(Math.abs(s.books[0].timestamp-s.books[1].timestamp)>c.maxSkewMs)return 'BOOK_SKEW';
  return null;
}
export function quote(book,side,requested,fee,c=CONFIG,limit=side==='buy'?1:0){
  let left=requested;const fills=[];
  const levels=[...(side==='buy'?book.asks:book.bids)].sort((a,b)=>side==='buy'?a.price-b.price:b.price-a.price);
  for(const l of levels){
    const price=round(side==='buy'?Math.min(.999999,l.price+c.slippage):Math.max(.000001,l.price-c.slippage));
    if(side==='buy'?price>limit:price<limit)break;
    const size=Math.floor(Math.min(left,l.size*c.participation)*1e6)/1e6;
    if(size<=0)continue;
    const reserve=feeReserve(size,price,fee);fills.push({size,price,fee:reserve,bookPrice:l.price});left=round(left-size);if(left<=1e-6)break;
  }
  const shares=round(fills.reduce((v,x)=>v+x.size,0)),gross=round(fills.reduce((v,x)=>v+x.size*x.price,0)),fees=round(fills.reduce((v,x)=>v+x.fee,0));
  return {side,requested,shares,gross,fees,total:round(side==='buy'?gross+fees:gross-fees),vwap:shares?gross/shares:null,fills};
}
export function initial(c=CONFIG){return {version:1,cash:c.bankroll,initialCash:c.bankroll,markets:{},seen:[],events:[]};}
export function inventory(m){return m.lots.map(a=>round(a.reduce((v,l)=>v+l.q,0)));}
function cost(lots,q=Infinity){let v=0;for(const l of lots){const take=Math.min(q,l.q);v+=take*l.unit;q-=take;if(q<=0)break;}return round(v);}
function consume(lots,q){const value=cost(lots,q);while(q>1e-6&&lots.length){const l=lots[0],n=Math.min(q,l.q);l.q=round(l.q-n);q=round(q-n);if(l.q<=1e-6)lots.shift();}return value;}
function event(state,s,action,extra={}){const e={index:state.events.length,id:s?.id,now:s?.now,marketId:s?.market?.id,action,...extra};state.events.push(e);return e;}
function apply(state,m,s,leg,q){
  if(q.shares<=1e-6)return;
  if(q.side==='buy'){
    if(q.total>state.cash+1e-6)throw Error('Insufficient local cash');
    state.cash=round(state.cash-q.total);m.spent=round(m.spent+q.total);m.lots[leg].push({q:q.shares,unit:q.total/q.shares,at:s.now});
  }else{m.realized=round(m.realized+q.total-consume(m.lots[leg],q.shares));state.cash=round(state.cash+q.total);}
  m.fees=round(m.fees+q.fees);
}
export function report(state,booksByMarket={}){
  const markets=Object.entries(state.markets).map(([id,m])=>{
    const shares=inventory(m),paired=Math.min(...shares),totalCost=round(cost(m.lots[0])+cost(m.lots[1]));
    const pairedCost=round(cost(m.lots[0],paired)+cost(m.lots[1],paired));
    const b=booksByMarket[id];const mark=b?round(shares.reduce((a,q,i)=>a+quote(b[i],'sell',q,m.fee,m.config).total,0)):null;
    return {id,title:m.title,shares,paired,unmatched:round(Math.abs(shares[0]-shares[1])),totalCost,pairedCost,conditionalPairSurplus:round(paired-pairedCost),worstSettlementPnl:round(paired-totalCost),realized:m.realized,fees:m.fees,markLiquidation:mark,settled:m.settled,halted:m.halted,spent:m.spent};
  });
  return {cash:state.cash,initialCash:state.initialCash,markets,realized:round(markets.reduce((v,m)=>v+m.realized,0)),positionsCost:round(markets.reduce((v,m)=>v+m.totalCost,0)),events:state.events.length};
}
export function step(state,input,config=CONFIG){
  const s=structuredClone(input),c={...CONFIG,...config};
  const digest=createHash('sha256').update(JSON.stringify(s)).digest('hex');
  const prior=state.seen.find(x=>x.id===s.id);if(prior){if(prior.digest!==digest)throw Error('Snapshot id collision');return {action:'DUPLICATE',id:s.id};}
  state.seen.push({id:s.id,digest});
  const invalid=validate(s,c);if(invalid)return event(state,s,'SKIP',{reason:invalid});
  const m=state.markets[s.market.id]??={title:s.market.title,tokens:s.market.tokens,fee:s.market.fee,config:c,lots:[[],[]],spent:0,fees:0,realized:0,enteredAt:null,halted:false,settled:false,lastNow:0};
  if(s.now<m.lastNow)return event(state,s,'SKIP',{reason:'OUT_OF_ORDER'});m.lastNow=s.now;
  if(JSON.stringify(m.tokens)!==JSON.stringify(s.market.tokens))return event(state,s,'SKIP',{reason:'IDENTITY_CHANGED'});
  let shares=inventory(m);const delta=round(shares[0]-shares[1]);
  if(m.settled||(m.halted&&Math.abs(delta)<1e-6))return event(state,s,'SKIP',{reason:m.settled?'SETTLED':'HALTED'});
  if(Math.abs(delta)>1e-6){
    const held=delta>0?0:1,need=1-held,q=Math.abs(delta),heldCost=cost(m.lots[held],shares[held])-cost(m.lots[held],shares[need]);
    const hedge=quote(s.books[need],'buy',q,s.market.fee,c);
    const pairedCost=hedge.shares?heldCost/q*hedge.shares+hedge.total:Infinity;
    const edge=hedge.shares?1-pairedCost/hedge.shares:-Infinity;
    if(!m.halted&&hedge.shares>1e-6&&edge>=c.minEdge&&hedge.total<=state.cash&&m.spent+hedge.total<=c.marketBudget){
      apply(state,m,s,need,hedge);return event(state,s,'HEDGE',{leg:need,quote:hedge,netEdgePerPair:edge,inventory:inventory(m)});
    }
    if(m.halted||s.now-m.enteredAt>=c.unmatchedMs||s.market.end-s.now<c.minRemainingMs){
      const exit=quote(s.books[held],'sell',q,s.market.fee,c);apply(state,m,s,held,exit);m.halted=true;
      return event(state,s,'EXIT',{leg:held,quote:exit,reason:exit.shares<q?'PARTIAL_EXIT':'HEDGE_TIMEOUT',inventory:inventory(m)});
    }
    return event(state,s,'WAIT',{reason:hedge.shares?'PAIR_TOO_EXPENSIVE':'NO_HEDGE_DEPTH',netEdgePerPair:Number.isFinite(edge)?edge:null,inventory:shares});
  }
  if(shares.some(q=>q>0))return event(state,s,'HOLD',{reason:'PAIRED_INVENTORY',inventory:shares});
  if(s.market.end-s.now<c.minRemainingMs)return event(state,s,'SKIP',{reason:'TOO_CLOSE_TO_RESOLUTION'});
  const quotes=s.books.map(b=>quote(b,'buy',c.shares,s.market.fee,c,c.seedMax));
  const leg=quotes[0].shares&&(!quotes[1].shares||quotes[0].vwap<=quotes[1].vwap)?0:1,entry=quotes[leg];
  if(!entry.shares)return event(state,s,'SKIP',{reason:'ENTRY_PRICE_OR_DEPTH'});
  if(entry.total>Math.min(c.maxUnmatchedCost,state.cash)||m.spent+entry.total>c.marketBudget)return event(state,s,'SKIP',{reason:'BUDGET'});
  apply(state,m,s,leg,entry);m.enteredAt=s.now;
  return event(state,s,'SEED',{leg,quote:entry,inventory:inventory(m)});
}
export function settle(state,marketId,evidence){
  const m=state.markets[marketId];if(!m)throw Error('Unknown market');if(m.settled)return {action:'DUPLICATE_SETTLEMENT'};
  if(evidence.verified!==true||evidence.closed!==true||evidence.conditionId!==marketId||!Array.isArray(evidence.tokens)||evidence.tokens.length!==2||evidence.tokens.filter(t=>t.winner===true).length!==1||m.tokens.some(t=>!evidence.tokens.some(x=>x.id===t)))throw Error('Settlement not verified');
  const winner=evidence.tokens.find(t=>t.winner).id,shares=inventory(m),payout=shares[m.tokens.indexOf(winner)],basis=cost(m.lots[0])+cost(m.lots[1]);
  m.realized=round(m.realized+payout-basis);state.cash=round(state.cash+payout);m.lots=[[],[]];m.settled=true;
  const e={action:'SETTLE',marketId,payout,realized:m.realized,at:evidence.at};state.events.push(e);return e;
}
