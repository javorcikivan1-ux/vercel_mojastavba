import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const load = name => {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require','exports','module',source)(name => load(name.replace('./','')), module.exports, module);
  return module.exports;
};
const { buildBatchAttendance } = load('batchAttendance');
const form = { site_id:'site', date:'2026-11-07', start_time:'07:00', end_time:'16:00', description:'  Montáž  ' };
const worker = { user_id:'a', full_name:'Ján', has_break:true, break_start:'12:00', break_end:'12:45', payment_type:'hourly', hourly_rate_snapshot:15, cost_rate_snapshot:20, fixed_amount:0 };

test('batch preserves individual lunch, fixed pay and wage/cost snapshots without UI fields', () => {
  const rows = buildBatchAttendance('org',form,[worker,{...worker,user_id:'b',has_break:false,payment_type:'fixed',fixed_amount:150}]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].hours,8.25);assert.equal(rows[0].break_minutes,45);
  assert.equal(rows[0].hourly_rate_snapshot,15);assert.equal(rows[0].cost_rate_snapshot,20);
  assert.equal(rows[0].description,'Montáž');assert.equal(rows[0].organization_id,'org');assert.equal(rows[0].site_id,'site');
  assert.equal(rows[1].hours,9);assert.equal(rows[1].fixed_amount,150);assert.equal(rows[1].break_start,null);
  assert.equal('has_break' in rows[0],false);assert.equal('full_name' in rows[0],false);
});

test('one invalid worker rejects the entire batch before any write', () => {
  for (const change of [{break_end:'17:00'},{hourly_rate_snapshot:-1},{cost_rate_snapshot:Infinity},{payment_type:'fixed',fixed_amount:0},{payment_type:'invalid'}]) {
    assert.throws(()=>buildBatchAttendance('org',form,[worker,{...worker,user_id:'b',...change}]));
  }
  assert.throws(()=>buildBatchAttendance('org',form,[worker,worker]));
  assert.throws(()=>buildBatchAttendance('org',form,[]));
  assert.throws(()=>buildBatchAttendance('org',{...form,date:'2026-02-30'},[worker]));
  assert.throws(()=>buildBatchAttendance('org',{...form,date:'garbage'},[worker]));
  assert.throws(()=>buildBatchAttendance('org',{...form,site_id:''},[worker]));
});

test('batch keeps overnight work and minute precision', () => {
  const [row] = buildBatchAttendance('org',{...form,start_time:'22:00',end_time:'06:00'},[{...worker,break_start:'02:00',break_end:'02:45'}]);
  assert.equal(row.hours,7.25);assert.equal(row.break_minutes,45);
});
