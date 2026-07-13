import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fuuxskyamoeuusnlsgvl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const logoUrl = 'https://lordsbenison.sk/wp-content/uploads/2026/07/icon-only.png';
const recipients = ['javorcik.ivan1@gmail.com', 'sluzby@lordsbenison.eu'];

const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatCurrency = (value) => `${Number(value || 0).toFixed(2)} €`;

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

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user) {
    return res.status(401).json({ error: 'Neplatné prihlásenie.' });
  }

  const {
    planName = '',
    planId = '',
    net = 0,
    vat = 0,
    total = 0,
    companyName = '',
    ico = '',
    dic = '',
    icDph = '',
    street = '',
    city = '',
    zip = '',
    invoiceEmail = '',
    phone = '',
    userName = '',
    organizationId = ''
  } = req.body || {};

  const normalizedEmail = String(invoiceEmail || '').trim().toLowerCase();

  if (!planName || !normalizedEmail || !companyName) {
    return res.status(400).json({ error: 'Chýbajú údaje objednávky.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Fakturačný email nie je platný.' });
  }

  const safe = {
    planName: escapeHtml(planName),
    planId: escapeHtml(planId),
    companyName: escapeHtml(companyName),
    ico: escapeHtml(ico || 'Nezadané'),
    dic: escapeHtml(dic || 'Nezadané'),
    icDph: escapeHtml(icDph || 'Nezadané'),
    street: escapeHtml(street || ''),
    city: escapeHtml(city || ''),
    zip: escapeHtml(zip || ''),
    invoiceEmail: escapeHtml(normalizedEmail),
    phone: escapeHtml(phone || 'Nezadané'),
    userName: escapeHtml(userName || user.email || 'Používateľ'),
    organizationId: escapeHtml(organizationId)
  };

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'MojaStavba <noreply@moja-stavba.sk>',
      to: recipients,
      replyTo: normalizedEmail,
      subject: `Nová objednávka balíka ${planName} - ${companyName}`,
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nová objednávka MojaStavba</title>
          </head>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
            <div style="max-width:700px;margin:0 auto;padding:32px 18px;">
              <div style="text-align:center;margin-bottom:22px;">
                <img src="${logoUrl}" width="54" height="54" alt="MojaStavba" style="display:inline-block;width:54px;height:54px;border-radius:16px;">
              </div>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.07);overflow:hidden;">
                <div style="padding:30px 34px;border-bottom:1px solid #f1f5f9;background:#fff7ed;">
                  <div style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Nová objednávka predplatného</div>
                  <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;color:#0f172a;">${safe.companyName}</h1>
                  <p style="margin:0;color:#64748b;font-size:14px;">Používateľ si objednal balík ${safe.planName}.</p>
                </div>
                <div style="padding:30px 34px;">
                  <div style="display:block;background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:22px 24px;margin-bottom:24px;color:#0f172a;">
                    <div style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">Objednaný balík</div>
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                      <div>
                        <div style="font-size:26px;font-weight:900;line-height:1;color:#0f172a;">${safe.planName}</div>
                        <div style="font-size:14px;color:#64748b;margin-top:8px;">mesačné predplatné MojaStavba</div>
                      </div>
                      <div style="text-align:right;">
                        <div style="font-size:13px;color:#64748b;font-weight:700;">bez DPH</div>
                        <div style="font-size:18px;color:#0f172a;font-weight:900;margin-top:2px;">${formatCurrency(net)}</div>
                      </div>
                    </div>
                    <div style="height:1px;background:#fed7aa;margin:18px 0;"></div>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                      <div style="font-size:14px;color:#64748b;font-weight:700;">Celkom s DPH</div>
                      <div style="font-size:24px;font-weight:900;color:#ea580c;">${formatCurrency(total)}</div>
                    </div>
                  </div>

                  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;width:170px;">Používateľ</td><td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:700;">${safe.userName}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Fakturačný email</td><td style="padding:9px 0;color:#0f172a;font-size:14px;"><a href="mailto:${safe.invoiceEmail}" style="color:#ea580c;text-decoration:none;font-weight:800;">${safe.invoiceEmail}</a></td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Telefón</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.phone}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Firma</td><td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:700;">${safe.companyName}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">IČO</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.ico}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">DIČ</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.dic}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">IČ DPH</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.icDph}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Adresa</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.street}, ${safe.zip} ${safe.city}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ID firmy</td><td style="padding:9px 0;color:#475569;font-size:13px;font-family:Consolas,monospace;">${safe.organizationId}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ID balíka</td><td style="padding:9px 0;color:#475569;font-size:13px;font-family:Consolas,monospace;">${safe.planId}</td></tr>
                  </table>

                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;">
                    <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Ďalší postup</div>
                    <div style="font-size:14px;line-height:1.7;color:#334155;">
                      Vystav faktúru na uvedené údaje a po úhrade aktivuj prístup v superadmine.
                      Faktúra bude zasielaná v mesačnom harmonograme so 7-dňovou splatnosťou.
                    </div>
                  </div>

                  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:18px 20px;margin-top:16px;">
                    <div style="font-size:12px;font-weight:800;color:#c2410c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Dodávateľ</div>
                    <div style="font-size:14px;line-height:1.7;color:#431407;">
                      <strong>LORD'S BENISON s.r.o.</strong><br>
                      IČO: 52404901<br>
                      DIČ: 2121022992<br>
                      IČ DPH: SK2121022992<br>
                      Sídlo: M. Nandrássyho 654/10, 050 01 Revúca<br>
                      Kontakt: <a href="tel:0948225713" style="color:#ea580c;font-weight:800;text-decoration:none;">0948 225 713</a>
                      alebo <a href="mailto:sluzby@lordsbenison.eu" style="color:#ea580c;font-weight:800;text-decoration:none;">sluzby@lordsbenison.eu</a>
                    </div>
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
    console.error('Subscription order email error:', error);
    return res.status(500).json({ error: 'Email o objednávke sa nepodarilo odoslať.' });
  }
}
