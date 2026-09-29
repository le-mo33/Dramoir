# Dramoir — Decision Log

Running log of every project decision: the options considered, what the owner chose, and why.
Process rule: **ask, never assume.** Claude raises every gap, ambiguity or spec/design conflict as a question
with 2–4 options (recommended one marked "rec."), at most 4 per round. The owner makes every decision.

- Owner decisions were collected in 13 rounds on 2026-09-29 (D1–D52).
- The **Proposed defaults** section lists minor technical choices Claude made. The owner may veto any of them.
- The **Spike results** section is filled in during build slice S0.

Status legend: **Decided** = owner chose · **Proposed** = Claude default, veto-able · **Open** = pending.

---

## Spec deviations the owner approved
| Decision | Spec said | Now |
|---|---|---|
| D1 | Pinterest images cached | Kept as spec, **but the owner accepts the risk under Pinterest ToS §2.a** (no automated collection) |
| D4 | Actor page grid built from `Actors Reference → Dramas` | Built from the `Main role`/`Cast` columns; the Dramas column is ignored |
| D9 | Image downloaded "on first load" | Downloaded by a background job after each sync |
| D15 | Actor pages split Series vs Movies | Movies tab shows "coming soon" (the Movies sheet has no cast) |
| D17, D21 | No user reviews/ratings in Phase 1 | Member ratings (1–10) at launch; written reviews in Phase 2 |
| D24 | Menu has Recommendations + Custom Lists | Designed menu kept; both reached from the profile and My List pages |
| D45, D52 | PWA (next-pwa), installable, offline shell | **PWA removed.** Only favicon + home-screen icons remain |

---

## Decisions

### Round 1 — architecture-shaping
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D1 | Image source for posters, banners, actor photos | TMDB + direct overrides (rec.) · Pinterest per spec · TMDB + Pinterest overrides · direct image links only | **Pinterest, as the spec says** | Keeps the owner's hand-picked images. The owner was told that Pinterest ToS §2.a forbids scraping "by using automated means (without our express prior permission)" and that Pinterest may block cloud IPs, and accepts both risks. |
| D2 | Hosting & monetization | Vercel now, stay portable (rec.) · Vercel Hobby forever · Cloudflare from day one | **Vercel Hobby now, stay portable** | $0 at launch. The site must stay non-commercial while on Hobby (ads, affiliate-first, payments = commercial; donations OK). No Vercel-only features, so moving to Cloudflare or Netlify is a config-level change. |
| D3 | How sheet edits reach the site | Mirror into Supabase (rec.) · ISR reads the sheet directly · manual publish only | **Mirror into Supabase** | A sync job validates the sheet and copies it into Postgres, then precomputes recommendations and refreshes pages. Gives fast search/filters, and the regular DB writes keep the free project awake. |
| D4 | What links actors to titles | Cast columns only (rec.) · Actors.Dramas (spec) · both combined | **Cast columns only** | Main role matches Actors Reference 100%. In Actors.Dramas, 184 refs can't be resolved and 135 contradict Main role. |

### Round 2 — data rules
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D5 | Stable title identity | Auto ID column via Apps Script (rec.) · derived from type+title+year · owner-typed slug | **Auto "Dramoir ID" column stamped by an Apps Script** | Renaming a title never breaks users' lists, and same-name works (The Witch drama vs movie) stay separate. The owner must never edit this column. URL = title slug + short ID. |
| D6 | What happens to a bad row | Skip row, publish the rest (rec.) · block whole sync · publish as-is | **Skip the row, publish the rest** | A row that was already live keeps its last good version. Safe auto-fixes (whitespace, `7,3`→7.3, `2018.0`→2018) are applied and reported. |
| D7 | How the owner sees sync problems | Private admin page (rec.) · report tab in the sheet · email | **Private `/admin/sync` page** | Shows each issue with its tab, row and a suggested fix, plus a "Sync now" button. The service account stays read-only. |
| D8 | When a title is "ready" to show | Title+type+country+year+≥1 tag+poster (rec.) · any titled row · every column filled | **Title, type, country, year, ≥1 genre/trope/mood, poster URL** | A type or country with 0 ready titles shows "coming soon". Empty optional fields are hidden. Today this hides all 162 Movies, plus Moving 2, My lovely journey 2, Save me 2 and Study group 2. |

