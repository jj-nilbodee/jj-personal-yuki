# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Yuki: a mobile-first PWA for personal finance in Thailand. The source of truth is `docs/prd/` (Part 1 business, Part 2 technical, Part 3 design/UX). Phase 1 (expense tracker) is what's built. Phases 2–4 (tax, loans, investments) are not started; the pre-PRD Vite/Firebase app that had them was removed, so git history before the `phase1-rebuild` branch is not a reference.

## Commands

```bash
npm run dev          # Next.js dev server (needs .env.local, see .env.example)
npm run build        # production build + type-check
npm run lint         # ESLint (eslint-config-next, incl. React Compiler rules)
npm test             # Vitest unit tests, src/**/*.test.ts
npx vitest run src/lib/slip/qr.test.ts   # single test file
npm run test:db      # applies supabase/migrations to in-memory Postgres (PGlite) and checks RLS + SQL functions
```

## Commits

Commit atomically, as a habit, without waiting to be asked:

- One logical change per commit (a feature, a fix, a refactor, a docs or config change). If the work mixes concerns, split it into separate commits; a migration goes in the same commit as the code that needs it.
- Commit as soon as a change is verified (build, lint, tests, and `npm run test:db` for migrations), so each commit stands on its own and unrelated work never piles up in the tree.
- Conventional Commits as in the history (`feat:`, `fix:`, `perf:`, `chore:`, `test(db):`, `docs:`): imperative subject, 50 characters where possible and never over 72, no trailing period. Add a body only when the why is not obvious from the subject, and always for breaking changes, security fixes, data migrations and reverts. The body says why, not what: the diff shows what. Wrap it at 72.
- Committing is not pushing: pushing `main` deploys to Vercel.

## Architecture

