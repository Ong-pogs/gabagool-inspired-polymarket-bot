import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {evaluate} from './evaluate.mjs';import {scenarios} from './scenarios.mjs';import {settle,report,CONFIG} from './engine.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const server=http.createServer((req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1');if(req.method!=='GET'){res.writeHead(405);res.end();return;}
 if(url.pathname==='/api/evidence'){
  const forward=evaluate(read('data/examples/forward/snapshots.json'));
  const tests=scenarios().map(s=>{const e=evaluate(s.snapshots);if(s.settlement){settle(e.state,'test-condition',s.settlement);e.settlementReport=report(e.state);}return {...s,...e};});
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({forward,tests,config:CONFIG,source:read('data/examples/wallet-study.json'),result:read('data/examples/forward/result.json'),frozen:read('data/examples/frozen-rules.json')}));return;
 }
 const allowed={'/':'public/index.html','/app.js':'public/app.js','/style.css':'public/style.css','/polymarket.svg':'public/polymarket.svg'};
 const file=allowed[url.pathname];if(!file){res.writeHead(404);res.end();return;}
 const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[ext]);res.end(fs.readFileSync(path.join(root,file)));
 }catch{res.writeHead(500);res.end('Evidence unavailable; collect a run and publish its local evidence first.');}
});
server.listen(8850,'127.0.0.1',()=>console.log('Inventory Bot: http://127.0.0.1:8850 (local, read-only dashboard)'));
