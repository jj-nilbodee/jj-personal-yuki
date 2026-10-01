# Yuki

A quiet, detail-oriented personal finance app for life in Thailand, named after a Scottish longhair cat. Phase 1 is the expense tracker: manual entry, Thai bank-slip reading (QR first, Gemini Flash as fallback), categories, accounts, recurring transactions and a monthly dashboard. It installs to the phone home screen as a PWA.

Product requirements live in [`docs/prd/`](docs/prd/).

**Stack:** Next.js (App Router) on Vercel · Supabase (Postgres + RLS, Auth, Storage) · Gemini Flash · Tailwind CSS.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. Apply the schema: open **SQL Editor**, paste `supabase/migrations/*.sql` in filename order and run. (With the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.)
3. **Authentication → Sign In / Providers → Google:** enable it and paste a Google OAuth client ID and secret. Create the client in Google Cloud Console (**APIs & Services → Credentials → OAuth client ID → Web application**) with the authorized redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
4. **Authentication → URL Configuration:** set **Site URL** to your production URL and add `http://localhost:3000/auth/callback` and `https://<your-vercel-domain>/auth/callback` to **Redirect URLs**.

### 2. Gemini

Create a free API key in [Google AI Studio](https://aistudio.google.com/apikey). Without one, slips still upload and the QR reference is still read, but amounts must be entered manually.

### 3. Environment

```bash
cp .env.example .env.local   # then fill in the values
npm ci
npm run dev                  # http://localhost:3000
```

### 4. Deploy (Vercel)

Import the GitHub repo in Vercel and add the same variables from `.env.example` under **Settings → Environment Variables**. Every push to `main` deploys. `vercel.json` schedules the recurring-transactions job daily at 00:00 Bangkok time; Vercel sends `CRON_SECRET` with it automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (includes type-check) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Runs the migrations in in-memory Postgres and checks RLS and the SQL functions |
| `npm run icons` | Re-exports app icons from `public/brand/yuki-loaf.png` |
