import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type ReminderJob = {
  id: string;
  task_id: string;
  user_id: string;
  reminder_minutes: 60 | 15 | 0;
  due_at: string;
  attempts: number;
};

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' }
});

const reminderTitle = (minutes: ReminderJob['reminder_minutes']) => {
  if (minutes === 60) return 'Úloha o 1 hodinu';
  if (minutes === 15) return 'Úloha o 15 minút';
  return 'Úloha práve začína';
};

const taskTime = (value: string) => new Intl.DateTimeFormat('sk-SK', {
  timeZone: 'Europe/Bratislava',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date(value));

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:sluzby@lordsbenison.eu';

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse({ error: 'Missing Supabase or VAPID configuration' }, 500);
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const now = new Date();
  const staleProcessing = new Date(now.getTime() - 10 * 60_000).toISOString();
  await admin
    .from('task_reminder_jobs')
    .update({ status: 'pending', updated_at: now.toISOString(), last_error: 'Obnovené po prerušení spracovania.' })
    .eq('status', 'processing')
    .lt('updated_at', staleProcessing);

  const { data: jobs, error: jobsError } = await admin
    .from('task_reminder_jobs')
    .select('id, task_id, user_id, reminder_minutes, due_at, attempts')
    .eq('status', 'pending')
    .lte('due_at', now.toISOString())
    .order('due_at', { ascending: true })
    .limit(100);

  if (jobsError) return jsonResponse({ error: jobsError.message }, 500);

  const result = { checked: jobs?.length || 0, sent: 0, skipped: 0, failed: 0 };

  for (const job of (jobs || []) as ReminderJob[]) {
    const attempt = (job.attempts || 0) + 1;
    const claimedAt = new Date().toISOString();
    const { data: claimed } = await admin
      .from('task_reminder_jobs')
      .update({ status: 'processing', attempts: attempt, updated_at: claimedAt })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (!claimed) continue;

    try {
      const latenessMs = Date.now() - new Date(job.due_at).getTime();
      if (latenessMs > 5 * 60_000) {
        await admin.from('task_reminder_jobs').update({
          status: 'skipped',
          last_error: 'Pripomienka bola viac než 5 minút po termíne.',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
        result.skipped++;
        continue;
      }

      const [{ data: task }, { data: profile }, { data: subscriptions }] = await Promise.all([
        admin.from('tasks').select('id, title, start_date, status, assigned_to, sites(name)').eq('id', job.task_id).maybeSingle(),
        admin.from('profiles').select('id, role, settings').eq('id', job.user_id).maybeSingle(),
        admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', job.user_id).eq('is_active', true)
      ]);

      if (!task || task.status !== 'todo' || task.assigned_to !== job.user_id || profile?.role !== 'admin' || profile?.settings?.notify_tasks === false) {
        await admin.from('task_reminder_jobs').update({
          status: 'skipped',
          last_error: 'Úloha, administrátorská rola alebo používateľské nastavenie už nie je aktívne.',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
        result.skipped++;
        continue;
      }

      if (!subscriptions?.length) {
        await admin.from('task_reminder_jobs').update({
          status: 'skipped',
          last_error: 'Používateľ nemá aktívne push zariadenie.',
          updated_at: new Date().toISOString()
        }).eq('id', job.id);
        result.skipped++;
        continue;
      }

      const siteRelation = task.sites as { name?: string } | Array<{ name?: string }> | null;
      const siteName = Array.isArray(siteRelation) ? siteRelation[0]?.name : siteRelation?.name;
      const body = [task.title, siteName, taskTime(task.start_date)].filter(Boolean).join(' · ');
      const payload = JSON.stringify({
        title: reminderTitle(job.reminder_minutes),
        body,
        tag: `task-${task.id}-${job.reminder_minutes}`,
        renotify: true,
        url: '/#/kalendar',
        taskId: task.id
      });

      let delivered = 0;
      const errors: string[] = [];

      for (const subscription of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth }
          }, payload, { TTL: 300, urgency: 'high', topic: `task-${task.id.slice(0, 18)}-${job.reminder_minutes}` });
          delivered++;
        } catch (error) {
          const statusCode = Number((error as any)?.statusCode || 0);
          errors.push((error as Error)?.message || `Push zlyhal (${statusCode || 'bez kódu'}).`);
          if (statusCode === 404 || statusCode === 410) {
            await admin.from('push_subscriptions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', subscription.id);
          }
        }
      }

      if (delivered > 0) {
        await admin.from('task_reminder_jobs').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: errors.length ? errors.join(' | ').slice(0, 1000) : null
        }).eq('id', job.id);
        result.sent++;
      } else {
        const retry = attempt < 3;
        await admin.from('task_reminder_jobs').update({
          status: retry ? 'pending' : 'failed',
          updated_at: new Date().toISOString(),
          last_error: (errors.join(' | ') || 'Push nebol doručený.').slice(0, 1000)
        }).eq('id', job.id);
        result.failed++;
      }
    } catch (error) {
      await admin.from('task_reminder_jobs').update({
        status: attempt < 3 ? 'pending' : 'failed',
        updated_at: new Date().toISOString(),
        last_error: ((error as Error)?.message || 'Neznáma chyba').slice(0, 1000)
      }).eq('id', job.id);
      result.failed++;
    }
  }

  return jsonResponse(result);
});
