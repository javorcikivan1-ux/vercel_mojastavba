import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Input, Select } from './UI';
import { Loader2, Search, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { loadAllProjectRows } from '../lib/projectData';
import { cooperationDateISO, temporaryWorkerDefaults, temporaryWorkerHasEnded } from '../lib/temporaryWorkers';
import { calculateAttendanceMinutes } from '../lib/attendance';
import { formatDuration } from '../lib/utils';
import { buildBatchAttendance } from '../lib/batchAttendance';

export const AttendanceEntryModal = ({ profile, initialEmployeeId, onClose, onSaved }: any) => {
  const [sites, setSites] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [entries, setEntries] = useState<Record<string, any>>({});
  const [form, setForm] = useState({ site_id: '', date: cooperationDateISO(), start_time: '07:00', end_time: '16:00', description: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const selected = Object.values(entries);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadAllProjectRows('sites', '*', profile.organization_id, undefined, 'name', true),
      loadAllProjectRows('profiles', '*', profile.organization_id, undefined, 'full_name', true),
      loadAllProjectRows('site_worker_rates', '*', profile.organization_id)
    ]).then(([sites, workers, rates]) => {
      if (cancelled) return;
      setSites(sites.filter(site => site.status !== 'lead'));
      setWorkers(workers.filter(worker => worker.is_active));
      setRates(rates);
    }).catch(error => { if (!cancelled) setLoadError(error?.message || 'Údaje sa nepodarilo načítať.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile.organization_id]);

  const defaults = (worker: any, siteId: string) => {
    const override = rates.find(rate => rate.site_id === siteId && rate.user_id === worker.id);
    const hourly = Number(override?.hourly_rate || worker.hourly_rate || 0);
    return { ...temporaryWorkerDefaults(worker), user_id: worker.id, full_name: worker.full_name,
      hourly_rate_snapshot: hourly, cost_rate_snapshot: Number(override?.cost_rate || worker.cost_rate || hourly) };
  };
  const changeSite = (siteId: string) => {
    setForm({ ...form, site_id: siteId });
    const chosen = Object.keys(entries);
    const ids = chosen.length ? chosen : initialEmployeeId ? [initialEmployeeId] : [];
    setEntries(Object.fromEntries(workers.filter(worker => ids.includes(worker.id) && !temporaryWorkerHasEnded(worker, form.date)).map(worker => [worker.id, defaults(worker, siteId)])));
    setError('');
  };
  const patch = (id: string, values: any) => setEntries(previous => ({ ...previous, [id]: { ...previous[id], ...values } }));
  const eligible = workers.filter(worker => !temporaryWorkerHasEnded(worker, form.date));
  const visible = eligible.filter(worker => entries[worker.id] || (worker.full_name || '').toLocaleLowerCase('sk').includes(search.toLocaleLowerCase('sk')));
  const close = () => { if (!lock.current) onClose(); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || loading || loadError) return;
    setError('');
    try {
      if (profile.role !== 'admin') throw new Error('Dochádzku za pracovníkov môže zapisovať iba administrátor.');
      if (!sites.some(site => site.id === form.site_id)) throw new Error('Vyberte zákazku.');
      if (selected.some(entry => !eligible.some(worker => worker.id === entry.user_id))) throw new Error('Skontrolujte vybraných pracovníkov a dátum spolupráce.');
      const payload = buildBatchAttendance(profile.organization_id, form, selected);
      lock.current = true; setSaving(true);
      const { error } = await supabase.from('attendance_logs').insert(payload);
      if (error) throw error;
      onSaved({ date: form.date, employeeIds: payload.map(row => row.user_id) });
    } catch (error: any) { setError(error?.message || 'Dochádzku sa nepodarilo uložiť.'); }
    finally { lock.current = false; setSaving(false); }
  };
  return <Modal title="Zapísať dochádzku" onClose={close} maxWidth="max-w-4xl">
    {loading ? <div className="flex justify-center p-12"><Loader2 className="animate-spin text-orange-600" /></div> : loadError ? <p role="alert" className="text-sm text-red-700">{loadError}</p> :
    <form onSubmit={save} className="space-y-5">
      <fieldset disabled={saving} className="space-y-5 min-w-0">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select aria-label="Zákazka" label="Zákazka" value={form.site_id} onChange={(event: any) => changeSite(event.target.value)} required>
            <option value="">Vyberte zákazku</option>
            {sites.map(site => <option key={site.id} value={site.id}>{site.name}{['completed', 'paused'].includes(site.status) ? ' · Archív' : ''}</option>)}
          </Select>
          <Input aria-label="Dátum" label="Dátum" type="date" value={form.date} onChange={(event: any) => {
            const date = event.target.value;
            setForm({ ...form, date });
            setEntries(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => !temporaryWorkerHasEnded(workers.find(worker => worker.id === id), date))));
            setError('');
          }} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input aria-label="Čas od" label="Čas od" type="time" value={form.start_time} onChange={(event: any) => setForm({ ...form, start_time: event.target.value })} required />
          <Input aria-label="Čas do" label="Čas do" type="time" value={form.end_time} onChange={(event: any) => setForm({ ...form, end_time: event.target.value })} required />
        </div>
        {form.site_id && <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold text-slate-900">Pracovníci</h4><span className="text-xs text-slate-500">Vybraní: {selected.length}</span></div>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search size={16} className="text-slate-400" /><input aria-label="Hľadať pracovníka" value={search} onChange={event => setSearch(event.target.value)} className="h-10 w-full min-w-0 bg-transparent text-sm outline-none" /></label>
          <div className="space-y-2">
            {visible.map(worker => {
              const entry = entries[worker.id];
              const duration = entry && calculateAttendanceMinutes(form.start_time, form.end_time, entry.has_break, entry.break_start, entry.break_end);
              return <div key={worker.id} className={`rounded-xl border ${entry ? 'border-orange-200' : 'border-slate-200'}`}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800">
                  <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={Boolean(entry)} onChange={event => {
                    if (event.target.checked) setEntries(previous => ({ ...previous, [worker.id]: defaults(worker, form.site_id) }));
                    else setEntries(previous => { const copy = { ...previous }; delete copy[worker.id]; return copy; });
                  }} />
                  <span className="min-w-0 flex-1 break-words">{worker.full_name}{worker.is_temporary && <span className="ml-2 text-xs font-normal text-slate-500">{worker.job_title || 'Dočasný pracovník'}</span>}</span>
                  {entry && <span className="shrink-0 text-xs font-medium text-orange-700">{duration.valid ? formatDuration(duration.netMinutes / 60) : 'Skontrolujte čas'}</span>}
                </label>
                {entry && <div className="space-y-3 border-t border-slate-100 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select aria-label="Odmena" label="Odmena" value={entry.payment_type} onChange={(event: any) => patch(worker.id, { payment_type: event.target.value })}><option value="hourly">Hodinovka</option><option value="fixed">Úkol (fixná suma)</option></Select>
                    {entry.payment_type === 'fixed' ? <Input aria-label="Fixná suma (€)" label="Fixná suma (€)" type="number" min="0.01" step="0.01" value={entry.fixed_amount} onChange={(event: any) => patch(worker.id, { fixed_amount: event.target.value })} required /> : <>
                      <Input aria-label="Hodinová sadzba (€/h)" label="Hodinová sadzba (€/h)" type="number" min="0" step="0.01" value={entry.hourly_rate_snapshot} onChange={(event: any) => patch(worker.id, { hourly_rate_snapshot: event.target.value, ...(Number(entry.cost_rate_snapshot) === Number(entry.hourly_rate_snapshot) ? { cost_rate_snapshot: event.target.value } : {}) })} required />
                      <Input aria-label="Celková cena práce (€/h)" label="Celková cena práce (€/h)" type="number" min="0" step="0.01" value={entry.cost_rate_snapshot} onChange={(event: any) => patch(worker.id, { cost_rate_snapshot: event.target.value })} required />
                    </>}
                  </div>
                  <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={entry.has_break} onChange={event => patch(worker.id, { has_break: event.target.checked })} /><Clock size={15} /> Obedná prestávka</label>
                  {entry.has_break && <div className="grid grid-cols-2 gap-3"><Input aria-label="Prestávka od" label="Prestávka od" type="time" value={entry.break_start} onChange={(event: any) => patch(worker.id, { break_start: event.target.value })} required /><Input aria-label="Prestávka do" label="Prestávka do" type="time" value={entry.break_end} onChange={(event: any) => patch(worker.id, { break_end: event.target.value })} required /></div>}
                </div>}
              </div>;
            })}
            {!visible.length && <p className="py-3 text-sm text-slate-500">Nenašli sa žiadni pracovníci.</p>}
          </div>
        </section>}
        <Input aria-label="Popis činnosti" label="Popis činnosti" value={form.description} onChange={(event: any) => setForm({ ...form, description: event.target.value })} />
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={close} disabled={saving}>Zrušiť</Button><Button type="submit" loading={saving} disabled={!form.site_id || !selected.length}>Zapísať dochádzku{selected.length > 1 ? ` (${selected.length})` : ''}</Button></div>
    </form>}
  </Modal>;
};
