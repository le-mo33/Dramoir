# Dramoir — Architecture

Dramoir ("The Drama Shelf") is an Asian-drama discovery site: browse by trope, mood and genre, track titles
in personal lists, get automatic recommendations. Constraints: $0/month on free tiers, English only,
responsive website (no PWA — D45), and the owner edits all content in a Google Sheet with no code changes.

Decision references (Dnn, Pnn) point to [DECISIONS.md](DECISIONS.md). Workbook facts come from
[DATA_QUALITY_REPORT.md](DATA_QUALITY_REPORT.md).

---

## 1. System overview
```
Owner edits Google Sheet ── Apps Script stamps a permanent "Dramoir ID" on new rows (D5)
        │  Sheets API v4, read-only service account
        ▼
Supabase pg_cron (hourly, D12) ─┐
Admin "Sync now" button ────────┴─POST─▶ Vercel  /api/sync
        detect tabs → parse → normalise → validate → upsert Postgres → precompute recs
        → revalidateTag('content')
        └─ new/changed image links? ──workflow_dispatch──▶ GitHub Actions images.yml (D9)
                 pin.it → pin page → og:image → download → sharp → WebP variants → Supabase Storage
                 → images marked ok/failed → POST /api/revalidate
                 (same script runs on the owner's PC if Pinterest blocks GitHub)

Visitor ──▶ Vercel (Next.js App Router; static pages refreshed on demand)
        ├─ public content: supabase-js, anon key, RLS read-only
        ├─ member actions: Server Actions + user session, RLS owner-only writes
        └─ images: straight from Supabase Storage public URLs (pre-sized WebP)

GitHub Actions nightly backup.yml → pg_dump of user tables → age-encrypted artifact, 30 days (D13)
Sentry (errors, D37) · Cloudflare Web Analytics (cookie-free, D48) · Gmail SMTP (auth emails, D18)
```

## 2. Stack
| Concern | Choice | Decision |
|---|---|---|
| Framework | Next.js (latest stable, App Router, React Server Components), TypeScript | spec, P1 |
| Styling / UI | Tailwind CSS + shadcn/ui (Radix) restyled to brand | D47 |
| Fonts | `next/font/google`: Cormorant Garamond (wordmark), DM Sans (UI) | spec |
| Hosting | Vercel Hobby, non-commercial, portable | D2 |
| Database / Auth / Storage / scheduler | Supabase Free: Postgres, Auth, Storage, pg_cron + pg_net | D3, D12 |
| DB access | supabase-js + generated types; SQL migrations via Supabase CLI | D46 |
| Content source | Google Sheets API v4 (`spreadsheets.readonly`) via service account (`google-auth-library`) | spec |
| Image processing | Node script with sharp, run in GitHub Actions or on the owner's PC | D9 |
| Validation | zod | P1 |
| Testing | Vitest (unit), Playwright (E2E), RLS test suite | D36 |
| Monitoring / analytics | Sentry Developer plan; Cloudflare Web Analytics | D37, D48 |
| Auth email | Custom SMTP through a Gmail account (≈500/day) | D18, P4 |
| PWA | **None.** Favicon + home-screen icons only | D45, D52 |

**Portability rule (D2).** Don't use Vercel KV/Blob/Edge Config/Cron/Image Optimization. Schedules live in
Supabase, and images come from Storage through one `mediaUrl()` helper. Moving to Cloudflare (OpenNext) or
Netlify is then a config change.

## 3. Brand & UI tokens
| Token | Hex | Use |
|---|---|---|
| `offwhite` | `#f5f5f5` | light backgrounds |
| `aubergine` | `#230612` | header, dark nav, filter panel, primary text |
| `blush` | `#e8d9e0` | page background |
| `mauve` | `#7d5c65` | large text, accents, decoration |
| `mauve-text` | `#6f4f58` | small secondary text on blush (5.3:1, AA — D38) |

- **Text:** tag chips are lowercase and filter chips UPPERCASE (D31). Design typos fixed: "action", "Series",
  "Currently Watching".
- **Cast:** pills with a small round photo, initials when there's none (D22).
- **Missing images:** aubergine placeholder with the D monogram, tinted with the image's dominant colour
  once known.
- **Icons:** favicon + Apple/Android home-screen icons from the D monogram (D52).
- **Accessibility:** target is WCAG 2.2 AA (D38).

