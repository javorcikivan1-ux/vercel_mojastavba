import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fuuxskyamoeuusnlsgvl.supabase.co';
export const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const rateStore = new Map();

const nowMs = () => Date.now();

export const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export const createInviteToken = () => crypto.randomBytes(32).toString('base64url');

export const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
};

export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
};

export const checkRateLimit = ({ key, limit, windowMs }) => {
  const current = nowMs();
  const existing = rateStore.get(key);

  if (!existing || existing.resetAt <= current) {
    rateStore.set(key, { count: 1, resetAt: current + windowMs });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt: current + windowMs };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
};

export const enforceRateLimit = (res, rules) => {
  for (const rule of rules) {
    const result = checkRateLimit(rule);
    if (!result.ok) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - nowMs()) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        error: rule.message || 'Prilis vela poziadaviek. Skuste to prosim neskor.'
      });
      return false;
    }
  }

  return true;
};

export const isMissingColumnError = (error) => {
  const message = String(error?.message || '');
  return error?.code === 'PGRST204' || message.includes('schema cache') || message.includes('column');
};
