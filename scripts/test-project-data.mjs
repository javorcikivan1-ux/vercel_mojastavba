import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const service = {};
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/projectData.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('require','exports','module',source)(()=>({supabase:service}),module.exports,module);
const { summarizeProjectLabor, loadAllProjectRows } = module.exports;

test('same names remain separate people while repeated work for one ID is combined', () => {
  const rows = summarizeProjectLabor([
    { id:'1',user_id:'a',hours:8.25,hourly_rate_snapshot:12,profiles:{full_name:'Ján Novák'} },
    { id:'2',user_id:'b',hours:3,payment_type:'fixed',fixed_amount:150,profiles:{full_name:'Ján Novák'} },
    { id:'3',user_id:'a',hours:1,hourly_rate_snapshot:12,profiles:{full_name:'Ján Novák'} }
  ]);
  assert.equal(rows.length,2);assert.deepEqual(rows.map(row=>row.id),['a','b']);
  assert.equal(rows[0].hours,9.25);assert.equal(rows[0].cost,111);assert.equal(rows[0].count,2);
  assert.equal(rows[1].cost,150);
});

test('unusual or unavailable names do not merge or corrupt summaries', () => {
  const rows=summarizeProjectLabor([
    {id:'1',user_id:'a',hours:1,profiles:{full_name:'__proto__'}},
    {id:'2',user_id:'b',hours:2,profiles:{full_name:'__proto__'}},
    {id:'3',hours:3}, {id:'4',hours:4}
  ]);
  assert.equal(rows.length,4);assert.equal(rows.reduce((sum,row)=>sum+row.hours,0),10);
  assert.equal(rows[2].name,'Neznámy pracovník');
});

test('all project pages load even when the API enforces a smaller page cap', async () => {
  const data=Array.from({length:1201},(_,id)=>({id}));const calls=[];
  service.from=table=>{
    assert.equal(table,'attendance_logs');const query={};
    for(const method of ['select','eq','order']) query[method]=(...args)=>{calls.push([method,...args]);return query;};
    query.range=async(start,end)=>{calls.push(['range',start,end]);return {data:data.slice(start,Math.min(start+500,end+1)),error:null};};return query;
  };
  const rows=await loadAllProjectRows('attendance_logs','*','org','site','date',false,'worker');
  assert.equal(rows.length,1201);assert.equal(rows.at(-1).id,1200);
  assert.ok(calls.some(call=>JSON.stringify(call)===JSON.stringify(['eq','organization_id','org'])));
  assert.ok(calls.some(call=>JSON.stringify(call)===JSON.stringify(['eq','site_id','site'])));
  assert.equal(calls.filter(call=>JSON.stringify(call)===JSON.stringify(['eq','user_id','worker'])).length,4);
  assert.deepEqual(calls.filter(call=>call[0]==='range').map(call=>call[1]),[0,500,1000,1201]);
  assert.ok(calls.some(call=>call[0]==='order'&&call[1]==='id'));
});

test('a later-page failure rejects the whole load instead of returning an incomplete export', async () => {
  service.from=()=>{
    const query={};for(const method of ['select','eq','order'])query[method]=()=>query;
    query.range=async start=>start===0?{data:Array.from({length:1000},(_,id)=>({id})),error:null}:{data:null,error:new Error('Later page failed')};return query;
  };
  await assert.rejects(loadAllProjectRows('materials','*','org','site'),/Later page failed/);
});
