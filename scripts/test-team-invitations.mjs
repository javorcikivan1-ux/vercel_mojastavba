import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/teamInvitations.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
new Function('exports', 'module', source)(module.exports, module);
const { validateInvitations, sendInvitationQueue } = module.exports;
const rows = ['a','b','c'].map(id => ({ id, email: `${id}@example.test`, name: id }));

test('email validation trims fields and blocks duplicates, empty and oversized batches', () => {
  assert.equal(validateInvitations([{ id:'a',email:' A@Example.Test ',name:' Adam ' }])[0].email,'a@example.test');
  for (const invalid of [[], [{...rows[0],email:''}], [rows[0],{...rows[0],id:'other'}], Array(51).fill(rows[0])]) assert.throws(()=>validateInvitations(invalid));
});

test('invites are strictly sequential, with a one-second gap and accurate per-row progress', async () => {
  const events=[];const progress=[];let active=0;
  const results=await sendInvitationQueue(rows,{
    send:async row=>{assert.equal(active,0);active++;events.push(row.id);await Promise.resolve();active--;},
    wait:async ms=>{assert.equal(active,0);events.push(ms);},
    onProgress:(row,index,result)=>progress.push([row.id,index,result?.status||'sending'])
  });
  assert.deepEqual(events,['a',1000,'b',1000,'c']);
  assert.equal(results.filter(row=>row.status==='sent').length,3);
  assert.deepEqual(progress,[['a',0,'sending'],['a',0,'sent'],['b',1,'sending'],['b',1,'sent'],['c',2,'sending'],['c',2,'sent']]);
});

test('a failed recipient does not block other people or turn into a false success', async () => {
  const results=await sendInvitationQueue(rows,{send:async row=>{if(row.id==='b')throw new Error('Mailbox rejected');},wait:async()=>{},onProgress:()=>{}});
  assert.deepEqual(results.map(row=>row.status),['sent','error','sent']);
  assert.equal(results[1].message,'Mailbox rejected');
});

test('rate limit and expired sessions stop the queue, preserving unsent recipients', async () => {
  for(const status of [401,403,429]) {
    const calls=[];
    const results=await sendInvitationQueue(rows,{send:async row=>{calls.push(row.id);throw Object.assign(new Error('Stop'),{status});},wait:async()=>assert.fail('No delay after stop'),onProgress:()=>{}});
    assert.deepEqual(calls,['a']);assert.deepEqual(results.map(row=>row.status),['error','pending','pending']);
  }
});
