import fs from 'node:fs';import {createHash} from 'node:crypto';
fs.mkdirSync('data/examples',{recursive:true});
const files=['DESIGN.md','src/engine.mjs','src/scenarios.mjs','src/collect.mjs','test/engine.test.mjs'];
fs.writeFileSync('data/examples/frozen-rules.json',JSON.stringify({frozenAt:new Date().toISOString(),files:Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))},null,2));console.log('Strategy and tests frozen before forward collection.');
