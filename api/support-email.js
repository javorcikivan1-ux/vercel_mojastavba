import { Resend } from 'resend';
import {
  enforceRateLimit,
  escapeHtml,
  getBearerToken,
  getClientIp,
  supabaseAdmin as supabase
} from './_security.js';

const logoUrl = 'https://lordsbenison.sk/wp-content/uploads/2026/07/icon-only.png';
const supportRecipients = ['javorcik.ivan1@gmail.com', 'sluzby@lordsbenison.eu'];
const HOUR = 60 * 60 * 1000;

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

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    return res.status(401).json({ error: 'Neplatne prihlasenie.' });
  }

  if (!enforceRateLimit(res, [
    {
      key: `support-email:user:${user.id}`,
      limit: 20,
      windowMs: HOUR,
      message: 'Spravu ste odoslali prilis casto. Skuste to prosim neskor.'
    },
    {
      key: `support-email:ip:${getClientIp(req)}`,
      limit: 60,
      windowMs: HOUR,
      message: 'Z tejto siete bolo odoslanych prilis vela sprav.'
    }
  ])) {
    return;
  }

  const {
    message = '',
    contactEmail = '',
    contactPhone = '',
    requestType = 'support',
    userName = '',
    organizationName = '',
    organizationId = ''
  } = req.body || {};

  const normalizedEmail = String(contactEmail || '').trim().toLowerCase();
  const trimmedMessage = String(message || '').trim();
  const trimmedPhone = String(contactPhone || '').trim();

  if (!trimmedMessage || !normalizedEmail || !trimmedPhone) {
    return res.status(400).json({ error: 'Vyplnte spravu, email aj telefon.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Zadajte platny email.' });
  }

  const safeUserName = escapeHtml(userName || user.email || 'Pouzivatel');
  const safeOrgName = escapeHtml(organizationName || 'Neznama firma');
  const safeMessage = escapeHtml(trimmedMessage).replace(/\n/g, '<br>');
  const safeEmail = escapeHtml(normalizedEmail);
  const safePhone = escapeHtml(trimmedPhone);
  const safeOrgId = escapeHtml(organizationId);
  const isFeedback = requestType === 'feedback';
  const requestLabel = isFeedback ? 'Podnet na zlepsenie aplikacie' : 'Technicka podpora';

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'MojaStavba <noreply@moja-stavba.sk>',
      to: supportRecipients,
      replyTo: normalizedEmail,
      subject: `${requestLabel}: ${organizationName || normalizedEmail}`,
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${requestLabel} MojaStavba</title>
          </head>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
            <div style="max-width:680px;margin:0 auto;padding:32px 18px;">
              <div style="text-align:center;margin-bottom:22px;">
                <img src="${logoUrl}" width="54" height="54" alt="MojaStavba" style="display:inline-block;width:54px;height:54px;border-radius:16px;">
              </div>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.07);overflow:hidden;">
                <div style="padding:28px 32px;border-bottom:1px solid #f1f5f9;">
                  <div style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">${requestLabel}</div>
                  <h1 style="margin:0;font-size:24px;line-height:1.2;color:#0f172a;">${safeOrgName}</h1>
                </div>
                <div style="padding:28px 32px;">
                  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;width:150px;">Typ</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:800;">${requestLabel}</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;">Pouzivatel</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:700;">${safeUserName}</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;">Email</td><td style="padding:8px 0;color:#0f172a;font-size:14px;"><a href="mailto:${safeEmail}" style="color:#ea580c;text-decoration:none;font-weight:700;">${safeEmail}</a></td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;">Telefon</td><td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:700;">${safePhone}</td></tr>
                    <tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;">ID firmy</td><td style="padding:8px 0;color:#475569;font-size:13px;font-family:Consolas,monospace;">${safeOrgId}</td></tr>
                  </table>
                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;">
                    <div style="font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Sprava</div>
                    <div style="font-size:15px;line-height:1.7;color:#0f172a;">${safeMessage}</div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Support email error:', error);
    return res.status(500).json({ error: 'Email podpory sa nepodarilo odoslat.' });
  }
}
