export const START=Date.parse('2026-10-23T00:00:00Z');
export function snapshot({id='s1',t=0,yes=.30,no=.72,ys=100,ns=100,bidYes=yes-.02,bidNo=no-.02}={}){
 const now=START+t;return {id,now,origin:'deterministic-test',market:{id:'test-condition',title:'Bitcoin Up or Down — deterministic test',status:'open',end:START+300000,verified:true,negRisk:false,tokens:['test-up','test-down'],labels:['Up','Down'],fee:{mode:'reserve',curveRate:.07,notionalRate:0}},books:[{token:'test-up',timestamp:now,source:'fixture',synthetic:false,asks:[{price:yes,size:ys}],bids:[{price:bidYes,size:100}]},{token:'test-down',timestamp:now,source:'fixture',synthetic:false,asks:[{price:no,size:ns}],bids:[{price:bidNo,size:100}]}]};
}
const first=()=>snapshot();
const stale=snapshot({id:'stale'});stale.books[0].timestamp-=9000;
const synthetic=snapshot({id:'synthetic'});synthetic.books[0].synthetic=true;
export function scenarios(){return [
 {id:'pair',title:'Complement gets cheaper',description:'A 30¢ first leg, followed by a 62¢ complement. Ten paired shares are later settled in the test.',snapshots:[first(),snapshot({id:'s2',t:10000,yes:.38,no:.62}),snapshot({id:'s3',t:15000,yes:.38,no:.62})],settlement:{verified:true,conditionId:'test-condition',closed:true,tokens:[{id:'test-up',winner:true},{id:'test-down',winner:false}],at:START+301000}},
 {id:'timeout',title:'Second leg stays expensive',description:'The complement never meets the net-cost rule. The unmatched leg exits at the bid after 30 seconds.',snapshots:[first(),snapshot({id:'wait',t:12000,yes:.22,no:.80}),snapshot({id:'timeout',t:31000,yes:.22,no:.80})]},
 {id:'partial',title:'Only three shares fill',description:'25% of twelve displayed shares is three. Hedging and payout use three shares, never the requested ten.',snapshots:[snapshot({ys:12}),snapshot({id:'part-hedge',t:10000,yes:.38,no:.62})]},
 {id:'failed-exit',title:'Exit depth disappears',description:'One share exits first. Two remain open until a later snapshot provides more bid depth.',snapshots:[snapshot({ys:12}),(()=>{const s=snapshot({id:'exit1',t:31000,yes:.22,no:.80});s.books[0].bids[0].size=4;return s;})(),snapshot({id:'exit2',t:35000,yes:.20,no:.82})]},
 {id:'fees',title:'Fees erase the apparent edge',description:'The two prices total 97¢ before execution reserves. Net cost fails the minimum-edge check.',snapshots:[snapshot({yes:.30}),snapshot({id:'fee-hedge',t:10000,yes:.35,no:.67})]},
 {id:'stale',title:'Stale snapshot rejected',description:'The source timestamp is nine seconds old. No trade is generated.',snapshots:[stale]},
 {id:'synthetic',title:'Synthetic book rejected',description:'An indicative book cannot be treated as executable liquidity.',snapshots:[synthetic]}
 ];}
