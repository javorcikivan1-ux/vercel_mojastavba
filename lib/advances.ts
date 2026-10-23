import { supabase } from './supabase';

export const loadAdvanceTotals = async (organizationId: string, userId = '') => {
  let remainingCents = 0;
  let countUnsettled = 0;
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from('advances').select('id,amount,settled_amount')
      .eq('organization_id', organizationId).eq('status', 'pending');
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('id').range(offset, offset + 999);
    if (error) throw error;
    for (const row of data || []) {
      remainingCents += Math.round(Number(row.amount) * 100) - Math.round(Number(row.settled_amount || 0) * 100);
      countUnsettled++;
    }
    if (!data || data.length < 1000) break;
  }
  return { totalUnsettled: remainingCents / 100, countUnsettled };
};
