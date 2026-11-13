import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/analyticsLabor.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('exports', 'module', source)(module.exports, module);
const { summarizeAnalyticsLabor } = module.exports;

test('analytics keeps same-name people separate and combines repeated IDs with company costs', () => {
  const rows = summarizeAnalyticsLabor([
    { id:'1',user_id:'a',hours:8.25,cost_rate_snapshot:20,profiles:{full_name:'Ján Novák',cost_rate:99} },
    { id:'2',user_id:'b',hours:3,payment_type:'fixed',fixed_amount:150,profiles:{full_name:'Ján Novák'} },
    { id:'3',user_id:'a',hours:1,hourly_rate_snapshot:15,profiles:{full_name:'Ján Novák'} }
  ]);
  assert.deepEqual(rows,[{id:'a',name:'Ján Novák',hours:9.25,cost:180},{id:'b',name:'Ján Novák',hours:3,cost:150}]);
});

test('analytics safely handles special names and separate unidentified workers', () => {
  const rows = summarizeAnalyticsLabor([
    {id:'1',user_id:'a',hours:1,profiles:{full_name:'__proto__'}},
    {id:'2',user_id:'b',hours:2,profiles:{full_name:'__proto__'}},
    {id:'3',hours:3}, {id:'4',hours:4}
  ]);
  assert.equal(rows.length,4);
  assert.equal(rows.reduce((sum,row)=>sum+row.hours,0),10);
});
