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

const defaultCount = (await q(`select count(*)::int n from default_categories()`)).rows[0].n;
ok((await q(`select count(*)::int n from categories where user_id=$1`, [A])).rows[0].n === defaultCount, 'default categories seeded');
const bCat = (await q(`select id from categories where user_id=$1 limit 1`, [B])).rows[0].id;
const aFood = (await q(`select id from categories where user_id=$1 and name='Food & Dining'`, [A])).rows[0].id;
const aSalary = (await q(`select id from categories where user_id=$1 and name='Salary'`, [A])).rows[0].id;
ok((await q(`select count(*)::int n from accounts`)).rows[0].n === 0, 'new users start without an account and name their first one');

// Onboarding: name → account → salary → bills → budget, one step at a time.
const step = async () => (await q(`select onboarding_step s from profiles`)).rows[0]?.s ?? null;
await as(A, async () => {
  ok((await q(`select count(*)::int n from profiles`)).rows[0].n === 1 && (await step()) === 'name', 'new users start onboarding at the name step');
  await q(`update profiles set display_name = 'Jay'`);
  await q(`select finish_onboarding_step('name')`);
  await q(`select finish_onboarding_step('name')`);
  ok((await step()) === 'account', 'finishing a step twice only advances once');
  await q(`select finish_onboarding_step('account')`);
  ok((await step()) === 'account', 'the account step needs an account');
});
const aCash = await as(A, async () => (await q(`insert into accounts (name, type) values ('Cash', 'cash') returning id, is_default`)).rows[0]);
ok(aCash.is_default, 'first account becomes the default');
const cashId = aCash.id;
await as(A, async () => {
  await q(`select finish_onboarding_step('account')`);
  ok((await step()) === 'salary', 'the account step finishes once an account exists');
  await q(`select finish_onboarding_step('budget')`);
  ok((await step()) === 'salary', 'a later step cannot be finished early');
  for (const s of ['salary', 'bills', 'budget']) await q(`select finish_onboarding_step($1)`, [s]);
  ok((await step()) === null, 'finishing the budget step ends onboarding');
});
await as(B, async () => {
  ok((await q(`select display_name from profiles`)).rows.every((r) => r.display_name === null), 'RLS: B sees only own profile');
});

