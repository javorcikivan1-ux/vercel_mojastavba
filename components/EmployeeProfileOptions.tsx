import React from 'react';
import { Check } from 'lucide-react';

export const EmployeeProfileOptions = ({ value, onChange, showWageOption }: {
  value: any;
  onChange: (value: any) => void;
  showWageOption: boolean;
}) => (
  <div className="space-y-3 border-t border-slate-100 pt-4">
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${value.is_active ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-200 bg-white'}`}>
      <input type="checkbox" checked={Boolean(value.is_active)}
        onChange={e => onChange({ ...value, is_active: e.target.checked })}
        className="peer sr-only" />
      <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-focus-visible:ring-offset-2 ${value.is_active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
        <Check size={14} strokeWidth={3} />
      </span>
      <span className={`text-sm font-semibold ${value.is_active ? 'text-emerald-900' : 'text-slate-700'}`}>Aktívny zamestnanec</span>
    </label>

    {showWageOption && <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-3 transition hover:bg-slate-50">
      <input type="checkbox" checked={Boolean(value.show_wage_in_profile)}
        onChange={e => onChange({ ...value, show_wage_in_profile: e.target.checked })}
        className="peer sr-only" />
      <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 peer-focus-visible:ring-offset-2 ${value.show_wage_in_profile ? 'border-slate-600 bg-slate-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
        <Check size={14} strokeWidth={2.5} />
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-700">Zobrazovať mzdu v profile</span>
        <span className="mt-1 block text-xs font-medium leading-relaxed text-slate-500">Zamestnanec uvidí svoju hodinovú mzdu a mesačný zárobok.</span>
      </span>
    </label>}
  </div>
);
