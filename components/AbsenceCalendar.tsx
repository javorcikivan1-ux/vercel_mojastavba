import { formatDuration } from '../lib/utils';
import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { absenceVisibleOnDate, absenceTime, absenceType, formatAbsenceDate, localDateISO, monthDates, type EmployeeAbsence } from '../lib/absences';

export const AbsenceCalendar = ({ month, onMonthChange, logs, absences }: {
  month: Date; onMonthChange?: (date: Date) => void; logs: any[]; absences: EmployeeAbsence[];
}) => {
  const [selected, setSelected] = useState('');
  const dates = monthDates(month);
  const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const selectedAbsences = absences.filter(absence => absenceVisibleOnDate(absence, selected));
  const selectedLogs = logs.filter(log => log.date === selected);
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div><h3 className="text-sm font-bold text-slate-900">Kalendár dochádzky</h3><p className="mt-1 text-xs capitalize text-slate-500">{month.toLocaleDateString('sk-SK', { month: 'long', year: 'numeric' })}</p></div>
      {onMonthChange && <div className="flex gap-1">
        <button type="button" aria-label="Predchádzajúci mesiac" className="rounded-lg border border-slate-200 p-2" onClick={() => { setSelected(''); onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1)); }}><ChevronLeft size={17} /></button>
        <button type="button" aria-label="Nasledujúci mesiac" className="rounded-lg border border-slate-200 p-2" onClick={() => { setSelected(''); onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1)); }}><ChevronRight size={17} /></button>
      </div>}
    </div>
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map(day => <div key={day} className="pb-1 text-center text-[11px] font-semibold text-slate-500">{day}</div>)}
      {Array.from({ length: offset }, (_, i) => <div key={`empty-${i}`} />)}
      {dates.map(date => {
        const dayAbsences = absences.filter(absence => absenceVisibleOnDate(absence, date));
        const dayLogs = logs.filter(log => log.date === date);
        const hours = dayLogs.reduce((sum, log) => sum + Number(log.hours || 0), 0);
        const kind = dayAbsences[0] && absenceType(dayAbsences[0].kind);
        const weekend = new Date(`${date}T12:00:00`).getDay() % 6 === 0;
        return <button key={date} type="button" aria-pressed={selected === date}
          aria-label={`${formatAbsenceDate(date)}: ${dayAbsences.map(a => `${absenceType(a.kind).label}, ${absenceTime(a)}`).join('; ')}${dayLogs.length ? `, zapísané ${formatDuration(hours)}` : dayAbsences.length ? '' : ', bez zápisu'}`}
          onClick={() => setSelected(date)}
          className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-0.5 py-2 text-[11px] transition sm:text-xs ${kind ? kind.color : dayLogs.length ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : weekend ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-600'} ${date === localDateISO() ? 'ring-1 ring-orange-400' : ''} ${selected === date ? 'outline outline-2 outline-offset-1 outline-slate-500' : ''}`}>
          <span className="font-medium">{Number(date.slice(-2))}</span>
          {kind ? <span className="max-w-full truncate font-bold">{dayAbsences.map(a => absenceType(a.kind).short).join('/')}</span> : dayLogs.length ? <Check size={14} /> : <span>–</span>}
          {kind && dayLogs.length > 0 && <span className="text-[9px]">+ {formatDuration(hours)}</span>}
          {kind && dayAbsences.some(a => !a.all_day) && <span className="text-[9px]">časť dňa</span>}
        </button>;
      })}
    </div>
    {selected && dates.includes(selected) && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <strong>{formatAbsenceDate(selected)}</strong>
      {selectedAbsences.map(absence => <p key={absence.id} className="mt-1">{absenceType(absence.kind).label} · {absenceTime(absence)}</p>)}
      {selectedLogs.map(log => <p key={log.id} className="mt-1">Práca: {log.start_time || '–'} – {log.end_time || '–'} · {formatDuration(Number(log.hours))}</p>)}
      {!selectedAbsences.length && !selectedLogs.length && <p className="mt-1">Bez záznamu.</p>}
    </div>}
  </div>;
};
