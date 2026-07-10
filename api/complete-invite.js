import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fuuxskyamoeuusnlsgvl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service key nie je nakonfigurovaný.' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const companyId = String(req.body?.companyId || '').trim();

  if (!email || !companyId) {
    return res.status(400).json({ error: 'Chýba email alebo ID firmy.' });
  }

  const { error } = await supabase
    .from('employee_invites')
    .update({
      status: 'registered',
      registered_at: new Date().toISOString()
    })
    .eq('organization_id', companyId)
    .eq('email', email)
    .in('status', ['invited', 'cancelled']);

  if (error) {
    console.error('Complete invite error:', error);
    return res.status(500).json({ error: error.message || 'Pozvánku sa nepodarilo označiť ako dokončenú.' });
  }

  return res.status(200).json({ success: true });
}
