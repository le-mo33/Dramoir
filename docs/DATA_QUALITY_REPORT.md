# Dramoir — Data Quality Report

- **Source:** `docs/inputs/Dramoir.xlsx`, an export of the content Google Sheet, inspected 2026-09-29.
- **Method:** the .xlsx XML (sheets, shared strings, hyperlinks, data validations) was parsed directly with a
  read-only PowerShell script. Every number below comes from script output. Row numbers are sheet rows:
  row 1 is the banner, row 2 the headers, data starts at row 3.
- **Who fixes what (D16):** the owner fixes the live sheet using the **checklist at the end**. The sync
  auto-fixes only safe issues (whitespace, comma decimals, `2018.0`-style numbers) and reports everything else
  on `/admin/sync`.

---

## 1. Workbook structure
| Sheet (exact name) | Header columns | Data rows | Notes |
|---|---|---|---|
| `Actors Reference` | Actor Name, Photo URL, Dramas | 1,244 (1,233 distinct names) | |
| `Kdrama Database ` *(trailing space)* | Title, `type `, `country `, Year, Episodes, Status, Main role, Genres, Tropes, Mood / Vibe Tags, `Global Rating\n(/10)`, Poster URL, Banner URL, Synopsis, Curated Collections | 706 titles + 2 stray rows (709, 710) | |
| `Movies Database` | Title, `type `, `country `, `year `, Genres, Tropes, Mood / Vibe Tags, Global Rating (/10), Poster URL, Banner URL, Synopsis | 162 titles + 1 stray row (165) | Only Title and type are filled |
| `reality shows Database ` | Title, type, country, Year, Mood / Vibe Tags, Global Rating, Poster URL, Banner URL, Synopsis | 0 | |
| `JDrama Database ` / `CDrama Database ` | as Kdrama, with `Cast` instead of `Main role`, no Curated Collections | 0 | |
| `🎞️ Genres` | Genre, Notes / Description | 25 | Banner says 26; no descriptions |
| `🎭 Tropes` | Category, Trope | 173 in 20 categories | Banner says 274 / 21; blank Category = merged cell |
| `✨ Mood & Vibe Tags` | Mood / Vibe Tag, Description | 23 | Banner says 27; 6 have no description |

**What this means for the parser:** sheet names and headers carry trailing spaces, one header contains a line
break, and Movies uses lowercase `year `. The sync must match tabs and headers by *normalised* name.

## 2. Kdrama Database (706 titles)
| Check | Result |
|---|---|
| `type` / `country` | Every row is `series ` / `Korea ` (with a trailing space) |
| Status | 702 Completed, 5 Upcoming, 1 Ongoing. 54 titles dated 2026 are marked Completed |
| Year | 2011–2027, stored as `2018.0`. Missing on 2 rows |
| Episodes | 1–100, stored as `16.0`. Missing on 1 row |
| Global Rating | 4.4–9.3. 8 titles unrated (new/upcoming). 3 bad values (see checklist) |
| Genres | 2,682 values, **all** match `🎞️ Genres`; 1–7 per title (avg 3.8) |
| Tropes | 8,858 values, **all** match `🎭 Tropes`; 1–25 per title (avg 12.6) |
| Mood / Vibe | 3,066 values. All match once `"slow starter, worth it"` (56 rows, stored in quotes) is read as one tag — it contains a comma. 2–9 per title (avg 4.3) |
| Main role | 4,472 names, **100% exact match** to Actors Reference; 2–23 per title (avg 6.3) |
| Synopsis | 244–1,037 characters; missing on 1 row; 1 contains a line break |
| Curated Collections | **0 of 706 filled** — the "K-Drama Starter" shelf is empty today |
| Titles | 125 have leading/trailing/double spaces; 15 contain commas; seasons are separate rows |
| Poster URL (703 filled) | 698 `pin.it`, 3 `pinterest.com/pin/…`, 1 `share.google`, 1 malformed |
| Banner URL (700 filled) | 693 `pin.it`, 3 `pinterest.com/pin/…`, 4 `share.google` |
| Ready under the D8 rule | **702 of 706.** Not ready: Moving 2, My lovely journey 2 (no year), Save me 2, Study group 2 (no poster) |

