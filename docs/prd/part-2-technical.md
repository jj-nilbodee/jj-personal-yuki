# Personal Finance Assistant — PRD

### Part 2: Technical Requirements

_Status: Locked for MVP (Phase 1). Builds on Part 1: Business & Product Requirements._

---

## 1. Platform

**Decision: staged — PWA now, native iOS migration as a deferred, triggered decision.**

- **Now:** build as a PWA. Installable via "Add to Home Screen," one codebase for phone and desktop, camera access via standard browser file/camera input. Fastest path to a working MVP at weekend-project pace, $0 additional cost.
- **Migration trigger:** revisit native iOS once Phase 1 has been used daily for a few weeks (the MVP success metric from Part 1) and there's real signal on which of Phases 2–4 are actually wanted — decide once the app's shape is known, not before.
- **Why deferring is low-risk here specifically:** Supabase (Section 2) has an official Swift SDK alongside its JS one, so a later migration rebuilds the UI layer only — the data model, RLS policies, recurring-transaction cron, and OCR pipeline all carry over untouched, provided Section 1a's discipline is followed.
- **What a native migration would trade in:** reliable APNs push (currently a real gap — iOS Safari PWA push only works once installed to home screen, and offline actions have no Background Sync API to rely on), Face ID/biometric lock, a smoother native camera capture flow. Traded against: Apple Developer Program cost ($99/year), Xcode/Mac requirement, and TestFlight/App Store review friction on every release.

### 1a. Architectural discipline required to keep the migration cheap

Business logic must live on the backend (Supabase Postgres functions, RLS policies, thin API routes) — **not** in Next.js/React component code. Anything that decides _when_ something happens (e.g. when Yuki's "protective" nudges trigger, how a spending pattern is classified as unusual) has to live where a future native app can call it too, not be baked into frontend logic that would need re-writing in Swift.

## 2. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend + API | Next.js (React) | One framework for UI and backend routes; deploys cleanly to Vercel |
| Database | Supabase (Postgres) | Real relational structure for joins across accounts/transactions/tax/loan data later |
| Auth | Supabase Auth | Built-in social login support (see Section 5) |
| File storage | Supabase Storage | Stores slip/receipt photos alongside the DB that references them |
| Hosting (app) | Vercel | Free/hobby tier covers personal-scale usage; native Cron support (see Section 6) |
| Hosting (data) | Supabase | Free/hobby tier covers personal-scale usage |

All choices run at **$0/month at current usage scale.**

## 3. Slip/Receipt Data Extraction Pipeline

**Two-stage approach, in priority order:**

1. **QR mini-code decode (primary path)** — Most Thai bank transfer slips carry a "Slip Verify Mini-QR": an EMVCo-formatted payload (sending bank code, transaction reference, date, checksum) that can be decoded entirely offline using open-source parsers, no API call required. This is exact, free, and more reliable than OCR for the fields it covers.
2. **Gemini Flash vision API (fallback path)** — Used only when there's no scannable QR (cropped/blurry photo, or a retail receipt with no such code) or when the QR doesn't cover a needed field (e.g. merchant name). Runs on Gemini's free tier (~1,500 requests/day, no expiry, no credit card) — comfortably covers expected volume (~90 slips/month) at **$0/month**.

**Error handling:** If both QR decode and vision extraction fail or return low-confidence data, the transaction falls back to **manual entry**, with a **retry button** so the user can choose to re-attempt automated extraction or just enter the data themselves. No silent failures or forced retries.

**UX pattern:** Optimistic UI — the photo appears immediately in the transaction list as a "processing" card; fields populate in place once extraction (QR or vision) completes, still fully editable before saving.

**Data model addition:** `transactions.source` records which path produced the row (`qr` / `ocr` / `manual`), and `bank_ref` / `sending_bank_code` capture QR-derived fields when available.

## 4. Data Model (Phase 1 core, extensible)

```
users            — id, email, created_at
accounts         — id, user_id, name, type (cash/bank/card)
categories       — id, user_id, name, is_default
transactions     — id, user_id, account_id, category_id, amount, type (income/expense),
                    date, note, slip_photo_url, source (manual/qr/ocr),
                    bank_ref, sending_bank_code, created_at
recurring_rules  — id, user_id, transaction_template, frequency, next_run_date
```

- Every table keys off `user_id` — enforced via Postgres **row-level security (RLS)** policies, not application-layer checks, so per-user isolation (per the Business PRD) is structural rather than something that can be accidentally bypassed.
- Phase 2–4 tables (tax profiles, loans, investment holdings) will reference `user_id` and, where relevant, `account_id` — no changes needed to this core schema.

## 5. Authentication

**Decision: Supabase Auth with social login (Google, etc.)**

- Supabase Auth supports 19+ OAuth providers including Google, GitHub, and Apple.
- Testers sign in with an existing account (e.g. Google) — no new password to create or remember, and no credentials touch the app's own database directly.
- Setup: enable the provider in the Supabase dashboard, add OAuth client credentials from the provider's developer console, done.
- Google-only is sufficient to start; email/magic-link fallback can be added later with a small config change, not an architecture change.

## 6. Recurring Transactions

**Decision: hybrid — scheduled auto-creation + on-the-fly preview**

- **On the due date:** a daily Vercel Cron job checks `recurring_rules` and automatically creates the real transaction — it just appears in the ledger, matching how the actual charge happens.
- **Before the due date:** the dashboard computes and displays an "upcoming" preview on-the-fly (not persisted) — visible for planning, without cluttering transaction history with not-yet-real entries.
- No separate job queue or worker infrastructure — Vercel Cron hitting a Next.js API route is sufficient at this scale.

## 7. Deployment

**Decision: fully automated on push**

- Git push → Vercel auto-builds and deploys. No manual deploy steps for a solo weekend-project pace.
- Supabase schema changes tracked via migration files in the repo, applied as part of the same flow.

## 8. Cost Summary

| Component | Monthly cost |
| --- | --- |
| Vercel hosting | $0 (hobby tier) |
| Supabase (DB + Auth + Storage) | $0 (free tier) |
| Gemini Flash (OCR fallback) | $0 (free tier, ~1,500 req/day quota) |
| QR decode | $0 (offline, open-source libraries) |
| **Total** | **$0/month at current scale** |

Cost will only become relevant if usage scales well beyond personal/small-group volume — worth revisiting if that happens, not before.

## 9. Carried Forward / Not Yet Decided

- **Native iOS migration** — deferred until Phase 1 has real usage signal (see Section 1). Decision point: revisit after a few weeks of daily use.
- Direct bank API integration or statement import for loan/expense sync (Phase 3+, contingent on per-bank feasibility)
- Tax/loan rules engine implementation details (Phase 2–3, to be scoped when reached)
- Household/shared expense splitting data model (deferred per Business PRD)
