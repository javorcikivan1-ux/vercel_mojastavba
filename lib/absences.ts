import { supabase } from './supabase';

export const ABSENCE_TYPES = [
  { value: 'pn', label: 'PN – práceneschopnosť', short: 'PN', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'ocr', label: 'OČR – ošetrovanie člena rodiny', short: 'OČR', color: 'bg-violet-50 text-violet-800 border-violet-200' },
  { value: 'doctor', label: 'P – návšteva lekára', short: 'P', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'accompaniment', label: 'Sprevádzanie k lekárovi', short: 'SPR', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'vacation', label: 'Dovolenka', short: 'D', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'compensatory', label: 'Náhradné voľno', short: 'NV', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { value: 'unpaid', label: 'Neplatené voľno', short: 'N', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'parental', label: 'Rodičovská dovolenka', short: 'RD', color: 'bg-pink-50 text-pink-800 border-pink-200' },
  { value: 'other', label: 'Iná neprítomnosť', short: 'INÉ', color: 'bg-slate-100 text-slate-700 border-slate-200' }
] as const;

export type AbsenceKind = typeof ABSENCE_TYPES[number]['value'];
export type EmployeeAbsence = {
  id: string; organization_id: string; user_id: string; kind: AbsenceKind;
  start_date: string; end_date: string | null; all_day: boolean;
  start_time: string | null; end_time: string | null;
};

export const absenceType = (kind: string) => ABSENCE_TYPES.find(type => type.value === kind) || ABSENCE_TYPES[8];
export const localDateISO = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const monthBounds = (date: Date) => ({ start: localDateISO(new Date(date.getFullYear(), date.getMonth(), 1)), end: localDateISO(new Date(date.getFullYear(), date.getMonth() + 1, 0)) });
export const monthDates = (month: Date): string[] => Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => localDateISO(new Date(month.getFullYear(), month.getMonth(), i + 1)));
export const absenceOnDate = (absence: EmployeeAbsence, date: string) => absence.start_date <= date && (!absence.end_date || absence.end_date >= date);
// An unknown end is ongoing, not confirmation that future days were absent.
export const absenceVisibleOnDate = (absence: EmployeeAbsence, date: string, today = localDateISO()) => absenceOnDate(absence, date) && (!!absence.end_date || date <= today);
export const formatAbsenceDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('sk-SK');
export const absenceRange = (absence: EmployeeAbsence) => `${formatAbsenceDate(absence.start_date)} – ${absence.end_date ? formatAbsenceDate(absence.end_date) : 'nezadané'}`;
export const absenceTime = (absence: EmployeeAbsence) => absence.all_day ? 'Celý deň' : `${absence.start_time?.slice(0, 5)} – ${absence.end_time?.slice(0, 5)}`;
export const absenceMinutes = (absence: EmployeeAbsence) => {
  if (absence.all_day) return null;
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  return minutes(absence.end_time!) - minutes(absence.start_time!);
};

export const validateAbsence = (form: { kind: string; start_date: string; end_date: string | null; all_day: boolean; start_time: string | null; end_time: string | null }) => {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime()) && localDateISO(new Date(`${value}T12:00:00`)) === value;
  if (!ABSENCE_TYPES.some(type => type.value === form.kind)) throw new Error('Vyberte typ neprítomnosti.');
  if (!validDate(form.start_date) || (form.end_date && !validDate(form.end_date))) throw new Error('Zadajte platný dátum.');
  if (form.end_date && form.end_date < form.start_date) throw new Error('Koniec neprítomnosti nemôže byť pred jej začiatkom.');
  if (!form.all_day) {
    const validTime = (value: string | null) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
    if (!validTime(form.start_time) || !validTime(form.end_time) || form.end_time! <= form.start_time!) throw new Error('Vyplňte čas od–do. Koniec musí byť neskôr ako začiatok.');
  }
};

export const absenceExportRows = (absences: EmployeeAbsence[], month: Date, today = localDateISO()) => monthDates(month).flatMap(date => absences.filter(absence => absenceVisibleOnDate(absence, date, today)).map(absence => ({
  id: `${absence.id}:${date}`, date, isAbsence: true, isFixed: false,
  absenceKind: absence.kind, all_day: absence.all_day,
  hours: absence.all_day ? '' : (absenceMinutes(absence)! / 60).toFixed(2),
  siteName: 'Neprítomnosť', description: absenceType(absence.kind).label,
  displayTime: `${absenceType(absence.kind).short} · ${absenceTime(absence)}`
})));

export const absenceDayCounts = (absences: EmployeeAbsence[], month: Date, today = localDateISO()) => ABSENCE_TYPES.map(type => ({
  ...type, days: monthDates(month).filter(date => absences.some(absence => absence.kind === type.value && absenceVisibleOnDate(absence, date, today))).length
})).filter(type => type.days > 0);

export const classifyAttendance = (workers: any[], logs: any[], absences: EmployeeAbsence[], date: string) => {
  const withAbsences = workers.map(worker => ({ ...worker, logs: logs.filter(log => log.user_id === worker.id), absences: absences.filter(absence => absence.user_id === worker.id && absenceOnDate(absence, date)) }));
  return {
    logged: withAbsences.filter(worker => worker.logs.length > 0 && !worker.absences.some((absence: EmployeeAbsence) => absence.all_day)),
    missing: withAbsences.filter(worker => worker.logs.length === 0 && !worker.absences.some((absence: EmployeeAbsence) => absence.all_day)),
    absent: withAbsences.filter(worker => worker.absences.some((absence: EmployeeAbsence) => absence.all_day)),
    partial: withAbsences.filter(worker => worker.absences.length > 0 && !worker.absences.some((absence: EmployeeAbsence) => absence.all_day))
  };
};

export const absenceError = (error: any) => ['42P01', 'PGRST205', 'PGRST202'].includes(error?.code)
  ? 'Evidencia neprítomností ešte nie je pripravená v databáze. Spustite SQL pre neprítomnosti zamestnancov.'
  : error?.message || 'Neprítomnosti sa nepodarilo načítať.';

// Paginate so an older/open-ended absence cannot disappear at the API row limit.
export const loadAbsences = async (organizationId: string, userId?: string, range?: { start: string; end: string }) => {
  const result: EmployeeAbsence[] = [];
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from('employee_absences').select('*').eq('organization_id', organizationId);
    if (userId) query = query.eq('user_id', userId);
    if (range) query = query.lte('start_date', range.end).or(`end_date.is.null,end_date.gte.${range.start}`);
    const { data, error } = await query.order('start_date').order('id').range(offset, offset + 999);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < 1000) return result;
  }
};

export const notifyAbsenceChange = () => window.dispatchEvent(new Event('employee-absences-changed'));