## 3. Movies Database (162 titles)
- Only Title and type are filled: country, year, tags, images and synopsis are all empty. One rating
  (Concrete market, 5.2). **0 ready titles**, so Movies shows "coming soon" (D8).
- No Episodes, Status or Cast columns. Without cast (D15), actor pages' Movies tab says "coming soon".
- 6 duplicate pairs and 8 names that also exist in Kdrama — see the checklist.

## 4. Actors Reference (1,244 rows)
- 10 names appear more than once (So Ji-Sub ×3); the duplicate rows list identical dramas.
- Photo URL: **309 of 1,244 filled (25%)** — 259 `pin.it`, 50 `share.google`. Only 499 of 1,412 lead-actor
  slots (first two names billed) have a photo.
- The `Dramas` column is **not used by the site (D4)**. Why:
  - 184 of its 4,738 references can't be resolved, because titles containing commas get split apart.
  - 135 links contradict Main role.
  - 88 Main-role links are missing from it.
- Look-alike names: some are different people (Jisoo ≠ Ji Soo), others are likely the same person. So names
  are never merged automatically (D49); you decide which ones to merge.

## 5. Image link behaviour (live test)
- `pin.it/<code>` → 308 → `api.pinterest.com/url_shortener/<code>/redirect/` → a pin page whose `og:image` is
  `i.pinimg.com/736x/…`. An `/originals/` version exists (about 126 KB JPEG).
- A plain `pinterest.com/pin/<id>/` URL returned no `og:image` in testing, so these 6 links may fail.
- `share.google/<code>` redirects to Google image search pointing at third-party sites (e.g. hancinema).
  They are **not fetched** (D11); please replace them.

---

## 6. Owner checklist — fix these in the live sheet
Tick each one off; anything left is reported on `/admin/sync` after every sync.

### A. Delete stray rows
- [ ] Kdrama rows **709** and **710** (only "Completed" in Status).
- [ ] Movies row **165** (only "movie" in type).

### B. Ratings
- [ ] r157 **Dr. Romantic 3**: `84.0` → probably `8.4`. Until fixed, the rating is hidden.
- [ ] r391 **Night has come** `7,3` and r386 **Namib** `6,4`: the sync fixes these automatically (7.3 / 6.4),
  but please correct them in the sheet.

### C. Title typos & casing (titles display exactly as typed — D31)
- [ ] r134 **Descendant of the sun** → *Descendants of the Sun*.
- [ ] r608–r610 **The penthhouse …** ×3 → *The Penthouse …*.
- [ ] r559 **The chairman  of class 9** has a double space.
- [ ] Titles starting lowercase: r510 *spooky in love*, r629 *the uncanny counter*, r664 *vigilante*.
- [ ] Movies titles are mostly lowercase (*train to busan*, *the witch*). Fix the casing when you fill in Movies.
- [ ] Optional: trailing spaces on 125 Kdrama and 103 Movies titles — the sync trims them automatically.

### D. Duplicate movies (the later row is skipped — D50)
- [ ] Phantom: r95 *phantom* and r154 *Phantom*.
- [ ] recalled: r98 and r99.
- [ ] Exhuma: r38 *Exhuma* and r39 *exhuma*.
- [ ] Hi-five: r47 *hi five* and r162 *Hi-five*.
- [ ] Mission: cross: r79 *mission cross* and r161 *Mission: cross*.
- [ ] Alive: r3 *#Alive* and r159 *Alive* — the same film?

### E. Same name in Kdrama and Movies — confirm each is a different work
Both rows get separate IDs (D5). Just confirm each pair is not an accidental copy:
- [ ] The witch (K r633, 2025 / M r132).
- [ ] The beauty inside (K r555, 2018 / M r115).
- [ ] Love in the big city (K r300, 2024 / M r65).
- [ ] D-day (K r121, 2015 / M r29).
- [ ] Confession (K r109, 2019 / M r25).
- [ ] Concrete market (K r108, 2025 / M r23).
- [ ] Start up (K r516, 2020 / M r110 *start-up*).
- [ ] **Kingdom: Ashin of the north** (K r273 / M r58): it's a feature-length special, so decide which sheet it
  belongs in and delete the other row.

