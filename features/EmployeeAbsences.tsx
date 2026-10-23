import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AlertModal, Button, ConfirmModal, Input, Modal, Select } from '../components/UI';
import { AbsenceCalendar } from '../components/AbsenceCalendar';
import { supabase } from '../lib/supabase';
import { ABSENCE_TYPES, absenceError, absenceOnDate, absenceRange, absenceTime, absenceType, loadAbsences, localDateISO, monthBounds, notifyAbsenceChange, validateAbsence, type EmployeeAbsence } from '../lib/absences';

const emptyForm = () => ({ id: '', kind: 'pn', start_date: localDateISO(), end_date: '', all_day: true, start_time: '09:00', end_time: '12:00', note: '' });
const singleDayDefault = (kind: string) => kind === 'ocr' || kind === 'doctor';

export const EmployeeAbsences = ({ profile, employee, logs = [], showCalendar = true }: { profile: any; employee: any; logs?: any[]; showCalendar?: boolean }) => {
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [month, setMonth] = useState(new Date());
  const [calendarLogs, setCalendarLogs] = useState<any[]>(logs);
  const [calendarError, setCalendarError] = useState('');
  const [history, setHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingNote, setLoadingNote] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<EmployeeAbsence | null>(null);
  const lock = useRef(false);
  const version = useRef(0);
  const noteRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    try {
      const data = await loadAbsences(profile.organization_id, employee.id);
      if (request === version.current) { setAbsences(data); setLoadError(''); }
    } catch (error) { if (request === version.current) setLoadError(absenceError(error)); }
    finally { if (request === version.current) setLoading(false); }
  }, [profile.organization_id, employee.id]);
  useEffect(() => { load(); return () => { version.current++; noteRequest.current++; }; }, [load]);

  useEffect(() => {
    if (!showCalendar) return;
    let cancelled = false;
    const bounds = monthBounds(month);
    setCalendarLogs([]); setCalendarError('');
    supabase.from('attendance_logs').select('id,date,hours,start_time,end_time').eq('organization_id', profile.organization_id).eq('user_id', employee.id).gte('date', bounds.start).lte('date', bounds.end).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setCalendarError('Pracovné zápisy sa nepodarilo načítať. Kalendár môže byť neúplný.');
      else setCalendarLogs(data || []);
    });
    return () => { cancelled = true; };
  }, [employee.id, profile.organization_id, month, showCalendar]);

  const edit = async (absence: EmployeeAbsence, endToday = false) => {
    const request = ++noteRequest.current;
    setForm({ id: absence.id, kind: absence.kind, start_date: absence.start_date, end_date: endToday ? localDateISO() : absence.end_date || '', all_day: absence.all_day, start_time: absence.start_time?.slice(0, 5) || '09:00', end_time: absence.end_time?.slice(0, 5) || '12:00', note: '' });
    setShowForm(true);
    setLoadingNote(true);
    const { data, error } = await supabase.from('employee_absence_notes').select('note').eq('absence_id', absence.id).maybeSingle();
    if (request !== noteRequest.current) return;
    setLoadingNote(false);
    if (error) { setShowForm(false); setError(absenceError(error)); return; }
    setForm(previous => ({ ...previous, note: data?.note || '' }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || loadingNote) return;
    lock.current = true; setSaving(true);
    try {
      const record = { id: form.id || undefined, organization_id: profile.organization_id, user_id: employee.id, kind: form.kind, start_date: form.start_date, end_date: form.end_date || null, all_day: form.all_day, start_time: form.all_day ? null : form.start_time, end_time: form.all_day ? null : form.end_time };
      validateAbsence(record);
      const { error } = await supabase.rpc('save_employee_absence', { p_absence: record, p_note: form.note });
      if (error) throw error;
      setShowForm(false); notifyAbsenceChange(); await load();
    } catch (error) { setError(absenceError(error)); }
    finally { lock.current = false; setSaving(false); }
  };

  const remove = async () => {
    if (!deleting || lock.current) return;
    lock.current = true; setSaving(true);
    try {
      const { data, error } = await supabase.from('employee_absences').delete().eq('id', deleting.id).eq('organization_id', profile.organization_id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Záznam sa už nenašiel alebo k nemu nemáte prístup.');
      setDeleting(null); notifyAbsenceChange(); await load();
    } catch (error) { setError(absenceError(error)); }
    finally { lock.current = false; setSaving(false); }
  };

  const range = monthBounds(month);
  const visible = absences.filter(absence => history || (absence.start_date <= range.end && (!absence.end_date || absence.end_date >= range.start))).sort((a, b) => b.start_date.localeCompare(a.start_date));
  return <section className="space-y-4">
    {showCalendar && <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-bold text-slate-900"><Calendar size={19} className="text-orange-600" /> Neprítomnosti</h3>
      {profile.role === 'admin' && <Button size="sm" disabled={!!loadError || loading} onClick={() => { noteRequest.current++; setLoadingNote(false); setForm(emptyForm()); setShowForm(true); }}><Plus size={16} /> Pridať neprítomnosť</Button>}
    </div>}
    {loadError ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError}<button type="button" className="ml-2 font-bold underline" onClick={load}>Skúsiť znova</button></div> : loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-orange-600" /></div> : <>
      {showCalendar && calendarError && <p role="alert" className="text-xs text-amber-800">{calendarError}</p>}
      {showCalendar && <AbsenceCalendar month={month} onMonthChange={setMonth} logs={calendarLogs} absences={absences} />}
      <div className={showCalendar ? '' : 'flex flex-col items-start gap-3 md:flex-row md:items-center md:gap-5'}>
      {!showCalendar && <input type="month" aria-label="Obdobie neprítomností" value={localDateISO(month).slice(0, 7)} onChange={event => { if (event.target.value) { const [year, month] = event.target.value.split('-').map(Number); setMonth(new Date(year, month - 1, 1)); } }} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" />}
      <label className="flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={history} onChange={event => setHistory(event.target.checked)} /> Zobraziť aj záznamy mimo zvoleného mesiaca</label>
      </div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto">
        {visible.map(absence => <div key={absence.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="min-w-0"><span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${absenceType(absence.kind).color}`}>{absenceType(absence.kind).label}</span><p className="mt-2 text-xs font-semibold text-slate-700">{absenceRange(absence)}</p><p className="mt-1 text-xs text-slate-500">{absenceTime(absence)}{!absence.all_day && absence.end_date !== absence.start_date ? ' · každý deň v zadanom období' : ''}</p></div>
          {profile.role === 'admin' && <div className="flex flex-wrap gap-1">
            {!absence.end_date && absenceOnDate(absence, localDateISO()) && <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => edit(absence, true)}>Ukončiť k dnešku</button>}
            <button type="button" aria-label="Upraviť neprítomnosť" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => edit(absence)}><Pencil size={16} /></button>
            <button type="button" aria-label="Odstrániť neprítomnosť" className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => setDeleting(absence)}><Trash2 size={16} /></button>
          </div>}
        </div>)}
        {!visible.length && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">V tomto období nie je evidovaná neprítomnosť.</p>}
      </div>
    </>}
    {showForm && <Modal title={form.id ? 'Upraviť neprítomnosť' : 'Nová neprítomnosť'} onClose={() => { if (!saving) { noteRequest.current++; setShowForm(false); } }}>
      <form onSubmit={save} className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">{employee.full_name}</div>
        <Select label="Typ neprítomnosti" value={form.kind} onChange={(event: any) => {
          const kind = event.target.value;
          setForm(previous => ({ ...previous, kind, end_date: previous.id ? previous.end_date : singleDayDefault(kind) && !previous.end_date ? previous.start_date : !singleDayDefault(kind) && singleDayDefault(previous.kind) && previous.end_date === previous.start_date ? '' : previous.end_date }));
        }}>{ABSENCE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</Select>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Od dátumu" type="date" value={form.start_date} onChange={(event: any) => {
            const start_date = event.target.value;
            setForm(previous => ({ ...previous, start_date, end_date: singleDayDefault(previous.kind) && previous.end_date === previous.start_date ? start_date : previous.end_date }));
          }} required />
          <div><Input label="Do dátumu (voliteľné)" type="date" min={form.start_date} value={form.end_date} onChange={(event: any) => setForm({ ...form, end_date: event.target.value })} /><p className="mt-1 text-[11px] text-slate-500">{form.end_date ? 'Posledný deň neprítomnosti vrátane.' : 'Nezadané – neprítomnosť trvá až do ukončenia.'}</p></div>
        </div>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input className="h-5 w-5 accent-orange-600" type="checkbox" checked={form.all_day} onChange={event => setForm({ ...form, all_day: event.target.checked, end_date: !event.target.checked && !form.end_date ? form.start_date : form.end_date })} /> Celodenná neprítomnosť</label>
        {!form.all_day && <div className="grid grid-cols-2 gap-3"><Input label="Čas od" type="time" value={form.start_time} required onChange={(event: any) => setForm({ ...form, start_time: event.target.value })} /><Input label="Čas do" type="time" value={form.end_time} required onChange={(event: any) => setForm({ ...form, end_time: event.target.value })} /></div>}
        <div><label htmlFor="absence-note" className="mb-2 block text-xs font-bold text-slate-500">Interná poznámka (voliteľné)</label><textarea id="absence-note" maxLength={2000} rows={3} value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} className="w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Poznámka pre administrátora…" /></div>
        <Button type="submit" fullWidth loading={saving || loadingNote} disabled={saving || loadingNote}>Uložiť neprítomnosť</Button>
      </form>
    </Modal>}
    <ConfirmModal isOpen={!!deleting} title="Odstrániť neprítomnosť?" message="Odstráni sa tento záznam neprítomnosti. Zapísané pracovné hodiny zostanú zachované." onClose={() => { if (!saving) setDeleting(null); }} onConfirm={remove} confirmText="Odstrániť" type="danger" />
    <AlertModal isOpen={!!error} title="Evidencia neprítomností" message={error} onClose={() => setError('')} type="error" />
  </section>;
};

export const TeamAbsenceOverview = ({ profile, onSelect }: { profile: any; onSelect: (id: string) => void }) => {
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let request = 0;
    const load = async () => {
      const current = ++request;
      try {
        const today = localDateISO();
        const [data, workers] = await Promise.all([loadAbsences(profile.organization_id, undefined, { start: today, end: today }), supabase.from('profiles').select('id,full_name,is_active').eq('organization_id', profile.organization_id).eq('is_active', true)]);
        if (workers.error) throw workers.error;
        if (current === request) { setAbsences(data); setEmployees(workers.data || []); setError(''); }
      } catch (error) { if (current === request) setError(absenceError(error)); }
    };
    load(); window.addEventListener('employee-absences-changed', load);
    return () => { request++; window.removeEventListener('employee-absences-changed', load); };
  }, [profile.organization_id]);
  const active = absences.filter(absence => employees.some(employee => employee.id === absence.user_id));
  const groups = [{ label: 'PN', kinds: ['pn'], color: ABSENCE_TYPES[0].color }, { label: 'OČR', kinds: ['ocr'], color: ABSENCE_TYPES[1].color }, { label: 'Dovolenka', kinds: ['vacation'], color: ABSENCE_TYPES[4].color }, { label: 'Ostatné', kinds: ABSENCE_TYPES.filter(type => !['pn', 'ocr', 'vacation'].includes(type.value)).map(type => type.value), color: 'bg-slate-50 text-slate-700 border-slate-200' }];
  return <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Dnešné neprítomnosti</h3><button type="button" className="text-xs font-semibold text-slate-600 underline" onClick={() => setExpanded(!expanded)}>{expanded ? 'Skryť prehľad' : 'Zobraziť zamestnancov'}</button></div>
    {error ? <p className="text-xs text-amber-800">{error}</p> : <><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{groups.map(group => <div key={group.label} className={`rounded-xl border px-3 py-2 ${group.color}`}><span className="text-xs font-semibold">{group.label}</span><strong className="ml-2 text-lg">{new Set(active.filter(absence => group.kinds.includes(absence.kind)).map(absence => absence.user_id)).size}</strong></div>)}</div>
    {expanded && <div className="mt-3 space-y-2">{active.map(absence => <button type="button" key={absence.id} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left text-xs" onClick={() => onSelect(absence.user_id)}><strong>{employees.find(employee => employee.id === absence.user_id)?.full_name}</strong><span>{absenceType(absence.kind).label} · {absenceTime(absence)} · {absenceRange(absence)}</span></button>)}{!active.length && <p className="text-xs text-slate-500">Dnes nie je evidovaná neprítomnosť.</p>}</div>}</>}
  </div>;
};