### Round 3 — pipeline
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D9 | When/where images are fetched | Background job + PC fallback (rec.) · on first page view · owner's PC only | **GitHub Actions job after each sync; the same script can run from the owner's PC** | Pages never wait on Pinterest. If Pinterest blocks GitHub's servers, the owner runs one command locally. |
| D10 | Where image copies live | Supabase Storage (rec.) · Cloudflare R2 · inside the repo | **Supabase Storage** | Pre-resized WebP, about 250–320 MB of the 1 GB limit. Egress is 5 GB + 5 GB cached per month. Migration path: R2. |
| D11 | Image failures & share.google links | Placeholder + retry (rec.) · hide the title · also fetch share.google | **Branded placeholder + retry with backoff; keep the last good copy; share.google links reported as "please replace" and never fetched** | The title stays visible. For D8, the poster URL only needs to be filled in; the download doesn't have to succeed. |
| D12 | Sync cadence | Hourly + sync now (rec.) · every 15 min · daily | **Hourly via Supabase pg_cron, plus the admin "Sync now" button** | Vercel Hobby cron runs only once a day, so Supabase schedules the sync. |

### Round 4 — data operations
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D13 | User-data backups (Supabase Free has none) | Nightly automatic dump (rec.) · manual weekly export · none until paid | **Nightly GitHub Actions dump of user tables, encrypted, 30-day retention** | $0. The same dump is the migration path to Supabase Pro or any Postgres host. Content isn't backed up because the sheet is its source. |
| D14 | Which tabs count as content | Auto-detect by headers (rec.) · settings tab · fixed list in code | **Auto-detect: any tab whose headers include Title + type + country** | New type or country tabs need no code. Unknown tabs are listed on the admin page. |
| D15 | Cast for Movies and reality shows | Add a Cast column (rec.) · no cast for movies | **No cast for movies (for now)** | The actor Movies tab says "coming soon", movie pages have no cast, and "More with [actor]" covers series only. The parser maps any `Main role`/`Cast` column, so adding one later needs no code. |
| D16 | Who fixes the known data errors | Owner, from a checklist (rec.) · Claude prepares corrected data · leave them | **The owner fixes the live sheet, using the checklist in DATA_QUALITY_REPORT.md** | The sync auto-fixes only the safe issues. |

### Round 5 — accounts & lists
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D17 | What guests can do | Browse everything (rec.) · home only · limited browse | **Guests browse everything. Login is needed for Favorites/lists and for ratings (and reviews later)** | Owner's own wording. It introduced member reviews/ratings, which are scoped in D21. |
| D18 | Sign-in methods | Google + email/password (rec.) · Google only · email/password only · magic link | **Google + email/password** | Supabase's built-in SMTP allows 2 emails/hour to team addresses only, so emails go through custom SMTP on a Gmail account (~500/day). Switch to Resend etc. once there's a custom domain. |
| D19 | How lists behave | One status + favorites (rec.) · fully free-form | **At most one status per title (Currently Watching / Completed / Want to Watch / Finish Later / Dropped), plus an independent Favorite, plus custom lists** | Keeps recommendation exclusions unambiguous. |
| D20 | Screens with no design | Claude designs, owner reviews (rec.) · owner designs in Canva · basic first | **Claude builds them from the existing screens and the brand palette** | Actor detail, login/sign-up, custom lists, coming soon, Top lists, search results, profile edit, 404. |

### Round 6 — spec ↔ design conflicts
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D21 | Member reviews & ratings | Ratings now, reviews later (rec.) · both at launch · neither | **Member ratings at launch; written reviews in Phase 2** | A "Dramoir members" score appears beside Global Rating. No user-written text means no moderation tools are needed yet. |
| D22 | Cast display on the detail page | Pill + small photo (rec.) · text pills · photo cards | **Designed pills with a small round photo, initials when there's no photo** | 65% of lead actors have no photo. |
| D23 | Recommendation rows | Two rows + reason (rec.) · one row, reason on tap · one row, no reasons | **"Since you liked X" + "More with [lead actor]" rows, each card with a reason line** | Meets spec §5 in the design's style. |
| D24 | Menu entries missing from the design | Add both (rec.) · keep the designed menu · Custom Lists only | **Keep the designed menu** | "Recommended for you" and Custom Lists are reached from the profile and My List pages. |