### F. Actors Reference
- [ ] Exact duplicates — delete the extra rows, keeping the one with a photo:
  - So Ji-Sub r787 / r793 / r794
  - Ahn Hee-Yeon r5 / r910
  - Uhm Ki-Joon r117 / r829
  - Lee Ha-Nee r168 / r523
  - Jin Hee-Kyung r248 / r1075
  - Lim Ju-Hwan r195 / r621
  - Ji Hyun-Woo r240 / r241
  - Joy r277 / r1144
  - Gong Ji-Ho r1117 / r1201
  - Chae Seo-An r983 / r1179
- [ ] Typos:
  - r937 **ParknKeun-Rok** → *Park Keun-Rok* (also used in Main role of r126 *Dark hole*).
  - r1099 **Baekk Seo-Hoo** (not cast anywhere).
- [ ] Same person or not? Merge only if so:
  - Kim Jiwon r995 / Kim Ji-Won r397
  - Yeonwoo r855 / Yeon Woo r853
  - Yeri r856 / Ye Ri r848
  - Eugene r1234 / Jung Eugene r282
  - Jisoo r256 / Ji Soo r243 are different people — keep both.
- [ ] Not cast in any title: Jinyoung r255, Hye-Sun r188, Baekk Seo-Hoo r1099. Keep them or remove them.
- [ ] 50 photo links are `share.google` and won't be fetched — replace each with a `pin.it` link:
  - r10 Ahn Seung-Gyun · r11 Ahn Si-Eun · r24 Bae Yoon-Kyung · r25 Baek Ji-Won · r29 Baek Yoon-Shik
  - r30 Bang Hyo-Rin · r36 Bong Tae-Kyu · r55 Chi Hae-Won · r58 Cho Hye-Jung · r59 Cho Hyun-Chul
  - r60 Cho Jae-Hyun · r62 Cho Jun-Young · r64 Cho Seong-Ha · r70 Choi Byung-Mo · r74 Choi Hee-Seo
  - r85 Choi Kyung-Hoon · r91 Choi Mu-Sung · r114 Do Ji-Won · r139 Kong Seong-Ha · r141 Goo Doo-Shim
  - r164 Heo Joon-Ho · r190 Hyun Bong-Sik · r213 Jang Hee-Jin · r234 Jeon Yeong-In · r235 Jeong Bo-Seok
  - r391 Kim Jee-Soo · r398 Kim Ji-Young · r400 Kim Jong-Soo · r404 Kim Jung-Eun · r408 Kim Guk-Hee
  - r515 Lee Dong-Gun · r521 Lee Geung-Young · r524 Lee Hae-Young · r527 Lee Ho-Chul · r533 Lee Hye-Young
  - r554 Lee Joong-Ok · r558 Lee Jung-Eun · r567 Lee Kyung-Young · r584 Lee Seol · r602 Lee Sung-Wook
  - r605 Lee Tae-Young · r786 Shin Yeon-Woo · r893 Yoon Sun-Woo · r895 Youn Yuh-Jung · r898 Yuna
  - r902 Lee Ga-Sub · r904 Go Gyu-Pil · r905 Choi Gwi-Hwa · r906 Seo Yi-Sook · r933 Park Se-Jun
- [ ] 935 actors have no photo at all; a placeholder shows until you add one.

### G. Kdrama image links
- [ ] r339 **Money flower** poster: the URL is pasted twice in one cell. The sync uses the first copy, but please
  clean it up.
- [ ] `share.google` links (not fetched):
  - r593 *The kidnapping day* poster + banner
  - r118 *Cringy romance* banner
  - r312 *Love: track* banner
  - r559 *The chairman of class 9* banner
