import fs from 'node:fs';import path from 'node:path';import {Predictefy} from './api.mjs';import {CONFIG,initial,step,report,quote} from './engine.mjs';import {persist,load,acquire} from './store.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function venueGet(url){const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Venue metadata HTTP '+r.status);return r.json();}
export async function discover(api,count=3){
 const response=await api.get('fetchMarkets',{query:'Bitcoin',status:'active',sort:'closeDate',closeAfter:new Date(Date.now()+90000).toISOString(),limit:100});
 const candidates=response.body.data.filter(m=>/^Bitcoin Up or Down/i.test(m.title)&&Date.parse(m.resolutionDate)<Date.now()+25*60000&&m.outcomes?.length===2).slice(0,count*2);
 const found=[];
 for(const m of candidates){if(found.length>=count)break;
  const condition=m.sourceMetadata?.nativeMarketId;if(!/^0x[a-f0-9]{64}$/i.test(condition||''))continue;
  try{
   const native=await venueGet('https://clob.polymarket.com/markets/'+condition);
   const tokens=m.outcomes.map(o=>String(o.outcomeId));
   if(native.condition_id!==condition||native.neg_risk!==false||!native.active||native.closed||!native.accepting_orders||native.tokens?.length!==2||tokens.some(t=>!native.tokens.some(n=>n.token_id===t)))continue;
   const rates=await Promise.all(tokens.map(t=>venueGet('https://clob.polymarket.com/fee-rate?token_id='+t)));
   if(rates.some(r=>!Number.isFinite(r.base_fee)||r.base_fee<0))continue;
   found.push({market:{id:condition,catalogId:m.marketId,title:m.title,status:'open',end:Date.parse(m.resolutionDate),verified:true,negRisk:false,tokens,labels:tokens.map(t=>native.tokens.find(n=>n.token_id===t).outcome),url:m.url,fee:{mode:'reserve',curveRate:.07,notionalRate:Math.max(...rates.map(r=>r.base_fee/10000)),reportedBaseFee:rates.map(r=>r.base_fee),note:'Maximum of documented crypto curve and reported bps notional reserve; not exact venue accounting'}},evidence:{catalog:m,native,rates,verifiedAt:new Date().toISOString()}});
  }catch(e){console.log(JSON.stringify({metadataSkipped:m.marketId,reason:e.message}));}
 }
 if(!found.length)throw Error('No verified near-term binary Bitcoin markets. Retry at the next market window.');
 return {found,response};
}
export async function collect({cycles=16,intervalMs=4000,count=3,runDir}={}){
 runDir??='runs/'+new Date().toISOString().replaceAll(/[:.]/g,'-');fs.mkdirSync(runDir,{recursive:true});const release=acquire(path.join(runDir,'runner.lock'));
 const api=new Predictefy();const read=name=>fs.existsSync(path.join(runDir,name))?JSON.parse(fs.readFileSync(path.join(runDir,name),'utf8')):[];const snapshots=read('snapshots.json'),decisions=read('decisions.json'),state=load(path.join(runDir,'ledger.json'));
 try{
  const {found,response}=await discover(api,count);persist(path.join(runDir,'discovery.json'),{response,found});persist(path.join(runDir,'config.json'),CONFIG);
  console.log(JSON.stringify({mode:'local-simulation',markets:found.map(x=>({id:x.market.catalogId,title:x.market.title})),cycles,liveOrders:false}));
  for(let cycle=0;cycle<cycles;cycle++){
   for(const {market} of found){
    try{
     const replies=await Promise.all(market.tokens.map(outcomeId=>api.get('fetchOrderBook',{outcomeId,limit:20})));
     const s={id:market.id+':'+snapshots.length+':'+replies[0].requestedAt,now:Date.now(),origin:'Predictefy live REST',market,books:replies.map((r,i)=>({token:market.tokens[i],timestamp:r.body.data.timestamp,source:r.body.data.provenance?.source,synthetic:r.body.data.sourceMetadata?.synthetic,bids:r.body.data.bids,asks:r.body.data.asks})),receivedAt:replies.map(r=>r.receivedAt),credits:replies.reduce((v,r)=>v+r.credits,0)};
     const d=step(state,s);snapshots.push(s);decisions.push(d);persist(path.join(runDir,'snapshots.json'),snapshots);persist(path.join(runDir,'ledger.json'),state);persist(path.join(runDir,'decisions.json'),decisions);
     console.log(JSON.stringify({cycle:cycle+1,market:market.catalogId,asks:s.books.map(b=>b.asks[0]?.price),action:d.action,reason:d.reason,shares:d.inventory,cash:state.cash}));
    }catch(e){const failure={at:new Date().toISOString(),market:market.id,error:e.message};fs.appendFileSync(path.join(runDir,'errors.jsonl'),JSON.stringify(failure)+'\n');console.log(JSON.stringify(failure));if(/HTTP (401|402|403)/.test(e.message))throw e;}
   }
   if(cycle<cycles-1)await wait(intervalMs);
  }
  const latest=Object.fromEntries(snapshots.map(s=>[s.market.id,s.books]));
  const result={runDir,config:CONFIG,usage:api.usage,snapshots:snapshots.length,startedAt:snapshots[0]?.now,endedAt:snapshots.at(-1)?.now,report:report(state,latest),actions:decisions.reduce((v,d)=>(v[d.action]=(v[d.action]||0)+1,v),{}),settledMarkets:0,limits:'Forward snapshot simulation. Book marks, not realized venue fills. Fee reserves are assumptions.'};
  persist(path.join(runDir,'result.json'),result);console.log(JSON.stringify(result,null,2));return {result,snapshots,state};
 }finally{release();}
}