**Stack:** Next.js 16 App Router (`src/middleware.ts` stays on the deprecated middleware name on purpose: it runs on the Edge runtime, while v16's `proxy.ts` is a separate Node function whose cold start added ~0.6 s to every PWA launch) · Supabase Postgres/Auth/Storage via `@supabase/ssr` · Gemini Flash via `@google/genai` · Tailwind v4 · Vercel (hosting + cron). Functions are pinned to `sin1` in `vercel.json` to sit next to the Supabase project (`ap-southeast-1`); keep the two in the same region, since every page makes several sequential Supabase calls.

**Business logic lives in Postgres, not React** (PRD Part 2 §1a, to keep a future native iOS client cheap). `supabase/migrations/` holds the schema, RLS policies and SQL functions the app calls via `supabase.rpc`: `month_summary`, `upcoming_recurring`, `suggest_category`, `protective_nudges`, `set_default_account`, `finish_onboarding_step`, `start_salary`, `start_recurring`, `erase_my_data`, `run_due_recurring` (service role only), `next_occurrence`. New rules or thresholds go there, with a check in `supabase/tests/schema.test.mjs`. `src/lib/types.ts` hand-mirrors the row shapes; update it with any migration.

**Per-user isolation is structural:** every table has `user_id default auth.uid()` + an RLS policy, and child rows reference accounts/categories through `(id, user_id)` composite FKs. App code never filters by user_id; always use the RLS-scoped client from `requireUser()` (`src/lib/supabase/server.ts`). `createServiceClient()` bypasses RLS and is only for the cron route.

**Transaction lifecycle:** `status` is `processing → needs_review → confirmed`. Only `confirmed` rows count toward totals. Saving any form sets `confirmed`.

**Which month an entry counts in:** monthly totals (`month_summary`, the transaction list's `month` filter) use the generated `transactions.ledger_month`, not `date`. It equals the entry's month unless `for_next_month` is set, which only income can have: a salary paid on 31 Oct that the user lives on in November keeps its real date (balances and the list stay true to the bank) but counts in November. Recurring rules carry the flag to the entries the cron and `make_recurring()` create; `start_salary(p_for_next_month)` sets it for onboarding.

**Types and accounts:** `type` is `expense`, `income` or `transfer`. A transfer moves money between two of the user's own accounts (`account_id → to_account_id`), has no category and never counts toward income or spending. Every confirmed entry and every recurring rule has an `account_id` (only drafts may lack one). Each user has exactly one `is_default` account, which is never hidden: their first account becomes it (trigger), `set_default_account()` moves it, and forms preselect it. Account balances come from `account_balances()` (opening balance + confirmed movements; negative on a card = owed) and are set via `set_account_balance()`.

**Profile and onboarding:** `profiles` (one row per user, created at sign-up) holds `display_name` (what Yuki calls the user at his touchpoints), `monthly_budget` (`month_summary` returns `budget` and `budget_left`) and `onboarding_step`. While `onboarding_step` is set, `(app)/layout.tsx` sends the user to `/welcome`, which asks name → first account → salary → bills → budget. Forms post `onboarding_step` and the action calls `finish_onboarding_step()`, which only advances from the current step and won't pass `account` without an account; every step but the account can be skipped. The salary step calls `start_salary()`, which logs this month's pay if it already came in. Pay and bills logged as already paid leave account balances where the user set them at the account step, since that balance already includes them (`opening_balance` absorbs the entries). `getProfile()` (`src/lib/profile.ts`) is cached per request. Profile updates filter on `user_id` because that is the row's key (PostgREST rejects unfiltered updates), not for isolation.

**Erasing data:** Settings › Your data calls `eraseMyData()`, which deletes every object under the user's `slips/{user_id}/` folder first (so a Storage failure leaves the data intact), then `erase_my_data()` deletes their rows and re-runs `seed_user_defaults()` (the same profile + default categories sign-up gets), which restarts onboarding. The sign-in is kept. Any new per-user table must be added to `erase_my_data()`.

**Slip pipeline** (PRD Part 2 §3):
1. Client (`src/lib/slip/prepare.ts`): downscale to ≤1600px WebP (JPEG on Safari) and decode the Slip Verify mini-QR with jsQR, offline.
2. `POST /api/slips`: validates the QR (`src/lib/slip/qr.ts`, TLV + CRC16), rejects duplicates by `bank_ref` (409), inserts a `processing` row, uploads to the private `slips` bucket at `{user_id}/{year}/{tx_id}.webp`.
3. `POST /api/slips/[id]/extract`: Gemini reads amount/date/sender/recipient (`src/lib/slip/extract.ts`) and the row moves to `needs_review`. A slip row has no `type` until the user says whether it's an expense, income or transfer, so the route stores `extraction.suggested` per direction (payee or payer, category from `suggest_category` history before the model's guess, sending-bank account) and the editor applies the one the user picks. It never overwrites a row the user already confirmed, and the client editor never overwrites fields the user has touched. Retry calls the same endpoint.

Mutations from forms are server actions in `src/app/actions.ts`; API routes exist where a future native client would need to call them too (slips, cron).

**Recurring:** Vercel Cron (`vercel.json`, 17:00 UTC = 00:00 Bangkok) calls `/api/cron/recurring`, which runs `run_due_recurring()` to create real rows and catch up on missed days. The dashboard's "upcoming" rows come from `upcoming_recurring()` and are never persisted. Saving an entry with a Repeat schedule calls `make_recurring()`, which turns it into a rule linked through `recurring_rule_id` and starts at the next scheduled date after the entry (past dates are skipped, not back-filled). New rules are created by `start_recurring()`: onboarding's bills step lets the first due date fall earlier this month, and with "Already paid" it logs every due date through today before the rule takes over (never before this month). "Last day of the month" is a monthly rule with `anchor_day = 31` (`src/lib/recurring.ts`).

## Design rules (PRD Part 3)

- Colours only via the tokens in `src/app/globals.css` (`bg`, `surface`, `ink`, `accent`, `income`, `expense`…). Dark mode flips the tokens (system preference, or `data-theme` set by Settings); don't add `dark:` variants.
- Headings/labels use Nunito (`font-display`); numbers use the `num` utility (Inter, tabular figures). Amounts are shown exactly via `formatMoney`, never rounded or abbreviated.
- Income/expense is never colour-only; pair with the in/out arrow icons. Tap targets ≥44px. Expense is muted rose, never alarm red.
- Voice: plain and direction-giving, no apologies, no shaming. Cat-flavoured copy and Yuki artwork (`src/components/yuki.tsx`) appear only at the fixed touchpoints listed in PRD Part 3 §7 (onboarding/login, slip processing paw, empty states, protective nudges, Settings > About). Don't add new ones as decoration.
