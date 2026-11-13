import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Mail, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { Button, Modal } from './UI';
import { supabase } from '../lib/supabase';
import { sendInvitationQueue, validateInvitations, type Invitation, type InvitationResult } from '../lib/teamInvitations';

const newRow = (): Invitation => ({ id: crypto.randomUUID(), email: '', name: '' });

export const InviteTeamModal = ({ organizationId, onClose, onUpdated }: { organizationId: string; onClose: () => void; onUpdated: () => void }) => {
  const [rows, setRows] = useState<Invitation[]>(() => [newRow()]);
  const [results, setResults] = useState<Record<string, InvitationResult>>({});
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ index: 0, total: 0, email: '', completed: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const lock = useRef(false);
  const started = useRef(0);
  useEffect(() => {
    if (!sending) return;
    const timer = window.setInterval(() => setElapsed((Date.now() - started.current) / 1000), 1000);
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.clearInterval(timer); window.removeEventListener('beforeunload', beforeUnload); };
  }, [sending]);
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (lock.current) return;
    try {
      const pending = validateInvitations(rows.filter(row => results[row.id]?.status !== 'sent'));
      lock.current = true; setSending(true); setError(''); setElapsed(0); started.current = Date.now();
      setProgress({ index: 0, total: pending.length, email: '', completed: 0 });
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError || !data.session?.access_token) throw new Error('Prihláste sa znova a zopakujte odoslanie.');
      const token = data.session.access_token;
      const sent = await sendInvitationQueue(pending, {
        send: async row => {
          const response = await fetch('/api/send-invite', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: row.email, employeeName: row.name }) });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.success !== true) throw Object.assign(new Error(result.error || 'Pozvánku sa nepodarilo odoslať.'), { status: response.status });
        },
        onProgress: (row, index, result) => {
          setProgress({ index: index + 1, total: pending.length, email: row.email, completed: result ? index + 1 : index });
          if (result) setResults(previous => ({ ...previous, [row.id]: result }));
        }
      });
      setResults(previous => ({ ...previous, ...Object.fromEntries(sent.map(result => [result.id, result])) }));
      if (sent.some(result => result.status !== 'sent')) setError('Niektoré pozvánky neboli odoslané. Skontrolujte stav pri jednotlivých emailoch.');
      onUpdated();
    } catch (error: any) { setError(error.message || 'Odosielanie sa nepodarilo spustiť.'); }
    finally { lock.current = false; setSending(false); }
  };
  const sentCount = rows.filter(row => results[row.id]?.status === 'sent').length;
  const hasResults = Object.keys(results).length > 0;
  const remaining = Math.max(0, progress.total - progress.completed);
  const estimate = Math.max(1, Math.ceil(remaining * (progress.completed ? Math.max(1, elapsed / progress.completed) : 3)));
  const copy = async (text: string, kind: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(kind); }
    catch { setError('Odkaz sa nepodarilo skopírovať. Skopírujte ho ručne.'); }
  };
  return <Modal title="Pridať zamestnancov" onClose={() => { if (!lock.current) onClose(); }} maxWidth="max-w-2xl">
    <form onSubmit={send} className="space-y-5">
      {!sending && <div className="flex items-start gap-3">
        <Mail size={19} className="mt-0.5 shrink-0 text-orange-600" />
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Emailová pozvánka</h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Pozvánka odíde z adresy <span className="font-medium text-slate-700">noreply@moja-stavba.sk</span> a registračný odkaz bude už obsahovať ID vašej firmy.</p>
        </div>
      </div>}
      <div className={sending ? 'hidden' : 'space-y-3'}>{rows.map((row, index) => {
        const result = results[row.id]; const done = result?.status === 'sent';
        return <div key={row.id} className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-500">Zamestnanec {index + 1}</span>{done ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><Check size={13} /> Odoslané</span> : <button type="button" aria-label={`Odstrániť riadok ${index + 1}`} disabled={sending || rows.length === 1} onClick={() => setRows(previous => previous.filter(item => item.id !== row.id))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={15} /></button>}</div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">Email<input aria-label={`Email zamestnanca ${index + 1}`} type="email" required maxLength={254} disabled={sending || done} value={row.email} onChange={event => { setRows(previous => previous.map(item => item.id === row.id ? { ...item, email: event.target.value } : item)); setResults(previous => { const next = { ...previous }; delete next[row.id]; return next; }); }} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-50 disabled:text-slate-500" /></label>
            <label className="text-xs font-medium text-slate-600">Meno (voliteľné)<input aria-label={`Meno zamestnanca ${index + 1}`} disabled={sending || done} maxLength={120} value={row.name} onChange={event => setRows(previous => previous.map(item => item.id === row.id ? { ...item, name: event.target.value } : item))} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-500 disabled:bg-slate-50 disabled:text-slate-500" /></label>
          </div>
          {result && !done && <p className="mt-2 text-xs leading-relaxed text-red-600">{result.message}</p>}
        </div>;
      })}</div>
      {!sending && <button type="button" disabled={rows.length >= 50} onClick={() => setRows(previous => [...previous, newRow()])} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-700 disabled:opacity-40"><Plus size={16} /> Pridať riadok</button>}
      {sending && <div role="status" aria-live="polite" className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Loader2 size={16} className="animate-spin text-orange-600" /> Odosielam email {Math.max(1, progress.index)} z {progress.total}</p>
        <p className="mt-2 break-all text-sm text-slate-600">{progress.email || 'Pripravujem odosielanie…'}</p>
        <progress aria-label="Priebeh odosielania" max={progress.total || 1} value={progress.completed} className="mt-3 h-2 w-full accent-orange-600" />
        <p className="mt-2 text-xs text-slate-500">Odhad zostávajúceho času: približne {estimate} s. Nezatvárajte aplikáciu.</p>
      </div>}
      {error && <p role="alert" className="text-sm leading-relaxed text-red-600">{error}</p>}
      {!sending && hasResults && <p role="status" className="text-sm font-semibold text-slate-700">Odoslané: {sentCount} z {rows.length} pozvánok</p>}
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        {(sending || sentCount < rows.length) && <Button type="submit" loading={sending} disabled={sending} className="!shadow-none">{!sending && <Send size={16} />} {sending ? 'Odosielam…' : hasResults ? 'Odoslať zostávajúce pozvánky' : rows.length > 1 ? 'Odoslať pozvánky' : 'Odoslať pozvánku'}</Button>}
        <Button variant="secondary" disabled={sending} onClick={onClose} className="!shadow-none">{hasResults ? 'Hotovo' : 'Zrušiť'}</Button>
      </div>
    </form>
    {!sending && <details className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500"><summary className="cursor-pointer py-2 font-medium">Registračný odkaz a ID firmy</summary><p className="mt-1 text-xs leading-relaxed text-slate-500">Náhradný spôsob pozvania: registračný odkaz môžete zamestnancovi poslať ručne. ID firmy použije, ak ho zadáva pri registrácii.</p><div className="mt-3 space-y-3"><div className="flex items-center gap-2"><input readOnly aria-label="Registračný odkaz" value={`https://www.moja-stavba.sk/?action=register-emp&companyId=${organizationId}`} className="min-w-0 flex-1 rounded-lg border border-slate-200 p-2" /><button type="button" aria-label="Kopírovať registračný odkaz" onClick={() => copy(`https://www.moja-stavba.sk/?action=register-emp&companyId=${organizationId}`, 'link')} className="p-2">{copied === 'link' ? <Check size={16} /> : <Copy size={16} />}</button></div><div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all">{organizationId}</code><button type="button" aria-label="Kopírovať ID firmy" onClick={() => copy(organizationId, 'id')} className="p-2">{copied === 'id' ? <Check size={16} /> : <Copy size={16} />}</button></div></div></details>}
  </Modal>;
};
