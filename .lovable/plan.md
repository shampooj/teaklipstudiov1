
## Goal

Move the hardcoded recommendation matrix (`src/data/lipstickRecommendations.ts`) into the database so you can edit which 5 products show for each of the 48 complexion types from the admin panel, without a code change.

## What stays in code vs. moves to DB

**Stays in code (product catalog — rarely changes):**
- `VARIANT_MAP` (variant name → Shopify variant ID)
- `PRODUCT_DETAILS` (label, description, swatch color)
- `CATEGORY_LABELS` ("My Lips But Better", "A Statement Red", etc.)
- `SKIN_TONE_MAP` / `LIP_TONE_MAP` / `COMPLEXION_TYPE_MAP`

**Moves to DB — the recommendation matrix:**
- One row per (skin tone × lip tone × category) = 48 × 5 = 240 rows
- Editable slot value = a variant name from the catalog

## Database

New table `public.recommendations`:

```
skin_tone       text   -- e.g. "medium-brown"
lip_tone        text   -- e.g. "two-toned-beige"
category        text   -- MLBB | RED | DAY | EVENING | LIPSET
variant_name    text   -- FK-by-convention to PRODUCT_DETAILS keys
updated_at      timestamptz
updated_by      uuid
PRIMARY KEY (skin_tone, lip_tone, category)
```

RLS:
- `SELECT` to `anon` + `authenticated` (frontend needs it to render results)
- `INSERT/UPDATE/DELETE` to `authenticated` only (admin edits)

Seed migration inserts all 240 rows from the current `RECOMMENDATIONS` object so behavior is unchanged on day one.

## Frontend changes

- `getRecommendations()` becomes async, fetches from `recommendations` table, joins with in-code `PRODUCT_DETAILS` + `VARIANT_MAP` + `CATEGORY_LABELS`.
- Small React Query hook `useRecommendations(skinTone, lipTone)` used on the results screen; keeps loading UX consistent.
- Remove the giant `RECOMMENDATIONS` literal from the code file.

## Admin editor

New tab in the admin dashboard: **Recommendations**.

Layout:
- Two dropdowns at the top: Skin Tone (4) + Lip Tone (12) → picks one of the 48 complexion types.
- Shows the 5 category slots (MLBB / RED / DAY / EVENING / LIPSET) as rows.
- Each row: a searchable select of variant names (from `PRODUCT_DETAILS`), showing swatch + label.
- "Save changes" upserts the 5 rows for that complexion type.
- Optional "Complexion Type #N" indicator so it's easy to cross-reference.

## Technical notes

- Table lives in `public`; migration includes GRANTs (`SELECT` to anon/authenticated, full to authenticated + service_role) before enabling RLS.
- Primary key `(skin_tone, lip_tone, category)` makes the admin save a clean upsert with `onConflict`.
- No changes to Shopify variant IDs or the results UI — only the source of the mapping changes.
- If a DB row references an unknown `variant_name` (e.g. renamed in code), that slot is silently skipped, same as today's fallback.

## Out of scope (for this pass)

- Editing product labels / descriptions / swatch colors from the admin (still in code).
- Editing complexion type numbers or category labels.
- Adding/removing skin tones or lip tones.

Happy to include any of those in a follow-up if you want.
