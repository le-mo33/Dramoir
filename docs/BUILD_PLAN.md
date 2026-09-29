# Dramoir — Build Plan

The work is split into ordered **vertical slices**. Each slice delivers something working end to end and ends
with a demo on a Vercel preview plus a checklist the owner can try. ⚠ marks the risky slices; the riskiest
external dependencies are tested with **spikes in S0**, before anything is built on top of them.

References: [ARCHITECTURE.md](ARCHITECTURE.md) · [DECISIONS.md](DECISIONS.md) ·
[DATA_QUALITY_REPORT.md](DATA_QUALITY_REPORT.md).

## Overview
| Slice | Goal | Depends on | Risk |
|---|---|---|---|
| S0 | Foundations + risk spikes | — | ⚠ |
| S1 | Sheet → database sync | S0 | ⚠ |
| S2 | Browse: Dramas List + title detail | S1 | |
| S3 | Image pipeline | S1, S0 spike (a) | ⚠ |
| S4 | Accounts & admin | S2 | ⚠ |
| S5 | Search & filters | S2 | |
| S6 | My List & member ratings | S4 | |
| S7 | Recommendations | S1, S6 | ⚠ |
| S8 | Home, Top lists, Actors, coming-soon states | S3, S6, S7 | |
| S9 | Public profiles & moderation | S4, S6 | ⚠ |
| S10 | Launch hardening | all | |

S3, S4 and S5 can overlap once S2 is done.

---

## S0 ⚠ Foundations & risk spikes
**Goal:** an empty but real, branded site is live, and the three biggest external risks are measured.
- **Tasks**
  - Owner machine setup: install Node LTS and pnpm (not installed today); git is already installed.
  - Repo: initialise `C:\Users\mouad\code\dramoir` and push it to a private GitHub repo (D40, D44).
  - Accounts: Vercel (Hobby), Supabase (prod + dev, P2), Sentry, Google Cloud project with a Sheets API service
    account, Gmail account for SMTP (P4).
  - Scaffold Next.js + Tailwind + shadcn/ui with brand tokens (§3 of ARCHITECTURE) and fonts.
  - Static header (wordmark, profile icon), search bar and hamburger drawer matching design p5; favicon and
    home-screen icons (D52).
  - CI (`ci.yml`): lint, typecheck, unit tests on every push.
  - **Spike (a):** a GitHub Actions job resolves 25 real `pin.it` links to images and reports the success rate.
  - **Spike (b):** read the live Google Sheet through the service account (owner shares it read-only).
  - **Spike (c):** send a sign-up email through Supabase Auth using Gmail SMTP.
- **Acceptance criteria**
  - The site loads on `*.vercel.app` with the designed header and drawer, correct fonts and colours.
  - CI passes.
  - Spike results are recorded in DECISIONS.md. If (a) is under 80%, the owner's-PC runner becomes the primary
    image path before S3. If (c) fails, Google sign-in goes first in S4 and the email provider is re-decided
    with the owner.
- **You can test:** open the URL on your phone and desktop; open the menu; compare with the Canva screens.

## S1 ⚠ Sheet → database sync
**Goal:** the database mirrors the sheet every hour, and every problem is recorded.
- **Tasks**
  - SQL migrations for the content tables, `sync_runs` and `sync_issues` (ARCHITECTURE §4.1).
  - Apps Script ID stamper (`apps-script/Code.gs`), installed in the sheet by the owner with a written guide (D5).
  - `src/sync/`: tab detection by headers (D14), header aliases, quote-aware list splitting (D32), normalisation
    and auto-fixes, D50 severity tiers, readiness (D8), transactional upsert, soft-remove (P7), actor merge (D49).
  - `/api/sync` (secret) plus hourly Supabase `pg_cron` → `pg_net` trigger (D12).
  - Unit tests using `docs/inputs/Dramoir.xlsx` converted to a JSON fixture.
- **Acceptance criteria** (from the fixture)
  - 706 dramas imported, **702 ready** (not ready: Moving 2, My lovely journey 2, Save me 2, Study group 2);
    0 movies ready.
  - `"slow starter, worth it"` becomes one tag in all 56 rows, so all mood values match the reference.
  - 4,472 cast links resolve; 25 genres, 173 tropes in 20 categories, 23 moods loaded.
  - Issues reported include: `84.0` rating, `7,3`/`6,4` (auto-fixed), 5 `share.google` poster/banner links,
    the pasted-twice URL on r339, the 6 movie duplicate pairs, stray rows 709/710/165.
  - Running the sync twice changes nothing; an error on a published row keeps its last good version.
