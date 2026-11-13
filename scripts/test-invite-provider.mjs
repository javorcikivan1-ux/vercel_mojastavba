import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('../api/send-invite.js', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;

const run = async (providerResult, role = 'admin') => {
  let saved = 0;
  let sent = 0;
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: 'admin' } }, error: null }) },
    from: table => {
      const query = {};
      for (const method of ['select','eq']) query[method] = () => query;
      query.single = async () => ({ data: table === 'profiles' ? { id: 'admin', role, organization_id: 'org', email: 'admin@example.test' } : { name: 'Test' }, error: null });
      query.maybeSingle = async () => ({ data: null, error: null });
      query.insert = async () => { saved++; return { error: null }; };
      return query;
    }
  };
  const security = { supabaseAdmin: supabase, createInviteToken: () => 'mock-token', enforceRateLimit: () => true, escapeHtml: value => value, getBearerToken: () => 'mock-auth', getClientIp: () => 'test', isMissingColumnError: () => false, sha256: () => 'mock-hash' };
  const module = { exports: {} };
  const require = name => name === 'resend' ? { Resend: class { emails = { send: async () => { sent++; return providerResult; } }; } } : security;
  new Function('require','exports','module','process','console',code)(require,module.exports,module,{env:{RESEND_API_KEY:'mock-only'}},{error:()=>{}});
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await module.exports.default({ method: 'POST', body: { email: 'worker@example.test' } },res);
  return { ...res, saved, sent };
};

test('provider rejection cannot be reported or stored as a sent invitation', async () => {
  const response = await run({ data: null, error: { message: 'Rejected mailbox', statusCode: 422 } });
  assert.equal(response.statusCode,500);assert.equal(response.saved,0);assert.equal(response.body.success,undefined);
});

test('provider rate limit propagates to stop the client queue', async () => {
  const response = await run({ data: null, error: { message: 'Rate limit', statusCode: 429 } });
  assert.equal(response.statusCode,429);assert.equal(response.saved,0);
});

test('accepted invitation is persisted and reported as successful', async () => {
  const response = await run({ data: { id: 'mock-email' }, error: null });
  assert.equal(response.statusCode,200);assert.equal(response.saved,1);assert.equal(response.body.success,true);
});

test('employee cannot send invitations or persist invitation records', async () => {
  const response = await run({ data: { id: 'mock-email' }, error: null }, 'employee');
  assert.equal(response.statusCode,403);assert.equal(response.saved,0);assert.equal(response.sent,0);
});
