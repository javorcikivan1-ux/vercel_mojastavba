import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/utils.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
new Function('exports', 'module', source)(module.exports, module);

test('decimal hours are displayed as hours and minutes', () => {
  for (const [hours, label] of [[8.25, '8 h 15 min'], [8.75, '8 h 45 min'], [8.5, '8 h 30 min'], [8, '8 h'], [0.25, '15 min'], [0, '0 min'], [1 / 60, '1 min'], [7.999999, '8 h'], [160.25, '160 h 15 min']]) {
    assert.equal(module.exports.formatDuration(hours), label);
  }
});
