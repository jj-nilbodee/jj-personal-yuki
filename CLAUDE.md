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

## Architecture

**Stack:** Next.js 16 App Router (`src/proxy.ts` is the v16 name for middleware) · Supabase Postgres/Auth/Storage via `@supabase/ssr` · Gemini Flash via `@google/genai` · Tailwind v4 · Vercel (hosting + cron).

**Business logic lives in Postgres, not React** (PRD Part 2 §1a, to keep a future native iOS client cheap). `supabase/migrations/` holds the schema, RLS policies and SQL functions the app calls via `supabase.rpc`: `month_summary`, `upcoming_recurring`, `suggest_category`, `protective_nudges`, `run_due_recurring` (service role only), `next_occurrence`. New rules or thresholds go there, with a check in `supabase/tests/schema.test.mjs`. `src/lib/types.ts` hand-mirrors the row shapes; update it with any migration.

**Per-user isolation is structural:** every table has `user_id default auth.uid()` + an RLS policy, and child rows reference accounts/categories through `(id, user_id)` composite FKs. App code never filters by user_id; always use the RLS-scoped client from `requireUser()` (`src/lib/supabase/server.ts`). `createServiceClient()` bypasses RLS and is only for the cron route.

**Transaction lifecycle:** `status` is `processing → needs_review → confirmed`. Only `confirmed` rows count toward totals. Saving any form sets `confirmed`.

**Slip pipeline** (PRD Part 2 §3):
1. Client (`src/lib/slip/prepare.ts`): downscale to ≤1600px WebP (JPEG on Safari) and decode the Slip Verify mini-QR with jsQR, offline.
2. `POST /api/slips`: validates the QR (`src/lib/slip/qr.ts`, TLV + CRC16), rejects duplicates by `bank_ref` (409), inserts a `processing` row, uploads to the private `slips` bucket at `{user_id}/{year}/{tx_id}.webp`.
3. `POST /api/slips/[id]/extract`: Gemini reads amount/date/merchant (`src/lib/slip/extract.ts`), category comes from merchant history (`suggest_category`) before the model's guess, and the row moves to `needs_review`. It never overwrites a row the user already confirmed, and the client editor never overwrites fields the user has touched. Retry calls the same endpoint.

Mutations from forms are server actions in `src/app/actions.ts`; API routes exist where a future native client would need to call them too (slips, cron).

**Recurring:** Vercel Cron (`vercel.json`, 17:00 UTC = 00:00 Bangkok) calls `/api/cron/recurring`, which runs `run_due_recurring()` to create real rows and catch up on missed days. The dashboard's "upcoming" rows come from `upcoming_recurring()` and are never persisted.

## Design rules (PRD Part 3)

- Colours only via the tokens in `src/app/globals.css` (`bg`, `surface`, `ink`, `accent`, `income`, `expense`…). Dark mode flips the tokens (system preference, or `data-theme` set by Settings); don't add `dark:` variants.
- Headings/labels use Nunito (`font-display`); numbers use the `num` utility (Inter, tabular figures). Amounts are shown exactly via `formatMoney`, never rounded or abbreviated.
- Income/expense is never colour-only; pair with the in/out arrow icons. Tap targets ≥44px. Expense is muted rose, never alarm red.
- Voice: plain and direction-giving, no apologies, no shaming. Cat-flavoured copy and Yuki artwork (`src/components/yuki.tsx`) appear only at the fixed touchpoints listed in PRD Part 3 §7 (onboarding/login, slip processing paw, empty states, protective nudges, Settings > About). Don't add new ones as decoration.
