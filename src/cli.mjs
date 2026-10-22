import fs from 'node:fs';import path from 'node:path';import {initial,step,report,settle} from './engine.mjs';import {scenarios} from './scenarios.mjs';import {collect} from './collect.mjs';
const [cmd,...args]=process.argv.slice(2);const option=(name,fallback)=>args.includes(name)?args[args.indexOf(name)+1]:fallback;
if(cmd==='scan'){const cycles=Number(option('--cycles',16)),count=Number(option('--markets',3)),intervalMs=Number(option('--interval',4000));if(!Number.isInteger(cycles)||cycles<1||cycles>100||!Number.isInteger(count)||count<1||count>5||!Number.isFinite(intervalMs)||intervalMs<1000||intervalMs>60000)throw Error('Use 1-100 cycles, 1-5 markets, and 1000-60000ms intervals');await collect({cycles,count,intervalMs,runDir:option('--out',undefined)});}
else if(cmd==='demo'){
 const outputs=scenarios().map(s=>{const state=initial();for(const snap of s.snapshots)step(state,snap);const beforeSettlement=report(state);if(s.settlement)settle(state,'test-condition',s.settlement);return {id:s.id,title:s.title,events:state.events,preSettlement:beforeSettlement,report:report(state)};});
 if(args.includes('--json'))console.log(JSON.stringify(outputs,null,2));else for(const s of outputs){console.log('\n'+s.title+' [DETERMINISTIC TEST]');for(const e of s.events)console.log('  '+e.action+' '+(e.reason||'')+(e.quote?' | '+e.quote.shares+' shares | $'+e.quote.total.toFixed(4):''));console.log('  Realized: $'+s.report.realized.toFixed(4)+' | Open cost: $'+s.report.positionsCost.toFixed(4));}
}
else if(cmd==='replay'){
 const file=args[0];if(!file)throw Error('Usage: node src/cli.mjs replay runs/<id>/snapshots.json');
 const snaps=JSON.parse(fs.readFileSync(file,'utf8')),state=initial();snaps.forEach(s=>step(state,s));console.log(JSON.stringify(report(state),null,2));
}else if(cmd==='status'){
 const dir=args[0]||'data/examples/forward';console.log(fs.readFileSync(path.join(dir,'result.json'),'utf8'));
}else console.log('Commands: scan [--cycles 16 --markets 3 --interval 4000 --out runs/name], demo [--json], replay <snapshots.json>, status [run-dir]');