### Round 7 — ranking & recommendation rules
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D25 | Home shelves | Auto + curated, hide small (rec.) · exactly as designed · curated only | **Exactly as designed: K-Drama Starter, Ongoing, Upcoming always shown, with a "coming soon" note when a shelf is empty or short** | Ongoing and Upcoming come from Status; Starter from Curated Collections (0 rows today). |
| D26 | Top Dramas / Top Movies ranking | Global Rating top 100 (rec.) · blend with member ratings · member ratings only | **Blend Global Rating with member ratings** | Formula in D29. |
| D27 | "More like this" scoring | Weighted + rarity (rec.) · plain weighted count · weighted + rarity, tunable | **Trope 3 / mood 2 / genre 1, weighted by tag rarity (IDF). Below a minimum score, fall back to same genre with rating ±0.5. Show 12.** | Rare tags carry more taste signal. |
| D28 | When recommendations are computed | Precompute + filter live (rec.) · on every request · per user nightly | **Precompute the top 30 per title at each sync; hide each viewer's own lists when the page loads. The personal page blends picks from Favorites + Completed, weighted by the member's own ratings. Guests see Top.** | Light on Vercel CPU. |

### Round 8 — details
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D29 | Member rating scale & Top formula | 1–10, Global = 10 votes (rec.) · 5 stars · 1–10, Global = 50 votes | **1–10 scale. Top score = (Global×10 + Σ member ratings) ÷ (10 + n). Top 100; unrated and Upcoming titles excluded; ties go to the newer year** | |
| D30 | Home page details | Hero for guests + new names add shelves (rec.) · three shelves only · same page for all | **Hero for guests only. Each new Curated Collections name adds a shelf below the designed three** | Creating a shelf needs no code (spec §4). |
| D31 | Design typos & text casing | Fix typos, titles as typed (rec.) · auto Title Case · keep design text | **Fix "acton"→action, "Serie"→Series, "Current Watching"→Currently Watching. Show titles and tags exactly as typed in the sheet. Tag chips lowercase, filter chips UPPERCASE** | |
| D32 | The mood tag "slow starter, worth it" contains a comma | Rename the tag (rec.) · keep it, respect quotes · change the separator | **Keep it; the parser treats quoted text as one tag** | Unbalanced quotes are flagged on the admin page. |

### Round 9 — filters, search, testing
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D33 | Country/Type filter options | Designed set + new values (rec.) · data-driven only · designed set only | **The designed set always, plus any new values from the sheets. Options with 0 ready titles are greyed "coming soon"** | |
| D34 | How filter picks combine | Tags must all match (rec.) · any tag, best matches first · any tag, unsorted | **Status/Country/Type: any of the picks. Genres/Tropes/Moods: every pick must match. Year: from–to range. Groups combine with AND** | |
| D35 | What search covers | Titles, tags, actors + typo-tolerant (rec.) · titles + tags exact · titles only | **Titles, tags and actors in one box, typo-tolerant (Postgres pg_trgm)** | |
| D36 | Testing depth | Focused (rec.) · thorough · minimal | **Focused: unit tests for the parser, validator and recommendations on the real workbook; end-to-end tests for browse, filter, sign-in, add-to-list and rate; CI on every push** | |

### Round 10 — operations & profiles
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D37 | Error monitoring | Sentry free + admin alerts (rec.) · built-in error table · Vercel logs only | **Sentry Developer plan (free) + failure banners on /admin/sync** | Vercel Hobby keeps logs for only 1 hour. |
| D38 | Accessibility target | WCAG AA + darker mauve (rec.) · AA with the exact palette · basics only | **WCAG 2.2 AA; small mauve text uses #6f4f58 (5.3:1 on blush)** | The spec mauve #7d5c65 on #e8d9e0 is 4.3:1, which fails AA for small text. |
| D39 | Profiles | Private + upload (rec.) · public from launch · private + presets | **Public profiles from launch** | Groundwork for Phase 2; details in D41–D43. |
| D40 | Project home | New folder + private repo (rec.) · public repo · local only | **New folder + private GitHub repo** | |

### Round 11 — public-profile details & location
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D41 | What others can see | Public with privacy switches (rec.) · everything always public · private by default | **Public by default; a whole-profile private switch; a public/private toggle on each custom list** | |
| D42 | Moderating avatars & usernames | Uploads + report + admin removal (rec.) · Google photo/presets only · automatic screening | **Avatar uploads; anyone can report a profile; the owner resets avatars/usernames from the admin page** | |
| D43 | Username rules | Standard rules (rec.) · free-form display name · fixed forever | **3–20 characters [a-z0-9_], unique ignoring case, reserved words blocked, changeable once per 30 days, old link redirects for 30 days** | Profile link: `/u/<username>`. |
| D44 | Project path | code\dramoir (rec.) · Desktop · Documents | **C:\Users\mouad\code\dramoir** | This PC has no Node.js yet; installing it is a step in S0. |