## 4. Data model (Postgres)

### 4.1 Content tables — written only by the sync (service role), read publicly
| Table | Key columns |
|---|---|
| `titles` | `id` text PK (Dramoir ID) · `slug` unique (title slug + short id) · `content_type` (`series` \| `movie` \| `variety`) · `country` · `title` (as typed, trimmed) · `year` · `episodes` · `status` (`completed` \| `ongoing` \| `upcoming`) · `global_rating numeric(3,1)` · `synopsis` · `poster_src`, `banner_src` · `poster_image_id`, `banner_image_id` → images · `is_ready` (D8) · `is_removed` (P7) · `source_tab`, `source_row`, `row_hash` · `search_doc` (for pg_trgm / tsvector) · timestamps |
| `tags` | `id` · `kind` (`genre` \| `trope` \| `mood`) · `name` · `slug` · `category` · `category_order` · `sort_order` · `description` · unique (kind, lower(name)) |
| `title_tags` | `title_id`, `tag_id`, `position` |
| `actors` | `id` (name slug) · `name` · `name_key` (lowercase, spaces collapsed — D49) · `photo_src` · `photo_image_id` · `in_reference` (false = cast name not found in Actors Reference) |
| `title_cast` | `title_id`, `actor_id`, `billing_order` (1–2 = lead, P11) |
| `collections` / `title_collections` | shelf name, slug, sort order ("K-Drama Starter" first) / membership + position |
| `images` | `source_url` unique · `kind` (`poster` \| `banner` \| `actor`) · `status` (`pending` \| `ok` \| `failed` \| `unsupported`) · `attempts`, `next_attempt_at`, `last_error` · `storage_prefix`, `variants jsonb`, `dominant_color`, `fetched_at` |
| `title_similar` | `title_id`, `similar_id`, `score`, `reasons jsonb` (top 3 matched tags), `rank` ≤ 30 |
| `sync_runs` | `trigger` (`cron` \| `manual`), `started_at`, `finished_at`, `status`, `counts jsonb` |
| `sync_issues` | `run_id` · `severity` (`error` \| `warning` \| `fixed` \| `info`) · `tab`, `row`, `column`, `title` · `code`, `message`, `suggestion` |

`content_type` comes from the raw `type` cell, matched case-insensitively against aliases:
series/serie/drama → `series`; movie/film → `movie`; variety/variety show/reality/reality show → `variety`.
An unknown type is a warning, and the row is not ready.

### 4.2 User tables
| Table | Key columns / rules |
|---|---|
| `profiles` | `id` = `auth.users.id` · `username citext unique` (D43 rules enforced by trigger) · `username_changed_at` · `avatar_path` · `is_private` default false (D41) · `is_admin` default false (not updatable by users) |
| `username_redirects` | `old_username`, `profile_id`, `expires_at` (+30 days) |
| `user_title_status` | PK (`user_id`, `title_id`) · `status` (`watching` \| `completed` \| `want` \| `finish_later` \| `dropped`), so one status per title (D19) |
| `user_favorites` | PK (`user_id`, `title_id`) |
| `custom_lists` / `custom_list_items` | `id`, `user_id`, `name`, `slug`, `is_public` default true / `list_id`, `title_id`, `position` |
| `ratings` | PK (`user_id`, `title_id`) · `score smallint check (score between 1 and 10)` (D21, D29) |
| `profile_reports` | `reporter_id`, `profile_id`, `reason`, `created_at`, `resolved_at`, `resolved_by` (D42) |

Derived objects:
- `title_member_stats(title_id)`: returns only the average and count of member ratings (security definer), so
  private members' ratings count in aggregates without revealing who they are.
- `top_titles(content_type)`: score = `(global_rating × 10 + Σ member scores) / (10 + n)`. Only ready,
  non-removed, rated, non-upcoming titles; ties go to the newer year; limit 100 (D29). Refreshed with each
  sync (P8).

