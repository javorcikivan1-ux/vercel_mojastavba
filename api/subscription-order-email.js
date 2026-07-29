import { Resend } from 'resend';
import {
  enforceRateLimit,
  escapeHtml,
  getBearerToken,
  getClientIp,
  isMissingColumnError,
  supabaseAdmin as supabase
} from './_security.js';

const logoUrl = 'https://lordsbenison.sk/wp-content/uploads/2026/07/icon-only.png';
const recipients = ['javorcik.ivan1@gmail.com', 'sluzby@lordsbenison.eu'];
const HOUR = 60 * 60 * 1000;
const VAT_RATE = 0.23;

const PLAN_CATALOG = {
  base: { id: 'base', name: 'SILVER', net: 24 },
  standard: { id: 'standard', name: 'GOLD', net: 29 },
  pro: { id: 'pro', name: 'PLATINUM', net: 55 }
};

const formatCurrency = (value) => `${Number(value || 0).toFixed(2)} EUR`;
const roundMoney = (value) => Math.round(Number(value || 0) * 100) / 100;
const pick = (...values) => values.find((value) => String(value || '').trim()) || '';

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

  const planId = String(req.body?.planId || '').trim();
  const plan = PLAN_CATALOG[planId];

  if (!plan) {
    return res.status(400).json({ error: 'Neplatny balik objednavky.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.organization_id) {
    return res.status(403).json({ error: 'Pouzivatelsky profil nie je pripraveny.' });
  }

  if (!enforceRateLimit(res, [
    {
      key: `subscription-order:org:${profile.organization_id}`,
      limit: 10,
      windowMs: HOUR,
      message: 'Objednavka bola odoslana prilis casto. Skuste to prosim neskor.'
    },
    {
      key: `subscription-order:user:${profile.id}`,
      limit: 10,
      windowMs: HOUR,
      message: 'Objednavka bola odoslana prilis casto. Skuste to prosim neskor.'
    },
    {
      key: `subscription-order:ip:${getClientIp(req)}`,
      limit: 30,
      windowMs: HOUR,
      message: 'Z tejto siete bolo odoslanych prilis vela objednavok.'
    }
  ])) {
    return;
  }

  let { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, ico, dic, ic_dph, street, city, zip, business_address')
    .eq('id', profile.organization_id)
    .single();

  if (organizationError && isMissingColumnError(organizationError)) {
    const fallback = await supabase
      .from('organizations')
      .select('id, name, ico, dic, ic_dph, business_address')
      .eq('id', profile.organization_id)
      .single();
    organization = fallback.data;
    organizationError = fallback.error;
  }

  if (organizationError || !organization) {
    return res.status(404).json({ error: 'Firma nebola najdena.' });
  }

  const net = roundMoney(plan.net);
  const vat = roundMoney(net * VAT_RATE);
  const total = roundMoney(net + vat);
  const normalizedEmail = String(pick(profile.email, user.email)).trim().toLowerCase();
  const phone = pick(profile.phone, req.body?.phone, 'Nezadane');
  const companyName = pick(organization.name, 'Neznama firma');
  const addressLine = pick(
    [organization.street, organization.zip, organization.city].filter(Boolean).join(', '),
    organization.business_address,
    'Nezadana'
  );

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Fakturacny email nie je platny.' });
  }

  const safe = {
    planName: escapeHtml(plan.name),
    planId: escapeHtml(plan.id),
    companyName: escapeHtml(companyName),
    ico: escapeHtml(organization.ico || 'Nezadane'),
    dic: escapeHtml(organization.dic || 'Nezadane'),
    icDph: escapeHtml(organization.ic_dph || 'Nezadane'),
    address: escapeHtml(addressLine),
    invoiceEmail: escapeHtml(normalizedEmail),
    phone: escapeHtml(phone),
    userName: escapeHtml(profile.full_name || user.email || 'Pouzivatel'),
    organizationId: escapeHtml(profile.organization_id)
  };

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'MojaStavba <noreply@moja-stavba.sk>',
      to: recipients,
      replyTo: normalizedEmail,
      subject: `Nova objednavka balika ${plan.name} - ${companyName}`,
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Nova objednavka MojaStavba</title>
          </head>
          <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
            <div style="max-width:700px;margin:0 auto;padding:32px 18px;">
              <div style="text-align:center;margin-bottom:22px;">
                <img src="${logoUrl}" width="54" height="54" alt="MojaStavba" style="display:inline-block;width:54px;height:54px;border-radius:16px;">
              </div>
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.07);overflow:hidden;">
                <div style="padding:30px 34px;border-bottom:1px solid #f1f5f9;background:#fff7ed;">
                  <div style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Nova objednavka predplatneho</div>
                  <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;color:#0f172a;">${safe.companyName}</h1>
                  <p style="margin:0;color:#64748b;font-size:14px;">Pouzivatel si objednal balik ${safe.planName}.</p>
                </div>
                <div style="padding:30px 34px;">
                  <div style="display:block;background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:22px 24px;margin-bottom:24px;color:#0f172a;">
                    <div style="font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;">Objednany balik</div>
                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;">
                      <div>
                        <div style="font-size:26px;font-weight:900;line-height:1;color:#0f172a;">${safe.planName}</div>
                        <div style="font-size:14px;color:#64748b;margin-top:8px;">mesacne predplatne MojaStavba</div>
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
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;width:170px;">Pouzivatel</td><td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:700;">${safe.userName}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Fakturacny email</td><td style="padding:9px 0;color:#0f172a;font-size:14px;"><a href="mailto:${safe.invoiceEmail}" style="color:#ea580c;text-decoration:none;font-weight:800;">${safe.invoiceEmail}</a></td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Telefon</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.phone}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Firma</td><td style="padding:9px 0;color:#0f172a;font-size:14px;font-weight:700;">${safe.companyName}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ICO</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.ico}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">DIC</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.dic}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">IC DPH</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.icDph}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">Adresa</td><td style="padding:9px 0;color:#0f172a;font-size:14px;">${safe.address}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ID firmy</td><td style="padding:9px 0;color:#475569;font-size:13px;font-family:Consolas,monospace;">${safe.organizationId}</td></tr>
                    <tr><td style="padding:9px 0;color:#64748b;font-size:13px;font-weight:700;">ID balika</td><td style="padding:9px 0;color:#475569;font-size:13px;font-family:Consolas,monospace;">${safe.planId}</td></tr>
                  </table>

                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:18px 20px;">
                    <div style="font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">Dalsi postup</div>
                    <div style="font-size:14px;line-height:1.7;color:#334155;">
                      Vystav fakturu na uvedene udaje a po uhrade aktivuj pristup v superadmine.
                      Faktura bude zasielana v mesacnom harmonograme so 7-dnovou splatnostou.
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
    return res.status(500).json({ error: 'Email o objednavke sa nepodarilo odoslat.' });
  }
}
