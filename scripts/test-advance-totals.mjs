import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const service = {};
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/advances.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
new Function('require', 'exports', 'module', source)(() => ({ supabase: service }), module.exports, module);

test('totals include all pages, scope organization/employee and preserve cents', async () => {
  const filters = [];
  service.from = table => {
    assert.equal(table, 'advances');
    const query = {};
    for (const method of ['select', 'eq', 'order']) query[method] = (...args) => { filters.push([method, ...args]); return query; };
    query.range = async offset => ({ data: offset === 0
      ? Array.from({ length: 1000 }, () => ({ amount: '100.15', settled_amount: '50.05' }))
      : [{ amount: '15.10', settled_amount: '5.05' }], error: null });
    return query;
  };
  assert.deepEqual(await module.exports.loadAdvanceTotals('org', 'worker'), { totalUnsettled: 50110.05, countUnsettled: 1001 });
  for (const filter of [['eq', 'organization_id', 'org'], ['eq', 'user_id', 'worker'], ['eq', 'status', 'pending']]) {
    assert.ok(filters.some(value => JSON.stringify(value) === JSON.stringify(filter)));
  }
});

test('failed summary request cannot appear as a zero balance', async () => {
  const query = {};
  for (const method of ['select', 'eq', 'order']) query[method] = () => query;
  query.range = async () => ({ data: null, error: new Error('network failure') });
  service.from = () => query;
  await assert.rejects(module.exports.loadAdvanceTotals('org'), /network failure/);
});