### Round 12 — technical
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D45 | PWA | Serwist (rec.) · next-pwa per spec · hand-written service worker | **Remove the PWA feature** | What remains is set by D52. |
| D46 | Database access | Supabase client + SQL migrations (rec.) · Drizzle · Prisma | **supabase-js with generated types + SQL migrations** | |
| D47 | UI building blocks | shadcn/ui restyled (rec.) · Radix only · hand-built | **shadcn/ui (Radix) restyled to the brand** | |
| D48 | Visitor analytics | Cloudflare Web Analytics (rec.) · Vercel Analytics · none | **Cloudflare Web Analytics** | Free, cookie-free, and works on any host. |

### Round 13 — matching & loose ends
| # | Decision | Options considered | Owner's choice | Why / consequences |
|---|---|---|---|---|
| D49 | Actor name matching | Strict, still linked (rec.) · strict, unlinked · loose | **Ignore only letter case and extra spaces, never hyphens or spacing inside names. Duplicate Actors Reference rows merge (first photo wins). An unmatched name gets a pill with initials and a basic actor page, and is reported** | Keeps Jisoo and Ji Soo apart. |
| D50 | Which problems hide a row | Two tiers (rec.) · any problem hides the row · only missing title/ID hides | **Hide the row: no title/ID, duplicate (same normalised title + type, same or missing year — the later row loses), unreadable year. Warn only (bad value dropped): unknown tag or cast name, bad image link, impossible rating** | |
| D51 | Who appears in the Actors List | Actors in visible titles (rec.) · actors with photos first · photos only | **Everyone credited in at least one visible title (~1,230)** | |
| D52 | What remains after removing the PWA | Favicon + home-screen icon (rec.) · favicon only | **Favicon + Apple/Android home-screen icons (D monogram)** | No service worker, offline mode or install prompt. |

---

## Proposed defaults (Claude's choices — owner may veto)
| # | Default | Reason |
|---|---|---|
| P1 | TypeScript, pnpm, Node LTS, latest stable Next.js App Router, zod, Vitest + Playwright | Mainstream, well-supported stack |
| P2 | Second free Supabase project as the dev/preview environment | Free plan allows 2 projects; Docker isn't needed locally |
| P3 | Backups stored as age-encrypted GitHub Actions artifacts, kept 30 days | $0, off-site from Supabase |
| P4 | Custom SMTP through a dedicated Gmail account with an app password | The only $0 option without a custom domain |
| P5 | "More like this" can suggest titles of other types (the card shows the type) | The spec says "other titles" |
| P6 | Similarity uses cosine over weighted IDF vectors | Stops titles with 25 tropes from dominating |
| P7 | A title deleted from the sheet is soft-removed ("no longer available" in lists) | Users' lists never lose entries silently |
| P8 | Top lists and member-rating effects refresh with each hourly sync | Keeps pages static and cheap |
| P9 | Images served as pre-sized WebP straight from Storage (no Vercel Image Optimization) | Avoids the 5K/month cap and stays portable |
| P10 | Avatars resized in the browser to 256px WebP before upload; 2 MB cap | No server CPU needed |
| P11 | "Lead" = first two names in Main role/Cast; a shelf is "short" below 4 titles | Needed for D23 and D25 |

---

## Spike results (to be filled in during S0)
| Spike | Result | Consequence |
|---|---|---|
| (a) Resolving 25 pin.it links — **owner's PC** (2026-09-29) | 25/25 (100%). 24 at `/originals/` size; 1 (*Buried hearts*) got 403 on originals and succeeded at the 736px fallback | The PC fallback path works; the resolver must always try both sizes |
| (a) Resolving 25 pin.it links — **GitHub Actions runner** | — (run `Spike - Pinterest from GitHub` once the repo exists) | If under 80% succeed, running the image job from the owner's PC becomes the primary path |
| (b) Reading the live Google Sheet with the service account | — | |
| (c) Supabase Auth email through Gmail SMTP | — | |
