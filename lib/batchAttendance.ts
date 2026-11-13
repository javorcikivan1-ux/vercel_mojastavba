import { calculateAttendanceMinutes } from './attendance';

export const buildBatchAttendance = (organizationId: string, form: any, workers: any[]) => {
  if (!form.site_id) throw new Error('Vyberte zákazku.');
  const date = new Date(`${form.date}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date || '') || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== form.date) throw new Error('Skontrolujte dátum.');
  if (!workers.length) throw new Error('Vyberte aspoň jedného pracovníka.');
  if (new Set(workers.map(worker => worker.user_id)).size !== workers.length) throw new Error('Pracovník môže byť vybraný iba raz.');
  return workers.map(worker => {
    const duration = calculateAttendanceMinutes(form.start_time, form.end_time, worker.has_break, worker.break_start, worker.break_end);
    if (!duration.valid) throw new Error(`${worker.full_name}: skontrolujte pracovný čas a obednú prestávku.`);
    const rate = Number(worker.hourly_rate_snapshot);
    const cost = Number(worker.cost_rate_snapshot);
    const fixed = Number(worker.fixed_amount);
    if (!['hourly', 'fixed'].includes(worker.payment_type) || !Number.isFinite(rate) || rate < 0 || !Number.isFinite(cost) || cost < 0 || (worker.payment_type === 'fixed' && (!Number.isFinite(fixed) || fixed <= 0))) throw new Error(`${worker.full_name}: skontrolujte odmenu.`);
    return {
      organization_id: organizationId, site_id: form.site_id, user_id: worker.user_id,
      date: form.date, start_time: form.start_time, end_time: form.end_time,
      hours: duration.netMinutes / 60,
      break_start: worker.has_break ? worker.break_start : null,
      break_end: worker.has_break ? worker.break_end : null,
      break_minutes: worker.has_break ? duration.breakMinutes : 0,
      payment_type: worker.payment_type, hourly_rate_snapshot: rate, cost_rate_snapshot: cost,
      fixed_amount: worker.payment_type === 'fixed' ? fixed : 0,
      description: form.description.trim()
    };
  });
};