### 4.3 Row-level security
| Object | Read | Write |
|---|---|---|
| Content tables | anon + authenticated; `titles` only where `is_ready and not is_removed` | none (service role only) |
| `sync_runs`, `sync_issues` | `is_admin()` | service role |
| `profiles` | `not is_private or id = auth.uid() or is_admin()` | owner updates own row (column privileges exclude `is_admin`); insert by trigger on `auth.users`; admin may reset username/avatar |
| `user_title_status`, `user_favorites`, `ratings` | owner, or anyone if the owner's profile is public | owner only (`auth.uid() = user_id`) |
| `custom_lists`, `custom_list_items` | owner, or anyone if `is_public` and the owner's profile is public | owner only |
| `profile_reports` | `is_admin()` | insert: any authenticated user as reporter; update: admin |
| Storage `media` bucket | public | service role |
| Storage `avatars` bucket | public | owner writes `avatars/{auth.uid()}/…` only; images only, ≤ 2 MB; admin may delete |

A dedicated RLS test suite (`tests/rls/`) signs in as two members and checks every rule above.

## 5. Sheet sync pipeline
**Triggers:**
- Supabase `pg_cron` runs hourly and calls `pg_net` to POST `/api/sync`; the shared secret lives in Supabase
  Vault.
- The admin "Sync now" button calls the same code through a Server Action that checks the admin role.
- A lock row in `sync_runs` stops overlapping runs (a run is treated as stale after 10 minutes).

**Steps:**
1. **Fetch.** Read the spreadsheet's tab list, then `values:batchGet` every tab (`UNFORMATTED_VALUE`).
2. **Detect tabs (D14).** In each tab's first 5 rows, find the header row and normalise its headers (lowercase,
   trim, collapse whitespace and line breaks).
   - Content tab: has title + type + country.
   - Tag tabs: `Genre`, `Category`+`Trope`, `Mood / Vibe Tag`.
   - Actors tab: `Actor Name`+`Photo URL`.
   - Anything else: an `info` issue.
3. **Map headers.** Aliases map columns to fields: title, type, country, year, episodes, status,
   `main role`/`cast` → cast, genres, tropes, `mood / vibe tags` → moods, `global rating (/10)`, poster url,
   banner url, synopsis, curated collections, dramoir id. A missing column just means the field is absent, so
   Movies and reality tabs need no special code.
4. **Parse & normalise.** The core is a pure function, `parseWorkbook(tabs)`, which the xlsx test fixture uses too.
   - Trim and collapse spaces.
   - `2018.0` → 2018; `7,3` → 7.3 (logged as a `fixed` issue).
   - List cells split on commas outside quotes (D32).
   - Tags match the reference tabs case-insensitively.
   - Cast names match on `name_key` (D49).
   - URL cells keep the first valid http(s) URL (fixes pasted-twice URLs, with a warning) and are classified as
     pin.it / pinterest.com / share.google / direct.
   - A trope's category is the last non-blank Category cell above it (merged cells).
5. **Validate (D50).**
   - Errors hide the row: no title or ID, duplicate (same normalised title + type, same or missing year — the
     later row loses), unreadable year.
   - Warnings drop the bad value: unknown tag or cast name, bad image link, rating outside 0–10.
   - A row that errors but was published before keeps its last good version (D6).
6. **Readiness (D8).** A row is ready with title, type, country, year, at least one genre/trope/mood, and a
   poster URL.
7. **Upsert** in one transaction:
   - Content tables are updated; rows missing from the sheet get `is_removed = true` (P7).
   - Actors merge by `name_key`, and the first photo wins.
   - Cast names not in Actors Reference get `in_reference = false`.
8. **Recommendations.** Recompute `title_similar` (§7).
9. **Finish.** Record run counts and issues, then call `revalidateTag('content')`. New or changed image
   sources become `images.pending` and dispatch `images.yml` (fine-grained PAT with `actions:write`).

**Apps Script (`apps-script/Code.gs`, D5).** An `onEdit` trigger plus a time-driven trigger give every content
row that has a title but no ID a new ID (`dr_` + 8 random characters). The ID goes in a **Dramoir ID** column
added as the last column. A protected range warns if someone edits that column by hand.

## 6. Image pipeline (D1, D9–D11)
- **Runner:** `scripts/images.ts`, started by `images.yml` (dispatched after a sync, a daily retry, or manual),
  or locally with `pnpm images` (PC fallback). Up to 200 images per run, 2 at a time, 1–2 s apart, with a
  browser user-agent.
