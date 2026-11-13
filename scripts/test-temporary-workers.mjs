import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = (path, require = () => ({})) => {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('require', 'exports', 'module', source)(require, module.exports, module);
  return module.exports;
};
const attendance = compile('../lib/attendance.ts');
const workers = compile('../lib/temporaryWorkers.ts', () => attendance);
const absences = compile('../lib/absences.ts', () => ({ supabase: {} }));

test('cooperation ends after the last inclusive day, with support for open and renewed periods', () => {
  const worker={is_temporary:true,temporary_periods:[{start_date:'2026-11-01',end_date:'2026-11-06'}]};
  assert.equal(workers.temporaryWorkerHasEnded(worker,'2026-11-06'),false);
  assert.equal(workers.temporaryWorkerHasEnded(worker,'2026-11-07'),true);
  assert.equal(workers.temporaryWorkerHasEnded({...worker,temporary_periods:[...worker.temporary_periods,{start_date:'2026-12-01',end_date:''}]},'2026-11-07'),false);
  assert.equal(workers.temporaryWorkerHasEnded({is_temporary:true,temporary_periods:[]},'2026-11-07'),false);
  assert.equal(workers.temporaryWorkerHasEnded({...worker,is_temporary:false},'2026-11-07'),false);
  assert.equal(workers.cooperationDateISO(new Date('2026-11-06T23:30:00Z')),'2026-11-07');
});

test('temporary worker defaults support deferred pay, hourly pay and fixed work', () => {
  assert.deepEqual(workers.temporaryWorkerDefaults({ is_temporary: true }), { has_break: false, break_start: '12:00', break_end: '12:45', hourly_rate_snapshot: 0, payment_type: 'hourly', fixed_amount: 0 });
  assert.equal(workers.temporaryWorkerDefaults({ is_temporary: true, default_payment_type: 'fixed', default_fixed_amount: 150 }).fixed_amount, 150);
  assert.equal(workers.temporaryWorkerDefaults({ is_temporary: true, default_payment_type: 'fixed' }).payment_type, 'fixed');
  assert.equal(workers.temporaryWorkerDefaults({ is_temporary: true, default_payment_type: 'hourly', hourly_rate: 12 }).hourly_rate_snapshot, 12);
  assert.equal(workers.temporaryWorkerDefaults({ hourly_rate: 15 }).payment_type, 'hourly');
});

test('temporary workers are excluded from the entire core attendance denominator', () => {
  const staff = [{ id: 'core' }, { id: 'temp', is_temporary: true }];
  let status = absences.classifyAttendance(staff, [], [], '2026-11-06');
  assert.deepEqual(status.missing.map(worker => worker.id), ['core']);
  status = absences.classifyAttendance(staff, [{ user_id: 'temp', hours: 8.25 }, { user_id: 'core', hours: 8 }], [], '2026-11-06');
  assert.deepEqual(status.logged.map(worker => worker.id), ['core']);
  assert.equal(status.missing.length, 0);
});

test('temporary worker accepts no account and optional pay, but rejects invalid input', () => {
  const form = { full_name: 'Pomocník', default_payment_type: '', temporary_periods: [{ start_date: '2026-11-06', end_date: '' }] };
  workers.validateTemporaryWorker(form);
  workers.validateTemporaryWorker({ ...form, job_title: 'Tesár na výpomoc' });
  assert.throws(() => workers.validateTemporaryWorker({ ...form, job_title: 'a'.repeat(121) }));
  workers.validateTemporaryWorker({ ...form, temporary_periods: [{ start_date: '2026-11-06', end_date: '2026-11-06' }, { start_date: '2026-12-01', end_date: '2026-12-03' }] });
  for (const change of [{ full_name: '' }, { hourly_rate: -1 }, { default_fixed_amount: Infinity }, { default_payment_type: 'other' }, { temporary_periods: [{ start_date: '2026-02-30', end_date: '' }] }, { temporary_periods: [{ start_date: '2026-11-06', end_date: '2026-11-05' }] }]) {
    assert.throws(() => workers.validateTemporaryWorker({ ...form, ...change }));
  }
});
