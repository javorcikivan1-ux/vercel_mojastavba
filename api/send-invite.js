import { Resend } from 'resend';
import {
  createInviteToken,
  enforceRateLimit,
  escapeHtml,
  getBearerToken,
  getClientIp,
  isMissingColumnError,
  sha256,
  supabaseAdmin as supabase
} from './_security.js';

const appUrl = 'https://www.moja-stavba.sk';
const logoUrl = 'https://lordsbenison.sk/wp-content/uploads/2026/07/icon-only.png';
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const withoutTokenFields = (payload) => {
  const { token_hash, token_expires_at, token_used_at, ...rest } = payload;
  return rest;
};

async function saveInvite(existingInvite, payload) {
  const query = existingInvite
    ? supabase.from('employee_invites').update(payload).eq('id', existingInvite.id)
    : supabase.from('employee_invites').insert(payload);

  const { error } = await query;
  if (!error) return;

  if (!isMissingColumnError(error)) {
    throw error;
  }

  const fallbackQuery = existingInvite
    ? supabase.from('employee_invites').update(withoutTokenFields(payload)).eq('id', existingInvite.id)
    : supabase.from('employee_invites').insert(withoutTokenFields(payload));

  const { error: fallbackError } = await fallbackQuery;
  if (fallbackError) throw fallbackError;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email odosielanie nie je nakonfigurovane.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Chyba prihlasenie.' });
  }

  const { email } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Zadajte platny email zamestnanca.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    return res.status(401).json({ error: 'Neplatne prihlasenie.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return res.status(403).json({ error: 'Pozvanky moze odosielat iba administrator firmy.' });
  }

  if (!enforceRateLimit(res, [
    {
      key: `send-invite:org:${profile.organization_id}`,
      limit: 250,
      windowMs: DAY,
      message: 'Denny limit pozvanok pre firmu bol dosiahnuty. Ak potrebujete pozvat viac ludi naraz, kontaktujte podporu.'
    },
    {
      key: `send-invite:user:${profile.id}`,
      limit: 250,
      windowMs: DAY,
      message: 'Denny limit pozvanok pre pouzivatela bol dosiahnuty.'
    },
    {
      key: `send-invite:target:${profile.organization_id}:${normalizedEmail}`,
      limit: 5,
      windowMs: HOUR,
      message: 'Na tento email bolo poslanych prilis vela pozvanok. Skuste to prosim neskor.'
    },
    {
      key: `send-invite:ip:${getClientIp(req)}`,
      limit: 300,
      windowMs: DAY,
      message: 'Z tejto siete bolo poslanych prilis vela pozvanok. Skuste to prosim neskor.'
    }
  ])) {
    return;
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single();

  const companyName = organization?.name || 'Vasa firma';
  const employeeName = String(req.body?.employeeName || '').trim();
  const safeCompanyName = escapeHtml(companyName);

  const { data: existingMember } = await supabase
    .from('profiles')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingMember) {
    return res.status(409).json({ error: 'Tento email je uz zaregistrovany vo vasom time.' });
  }

  const { data: existingInvite, error: existingInviteError } = await supabase
    .from('employee_invites')
    .select('id, sent_count')
    .eq('organization_id', profile.organization_id)
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingInviteError && existingInviteError.code !== 'PGRST116') {
    return res.status(500).json({
      error: 'Tabulka pozvanok este nie je pripravena. Spustite SQL subor supabase_employee_invites.sql v Supabase.'
    });
  }

  const inviteToken = createInviteToken();
  const inviteUrl = `${appUrl}/?action=register-emp&companyId=${encodeURIComponent(profile.organization_id)}&email=${encodeURIComponent(normalizedEmail)}&inviteToken=${encodeURIComponent(inviteToken)}`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: 'MojaStavba <noreply@moja-stavba.sk>',
      to: normalizedEmail,
      replyTo: profile.email,
      subject: `${companyName} vas pozyva do aplikacie MojaStavba`,
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Pozvanka do MojaStavba</title>
          </head>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
            <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
              <div style="text-align:center;margin-bottom:24px;">
                <img src="${logoUrl}" width="56" height="56" alt="MojaStavba" style="display:inline-block;width:56px;height:56px;border-radius:16px;">
              </div>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.07);overflow:hidden;">
                <div style="padding:34px 34px 22px;border-bottom:1px solid #f1f5f9;">
                  <h1 style="margin:0 0 12px;font-size:28px;line-height:1.15;color:#0f172a;">Pozvanka do firemneho uctu</h1>
                  <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">${safeCompanyName} vas pozyva do aplikacie MojaStavba.</p>
                </div>
                <div style="padding:30px 34px;">
                  <p style="margin:0 0 18px;color:#0f172a;font-size:16px;line-height:1.7;">Dobry den,</p>
                  <p style="margin:0 0 24px;color:#334155;font-size:15px;line-height:1.7;">
                    Spolocnost ${safeCompanyName} vam posiela pozvanku do systemu ${appUrl} na evidenciu dochadzky,
                    zakaziek a pracovnych vykazov. Kliknite na tlacidlo nizsie a dokoncite registraciu zamestnanca.
                  </p>
                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin:0 0 26px;">
                    <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Firma</div>
                    <div style="font-size:18px;font-weight:800;color:#0f172a;">${safeCompanyName}</div>
                  </div>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="${inviteUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:14px;padding:15px 26px;font-weight:800;font-size:15px;">Prijat pozvanku</a>
                  </div>
                  <p style="margin:24px 0 8px;color:#64748b;font-size:13px;line-height:1.6;">Ak tlacidlo nefunguje, skopirujte tento odkaz do prehliadaca:</p>
                  <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.6;"><a href="${inviteUrl}" style="color:#ea580c;">${inviteUrl}</a></p>
                </div>
              </div>
              <p style="text-align:center;margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">
                Tento email bol odoslany automaticky z aplikacie MojaStavba. Ak ste pozvanku neocakavali, mozete ju ignorovat.
              </p>
            </div>
          </body>
        </html>
      `
    });

    const sentCount = existingInvite ? (existingInvite.sent_count || 0) + 1 : 1;
    const invitePayload = {
      organization_id: profile.organization_id,
      email: normalizedEmail,
      employee_name: employeeName || null,
      status: 'invited',
      invited_by: profile.id,
      sent_count: sentCount,
      last_sent_at: new Date().toISOString(),
      registered_at: null,
      cancelled_at: null,
      token_hash: sha256(inviteToken),
      token_expires_at: new Date(Date.now() + 14 * DAY).toISOString(),
      token_used_at: null
    };

    await saveInvite(existingInvite, invitePayload);

    return res.status(200).json({ success: true, data: result, invite: { email: normalizedEmail, sent_count: sentCount } });
  } catch (error) {
    console.error('Send invite error:', error);
    return res.status(500).json({ error: error.message || 'Email sa nepodarilo odoslat.' });
  }
}
