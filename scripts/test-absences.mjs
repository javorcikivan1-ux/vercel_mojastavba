import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Test the date/business rules without loading browser auth or making requests.
const service = {};
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/absences.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
new Function('require', 'exports', 'module', source)(() => ({ supabase: service }), module.exports, module);
const a = module.exports;
const pn = { id: 'pn', organization_id: 'org', user_id: 'alice', kind: 'pn', start_date: '2026-10-19', end_date: null, all_day: true, start_time: null, end_time: null };
const doctor = { ...pn, id: 'doctor', user_id: 'bob', kind: 'doctor', start_date: '2026-10-23', end_date: '2026-10-23', all_day: false, start_time: '09:00', end_time: '12:00' };
const october = new Date(2026, 9, 1);

test('inclusive endpoints and open-ended absence', () => {
  assert.equal(a.absenceOnDate(pn, '2026-10-18'), false);
  assert.equal(a.absenceOnDate(pn, '2026-10-19'), true);
  assert.equal(a.absenceOnDate(pn, '2027-01-01'), true);
  assert.equal(a.absenceOnDate({ ...pn, end_date: '2026-10-23' }, '2026-10-23'), true);
  assert.equal(a.absenceOnDate({ ...pn, end_date: '2026-10-23' }, '2026-10-24'), false);
});

test('month expansion handles leap years and clips long absences', () => {
  assert.equal(a.monthDates(new Date(2028, 1, 1)).length, 29);
  assert.equal(a.monthDates(new Date(2026, 1, 1)).length, 28);
  const rows = a.absenceExportRows([pn], october, '2026-11-05');
  assert.equal(rows.length, 13);
  assert.equal(rows[0].date, '2026-10-19');
  assert.equal(rows.at(-1).date, '2026-10-31');
  assert.ok(rows.every(row => row.isAbsence && !row.isFixed && row.hours === ''));
  assert.equal(a.absenceExportRows([pn], new Date(2026, 8, 1)).length, 0);
});

test('partial absence preserves minutes and does not become worked hours', () => {
  const rows = a.absenceExportRows([{ ...doctor, end_time: '11:45' }], october, '2026-10-23');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hours, '2.75');
  assert.equal(rows[0].isAbsence, true);
  assert.match(rows[0].displayTime, /09:00.*11:45/);
  assert.equal(a.absenceMinutes(pn), null);
});

test('day summary counts days rather than number of records', () => {
  assert.equal(a.absenceDayCounts([pn, pn], october, '2026-11-05')[0].days, 13);
  const morning = { ...doctor, end_time: '10:00' };
  const afternoon = { ...doctor, id: 'afternoon', start_time: '13:00', end_time: '15:00' };
  assert.equal(a.absenceDayCounts([morning, afternoon], october, '2026-10-23')[0].days, 1);
});

test('ongoing PN is not exported as a confirmed future absence', () => {
  assert.equal(a.absenceVisibleOnDate(pn, '2026-10-24', '2026-10-23'), false);
  assert.equal(a.absenceExportRows([pn], october, '2026-10-23').length, 5);
  assert.equal(a.absenceDayCounts([pn], october, '2026-10-23')[0].days, 5);
  assert.equal(a.absenceVisibleOnDate({ ...pn, kind: 'vacation', end_date: '2026-10-30' }, '2026-10-24', '2026-10-23'), true);
});

test('full-day absence excuses missing entry but partial absence does not', () => {
  const status = a.classifyAttendance([{ id: 'alice' }, { id: 'bob' }, { id: 'carol' }], [], [pn, doctor], '2026-10-23');
  assert.deepEqual(status.absent.map(worker => worker.id), ['alice']);
  assert.deepEqual(status.missing.map(worker => worker.id), ['bob', 'carol']);
  assert.deepEqual(status.partial.map(worker => worker.id), ['bob']);
});

test('work alongside full-day absence is retained for review', () => {
  const work = { user_id: 'alice', hours: 5 };
  const status = a.classifyAttendance([{ id: 'alice' }], [work], [pn], '2026-10-23');
  assert.deepEqual(status.absent[0].logs, [work]);
  assert.equal(status.logged.length, 0);
  assert.equal(status.missing.length, 0);
});

test('validation rejects impossible dates, unknown type and invalid time interval', () => {
  a.validateAbsence(pn);
  a.validateAbsence(doctor);
  for (const invalid of [
    { ...pn, start_date: '2026-02-30' },
    { ...pn, end_date: '2026-10-18' },
    { ...pn, kind: 'invalid' },
    { ...doctor, end_time: '08:00' },
    { ...doctor, start_time: '25:00' },
    { ...doctor, end_time: null }
  ]) assert.throws(() => a.validateAbsence(invalid));
});

test('paginated load retains records beyond API row limit and scopes queries', async () => {
  const calls = [];
  const first = Array.from({ length: 1000 }, (_, index) => ({ ...pn, id: String(index) }));
  service.from = table => {
    calls.push(['table', table]);
    const query = {};
    for (const method of ['select', 'eq', 'lte', 'or', 'order']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
    query.range = async (start, end) => { calls.push(['range', start, end]); return { data: start === 0 ? first : [{ ...pn, id: 'last' }], error: null }; };
    return query;
  };
  const rows = await a.loadAbsences('org', 'alice', { start: '2026-10-01', end: '2026-10-31' });
  assert.equal(rows.length, 1001);
  assert.equal(rows.at(-1).id, 'last');
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'organization_id' && call[2] === 'org'));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'alice'));
  assert.ok(calls.some(call => call[0] === 'range' && call[1] === 1000));
});
