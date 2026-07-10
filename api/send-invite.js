import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fuuxskyamoeuusnlsgvl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email odosielanie nie je nakonfigurované.' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Chýba prihlásenie.' });
  }

  const { email, employeeName } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Zadajte platný email zamestnanca.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    return res.status(401).json({ error: 'Neplatné prihlásenie.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Pozvánky môže odosielať iba administrátor firmy.' });
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single();

  const companyName = organization?.name || 'Vaša firma';
  const inviteUrl = `https://www.moja-stavba.sk/?action=register-emp&companyId=${encodeURIComponent(profile.organization_id)}&email=${encodeURIComponent(normalizedEmail)}`;
  const safeCompanyName = escapeHtml(companyName);
  const safeEmployeeName = escapeHtml(employeeName || 'dobrý deň');
  const safeAdminName = escapeHtml(profile.full_name || profile.email || 'administrátor');

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: 'MojaStavba <noreply@moja-stavba.sk>',
      to: normalizedEmail,
      replyTo: profile.email,
      subject: `${companyName} vás pozýva do aplikácie MojaStavba`,
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pozvánka do MojaStavba</title>
          </head>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
            <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
              <div style="text-align:center;margin-bottom:24px;">
                <div style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;color:#ea580c;padding:10px 16px;border-radius:999px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;">MojaStavba</div>
              </div>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.07);overflow:hidden;">
                <div style="padding:34px 34px 22px;border-bottom:1px solid #f1f5f9;">
                  <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#0f172a;">Pozvánka do firemného účtu</h1>
                  <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">${safeCompanyName} vás pozýva do aplikácie MojaStavba.</p>
                </div>
                <div style="padding:30px 34px;">
                  <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">Dobrý deň ${safeEmployeeName},</p>
                  <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
                    ${safeAdminName} vám posiela pozvánku do systému na evidenciu dochádzky, zákaziek a pracovných výkazov.
                    Kliknite na tlačidlo nižšie a dokončite registráciu zamestnanca.
                  </p>
                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin:0 0 26px;">
                    <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Firma</div>
                    <div style="font-size:18px;font-weight:800;color:#0f172a;">${safeCompanyName}</div>
                  </div>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${inviteUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:14px;padding:15px 26px;font-weight:800;font-size:15px;">Prijať pozvánku</a>
                  </div>
                  <p style="margin:24px 0 8px;color:#64748b;font-size:13px;line-height:1.6;">Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:</p>
                  <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;"><a href="${inviteUrl}" style="color:#ea580c;">${inviteUrl}</a></p>
                </div>
              </div>
              <p style="text-align:center;margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
                Tento email bol odoslaný automaticky z aplikácie MojaStavba. Ak ste pozvánku neočakávali, môžete ju ignorovať.
              </p>
            </div>
          </body>
        </html>
      `
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('Send invite error:', error);
    return res.status(500).json({ error: error.message || 'Email sa nepodarilo odoslať.' });
  }
}
