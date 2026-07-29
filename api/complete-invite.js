import {
  enforceRateLimit,
  getBearerToken,
  getClientIp,
  isMissingColumnError,
  sha256,
  supabaseAdmin as supabase
} from './_security.js';

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service key nie je nakonfigurovany.' });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Chyba prihlasenie.' });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  const user = authData?.user;

  if (authError || !user?.email) {
    return res.status(401).json({ error: 'Neplatne prihlasenie.' });
  }

  const email = normalizeEmail(req.body?.email || user.email);
  const companyId = String(req.body?.companyId || '').trim();
  const inviteToken = String(req.body?.inviteToken || '').trim();

  if (!email || !companyId) {
    return res.status(400).json({ error: 'Chyba email alebo ID firmy.' });
  }

  if (normalizeEmail(user.email) !== email) {
    return res.status(403).json({ error: 'Pozvanku moze dokoncit iba prihlaseny pouzivatel s rovnakym emailom.' });
  }

  if (!enforceRateLimit(res, [
    {
      key: `complete-invite:ip:${getClientIp(req)}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
      message: 'Prilis vela pokusov o dokoncenie pozvanky. Skuste to prosim neskor.'
    },
    {
      key: `complete-invite:user:${user.id}`,
      limit: 30,
      windowMs: 60 * 60 * 1000,
      message: 'Prilis vela pokusov o dokoncenie pozvanky. Skuste to prosim neskor.'
    }
  ])) {
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, role, organization_id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(403).json({ error: 'Profil pouzivatela sa nepodarilo overit.' });
  }

  if (profile.role !== 'employee' || profile.organization_id !== companyId || normalizeEmail(profile.email) !== email) {
    return res.status(403).json({ error: 'Pozvanka nepatri tomuto prihlasenemu pouzivatelovi.' });
  }

  const finalizeInvite = async (withTokenColumns = true) => {
    let query = supabase
      .from('employee_invites')
      .select(withTokenColumns ? 'id, status, token_hash, token_expires_at, token_used_at' : 'id, status')
      .eq('organization_id', companyId)
      .eq('email', email)
      .in('status', ['invited', 'cancelled'])
      .maybeSingle();

    const { data: invite, error: inviteError } = await query;
    if (inviteError) throw inviteError;

    if (!invite) {
      return { status: 200, body: { success: true, alreadyResolved: true } };
    }

    if (withTokenColumns) {
      const hasTokenOnInvite = Boolean(invite.token_hash);
      if (hasTokenOnInvite) {
        if (!inviteToken) {
          return { status: 403, body: { error: 'Chyba bezpecny token pozvanky.' } };
        }

        if (invite.token_used_at) {
          return { status: 409, body: { error: 'Pozvanka uz bola pouzita.' } };
        }

        if (invite.token_expires_at && new Date(invite.token_expires_at).getTime() < Date.now()) {
          return { status: 410, body: { error: 'Pozvanka expirovala. Poziadajte firmu o novu pozvanku.' } };
        }

        if (sha256(inviteToken) !== invite.token_hash) {
          return { status: 403, body: { error: 'Neplatny token pozvanky.' } };
        }
      }
    }

    const updatePayload = {
      status: 'registered',
      registered_at: new Date().toISOString()
    };

    if (withTokenColumns) {
      updatePayload.token_used_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('employee_invites')
      .update(updatePayload)
      .eq('id', invite.id);

    if (updateError) throw updateError;
    return { status: 200, body: { success: true } };
  };

  try {
    const result = await finalizeInvite(true);
    return res.status(result.status).json(result.body);
  } catch (error) {
    if (isMissingColumnError(error)) {
      try {
        const result = await finalizeInvite(false);
        return res.status(result.status).json(result.body);
      } catch (fallbackError) {
        console.error('Complete invite fallback error:', fallbackError);
        return res.status(500).json({ error: fallbackError.message || 'Pozvanku sa nepodarilo oznacit ako dokoncenu.' });
      }
    }

    console.error('Complete invite error:', error);
    return res.status(500).json({ error: error.message || 'Pozvanku sa nepodarilo oznacit ako dokoncenu.' });
  }
}
