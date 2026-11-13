import { getDefaultAttendanceBreak } from './attendance';

export type WorkPeriod = { start_date: string; end_date: string };
export const temporaryWorkerInfo = 'Krátkodobá výpomoc alebo brigádnik bez vlastného účtu. Hodiny zapisuje administrátor pri zákazke. Nezobrazuje sa medzi nezapísanými členmi bežného tímu.';
export const temporaryPeriods = (worker: any): WorkPeriod[] => Array.isArray(worker?.temporary_periods) ? worker.temporary_periods : [];
export const cooperationDateISO = (date = new Date()) => date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Bratislava' });
export const temporaryWorkerHasEnded = (worker: any, day = cooperationDateISO()) => {
  const periods = temporaryPeriods(worker);
  return Boolean(worker?.is_temporary && periods.length && periods.every(period => period.end_date && period.end_date < day));
};
export const temporaryWorkerDefaults = (worker: any) => ({
  ...getDefaultAttendanceBreak(worker),
  hourly_rate_snapshot: worker?.hourly_rate ?? 0,
  payment_type: worker?.is_temporary && worker.default_payment_type === 'fixed' ? 'fixed' : 'hourly',
  fixed_amount: worker?.is_temporary ? worker.default_fixed_amount ?? 0 : 0
});
export const validateTemporaryWorker = (form: any) => {
  if (!form.full_name?.trim()) throw new Error('Zadajte meno pracovníka.');
  if (form.full_name.trim().length > 120) throw new Error('Zadajte meno do 120 znakov.');
  if (form.job_title?.trim().length > 120) throw new Error('Zadajte pozíciu do 120 znakov.');
  if (![null, '', 'hourly', 'fixed'].includes(form.default_payment_type)) throw new Error('Vyberte spôsob odmeňovania.');
  for (const value of [form.hourly_rate, form.cost_rate, form.default_fixed_amount]) {
    if (value !== '' && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error('Odmena nemôže byť záporná.');
  }
  const date = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) && new Date(`${value}T12:00:00`).toISOString().slice(0, 10) === value;
  for (const period of temporaryPeriods(form)) {
    if (!date(period.start_date) || (period.end_date && (!date(period.end_date) || period.end_date < period.start_date))) throw new Error('Skontrolujte dátumy spolupráce.');
  }
};
export const temporaryWorkerError = (error: any) => ['PGRST202', 'PGRST204', '42703', '42883'].includes(error?.code)
  ? 'Najskôr spustite SQL aktualizáciu pre dočasných pracovníkov.'
  : error?.message || 'Pracovníka sa nepodarilo uložiť.';
