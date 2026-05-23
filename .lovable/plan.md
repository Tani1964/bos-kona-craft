
## Goal

Add a Lovable Cloud backend and an admin CMS so you can manage the brand-controlled narrative (provenance, makers, atelier, documentary, module copy, hero) per passport. Buyer telemetry (wears, NFC, care logs, KFI) stays computed by the State Engine and is **not** admin-editable.

## What admin controls vs. what stays automatic

| Admin-editable (narrative) | Automatic (buyer/state engine) |
|---|---|
| Asset identity: model name, serial, lot, hero gradient/image | Wears, NFC scans, care entries, repairs, age |
| Provenance: 4 stages, makers, atelier, snapshot stats | KFI score + breakdown, lifecycle stage |
| Documentary: video file, chapters, credits, synopsis, meta | Care recommendation, lifespan estimate |
| Module feed: per-module subtitle/title overrides, thumbnail | Lock state (driven by UnlockRules) |
| Care recommendations catalogue (titles) | Which recommendation is shown right now |

## Data model

Tables (all RLS-protected; public SELECT for the passport tables, admin-only write):

- `assets` — id, serial, model_name, lot, hero_style (jsonb), created_at
- `asset_telemetry` — one-to-one with assets (wears, nfc_scans, care_entries, repairs, age_days). Editable by owner later; admin read-only.
- `provenance_stages` — asset_id, order, label, title, body, location, date, icon_key
- `makers` — asset_id, order, name, role, years
- `atelier` — asset_id, name, location, lat, lng
- `documentary` — asset_id, video_path (storage), poster_path, runtime, year, chapters (jsonb), credits (jsonb), synopsis
- `module_overrides` — asset_id, module_id, title_override, subtitle_override, thumbnail_override (jsonb)
- `user_roles` — user_id, role (enum: admin, user) — uses `has_role()` security-definer fn

Storage buckets: `documentary` (private, signed-URL playback) and `passport-media` (public, hero stills/posters).

## Routes

Public:
- `/` — redirects to the first/featured passport (or a picker)
- `/p/$serial` — the passport (was `/`). Reads from DB; falls back to defaults if a field is empty.
- `/p/$serial/provenance`, `/p/$serial/timeline`, `/p/$serial/documentary` — same, data-driven

Auth:
- `/login` — email + password

Admin (gated by `_authenticated` + admin role check):
- `/admin` — list of assets, "New asset" button
- `/admin/assets/$id` — tabbed editor: **Identity · Provenance · Makers · Atelier · Documentary · Modules**
- Each tab is a form with optimistic save via `createServerFn` + TanStack Query invalidation
- Documentary tab includes a video uploader (signed upload URL → storage → save path)

## Implementation order

1. Enable Lovable Cloud
2. Migrations: tables + RLS + `has_role` + storage buckets + seed Air Formula F1 from current constants
3. Auth: `/login`, `_authenticated` layout, admin role gate (`_admin` layout)
4. Server fns: `getPassport(serial)`, `listAssets()`, `getAsset(id)`, `upsert*` per section, `getSignedUploadUrl(bucket, path)`
5. Refactor public routes to `/p/$serial/*` and consume the passport DTO; keep `/` as a redirect to the seed asset
6. Build admin shell + tabs (Identity, Provenance with reorderable stages, Makers, Atelier, Documentary w/ uploader, Modules)
7. Wire documentary video playback to signed download URLs

## Out of scope for v1 (call out so you can plan follow-ups)

- Owner-facing flow to log care/NFC scans against real telemetry (still client-mock)
- Multi-tenant brand accounts, audit log, draft/publish workflow
- Image cropper / video transcoding (uploads accepted as-is; show file size guardrails)

## Notes

- `Module · 14` (State Engine) and `15` (Ecosystem) stay pure-functional and unchanged — they now consume DB telemetry instead of the hardcoded `TELEMETRY` constant.
- I'll seed one admin invite path: after you sign up, I'll show you the SQL snippet to grant yourself `admin` (or run it via the DB tool if you'd like).
- This is sizable — expect a few back-to-back turns. I'll ship in this order: Cloud + schema + auth → admin shell + Identity/Provenance tabs → Documentary uploader → Modules + Makers + Atelier → public refactor.

Confirm and I'll start with step 1 (enable Cloud + migrations + auth scaffolding).
