import fs from 'node:fs';import path from 'node:path';import {evaluate} from '../src/evaluate.mjs';import {initial,step,report,settle} from '../src/engine.mjs';import {scenarios} from '../src/scenarios.mjs';
const source=process.argv[2]||'runs/forward-01',out='data/examples/forward';fs.mkdirSync(out,{recursive:true});
for(const file of ['snapshots.json','result.json','ledger.json','decisions.json','config.json','discovery.json'])fs.copyFileSync(path.join(source,file),path.join(out,file));
const snaps=JSON.parse(fs.readFileSync(out+'/snapshots.json','utf8'));const evaluation=evaluate(snaps);fs.writeFileSync(out+'/evaluation.json',JSON.stringify(evaluation,null,2));
const tests=scenarios().map(s=>{const e=evaluate(s.snapshots);if(s.settlement){settle(e.state,'test-condition',s.settlement);e.settlementReport=report(e.state);}return {...s,...e};});fs.writeFileSync('data/examples/scenarios.json',JSON.stringify(tests,null,2));
console.log(JSON.stringify({snapshots:evaluation.snapshotCount,report:evaluation.report,baselines:evaluation.baselines},null,2));
