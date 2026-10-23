import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const module = { exports: {} };
const source = ts.transpileModule(readFileSync(new URL('../lib/attendance.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
new Function('exports', 'module', source)(module.exports, module);
const { parseAttendanceRangeHours, calculateAttendanceMinutes, formatAttendanceRange, formatAttendanceRanges } = module.exports;

test('summarized split shifts preserve lunch gap and net hours when edited', () => {
  const ranges = formatAttendanceRanges([
    { start_time: '12:45', end_time: '16:00' },
    { start_time: '07:00', end_time: '12:00' }
  ]);
  assert.equal(ranges, '07:00 - 12:00, 12:45 - 16:00');
  assert.equal(parseAttendanceRangeHours(ranges), 8.25);
});

test('summarized entries keep individual breaks and gaps between jobs', () => {
  const ranges = formatAttendanceRanges([
    { start_time: '07:00', end_time: '14:00', break_start: '12:00', break_end: '12:45' },
    { start_time: '16:00', end_time: '18:00' }
  ]);
  assert.equal(ranges, '07:00 - 12:00, 12:45 - 14:00, 16:00 - 18:00');
  assert.equal(parseAttendanceRangeHours(ranges), 8.25);
});

test('45 minute lunch keeps 8.25 hours through time formatting and editing', () => {
  const log = { start_time: '07:00', end_time: '16:00', break_start: '12:00', break_end: '12:45' };
  const hours = calculateAttendanceMinutes(log.start_time, log.end_time, true, log.break_start, log.break_end).netMinutes / 60;
  assert.equal(hours, 8.25);
  assert.equal(parseAttendanceRangeHours(formatAttendanceRange(log)), hours);
  assert.equal((hours + hours).toFixed(2), '16.50');
});

test('time edits retain minute precision and overnight shifts', () => {
  assert.equal(parseAttendanceRangeHours('07:00 - 15:15'), 8.25);
  assert.equal(parseAttendanceRangeHours('07:00 - 07:01'), 1 / 60);
  assert.equal(parseAttendanceRangeHours('22:00 - 00:00, 00:45 - 06:00'), 7.25);
  assert.equal(parseAttendanceRangeHours('09:00 – 12:00'), 3);
});

test('invalid or unfinished time edits do not overwrite hours', () => {
  for (const value of ['', '---', '25:00 - 16:00', '07:60 - 16:00', '07:00 - 12:00, 12:45 -']) {
    assert.equal(parseAttendanceRangeHours(value), null);
  }
});
