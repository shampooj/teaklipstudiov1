# TEAK Virtual Lip Studio

Virtual lipstick try-on for TEAK: customers take a skin-tone quiz, upload a selfie, preview shades with Banuba WebAR, and get a Shopify discount code. An admin dashboard (invite-only) manages shade tuning and reviews AI categorization.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React + TypeScript, shadcn/ui, Tailwind |
| Backend | Supabase (Postgres + RLS, Auth, Edge Functions) |
| AR try-on | Banuba WebAR |
| AI vision | Gemini (`gemini-flash-latest`) via edge functions |
| Commerce | Shopify Admin API (discounts, OAuth, webhooks) |
| Hosting | Vercel |
| Analytics | PostHog |

## Environments

| | Frontend | Backend (Supabase ref) |
|---|---|---|
| Production | teaklipstudiov1.vercel.app | `ouoyczbtpbhtwbygpigx` |
| Staging | every PR preview URL | `haeacwygxyrtpandtwpb` |

The committed `.env` points at **staging** — local dev and PR previews are safe by default. Production values are set in Vercel's dashboard env vars (Production scope), which override the file.

## Pipeline

- Frontend edits happen in Lovable or any IDE; everything lands in this repo.
- Every PR: CI (tests + build) runs, Vercel deploys a preview against staging, and changes under `supabase/` deploy to the **staging** backend.
- Merge to `main`: Vercel deploys production, and changes under `supabase/` deploy to the **production** backend (`.github/workflows/deploy-backend.yml`).

## Local development

Requires Node 18+ (repo was built against Node 22).

```sh
npm install
npm run dev        # http://localhost:8080, talks to staging
npm test
npm run build
```

## Backend

Schema lives in `supabase/migrations/`, functions in `supabase/functions/`. Never edit the database by hand — add a migration and let the pipeline apply it. Function secrets (Shopify, Banuba, Gemini) are set per-project in the Supabase dashboard under Edge Functions → Secrets.

Admin sign-in is Google OAuth restricted to allowlisted test users, with public signups disabled in Supabase.
