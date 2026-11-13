import React, { useId, useRef, useState } from 'react';
import { HelpCircle, Plus, X } from 'lucide-react';
import { Button, Input, Modal, Select } from './UI';
import { supabase } from '../lib/supabase';
import { localDateISO } from '../lib/absences';
import { temporaryPeriods, temporaryWorkerError, temporaryWorkerInfo, validateTemporaryWorker } from '../lib/temporaryWorkers';

export const TemporaryWorkerInfo = () => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" aria-label="Čo je dočasný pracovník" aria-expanded={open} aria-describedby={open ? id : undefined} onClick={() => setOpen(true)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }} className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-500"><HelpCircle size={17} /></button>
    {open && <span id={id} role="tooltip" className="absolute right-0 top-full z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-lg">{temporaryWorkerInfo}</span>}
  </span>;
};

export const TemporaryWorkerForm = ({ worker, quick = false, initialDate, onClose, onSaved }: { worker?: any; quick?: boolean; initialDate?: string; onClose: () => void; onSaved: (id: string, saved: any) => void }) => {
  const [form, setForm] = useState({
    id: worker?.id || '', full_name: worker?.full_name || '', phone: worker?.phone || '',
    job_title: worker?.job_title || '',
    default_payment_type: worker?.default_payment_type || '', hourly_rate: worker?.hourly_rate ?? '', cost_rate: worker?.cost_rate ?? '', default_fixed_amount: worker?.default_fixed_amount ?? '',
    temporary_periods: worker ? temporaryPeriods(worker) : [{ start_date: initialDate || localDateISO(), end_date: quick ? initialDate || localDateISO() : '' }]
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (lock.current) return;
    try {
      validateTemporaryWorker(form); lock.current = true; setSaving(true); setError('');
      const payload = {
        ...form, reactivate: Boolean(worker?.reactivate), full_name: form.full_name.trim(), job_title: form.job_title.trim() || 'Dočasný pracovník', default_payment_type: form.default_payment_type || null,
        hourly_rate: form.default_payment_type === 'hourly' ? Number(form.hourly_rate || 0) : 0,
        cost_rate: form.default_payment_type === 'hourly' ? Number(form.cost_rate === '' ? form.hourly_rate || 0 : form.cost_rate) : 0,
        default_fixed_amount: form.default_payment_type === 'fixed' ? Number(form.default_fixed_amount || 0) : null
      };
      const { data, error } = await supabase.rpc('save_temporary_worker', { p_worker: payload });
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('Pracovníka sa nepodarilo načítať.');
      onSaved(data, { ...payload, id: data, is_temporary: true, is_active: true, role: 'employee' });
    } catch (error) { setError(temporaryWorkerError(error)); }
    finally { lock.current = false; setSaving(false); }
  };
  return <Modal title={<span className="flex items-center gap-2"><span>{worker ? 'Upraviť dočasného pracovníka' : quick ? 'Pridať pomocníka' : 'Pridať dočasného pracovníka'}</span><TemporaryWorkerInfo /></span>} onClose={() => { if (!lock.current) onClose(); }}>
    <form onSubmit={save} className="space-y-4">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <fieldset disabled={saving} className="space-y-4 min-w-0">
      <Input label="Meno a priezvisko" aria-label="Meno a priezvisko" required maxLength={120} value={form.full_name} onChange={(event: any) => setForm({ ...form, full_name: event.target.value })} />
      <Input label="Pozícia" aria-label="Pozícia" placeholder="napr. brigádnik" maxLength={120} value={form.job_title} onChange={(event: any) => setForm({ ...form, job_title: event.target.value })} />
      {!quick && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input label="Telefón (voliteľné)" aria-label="Telefón (voliteľné)" type="tel" value={form.phone} onChange={(event: any) => setForm({ ...form, phone: event.target.value })} />
      </div>}
      {!quick && <div className="space-y-3 border-t border-slate-100 pt-4">
        {form.temporary_periods.map((period, index) => <div key={index} className="flex items-end gap-2"><div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2"><Input label="Spolupráca od" aria-label="Spolupráca od" type="date" required value={period.start_date} onChange={(event: any) => setForm({ ...form, temporary_periods: form.temporary_periods.map((p, i) => i === index ? { ...p, start_date: event.target.value } : p) })} /><Input label="Do (voliteľné)" aria-label="Do (voliteľné)" type="date" min={period.start_date} value={period.end_date} onChange={(event: any) => setForm({ ...form, temporary_periods: form.temporary_periods.map((p, i) => i === index ? { ...p, end_date: event.target.value } : p) })} /></div><button type="button" aria-label={`Odstrániť obdobie ${index + 1}`} onClick={() => setForm({ ...form, temporary_periods: form.temporary_periods.filter((_, i) => i !== index) })} className="mb-1 flex h-10 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><X size={16} /></button></div>)}
        <button type="button" onClick={() => setForm({ ...form, temporary_periods: [...form.temporary_periods, { start_date: localDateISO(), end_date: '' }] })} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-slate-600 hover:text-orange-700"><Plus size={14} /> Ďalšie obdobie spolupráce</button>
      </div>}
      {!quick && <Select label="Predvolená odmena" aria-label="Predvolená odmena" value={form.default_payment_type} onChange={(event: any) => setForm({ ...form, default_payment_type: event.target.value })}><option value="">Nastaviť až pri zápise práce</option><option value="hourly">Hodinovka</option><option value="fixed">Úkol</option></Select>}
      {form.default_payment_type === 'hourly' && <div className="grid grid-cols-2 gap-3"><Input label="Mzdová sadzba (€/h)" aria-label="Mzdová sadzba (€/h)" type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(event: any) => setForm({ ...form, hourly_rate: event.target.value })} /><Input label="Cena práce (€/h)" aria-label="Cena práce (€/h)" type="number" min="0" step="0.01" value={form.cost_rate} onChange={(event: any) => setForm({ ...form, cost_rate: event.target.value })} /></div>}
      {form.default_payment_type === 'fixed' && <Input label="Dohodnutá suma (€)" aria-label="Dohodnutá suma (€)" type="number" min="0" step="0.01" value={form.default_fixed_amount} onChange={(event: any) => setForm({ ...form, default_fixed_amount: event.target.value })} />}
      </fieldset>
      <Button type="submit" fullWidth loading={saving} disabled={saving}>{quick ? 'Pridať a pokračovať' : 'Uložiť pracovníka'}</Button>
    </form>
  </Modal>;
};
