import { Resend } from 'resend';
import { enforceRateLimit, escapeHtml, getClientIp } from './_security.js';

const recipients = ['sluzby@lordsbenison.eu', 'javorcik.ivan1@gmail.com'];
const logoUrl = 'https://lordsbenison.sk/wp-content/uploads/2026/07/icon-only.png';
const HOUR = 60 * 60 * 1000;

const normalize = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'Odosielanie správ nie je momentálne dostupné.' });

  const ip = getClientIp(req);
  if (!enforceRateLimit(res, [{
    key: `landing-contact:ip:${ip}`,
    limit: 6,
    windowMs: HOUR,
    message: 'Odoslali ste príliš veľa správ. Skúste to prosím neskôr.'
  }])) return;

  const website = normalize(req.body?.website, 200);
  if (website) return res.status(200).json({ ok: true });

  const name = normalize(req.body?.name, 120);
  const email = normalize(req.body?.email, 254).toLowerCase();
  const phone = normalize(req.body?.phone, 50);
  const message = normalize(req.body?.message, 4000);
  const agreedToPrivacy = req.body?.agreedToPrivacy === true;

  if (!name || !email || !phone || !message) return res.status(400).json({ error: 'Vyplňte meno, e-mail, telefón a správu.' });
  if (!agreedToPrivacy) return res.status(400).json({ error: 'Pre odoslanie je potrebný súhlas so zásadami ochrany osobných údajov.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Zadajte platný e-mail.' });

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || 'Nezadaný');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: 'MojaStavba <noreply@moja-stavba.sk>',
      to: recipients,
      replyTo: email,
      subject: `Otázka z webu MojaStavba – ${name}`,
      html: `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;"><div style="max-width:680px;margin:0 auto;padding:32px 18px;"><div style="text-align:center;margin-bottom:20px;"><img src="${logoUrl}" width="54" height="54" alt="MojaStavba" style="width:54px;height:54px;border-radius:16px;"></div><div style="overflow:hidden;border:1px solid #e2e8f0;border-radius:20px;background:#fff;box-shadow:0 18px 45px rgba(15,23,42,.07);"><div style="padding:28px 32px;background:#fff7ed;border-bottom:1px solid #fed7aa;"><div style="margin-bottom:8px;font-size:12px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:.08em;">Kontaktný formulár MojaStavba</div><h1 style="margin:0;font-size:25px;line-height:1.25;">Nová otázka z webu</h1></div><div style="padding:26px 32px;"><table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:22px;"><tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;width:110px;">Meno</td><td style="padding:8px 0;font-size:14px;font-weight:700;">${safeName}</td></tr><tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;">E-mail</td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${safeEmail}" style="color:#ea580c;font-weight:700;">${safeEmail}</a></td></tr><tr><td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:700;">Telefón</td><td style="padding:8px 0;font-size:14px;font-weight:700;">${safePhone}</td></tr></table><div style="padding:18px 20px;border:1px solid #fed7aa;border-radius:16px;background:#fff7ed;"><div style="margin-bottom:8px;font-size:12px;font-weight:800;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;">Správa</div><div style="font-size:15px;line-height:1.7;">${safeMessage}</div></div></div></div></div></body></html>`
    });

    if (result.error) throw result.error;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Landing contact email error:', error);
    return res.status(500).json({ error: 'Správu sa nepodarilo odoslať. Skúste to prosím znova.' });
  }
}
