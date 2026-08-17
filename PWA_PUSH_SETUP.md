# PWA pripomienky kalendárových úloh

Implementácia posiela priradenému používateľovi tri upozornenia:

- 60 minút pred začiatkom úlohy,
- 15 minút pred začiatkom úlohy,
- bezprostredne pri začiatku úlohy.

Web Push, VAPID kľúče ani Apple Developer účet nie sú spoplatnené. Supabase Free aktuálne zahŕňa 500 000 spustení Edge Functions mesačne. Cron spustený každú minútu spotrebuje približne 43 200 spustení za 30 dní.

> Web Push je služba typu „best effort“. Cron kontroluje úlohy každú minútu, ale operačný systém môže upozornenie pri slabom pripojení, úspornom režime alebo vypnutých upozorneniach doručiť neskôr.

## 1. Vygenerovanie bezplatných kľúčov

V koreňovom priečinku projektu spustite:

```powershell
npm run push:keys
```

Výstup obsahuje:

- `VAPID_PUBLIC_KEY` – môže byť zverejnený v klientskej aplikácii,
- `VAPID_PRIVATE_KEY` – musí zostať iba v Supabase Secrets,
- `CRON_SECRET` – chráni serverovú funkciu pred cudzím spustením.

Kľúče si bezpečne uložte. Pri ich neskoršej zmene sa budú musieť zariadenia znovu prihlásiť na odber upozornení.

## 2. Databáza

V Supabase otvorte **SQL Editor**, vložte celý obsah súboru:

`supabase_task_push_reminders.sql`

a stlačte **Run**.

Skript vytvorí:

- bezpečné uloženie odberov jednotlivých zariadení,
- tri plánované pripomienky pre každú priradenú úlohu,
- automatickú aktualizáciu pripomienok pri presunutí alebo preassignovaní úlohy,
- ochranu proti duplicitnému odoslaniu.

Pripomienky sa vytvoria iba pre úlohy so stavom `todo`, ktoré majú vyplnené `assigned_to`.

## 3. Nasadenie Supabase Edge Function

Ak Supabase CLI ešte nie je pripojené:

```powershell
npx supabase login
npx supabase link --project-ref fuuxskyamoeuusnlsgvl
```

Nastavte tajné premenné. Hodnoty nahraďte výstupom z prvého kroku:

```powershell
npx supabase secrets set VAPID_PUBLIC_KEY=SEM_VEREJNY_KLUC VAPID_PRIVATE_KEY=SEM_SUKROMNY_KLUC CRON_SECRET=SEM_CRON_SECRET VAPID_SUBJECT=mailto:sluzby@lordsbenison.eu
```

Funkciu nasaďte:

```powershell
npx supabase functions deploy send-task-reminders --no-verify-jwt
```

Funkcia síce nemá Supabase JWT kontrolu, ale každé volanie musí obsahovať tajnú hlavičku `x-cron-secret`. Bez nej vráti `401 Unauthorized`.

## 4. Verejný kľúč vo Verceli

Vo Verceli otvorte **Project → Settings → Environment Variables** a pridajte:

```text
VITE_WEB_PUSH_PUBLIC_KEY=SEM_VEREJNY_KLUC
```

Premennú nastavte aspoň pre **Production** a následne urobte nový deploy aplikácie.

Súkromný VAPID kľúč ani `CRON_SECRET` sa nesmú ukladať do Vercelu ako premenné s prefixom `VITE_`.

## 5. Supabase Cron každú minútu

V Supabase SQL Editore najprv povoľte rozšírenia a uložte tajné hodnoty do Vaultu. Hodnoty nahraďte svojimi údajmi:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
  'https://fuuxskyamoeuusnlsgvl.supabase.co',
  'task_push_project_url'
);

select vault.create_secret(
  'SEM_SUPABASE_PUBLISHABLE_ALEBO_ANON_KEY',
  'task_push_publishable_key'
);

select vault.create_secret(
  'SEM_CRON_SECRET',
  'task_push_cron_secret'
);
```

Potom vytvorte minútový job:

```sql
select cron.schedule(
  'send-task-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'task_push_project_url'
    ) || '/functions/v1/send-task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'task_push_publishable_key'
      ),
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'task_push_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
```

Stav jobu je viditeľný v **Supabase → Integrations → Cron**. História behov je v tabuľke `cron.job_run_details`.

## 6. Povolenie na mobilnom zariadení

### Android

1. Otvorte nasadenú aplikáciu cez HTTPS.
2. Prihláste sa ako používateľ, ktorému sú prideľované úlohy.
3. Otvorte **Nastavenia → Všeobecné → Notifikácie**.
4. Stlačte **Povoliť upozornenia** a potvrďte systémové povolenie.

### iPhone alebo iPad

Vyžaduje iOS/iPadOS 16.4 alebo novší:

1. Otvorte aplikáciu v Safari.
2. Zvoľte **Zdieľať → Pridať na plochu**.
3. Aplikáciu zatvorte a znovu otvorte cez ikonu na ploche.
4. Prihláste sa a v **Nastaveniach → Všeobecné → Notifikácie** stlačte **Povoliť upozornenia**.

Povolenie sa robí samostatne na každom zariadení.

## 7. Funkčný test

1. Na testovacom mobile povoľte systémové upozornenia.
2. V kalendári vytvorte úlohu, priraďte ju prihlásenému používateľovi a nastavte začiatok o niekoľko minút.
3. Skontrolujte, že v `task_reminder_jobs` vznikli tri riadky s hodnotami `60`, `15` a `0`.
4. Pri blízkom teste môžete v SQL Editore posunúť jeden čakajúci job na aktuálny čas:

```sql
update public.task_reminder_jobs
set due_at = now(), status = 'pending', attempts = 0, last_error = null
where id = (
  select id
  from public.task_reminder_jobs
  where status = 'pending'
  order by due_at
  limit 1
);
```

5. Do jednej minúty musí prísť systémové upozornenie. Kliknutie otvorí kalendár.

Logy funkcie nájdete v **Supabase → Edge Functions → send-task-reminders → Logs**.

