import { PGlite } from '@electric-sql/pglite';
// Runs every migration against in-memory Postgres (PGlite) with minimal stand-ins
// for Supabase's auth and storage schemas, then checks RLS isolation and the
// business-logic functions. Run with `npm run test:db`.
import { readFileSync, readdirSync } from 'node:fs';
const db = new PGlite();
const q = (s, p) => db.query(s, p);
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
  grant usage on schema public, auth, storage to authenticated;
  grant execute on function auth.uid() to authenticated;
`);
const dir = new URL('../migrations/', import.meta.url);
for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(new URL(f, dir), 'utf8'));
}
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
await q(`insert into auth.users values ($1,'a@x'),($2,'b@x')`, [A, B]);
const as = async (uid, fn) => { await db.exec(`set role authenticated; set test.uid = '${uid}'`); try { return await fn(); } finally { await db.exec(`reset role; set test.uid = ''`); } };
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

ok((await q(`select count(*)::int n from categories where user_id=$1`, [A])).rows[0].n === 14, 'default categories seeded');
const bCat = (await q(`select id from categories where user_id=$1 limit 1`, [B])).rows[0].id;
const aFood = (await q(`select id from categories where user_id=$1 and name='Food & Dining'`, [A])).rows[0].id;

await as(A, async () => {
  ok((await q(`select count(*)::int n from categories`)).rows[0].n === 14, 'RLS: A sees only own categories');
  let err = null; try { await q(`insert into transactions (amount, category_id) values (10, $1)`, [bCat]); } catch (e) { err = e.message; }
  ok(err && /foreign key/.test(err), 'cannot reference another user\'s category');
  err = null; try { await q(`insert into transactions (user_id, amount) values ($1, 10)`, [B]); } catch (e) { err = e.message; }
  ok(err && /row-level security/.test(err), 'cannot insert rows for another user');
  err = null; try { await q(`insert into transactions (amount, status) values (null, 'confirmed')`); } catch (e) { err = e.message; }
  ok(err && /check/.test(err), 'confirmed requires amount');
  await q(`insert into transactions (amount, status, source) values (null, 'processing', 'qr')`);
  await q(`insert into transactions (amount, merchant, category_id, date, bank_ref) values (120.50, 'Cafe Amazon', $1, '2026-09-10', 'REF1')`, [aFood]);
  await q(`insert into transactions (amount, merchant, date) values (99.25, 'Mystery', '2026-09-11')`);
  await q(`insert into transactions (type, amount, date) values ('income', 50000, '2026-09-01')`);
  err = null; try { await q(`insert into transactions (amount, bank_ref) values (5, 'REF1')`); } catch (e) { err = e.message; }
  ok(err && /duplicate key/.test(err), 'duplicate bank_ref rejected');
  const s = (await q(`select month_summary('2026-09-15') s`)).rows[0].s;
  console.log('  summary', JSON.stringify(s));
  ok(Number(s.expense) === 219.75 && Number(s.income) === 50000 && s.categories[0].name === 'Food & Dining', 'month_summary totals & ordering (excludes processing)');
  ok((await q(`select suggest_category(' cafe amazon ') c`)).rows[0].c === aFood, 'suggest_category by merchant history');
  let e2 = null; try { await q(`select run_due_recurring()`); } catch (e) { e2 = e.message; }
  ok(e2 && /permission denied/.test(e2), 'authenticated cannot run cron function');
  await q(`insert into recurring_rules (amount, merchant, anchor_day, next_run_date) values (15000, 'Rent', 31, '2026-08-31')`);
});
await as(B, async () => {
  ok((await q(`select count(*)::int n from transactions`)).rows[0].n === 0, 'RLS: B sees none of A\'s transactions');
  ok((await q(`select month_summary('2026-09-15') s`)).rows[0].s.count === 0, 'month_summary scoped to caller');
});
const nx = async (d, f, a) => (await q(`select next_occurrence($1::date, $2, $3)::text d`, [d, f, a])).rows[0].d;
ok(await nx('2026-01-31', 'monthly', 31) === '2026-02-28', 'monthly anchor 31 -> Feb 28');
ok(await nx('2026-02-28', 'monthly', 31) === '2026-03-31', 'returns to 31st after Feb');
ok(await nx('2028-02-29', 'yearly', 29) === '2029-02-28', 'yearly leap day');
ok(await nx('2026-09-28', 'weekly', 28) === '2026-10-05', 'weekly');
const created = (await q(`select run_due_recurring('2026-10-01') n`)).rows[0].n;
ok(created === 2, `cron catches up missed runs (created ${created})`);
const dates = (await q(`select date::text d from transactions where source='recurring' order by date`)).rows.map(r => r.d);
ok(dates.join() === '2026-08-31,2026-09-30', 'recurring dates ' + dates.join());
ok((await q(`select next_run_date::text d from recurring_rules`)).rows[0].d === '2026-10-31', 'next_run_date advanced');
ok((await q(`select run_due_recurring('2026-10-01') n`)).rows[0].n === 0, 'cron idempotent same day');
await as(A, async () => {
  const up = (await q(`select due_date::text d from upcoming_recurring(400)`)).rows.map(r => r.d);
  console.log('  upcoming', up.slice(0, 4).join(', '), '...', up.length);
  ok(up.length > 0, 'upcoming_recurring returns rows');
});
