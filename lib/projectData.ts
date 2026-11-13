import { supabase } from './supabase';

export const loadAllProjectRows = async (table: string, fields: string, organizationId: string, siteId?: string, orderBy = 'id', ascending = false, userId?: string): Promise<any[]> => {
  const rows: any[] = [];
  for (let offset = 0; ;) {
    let query = supabase.from(table).select(fields).eq('organization_id', organizationId);
    if (siteId) query = query.eq('site_id', siteId);
    if (userId) query = query.eq('user_id', userId);
    query = query.order(orderBy, { ascending });
    if (orderBy !== 'id') query = query.order('id', { ascending: true });
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw error;
    if (!data?.length) return rows;
    rows.push(...data);
    offset += data.length;
  }
};

export type ProjectWorkerSummary = { id: string; name: string; hours: number; cost: number; count: number };
export const summarizeProjectLabor = (logs: any[]): ProjectWorkerSummary[] => {
  const workers = new Map<string, ProjectWorkerSummary>();
  const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);
  logs.forEach((log, index) => {
    const id = log.user_id || log.profiles?.id || `unknown:${log.id ?? index}`;
    const name = log.profiles?.full_name?.trim() || 'Neznámy pracovník';
    const worker = workers.get(id) || { id, name, hours: 0, cost: 0, count: 0 };
    const hours = Number(log.hours) || 0;
    const rate = Number(log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0);
    const cost = log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : hours * rate;
    worker.hours += hours;
    worker.cost = (cents(worker.cost) + cents(cost)) / 100;
    worker.count++;
    workers.set(id, worker);
  });
  return [...workers.values()];
};