- [ ] The same URL used on two rows — one of each pair is probably wrong:
  - r93 *Cheese in the trap* banner = r105 *Cleaning with passion for now* poster
  - r636 *The world of the married* poster = r642 *Tomorrow with you* banner
  - r324 *May I help you* poster = its own banner
  - r525 *Strongest deliveryman* banner = r526 *Study group* poster
  - r609 *The penthhouse 2* poster = r610 *The penthhouse 3* poster
  - r371 *My lovely journey* poster = r372 *My lovely journey 2* poster
  - r310 *Love your enemy* banner = r312 *Love: track* poster
- [ ] `pinterest.com/pin/…` links may fail (see §5); swap them for `pin.it` links if the admin page reports failures:
  - r191 *Frankly speaking*
  - r303 *Love Me*
  - r519 *Stock Struck*

### H. Missing data
- [ ] r470 **Save me 2**: add tropes, mood, synopsis, poster, banner (hidden until it has a poster).
- [ ] r418 **Our universe**: add genres and tropes.
- [ ] r352 **Moving 2** and r372 **My lovely journey 2**: add a year (hidden until they have one). Moving 2 also
  needs a poster and banner.
- [ ] r527 **Study group 2**: add a poster (hidden until then) and a banner.
- [ ] r77 **Boyhood 2**: add episodes and a banner. r31 **All of us are dead 2**: add a banner.

### I. Status review
- [ ] 54 titles dated 2026 are marked **Completed**. Check any still airing (only *Four hands, two sonatas* is
  Ongoing):
  - A bona fide killer · A shop for killers 2 · Absolute Value of Romance · Agent kim reactivated · Azure spring
  - Bloodhounds 2 · Bloody Flower · Boyfriend on demand · Can this love be translated? · Climax
  - Doctor on the edge · Dream to you · Fifties professionals · Filing for love · Flex x cop 2 · Gold land
  - Honour · If wishes could kill · In your radiant season · Love in sync · Love phobia · Made in korea 2
  - Mousetrap · My bias, my boss · My royal nemesis · No tail to tell · Notes from the last row
  - Our sticky love · Our universe · Perfect crown · Phantom lawyer · Positively yours · Reborn Rookie
  - See you at work tomorrow! · Siren's kiss · Sold out on you · spooky in love · Spring fever · Still shining
  - Teach you a lesson · The affair was just the beginning · The apartment job · The art of Sarah
  - The east palace · The husband · The judge returns · The legend of the kitchen soldier
  - The practical guide to love · The scarecrow · The wonderfools · To my beloved thief
  - Undercover miss hong · We are all trying here · Yumi's cells 3
- [ ] *Made in korea 2* and *Mousetrap* are Completed but have no rating.

### J. Shelves, tags, dropdowns
- [ ] **Curated Collections**: tag the titles for the *K-Drama Starter* shelf. Any new name you type there
  becomes an extra shelf (D30).
- [ ] Mood tags without a description: *episode 1 hook, fast-paced, masterpiece, disappointing ending,
  Intense action, gory & violent*. Their tooltips will be empty.
- [ ] Optional: add descriptions for the 25 genres.
- [ ] Keep `"slow starter, worth it"` inside quotes wherever you use it (D32). A missing quote gets flagged.
- [ ] The dropdown ranges are fixed (Genres A3:A27, Mood A3:A25, Tropes B3:B185, Year 2011–2027, Curated
  "K-Drama Starter" only). New tags, years or shelves won't appear in the dropdowns until you extend them to
  whole columns.
- [ ] Optional/cosmetic:
  - Banner counts on the tag sheets are stale.
  - The Movies and reality banners say "Drama Database".
  - Two trope categories share ⚔️, and "⚔️ Action & Thriller " has a trailing space.
  - Near-duplicate tropes: *bromance* / *bromance steals the show*; *undercover* / *undercover agent / cop* /
    *undercover in daily life*.

### K. Set-up items (during S1)
- [ ] Install the Apps Script that adds the **Dramoir ID** column (D5). Never edit that column by hand.
- [ ] Share the sheet (read-only) with the service account email you'll be given.
- [ ] The `Dramas` column in Actors Reference is no longer used (D4). You can keep it or delete it.