- **You can test:** edit a synopsis in the sheet. Within an hour (or right away via the secret sync URL) the
  database row changes. Break a rating and see the issue recorded.

## S2 Browse: Dramas List + title detail
**Goal:** visitors can browse every ready drama and open its page (images come in S3).
- **Tasks**
  - `/dramas` list per design p6: poster placeholder, title, year, "Korean Drama · 16 episodes", synopsis
    excerpt, rating, "+" (inactive until S6).
  - `/title/[slug]` per p8: status, episodes, rating ring, genre chips, synopsis, tropes, moods, cast pills with
    initials (D22). Empty fields are hidden.
  - 404 page; page refresh triggered by the sync.
- **Acceptance criteria**
  - All 702 ready dramas are reachable.
  - The Witch (drama) and the witch (movie, once ready) get different URLs.
  - Renaming a title in the sheet keeps its URL ID and updates the text after the next sync.
- **You can test:** browse the list, open *Descendant of the sun*, and compare it with Canva p8.

## S3 ⚠ Image pipeline
**Goal:** posters, banners and actor photos come from Pinterest and are stored permanently (D1, D9–D11).
- **Tasks**
  - `images` table flow; `scripts/images.ts` (resolve, download, sharp variants, dominant colour).
  - `images.yml`: dispatched after each sync, daily retry, manual run.
  - Storage buckets and policies; branded placeholders; images wired into S2 pages.
  - `pnpm images` for the owner's PC, with a short guide.
- **Acceptance criteria**
  - At least 95% of `pin.it` sources stored; the rest listed with reasons.
  - `share.google` links marked "please replace".
  - Changing a URL in the sheet swaps the image only once the new one succeeds.
  - Stored size is within the §6 estimate.
- **You can test:** pages show real posters and banners. Put a broken link in one row: the title keeps its old
  image (or a placeholder) and the issue appears.

## S4 ⚠ Accounts & admin
**Goal:** people can sign up and in; the owner has the sync admin page (D7, D18).
- **Tasks**
  - Google OAuth and email/password through Gmail SMTP.
  - Login, sign-up and reset screens designed from the palette (D20).
  - `profiles` with username rules (D43); owner set as admin.
  - `/admin/sync`: issues grouped by severity with suggested fixes, run history, Sync now, image status,
    failure banners.
  - Sentry wired in (D37).
  - RLS test harness started.
- **Acceptance criteria**
  - Confirmation and reset emails arrive; Google sign-in works on phone and desktop.
  - A non-admin gets 404 on `/admin/*`.
  - RLS tests for profiles and the sync tables pass.
- **You can test:** create one account with Google and one with email. Open `/admin/sync`, press Sync now, and
  work through the issue list.

## S5 Search & filters
**Goal:** find titles "by feel" (D33–D35).
- **Tasks**
  - Filter overlay per p3/p4:
    - Status, Country and Type show the designed options plus new values, greyed "coming soon" when there are
      no titles.
    - Year from–to range.
    - Genres, Tropes grouped by category, Mood & Vibe with description tooltips.
  - Filter logic D34.
  - `pg_trgm` search across titles, tags and actors, with suggestions; results page; filters kept in the URL.
- **Acceptance criteria**
  - *enemies to lovers* + *healing romance* returns only titles tagged with both.
  - "descendents" finds *Descendant of the sun*; "song joong" suggests Song Joong-Ki.
  - CHINA, JAPAN, THAILAND, TAIWAN, MOVIE and VARIETY SHOW appear greyed "coming soon".
- **You can test:** try your favourite trope combinations, then share a filtered link with someone.

## S6 My List & member ratings
**Goal:** members track titles across devices and rate them (D19, D21).
- **Tasks**
  - "+" bottom sheet per p9 (one status + Favorite); sign-in prompt for guests.
  - My List tabs; custom lists (create, rename, delete, reorder, public/private).
  - 1–10 rating widget; member score next to Global Rating.
  - RLS tests for all list and rating tables.
- **Acceptance criteria**
  - A title can't have two statuses; lists stay in sync between two browsers.
  - Member B can't read A's private lists or write any of A's data.
- **You can test:** add titles on your phone and see them on desktop; rate a few titles.

## S7 ⚠ Recommendations
**Goal:** good, explained recommendations (D23, D27, D28).
- **Tasks**
  - `src/recs` precompute inside the sync (IDF, cosine, top 30, reasons, cold-start fallback).
  - Detail page "Since you liked X" and "More with [lead]" rows with reason lines; hiding of the viewer's lists.
  - `/me/recommended`, linked from the profile and My List (D24).
  - Tune θ against real data.