- **Resolving links:**
  - `pin.it` → follow redirects → pin page → `og:image` → try the `/originals/` URL, fall back to `/736x/`.
  - `pinterest.com/pin/…` → same page parse (unreliable in testing).
  - Direct `image/*` URL → download.
  - `share.google` → `unsupported` with a "please replace" issue.
  - Malformed → `failed`.
- **Variants (sharp, WebP):**
  - poster 320 w and 640 w
  - banner 800 w and 1280 w
  - actor 160 and 400 (square, attention crop)

  Also records a dominant colour. Files are stored at `media/{kind}/{sha1(source)}/{w}.webp` with
  `cache-control: public, max-age=31536000, immutable`.
- **Failures:**
  - Retries back off 1 h → 6 h → 24 h → 72 h, then the image stays `failed` until its URL changes in the sheet.
  - A title keeps its previous good image until a new one succeeds.
  - Failures appear on `/admin/sync`.
- **Budget:** about 1,700 sources ≈ 250–320 MB of the 1 GB limit. Egress: 5 GB + 5 GB cached per month.
  If outgrown, move to Cloudflare R2 by changing `mediaUrl()`.
- **Risk:** the owner accepts the Pinterest ToS §2.a risk (D1). The S0 spike measures blocking before S3.

## 7. Recommendation engine (D23, D27, D28, D15)
- **Vectors:** each ready title is a vector of its tags. Weight = kind weight (trope 3, mood 2, genre 1) ×
  IDF, where IDF = ln(N / number of ready titles with that tag).
- **Similarity:** cosine similarity between vectors (P6). Each title stores its top 30 neighbours plus the
  3 tags that contributed most (the reason line, e.g. "enemies to lovers · slow burn · healing").
- **Cold start:** if fewer than 6 neighbours score above θ (initially 0.15, tuned in S7), the rest are filled
  with titles that share a genre and have a Global Rating within ±0.5, sorted by rating.
- **Detail page:**
  - "Since you liked X": the first 12 neighbours, after hiding the viewer's Currently Watching / Completed /
    Dropped titles (spec §5). This filtering happens in the browser, so pages stay static.
  - "More with [lead]": other ready series with the first lead actor (billing 1–2) who has at least 2 other
    titles, sorted by Global Rating. Series only (D15).
- **Personal page** (`/me/recommended`, linked from the profile and My List — D24):
  - Seeds: Favorites (weight 2) and Completed (weight 1, scaled by the member's own rating; a rating ≤ 4 isn't
    used as a seed).
  - The seeds' neighbour scores are added up, the member's own list titles and the seeds are removed, and the
    top 24 are shown with "Because you liked X".
  - Guests and members without seeds see `top_titles`.
- **Cost:** about 700 titles × sparse vectors, well under a second inside `/api/sync`.

## 8. Routes & page structure (App Router)
| Route | Page | Notes |
|---|---|---|
| `/` | Home (design p1) | Hero + "Get started" for guests only (D30). Shelves K-Drama Starter, Ongoing, Upcoming always, then one shelf per extra Curated Collections name. A shelf with under 4 titles shows a "coming soon" note (D25). Each shelf has "View all" |
| `/dramas`, `/movies`, `/variety` | Type lists (p6) | "Coming soon" state when the type has 0 ready titles (D8) |
| `/dramas/top`, `/movies/top` | Top 100 | `top_titles` (D29) |
| `/title/[slug]` | Title detail (p8, p9) | Banner, poster, rating ring + member score, chips, synopsis, tropes, moods, cast pills, two recommendation rows, "+" bottom sheet |
| `/actors`, `/actors/[slug]` | Actors List (p7) and actor detail | Everyone in a visible title (D51); Series and Movies tabs, Movies "coming soon" (D15) |
| `/search` | Search results + filter overlay (p3, p4) | URL state `?q&status&country&type&year=2015-2020&genre&trope&mood`; D33/D34 logic |
| `/login`, `/signup`, `/auth/callback`, `/reset-password` | Auth | Google + email/password (D18) |
| `/u/[username]`, `/u/[username]/lists/[slug]` | Public profile (p2) and public custom list | D39–D43 |
| `/me/lists/[favorites\|watching\|completed\|want\|finish-later\|dropped]`, `/me/lists/custom[/slug]` | My List | D19 |
| `/me/recommended`, `/me/settings` | Personal recs; username / avatar / privacy | |
| `/admin/sync`, `/admin/reports` | Owner only | D7, D42 |
| `/api/sync`, `/api/revalidate` | Secret-protected POST | |

