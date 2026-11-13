export const summarizeAnalyticsLabor = (logs: any[]) => {
  const workers = new Map<string, { id: string; name: string; hours: number; cost: number }>();
  logs.forEach((log, index) => {
    const id = log.user_id || log.profiles?.id || `unknown:${log.id ?? index}`;
    const name = log.profiles?.full_name || 'Neznámy pracovník';
    const worker = workers.get(id) || { id, name, hours: 0, cost: 0 };
    const rate = log.cost_rate_snapshot || log.profiles?.cost_rate || log.hourly_rate_snapshot || log.profiles?.hourly_rate || 0;
    worker.hours += Number(log.hours);
    worker.cost += log.payment_type === 'fixed' ? Number(log.fixed_amount || 0) : Number(log.hours) * rate;
    workers.set(id, worker);
  });
  return [...workers.values()].sort((a, b) => b.hours - a.hours);
};
