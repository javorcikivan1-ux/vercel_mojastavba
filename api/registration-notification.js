import { Resend } from 'resend';
import {
  enforceRateLimit,
  escapeHtml,
  getClientIp,
  supabaseAdmin as supabase
} from './_security.js';

const recipients = ['javorcik.ivan1@gmail.com', 'sluzby@lordsbenison.eu'];
const logoUrl = 'https://lordsbenison.sk/wp-content/uploads/2026/07/icon-only.png';
const HOUR = 60 * 60 * 1000;

const normalize = (value) => String(value || '').trim();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email odosielanie nie je nakonfigurovane.' });
  }

  const userId = normalize(req.body?.userId);
  const notificationToken = normalize(req.body?.notificationToken);

  if (!userId || !notificationToken || notificationToken.length < 24) {
    return res.status(400).json({ error: 'Neplatna registracna poziadavka.' });
  }

  if (!enforceRateLimit(res, [
    {
      key: `registration-notification:ip:${getClientIp(req)}`,
      limit: 20,
      windowMs: HOUR,
      message: 'Prilis vela registracnych upozorneni.'
    },
    {
      key: `registration-notification:user:${userId}`,
      limit: 3,
      windowMs: HOUR,
      message: 'Upozornenie pre tuto registraciu uz bolo spracovane.'
    }
  ])) return;

  const { data, error } = await supabase.auth.admin.getUserById(userId);
  const user = data?.user;
  const metadata = user?.user_metadata || {};

  if (error || !user || metadata.registration_notification_token !== notificationToken) {
    return res.status(403).json({ error: 'Registraciu sa nepodarilo overit.' });
  }

  // Supabase can conceal an already registered address by returning a synthetic
  // signup response. Never send a "new registration" notification for it.
  if (!Array.isArray(user.identities) || user.identities.length === 0) {
    return res.status(202).json({ ok: true, skipped: true });
  }

  if (metadata.registration_notified_at) {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  // Internal notifications are only for newly created company-owner accounts.
  // Employee registrations must never consume an outgoing email.
  if (metadata.role !== 'admin') {
    return res.status(202).json({ ok: true, skipped: true });
  }

  const createdAt = new Date(user.created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 15 * 60 * 1000) {
    return res.status(403).json({ error: 'Platnost registracnej poziadavky vyprsala.' });
  }

  const role = 'admin';
  const fullName = normalize(metadata.full_name) || 'Nezadane';
  let companyName = normalize(metadata.company_name);
  const companyId = normalize(metadata.company_id);

  if (role === 'employee' && companyId) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', companyId)
      .maybeSingle();
    companyName = normalize(organization?.name) || 'Neznama firma';
  }

  const email = normalize(user.email).toLowerCase();
  const safe = {
    fullName: escapeHtml(fullName),
    email: escapeHtml(email || 'Nezadany'),
    role: role === 'admin' ? 'Majitel / administrator' : 'Zamestnanec',
    companyName: escapeHtml(companyName || 'Nezadana'),
    companyId: escapeHtml(companyId || 'Vytvori sa automaticky'),
    userId: escapeHtml(user.id),
    createdAt: escapeHtml(new Date(user.created_at).toLocaleString('sk-SK', { timeZone: 'Europe/Bratislava' }))
  };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: 'MojaStavba <noreply@moja-stavba.sk>',
    to: recipients,
    replyTo: email || undefined,
    subject: `Nova registracia - ${companyName || fullName}`,
    html: `
      <!doctype html>
      <html>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
          <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
            <div style="text-align:center;margin-bottom:20px;">
              <img src="${logoUrl}" width="54" height="54" alt="MojaStavba" style="width:54px;height:54px;border-radius:16px;">
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.07);">
              <div style="padding:28px 32px;background:#fff7ed;border-bottom:1px solid #fed7aa;">
                <div style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Nova registracia v MojaStavba</div>
                <h1 style="margin:0;font-size:25px;line-height:1.25;">${safe.companyName}</h1>
              </div>
              <div style="padding:26px 32px;">
                <table role="presentation" style="width:100%;border-collapse:collapse;">
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Meno</td><td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:700;">${safe.fullName}</td></tr>
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">E-mail</td><td style="padding:9px 0;color:#0f172a;font-size:14px;"><a href="mailto:${safe.email}" style="color:#ea580c;">${safe.email}</a></td></tr>
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Typ uctu</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.role}</td></tr>
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Firma</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.companyName}</td></tr>
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ID firmy</td><td style="padding:9px 0;color:#475569;font-size:13px;font-family:Consolas,monospace;">${safe.companyId}</td></tr>
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Cas registracie</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.createdAt}</td></tr>
                  <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ID pouzivatela</td><td style="padding:9px 0;color:#475569;font-size:12px;font-family:Consolas,monospace;">${safe.userId}</td></tr>
                </table>
                <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">Automaticke interne upozornenie. Heslo ani ine prihlasovacie udaje sa e-mailom neposielaju.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `
  });

  if (result.error) {
    console.error('Registration notification email failed:', result.error);
    return res.status(502).json({ error: 'Upozornenie sa nepodarilo odoslat.' });
  }

  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      registration_notified_at: new Date().toISOString()
    }
  });

  return res.status(200).json({ ok: true });
}