- **Menu:** the hamburger drawer matches the design exactly (D24): Dramas (List, Top), Movies (List, Top),
  Variety Shows (List), My List (six entries), Actors List. The profile icon opens login or the profile.
- **Rendering:**
  - Content pages are static and revalidated on demand by tag.
  - Member-specific parts are client components that read through RLS with the member's session: list
    buttons, rating widget, rec filtering, "Recommended for you" shelf.
  - Guest taps on +, ♥ or a rating open a sign-in sheet that returns to the same page.

## 9. Authentication (D17, D18, D39–D43)
- **Sign-in:** Supabase Auth with Google OAuth and email/password. Confirmation and reset emails go through
  custom SMTP (Gmail app password, about 500/day). `@supabase/ssr` handles cookie sessions.
- **Profiles:** first sign-in creates a `profiles` row with a suggested username, which the member confirms.
  Username rules: 3–20 characters, `[a-z0-9_]`, reserved words blocked, one change per 30 days, old usernames
  redirect for 30 days.
- **Admin:** the owner's profile is flagged `is_admin` once, by SQL.
- **Reports:** anyone can report a profile. The admin resets avatar or username from `/admin/reports`.

## 10. Folder layout (`C:\Users\mouad\code\dramoir`)
```
docs/              ARCHITECTURE.md BUILD_PLAN.md DECISIONS.md DATA_QUALITY_REPORT.md RUNBOOK.md (S10)
  inputs/          dramoir-spec.pdf  dramoir.pdf  Dramoir.xlsx
src/app/           (site)/ (auth)/ me/ u/ admin/ api/sync/ api/revalidate/
src/components/    ui/ (shadcn)  nav/  title/  shelf/  filters/  lists/  profile/  admin/
src/lib/           supabase/{server,browser,admin}.ts  content/queries.ts  media.ts  auth/
src/sync/          sheets.ts detect.ts headers.ts parse.ts validate.ts upsert.ts issues.ts
src/recs/          vectors.ts similar.ts personal.ts
scripts/           images.ts  backup.sh  import-xlsx-fixture.ts
apps-script/       Code.gs
supabase/          migrations/*.sql  config.toml  seed.sql
tests/             unit/ (fixtures from docs/inputs/Dramoir.xlsx)  e2e/ (Playwright)  rls/
.github/workflows/ ci.yml  images.yml  backup.yml
```

## 11. Environments, secrets, free-tier budget, migration paths
**Environments:**
- Production: Supabase project #1 + Vercel production.
- Dev/preview: Supabase project #2 + Vercel previews (P2).

**Secrets:**
- Vercel: Supabase URL / anon key / service-role key, Google service-account JSON, `SHEET_ID`, `SYNC_SECRET`,
  `REVALIDATE_SECRET`, `GITHUB_DISPATCH_TOKEN`, `SENTRY_DSN`.
- GitHub: `SUPABASE_DB_URL`, service-role key, age public key, `REVALIDATE_SECRET`, `SITE_URL`.
- Supabase Vault: `SYNC_SECRET` for pg_cron.

| Service | Free limit that matters | Expected use |
|---|---|---|
| Vercel Hobby | non-commercial; 100 GB transfer; 1M invocations; 4 h active CPU | static pages, hourly sync |
| Supabase Free | 500 MB DB; 1 GB storage; 5 GB + 5 GB cached egress; pause after 7 idle days; no backups | hourly writes prevent pausing; nightly dump (D13) |
| GitHub Actions (private) | 2,000 min/month | image jobs + nightly backup |
| Sentry Developer | 5K errors/month, 30-day lookback | |
| Gmail SMTP | ~500 emails/day | sign-up confirmation + resets |

**Migration paths:**

| From | To |
|---|---|
| Vercel | Cloudflare Workers (OpenNext) or Netlify |
| Supabase DB | Supabase Pro ($25/mo) or any Postgres, restored from the nightly dump |
| Storage | Cloudflare R2 (change `mediaUrl()`) |
| Gmail SMTP | Resend or similar, once there's a custom domain |
| Domain | custom domain added in the Vercel dashboard, no rebuild |