await as(A, async () => {
  ok((await q(`select count(*)::int n from categories`)).rows[0].n === defaultCount, 'RLS: A sees only own categories');
  let err = null; try { await q(`insert into transactions (amount, account_id, category_id) values (10, $1, $2)`, [cashId, bCat]); } catch (e) { err = e.message; }
  ok(err && /foreign key/.test(err), 'cannot reference another user\'s category');
  err = null; try { await q(`insert into transactions (user_id, amount) values ($1, 10)`, [B]); } catch (e) { err = e.message; }
  ok(err && /row-level security/.test(err), 'cannot insert rows for another user');
  err = null; try { await q(`insert into transactions (amount, status) values (null, 'confirmed')`); } catch (e) { err = e.message; }
  ok(err && /check/.test(err), 'confirmed requires amount');
  await q(`insert into transactions (amount, status, source) values (null, 'processing', 'qr')`);
  await q(`insert into transactions (amount, merchant, category_id, account_id, date, bank_ref) values (120.50, 'Cafe Amazon', $1, $2, '2026-09-10', 'REF1')`, [aFood, cashId]);
  await q(`insert into transactions (amount, merchant, account_id, date) values (99.25, 'Mystery', $1, '2026-09-11')`, [cashId]);
  await q(`insert into transactions (type, amount, category_id, account_id, date) values ('income', 50000, $1, $2, '2026-09-01')`, [aSalary, cashId]);
  err = null; try { await q(`insert into transactions (amount, account_id, bank_ref) values (5, $1, 'REF1')`, [cashId]); } catch (e) { err = e.message; }
  ok(err && /duplicate key/.test(err), 'duplicate bank_ref rejected');
  const s = (await q(`select month_summary('2026-09-15') s`)).rows[0].s;
  console.log('  summary', JSON.stringify(s));
  ok(Number(s.expense) === 219.75 && Number(s.income) === 50000 && s.categories[0].name === 'Food & Dining', 'month_summary totals & ordering (excludes processing)');
  ok(s.categories.every((c) => c.name !== 'Salary') && s.income_categories.length === 1 && s.income_categories[0].name === 'Salary' && Number(s.income_categories[0].total) === 50000, 'month_summary splits income categories from spending');
  ok((await q(`select suggest_category(' cafe amazon ') c`)).rows[0].c === aFood, 'suggest_category by merchant history');
  let e2 = null; try { await q(`select run_due_recurring()`); } catch (e) { e2 = e.message; }
  ok(e2 && /permission denied/.test(e2), 'authenticated cannot run cron function');
  await q(`insert into recurring_rules (amount, merchant, account_id, anchor_day, next_run_date) values (15000, 'Rent', $1, 31, '2026-08-31')`, [cashId]);
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

// upcoming_recurring() looks ahead from the real Bangkok date, so the transfer rule is due a few days from now.
const due = (await q(`select ((now() at time zone 'Asia/Bangkok')::date + 3)::text d`)).rows[0].d;

// Transfers, balances and type-less slip drafts.
await as(A, async () => {
  const cash = (await q(`select id from accounts where name='Cash'`)).rows[0].id;
  const bank = (await q(`insert into accounts (name, type, bank_code) values ('KBank', 'bank', '004') returning id`)).rows[0].id;
  const card = (await q(`insert into accounts (name, type) values ('Visa', 'card') returning id`)).rows[0].id;
  await q(`select set_account_balance($1, 10000)`, [bank]);
  await q(`select set_account_balance($1, -500)`, [card]);
  await q(`insert into transactions (amount, account_id, date) values (200, $1, '2026-09-12')`, [card]);
  await q(`insert into transactions (type, amount, account_id, date) values ('income', 3000, $1, '2026-09-13')`, [bank]);
  await q(`insert into transactions (type, amount, account_id, to_account_id, date) values ('transfer', 700, $1, $2, '2026-09-14')`, [bank, card]);
  await q(`insert into transactions (type, amount, account_id, to_account_id, date) values ('transfer', 300, $1, $2, '2026-09-14')`, [bank, cash]);
  const bal = Object.fromEntries((await q(`select name, balance from account_balances()`)).rows.map((r) => [r.name, Number(r.balance)]));
  console.log('  balances', JSON.stringify(bal));
  // Cash also carries the earlier entries: 50,000 salary − 219.75 spending − 2 × 15,000 rent, plus the 300 transfer in.
  ok(bal.KBank === 12000 && bal.Visa === 0 && bal.Cash === 20080.25, 'account_balances: income, expense and transfers in/out');
  await q(`select set_account_balance($1, 11500.25)`, [bank]);
  ok(Number((await q(`select balance from account_balances() where id=$1`, [bank])).rows[0].balance) === 11500.25, 'set_account_balance sets the current balance');

  const s = (await q(`select month_summary('2026-09-15') s`)).rows[0].s;
  // 219.75 earlier + 200 card spend + 15,000 rent from the cron run above; transfers add nothing.
  ok(Number(s.expense) === 15419.75 && Number(s.income) === 53000, 'month_summary ignores transfers');
  ok(s.income_categories.map((c) => `${c.name}:${Number(c.total)}`).join() === 'Salary:50000,Uncategorized:3000', 'income categories ordered by total, uncategorized income included');
  ok(s.budget === null && s.budget_left === null, 'month_summary: no budget until one is set');
  await q(`update profiles set monthly_budget = 20000`);
  const sb = (await q(`select month_summary('2026-09-15') s`)).rows[0].s;
  ok(Number(sb.budget) === 20000 && Number(sb.budget_left) === 4580.25, 'month_summary: budget left after spending');
  await q(`update profiles set monthly_budget = 15000`);
  ok(Number((await q(`select month_summary('2026-09-15') s`)).rows[0].s.budget_left) === -419.75, 'month_summary: over budget is negative');

  const fails = async (sql, params) => { try { await q(sql, params); return false; } catch { return true; } };
  ok(await fails(`insert into transactions (type, amount, account_id) values ('transfer', 5, $1)`, [bank]), 'confirmed transfer needs both accounts');
  ok(await fails(`insert into transactions (type, amount, account_id, to_account_id) values ('transfer', 5, $1, $1)`, [bank]), 'transfer needs two different accounts');
  ok(await fails(`insert into transactions (type, amount, account_id, to_account_id, category_id) values ('transfer', 5, $1, $2, $3)`, [bank, card, aFood]), 'transfer has no category');
  ok(await fails(`insert into transactions (amount, account_id, to_account_id) values (5, $1, $2)`, [cash, bank]), 'only transfers have a destination account');
  ok(await fails(`insert into categories (name, type) values ('Moves', 'transfer')`), 'no transfer categories');
  ok(await fails(`insert into transactions (type, amount) values (null, 5)`), 'confirmed entry needs a type');
  await q(`insert into transactions (type, amount, status, source) values (null, 42, 'needs_review', 'ocr')`);
  ok(true, 'slip draft may wait without a type');
  ok(await fails(`insert into transactions (amount) values (5)`), 'confirmed expense needs an account');
  ok(await fails(`insert into transactions (type, amount) values ('income', 5)`), 'confirmed income needs an account');
  ok(await fails(`insert into recurring_rules (amount, anchor_day, next_run_date) values (5, 5, '2026-10-05')`), 'recurring rule needs an account');
  ok(await fails(`delete from accounts where id=$1`, [cash]), 'an account with entries cannot be deleted');

  const defaults = async () => (await q(`select name from account_balances() where is_default`)).rows.map((r) => r.name).join();
  ok((await defaults()) === 'Cash', 'later accounts do not take over the default');
  ok(await fails(`update accounts set archived = true where id=$1`, [cash]), 'the default account cannot be hidden');
  ok(await fails(`update accounts set is_default = true where id=$1`, [bank]), 'only one default account');
  await q(`update accounts set archived = true where id=$1`, [card]);
  ok(await fails(`select set_default_account($1)`, [card]), 'a hidden account cannot become the default');
  await q(`update accounts set archived = false where id=$1`, [card]);
  await q(`select set_default_account($1)`, [bank]);
  ok((await defaults()) === 'KBank', 'set_default_account moves the default');
  await q(`select set_default_account($1)`, [cash]);

  // Salary from onboarding, with "today" pinned to 20 Oct 2026.
  const startSalary = async (day, paid, nextMonth = false) => {
    const r = (await q(`select r.id, r.next_run_date::text as next from start_salary(30000, $1, $2, $3, $4, $5, '2026-10-20') r`, [day, bank, aSalary, paid, nextMonth])).rows[0];
    const logged = (await q(`select date::text d, ledger_month::text m, type::text, account_id, category_id from transactions where recurring_rule_id=$1 order by date`, [r.id])).rows;
    return { ...r, logged };
  };
  let sal = await startSalary(25, false);
  ok(sal.next === '2026-10-25' && sal.logged.length === 0, 'start_salary: payday still ahead this month');
  sal = await startSalary(25, true);
  ok(sal.next === '2026-10-25' && sal.logged.length === 0, 'start_salary: "already paid" ignored before payday');
  sal = await startSalary(5, false);
  ok(sal.next === '2026-11-05' && sal.logged.length === 0, 'start_salary: missed payday is not back-filled');
  sal = await startSalary(5, true);
  ok(sal.next === '2026-11-05' && sal.logged.length === 1 && sal.logged[0].d === '2026-10-05' && sal.logged[0].type === 'income'
    && sal.logged[0].account_id === bank && sal.logged[0].category_id === aSalary, 'start_salary: logs this month\'s pay when already paid');
  sal = await startSalary(20, true);
  ok(sal.next === '2026-11-20' && sal.logged[0]?.d === '2026-10-20', 'start_salary: paid today');
  sal = await startSalary(20, false);
  ok(sal.next === '2026-10-20' && sal.logged.length === 0, 'start_salary: payday today, not in yet');
  const monthEnd = (await q(`select next_run_date::text n from start_salary(30000, 31, $1, null, false, false, '2026-02-10')`, [bank])).rows[0].n;
  ok(monthEnd === '2026-02-28', 'start_salary: last day of a short month');

  // Salary for the following month (paid at month-end, lived on the month after).
  sal = await startSalary(31, true, true);
  ok(sal.next === '2026-10-31' && sal.logged.map((l) => `${l.d}→${l.m}`).join() === '2026-09-30→2026-10-01',
    'start_salary for next month: logs last month\'s pay, counted in this month');
  sal = await startSalary(5, true, true);
  ok(sal.next === '2026-11-05' && sal.logged.map((l) => `${l.d}→${l.m}`).join() === '2026-09-05→2026-10-01,2026-10-05→2026-11-01',
    'start_salary for next month: payday already passed logs both paydays, each counted in the month after');
  sal = await startSalary(31, false, true);
  ok(sal.next === '2026-10-31' && sal.logged.length === 0, 'start_salary for next month: nothing logged unless paid');

  // Adding a repeating entry, with "today" pinned to 16 Oct 2026: the date entered
  // decides whether it is a payment already made (logged now) or one still to come.
  const addRepeating = async (date, frequency = 'monthly', anchor = null, extra = {}) => {
    const entry = { type: 'expense', amount: 9000, account_id: bank, category_id: aFood, merchant: 'Rent', for_next_month: false, date, user_id: B, ...extra };
    const r = (await q(`select r.id, r.next_run_date::text as next, r.anchor_day, r.user_id from start_recurring($1, $2, $3, '2026-10-16') r`, [entry, frequency, anchor])).rows[0];
    const logged = (await q(`select date::text d, type::text, amount::int, account_id, merchant, status::text from transactions where recurring_rule_id=$1 order by date`, [r.id])).rows;
    return { ...r, logged };
  };
  let bill = await addRepeating('2026-10-01');
  ok(bill.next === '2026-11-01' && bill.logged.length === 1 && bill.logged[0].d === '2026-10-01' && bill.logged[0].type === 'expense'
    && bill.logged[0].amount === 9000 && bill.logged[0].account_id === bank && bill.logged[0].merchant === 'Rent' && bill.logged[0].status === 'confirmed',
    'start_recurring: a date already past is logged as paid and repeats from the next due date');
  ok(bill.user_id === A, 'start_recurring: the rule belongs to the caller, whatever p_entry says');
  bill = await addRepeating('2026-10-16');
  ok(bill.next === '2026-11-16' && bill.logged.map((l) => l.d).join() === '2026-10-16', 'start_recurring: dated today is logged as paid');
  bill = await addRepeating('2026-10-25');
  ok(bill.next === '2026-10-25' && bill.anchor_day === 25 && bill.logged.length === 0, 'start_recurring: a date still to come logs nothing and first runs on that date');
  bill = await addRepeating('2026-10-25', 'monthly', 31);
  ok(bill.next === '2026-10-31' && bill.logged.length === 0, 'start_recurring: month-end still to come first runs on the last day');
  bill = await addRepeating('2026-10-01', 'weekly');
  ok(bill.next === '2026-10-22' && bill.logged.map((l) => l.d).join() === '2026-10-01', 'start_recurring: weekly logs the entry entered, not the weeks since');
  bill = await addRepeating('2026-09-01');
  ok(bill.next === '2026-11-01' && bill.logged.map((l) => l.d).join() === '2026-09-01', 'start_recurring: due dates between an old payment and today are skipped, not back-filled');

  // Balances typed in during onboarding already include payments made before them.
  const balanceOf = async (id) => Number((await q(`select balance from account_balances() where id=$1`, [id])).rows[0].balance);
  let entered = await balanceOf(bank);
  await addRepeating('2026-10-01');
  ok((await balanceOf(bank)) === entered - 9000, 'start_recurring: after onboarding, a payment logged now moves the balance');
  await q(`update profiles set onboarding_step = 'bills'`);
  entered = await balanceOf(bank);
  sal = await startSalary(5, true, true);
  ok(sal.logged.length === 2 && (await balanceOf(bank)) === entered, 'start_salary: already-paid pay leaves the account balance as entered');
  entered = await balanceOf(bank);
  bill = await addRepeating('2026-10-01');
  ok(bill.logged.length === 1 && (await balanceOf(bank)) === entered, 'start_recurring: during onboarding, a past payment leaves the balance as entered');
  const [bankBefore, cashBefore] = [await balanceOf(bank), await balanceOf(cash)];
  bill = await addRepeating('2026-10-01', 'monthly', null, { type: 'transfer', to_account_id: cash, category_id: null });
  ok(bill.logged.length === 1 && (await balanceOf(bank)) === bankBefore && (await balanceOf(cash)) === cashBefore,
    'start_recurring: during onboarding, a past transfer leaves both balances as entered');
  await q(`select discard_onboarding_bill($1)`, [bill.id]);
  ok((await q(`select ((select count(*) from recurring_rules where id=$1) + (select count(*) from transactions where recurring_rule_id=$1))::int n`, [bill.id])).rows[0].n === 0
    && (await balanceOf(bank)) === bankBefore && (await balanceOf(cash)) === cashBefore,
    'discard_onboarding_bill removes the bill and what it logged, leaving balances as entered');
  await q(`update profiles set onboarding_step = null`);
  ok(await fails(`select discard_onboarding_bill($1)`, [sal.id]), 'discard_onboarding_bill only works during onboarding');
  await q(`delete from transactions where merchant = 'Rent'`);
  await q(`delete from recurring_rules where merchant = 'Rent'`);
  ok(await fails(`insert into transactions (type, amount, account_id, for_next_month) values ('expense', 5, $1, true)`, [bank]), 'only income can count toward next month');

  // Monthly totals follow ledger_month: 31 Oct pay for November counts in November, not October.
  await q(`insert into transactions (type, amount, account_id, for_next_month, date) values ('income', 777, $1, true, '2027-03-31')`, [bank]);
  const inc = async (m) => Number((await q(`select month_summary($1::date) s`, [m])).rows[0].s.income);
  ok((await inc('2027-03-15')) === 0 && (await inc('2027-04-15')) === 777, 'month_summary counts next-month income in the following month');
  await q(`delete from transactions where amount = 777`);
  const nmTx = (await q(`insert into transactions (type, amount, account_id, for_next_month, date) values ('income', 888, $1, true, '2026-09-30') returning id`, [bank])).rows[0].id;
  const nmRule = (await q(`select r.for_next_month from make_recurring($1, 'monthly', 31, '2026-10-01') r`, [nmTx])).rows[0];
  ok(nmRule.for_next_month === true, 'make_recurring keeps "counts toward next month"');
  ok(await fails(`select start_salary(30000, 0, $1)`, [bank]), 'start_salary: payday must be a day of the month');
  // Keep the cron run below about the transfer rule only.
  await q(`delete from transactions where recurring_rule_id in (select id from recurring_rules where type = 'income')`);
  await q(`delete from recurring_rules where type = 'income'`);

  const uncategorized = async () => (await q(`select count::int n from protective_nudges() where kind = 'uncategorized'`)).rows[0]?.n ?? 0;
  const before = await uncategorized();
  for (let i = 0; i < 5; i++) await q(`insert into transactions (type, amount, account_id, to_account_id) values ('transfer', 1, $1, $2)`, [bank, cash]);
  ok((await uncategorized()) === before, 'transfers are not counted as uncategorized');

  await q(`insert into recurring_rules (type, amount, account_id, to_account_id, anchor_day, next_run_date) values ('transfer', 2000, $1, $2, extract(day from $3::date)::int, $3::date)`, [bank, cash, due]);
  ok(await fails(`insert into recurring_rules (type, amount, account_id, anchor_day, next_run_date) values ('transfer', 1, $1, 5, '2026-10-05')`, [bank]), 'recurring transfer needs both accounts');
  const up = (await q(`select type::text, to_account_id from upcoming_recurring(10) where type = 'transfer'`)).rows;
  ok(up.length === 1 && up[0].to_account_id === cash, 'upcoming_recurring includes transfers with destination');

  // An entry set to repeat becomes a rule; the entry is the first occurrence.
  const salary = (await q(`insert into transactions (type, amount, category_id, merchant, account_id, date) values ('income', 42000, $1, 'Acme', $2, '2026-09-15') returning id`, [aSalary, bank])).rows[0].id;
  const rule = (await q(`select r.*, r.next_run_date::text as next from make_recurring($1, 'monthly', 31, '2026-09-20') r`, [salary])).rows[0];
  ok(rule.type === 'income' && Number(rule.amount) === 42000 && rule.category_id === aSalary && rule.merchant === 'Acme' && rule.account_id === bank, 'make_recurring copies the entry');
  ok(rule.anchor_day === 31 && rule.next === '2026-09-30', 'make_recurring: month-end salary first runs at the end of the entry\'s month');
  ok((await q(`select recurring_rule_id from transactions where id=$1`, [salary])).rows[0].recurring_rule_id === rule.id, 'make_recurring links the entry to its rule');
  ok(await fails(`select make_recurring($1, 'monthly')`, [salary]), 'an entry can only be made recurring once');
  const old = (await q(`insert into transactions (amount, account_id, date) values (300, $1, '2026-01-10') returning id`, [cash])).rows[0].id;
  const oldRule = (await q(`select r.*, r.next_run_date::text as next from make_recurring($1, 'monthly', null, '2026-04-15') r`, [old])).rows[0];
  ok(oldRule.anchor_day === 10 && oldRule.next === '2026-05-10', 'make_recurring skips past occurrences instead of back-filling');
  const draft = (await q(`insert into transactions (type, amount, status, source) values ('expense', 7, 'needs_review', 'ocr') returning id`)).rows[0].id;
  ok(await fails(`select make_recurring($1, 'monthly')`, [draft]), 'a draft cannot be made recurring');
});
const salaryTx = (await q(`select id from transactions where merchant = 'Acme'`)).rows[0].id;
await as(B, async () => {
  let err = null; try { await q(`select make_recurring($1, 'monthly')`, [salaryTx]); } catch (e) { err = e.message; }
  ok(err && /not found/.test(err), 'make_recurring cannot reach another user\'s entry');
  err = null; try { await q(`select set_default_account($1)`, [cashId]); } catch (e) { err = e.message; }
  ok(err && /not found/.test(err), 'set_default_account cannot reach another user\'s account');
});
const ran = (await q(`select run_due_recurring($1::date) n`, [due])).rows[0].n;
const recurTransfer = (await q(`select to_account_id from transactions where source='recurring' and type='transfer'`)).rows;
ok(ran >= 1 && recurTransfer.length === 1 && recurTransfer[0].to_account_id, 'cron creates recurring transfers');
// A next-month salary rule due on 31 Dec creates an entry dated 31 Dec, counted in January.
await q(`insert into recurring_rules (user_id, type, amount, account_id, for_next_month, anchor_day, next_run_date) values ($1, 'income', 999, $2, true, 31, '2026-12-31')`, [A, cashId]);
await q(`update recurring_rules set active = false where user_id = $1 and amount <> 999`, [A]);
await q(`select run_due_recurring('2026-12-31')`);
const nmCron = (await q(`select date::text d, ledger_month::text m, for_next_month from transactions where amount = 999`)).rows;
ok(nmCron.length === 1 && nmCron[0].for_next_month && nmCron[0].d === '2026-12-31' && nmCron[0].m === '2027-01-01', 'cron keeps "counts toward next month" on created entries');

// "Delete all my data": A starts over; B's data is untouched.
await as(B, async () => {
  const bAcc = (await q(`insert into accounts (name, type) values ('B wallet', 'e_wallet') returning id`)).rows[0].id;
  await q(`insert into transactions (amount, account_id) values (77, $1)`, [bAcc]);
});
const counts = async (uid) => (await q(`select
  (select count(*)::int from transactions where user_id=$1) tx, (select count(*)::int from recurring_rules where user_id=$1) rules,
  (select count(*)::int from accounts where user_id=$1) accounts, (select count(*)::int from categories where user_id=$1) categories,
  (select onboarding_step from profiles where user_id=$1) step, (select monthly_budget from profiles where user_id=$1) budget`, [uid])).rows[0];
const bBefore = await counts(B);
await as(A, async () => {
  let err = null; try { await q(`select seed_user_defaults($1)`, [A]); } catch (e) { err = e.message; }
  ok(err && /permission denied/.test(err), 'seed_user_defaults is not callable directly');
  await q(`select erase_my_data()`);
});
const aAfter = await counts(A);
ok(aAfter.tx === 0 && aAfter.rules === 0 && aAfter.accounts === 0, 'erase_my_data removes entries, rules and accounts');
ok(aAfter.categories === defaultCount && aAfter.step === 'name' && aAfter.budget === null, 'erase_my_data restores default categories and restarts onboarding');
ok(JSON.stringify(await counts(B)) === JSON.stringify(bBefore), 'erase_my_data leaves other users alone');
let eraseErr = null; try { await q(`select erase_my_data()`); } catch (e) { eraseErr = e.message; }
ok(eraseErr && /not signed in/.test(eraseErr), 'erase_my_data needs a signed-in caller');

await q(`delete from auth.users where id=$1`, [A]);
// A was just re-seeded by erase_my_data, so these rows exist until the user is deleted.
ok((await q(`select (select count(*)::int from categories where user_id=$1) + (select count(*)::int from profiles where user_id=$1) n`, [A])).rows[0].n === 0, 'deleting a user removes their rows');