- **Acceptance criteria**
  - Every ready drama shows at least 6 recommendations, each with a reason.
  - A member never sees their Completed, Dropped or Currently Watching titles recommended.
  - **Quality gate:** the owner picks 10 dramas they know well and approves their recommendations. If not
    approved, weights and θ are adjusted with the owner (any change is logged in DECISIONS.md).
- **You can test:** judge the recommendations for dramas you know; mark some as Completed and watch them
  disappear.

## S8 Home, Top lists, Actors, coming-soon states
**Goal:** the full site structure from the design and spec (D25, D29, D30, D51).
- **Tasks**
  - Home per p1: hero for guests only; K-Drama Starter, Ongoing and Upcoming always shown, plus extra
    collection shelves; "coming soon" notes; View all pages.
  - `/dramas/top` and `/movies/top`; `/movies` and `/variety` coming-soon screens.
  - Actors List grid per p7 with search; actor detail with photo and Series/Movies tabs.
- **Acceptance criteria**
  - Tagging rows "K-Drama Starter" fills that shelf after the next sync.
  - A new collection name creates a new shelf with no code.
  - Top order reflects member ratings after the next sync.
- **You can test:** tag 6 titles as K-Drama Starter; add a test collection name and remove it again.

## S9 ⚠ Public profiles & moderation
**Goal:** public profiles that are safe to show (D39–D43).
- **Tasks**
  - `/u/[username]` per p2 (banner, avatar, list previews).
  - Whole-profile private switch; public/private toggle per custom list.
  - Avatar upload with browser-side resize (P10); username change with a 30-day redirect.
  - "Report profile"; `/admin/reports` to reset avatar or username.
- **Acceptance criteria**
  - A private profile shows 404 to others; a private custom list is hidden.
  - The full RLS suite passes for every table.
  - Resolving a report resets the avatar or username immediately.
- **You can test:** view your profile while logged out; switch it to private; report a test profile and
  resolve it.

## S10 Launch hardening
**Goal:** ready for real visitors.
- **Tasks**
  - Accessibility: WCAG 2.2 AA pass (automated axe checks, keyboard-only walkthrough, screen-reader spot check).
  - Complete the E2E suite (browse, filter, sign-in, add-to-list, rate).
  - Backups: nightly `backup.yml` plus a restore drill into the dev project.
  - SEO metadata, sitemap and social-share images from posters.
  - Cloudflare Web Analytics.
  - Free-tier usage review.
  - `docs/RUNBOOK.md`: manual sync, running images from your PC, restoring a backup, rotating secrets, adding a
    custom domain later.
- **Acceptance criteria**
  - axe reports 0 serious issues on key pages.
  - The restore drill succeeds.
  - Usage is comfortably under every free limit.
  - The owner walks through the RUNBOOK successfully.
- **You can test:** follow the RUNBOOK to sync and restore; add the site to your phone's home screen and check
  the D icon.

---

## Risk register
| Risk | Slice | Mitigation |
|---|---|---|
| Pinterest blocks GitHub IPs or changes its page markup; ToS risk (accepted, D1) | S0, S3 | Spike (a) first; PC fallback runner; last good copy kept; placeholders; failures listed on admin |
| Sheet quirks break the sync (spaces, emoji tab names, merged cells, quoted tags) | S1 | Pure parser tested on the real workbook; severity tiers; last good version kept |
| Gmail SMTP deliverability or daily limit | S0, S4 | Spike (c); Google sign-in as the main path; Resend once there's a custom domain |
| Public profiles leak private data | S4, S6, S9 | RLS on every table, dedicated RLS test suite, privacy switches |
| Supabase pause, egress, or no backups | S1, S3, S10 | Hourly writes; pre-sized images; usage review; nightly dump; R2 path |
| Recommendation quality | S7 | IDF + cosine; owner quality gate on 10 known titles |
| Vercel non-commercial clause | ongoing | Stay non-commercial on Hobby; portable build for a later move (D2) |

## Owner tasks (outside code)
- S0: create the Vercel, Supabase, Sentry and Google Cloud accounts (Claude guides each step); share the sheet
  with the service account; make a Gmail account for SMTP.
- S1: install the Apps Script; work through the DATA_QUALITY_REPORT checklist (it can run in parallel).
- S7: review recommendations for 10 titles.
- Ongoing: check `/admin/sync` after editing the sheet.
