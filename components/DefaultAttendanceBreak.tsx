import React from 'react';
import { Input } from './UI';
import { Clock } from 'lucide-react';

export const DefaultAttendanceBreak = ({ value, onChange }: { value: any; onChange: (value: any) => void }) => (
  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <label className="flex items-center gap-3 text-sm font-bold text-slate-800">
      <input type="checkbox" checked={Boolean(value.has_break)}
        onChange={e => onChange({ ...value, has_break: e.target.checked })}
        className="h-5 w-5 rounded text-orange-600" />
      <Clock size={17} className="shrink-0 text-orange-600" />
      Predvolená obedná prestávka
    </label>
    <p className="text-xs font-medium leading-relaxed text-slate-500">Obed sa automaticky predvyplní pri zápise hodín zamestnancom aj administrátorom. V konkrétnom zápise ho môžete upraviť alebo vypnúť.</p>
    {value.has_break && <div className="grid grid-cols-2 gap-3">
      <Input label="Obed od" type="time" value={value.break_start || '12:00'} required
        onChange={(e: any) => onChange({ ...value, break_start: e.target.value })} />
      <Input label="Obed do" type="time" value={value.break_end || '12:45'} required
        onChange={(e: any) => onChange({ ...value, break_end: e.target.value })} />
    </div>}
  </div>
);
