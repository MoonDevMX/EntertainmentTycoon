# HANDOFF V44 — DEFINITIVE EDITION

> **You are agent #42 (V45). Read this top-to-bottom before you touch anything.** This is the master orientation doc for *Tycoon Cinema* (a.k.a. Moon Cinema Tycoon / Media Entertainment Tycoon). It supersedes everything that came before. The user has invested ≈41 agent-sessions in this codebase. Do not break their work, do not "refactor" file structure on a whim, and do not invent new save formats. Read first, ship second.

---

## 0 · The User & Their Constraints

- **Owner**: MoonDevMX. Native Spanish speaker (English second). Communicates in **short, urgent bursts** with typos. Translate intent, do not nitpick spelling.
- **Mode**: Mobile-first, sometimes types from phone. Will sometimes paste GitHub URLs. Will sometimes say "the game" or "the app" interchangeably.
- **Credits**: Buys Emergent credits in batches (30–50 at a time). Says "I refilled X credits" → continue, don't stop to ask permission.
- **Patience**: LOW for ceremony, HIGH for substance. Skip preamble. Lead with what's broken and what you fixed.
- **Their #1 ask**: Squash bugs before adding features. They have hit "bug fatigue" — every shiny new system without polish becomes a new bug surface.
- **They do not push their own code** — you push for them or hand them a token. Always ask before pushing to GitHub.

---

## 1 · What This App Is

A **single-player media-empire simulation tycoon**, mobile-first, completely offline. Players run a studio that:

- Produces **movies** (with writers/directors/cast, marketing campaigns, theatrical or streaming or hybrid releases).
- Produces **TV series** (seasons, episodes, networks).
- Operates **theatrical cinemas** (owned + chain partnership deals).
- Operates **streaming services** (up to 3, multi-tier, exclusive + licensed catalog, ad-supported tiers).
- Operates **TV networks** (broadcast, cable, premium; own networks + cable carriage).
- Operates **cable packages** (sister-channel bundles).
- Trades **IP / franchises** with external licensors and rival studios.
- Negotiates with **talent** (writers, directors, actors, actresses, with color-trait personalities).
- Wages **bidding wars** for hot licensable rival titles.
- Receives proposals from **AI Managers** (Cinema Manager, TV Manager, Owned-Cinema Manager) every few weeks.

The world also includes:
- 4 rival AI studios with their own movies, deals, and aggression patterns.
- A 200-week rolling **studio-stats history** for charts.
- A **weekly recap modal** that auto-shows with deltas after every tick.
- A **ledger** that records every cash mutation (inflow/outflow tagging).
- A **news feed** of in-world events.

---

## 2 · Tech Stack & Architecture

### The Big Picture
- **Expo SDK 54** + React Native + expo-router. Runs natively on iOS/Android **and** as a PWA via `expo start --web`.
- **AsyncStorage** for all persistence. Storage key: `tycoon_v4` (DO NOT CHANGE — would invalidate 41 agents of save data).
- **OFFLINE.** The sim runs entirely client-side. FastAPI backend exists in `/app/backend/server.py` but is **not used by gameplay**. It can be ignored unless explicitly asked to add online features.
- **TypeScript** everywhere. ESLint is configured but is not TS-aware here — it errors on `.tsx` files. **Trust Metro/Babel compile output, not ESLint output.**

### Service / Port Layout in Emergent
- Frontend served on port 3000 (`expo start --web --port 3000`). Supervisor program: `frontend`.
- Backend on port 8001 (unused at runtime). Supervisor program: `backend`.
- MongoDB on port 27017 (unused). Supervisor program: `mongodb`.
- Kubernetes ingress routes `/api/*` → backend, everything else → frontend. Since gameplay never uses `/api`, no public routing concerns.
- Preview URL is regenerated per Emergent environment. **V43 used `media-empire-sim`, V44 uses `streaming-dynasty`** — never assume; read it from the system prompt.

### File Layout
```
/app/
├── backend/                       # FastAPI shell. Not used by game.
│   ├── server.py
│   └── requirements.txt
├── frontend/                      # The actual game.
│   ├── app/                       # expo-router screens (file = route).
│   │   ├── _layout.tsx            # Root navigator.
│   │   ├── index.tsx              # Splash / load screen.
│   │   ├── setup.tsx              # New studio creation.
│   │   ├── dashboard.tsx          # Main hub. ALL nav lives here.
│   │   ├── create-movie.tsx       # Movie creator (mature flow).
│   │   ├── create-series.tsx      # TV series creator (V44 brought toward parity with movies).
│   │   ├── current-movies.tsx     # Now-playing / coming-soon / on-hold.
│   │   ├── streaming.tsx          # Streaming services list + bid wars panel.
│   │   ├── streaming/             #   /streaming/[id] — service detail (HEAVY: tiers, catalog, exclusivity, licensing).
│   │   │   ├── [id].tsx
│   │   │   └── launch.tsx
│   │   ├── cinemas.tsx            # 4-tab page: Deals / Manager / My Cinemas / Calendar.
│   │   ├── tv-networks.tsx        # 5-tab page: Networks / My TV / My Cable / Cable / Manager.
│   │   ├── series.tsx             # Series list.
│   │   ├── series/[id].tsx        # Series detail.
│   │   ├── movie/[id].tsx         # Movie detail.
│   │   ├── franchise/[id].tsx
│   │   ├── franchises.tsx
│   │   ├── marketing/             # /marketing index + /marketing/[movieId] for per-title plan.
│   │   ├── talent.tsx             # Talent database.
│   │   ├── negotiate/[talentId].tsx
│   │   ├── financials.tsx         # 200-week studio history.
│   │   ├── studio-stats.tsx
│   │   ├── rivals.tsx
│   │   ├── offers.tsx             # Pending offers (license, IP, etc.).
│   │   ├── external-ip.tsx
│   │   ├── festivals.tsx
│   │   ├── trends.tsx
│   │   └── tv-network-search.tsx
│   ├── src/
│   │   ├── game/
│   │   │   ├── types.ts           # Source of truth for all interfaces.
│   │   │   ├── data.ts            # Seeds, constants, helpers (WEEKS_PER_YEAR = 48).
│   │   │   ├── sim.ts             # THE SIM (~6298 LOC). All gameplay logic.
│   │   │   ├── state.tsx          # React Context wrapper around sim. Public surface for UI.
│   │   │   └── ledger.ts          # Cash mutation tagging.
│   │   └── ui/
│   │       ├── theme.ts           # T = cyberpunk-neon palette.
│   │       ├── components.tsx     # TopBar, NeonStat, SectionHeader, IconTile, GreyButton, etc.
│   │       └── ui-alert.ts        # Platform-aware alert helper.
│   ├── assets/
│   ├── app.json
│   ├── package.json               # start script: `expo start --web --port 3000`
│   └── metro.config.js
├── memory/
│   ├── PRD.md                     # Current-session summary.
│   ├── handoff/
│   │   ├── HANDOFF_V42d.md        # Historical.
│   │   ├── HANDOFF_V43.md         # Historical.
│   │   └── HANDOFF_V44.md         # ← YOU ARE READING THIS
│   └── test_credentials.md
├── tests/                         # pytest sim tests (run rarely; sim is the source of truth).
└── test_reports/                  # testing_agent_v3 outputs.
```

### Sim Architecture (read this carefully)

- **`sim.ts` is sacred.** It is ~6300 LOC and grows by 100–400 LOC per session. Do not "modularize" it without a real reason — the user's 41 agents have all touched it and the cross-references are dense. If you split it, you will spend most of your session moving imports around and break something.
- **State is immutable.** Every exported sim function returns a **new** `GameState` (or `{ state, error?, … }`). Never mutate in place. Helpers (the `_bump*` ledger writers inside `tickWeek`) close over a local mutable copy for performance, but the **public API is immutable**.
- **`tickWeek(state)` is the heart.** Calls a chain of sub-ticks in order:
  ```
  ensureTVNetworks → tickMovies → tickRivalAcquisition → tickStreamingSubs →
  tickOwnedCinemas → tickChainDeals → tickTVNetworks → tickTVSeries →
  tickPlayerCableNetworks → tickAIWorldDynamics → tickMarketingDecay →
  tickNewsAging → tickRivalAI → … → ledger commit → recap delta calc → return.
  ```
  Each sub-tick is pure (state-in, state-out, ledger entries via closure).
- **Subscribers are absolute counts** (e.g. `svc.subscribers = 50_000_000` = 50 million subs). **TV `subscribers` field is in millions.** **The unit mismatch caused the great V44 economy bug.** Whenever you see `subscribers * X`, ask yourself which one.
- **Cash is in $B (billions)** for `player.cash`, `rival.cash`, ledger weekly deltas. **Movie budgets, marketing spend, license fees, etc. are in $M (millions)**. Convert by `/1000` or `*1000`. **Most bugs in this codebase are unit conversion bugs.** Re-derive units from comments before trusting a formula.

### Helpers You Will Use Constantly

| Helper | Lives in | Purpose |
|---|---|---|
| `computeLicenseFee(movie, years, week, year, opts)` | `sim.ts` | Fair value of a movie license. Returns $M. |
| `recomputeStreamingSubs({ tiers, … })` | `data.ts ~658` | Re-derive a service's subscriber count and monthly revenue ($M) from market conditions. |
| `findMovieExclusivityLock(state, movieId, excludingServiceId?)` | `sim.ts ~940` (V44 NEW) | Returns the locking service info or null. Use BEFORE any new license operation. |
| `amenityWeeklyOpex(c)` | `sim.ts ~4084` (V44 exported) | Per-cinema add-on opex ($M/wk). |
| `cinemaDealRange(rep, rating)` | `sim.ts` | Returns acceptable share % range for chain deal negotiation. |
| `calculateAcceptance(talent, …)` | `sim.ts` | Talent verdict: `will_accept` / `likely_accept` / `considering` / `likely_reject` / `will_reject`. |
| `nudgeRelInPlace(rels, a, b, delta)` | `sim.ts` | Mutates a relationships object (only safe inside sub-ticks). |
| `monthOf(weekInYear)` | `data.ts` | Returns `{ name, weekInMonth }`. |
| `holidayFor(weekInYear)` | `data.ts` | Returns holiday name if release falls on one. |

---

## 3 · Major Feature Map (what the player can do)

> Each row = a top-level system. "Health" = the maturity level. ✅ shipped + tested, 🟡 partial, ❌ stub, ⚠️ known bug.

| System | Health | Notes |
|---|---|---|
| **New Studio Setup** | ✅ | Pick treasury ($5B / $20B / $50B), studio name, logo. Persists. |
| **Weekly Tick** | ✅ | Single + multi-week sim. Recap modal auto-shows. Accumulates across multi-week sims. |
| **Studio Stats / Financials** | ✅ | 200-week rolling history. Charts pending (V45). |
| **Movie Creator** | ✅ | Crew, cast, deal-split chips, contract chips, inline negotiation, full-screen `/negotiate/[id]`, marketing tab, release strategy selector. **The reference UX.** |
| **TV Series Creator** | 🟡 | V44 added "Browse Talent" + "Open Full Negotiation". Inline DEAL SPLIT / CONTRACT chips still missing (V45). |
| **Marketing System** | ✅ | Per-title `marketingAllocation` (channels: TV / internet / billboards / etc.). Real-time efficiency feedback. `marketingBudget` baked in at movie creation. Marketing decay handled in tick. V44 fixed the dashboard button routing. |
| **Talent Database** | ✅ | Writers, directors, actors, actresses, with `fame`, `skill`, `colorTrait`, `salary`. Hire/release flow. Negotiations. |
| **Cinemas — Chain Deals** | ✅ | 5–10y deals with major real-style chains. AI counter-offers. Renewal. |
| **Cinemas — Owned** | ✅ | Build small/medium/large/megaplex in any region. Upgrade with amenities (IMAX, recliners, premium concessions). Mass-mode bulk operations. **V44 grouped by region+size** for cleaner UI. |
| **Cinemas — Manager** | ✅ | V44 unified: chain + owned suggestions in one tab. AI proposes deals, supplier swaps, scheduling re-runs. |
| **Cinema Calendar** | ✅ | V44 made the tab reachable. Schedule chain releases + owned-cinema runs. |
| **Cinema Supplier Deals** | ✅ | Pre-negotiated revenue split with a rival studio's owned cinemas. |
| **Streaming Services** | ✅ | Up to 3 per studio. Multi-tier. Ad-supported tier flag. Tier price/screens/users. Exclusivity flags. Licensed-in catalog with own tier mapping. |
| **Streaming Licensing** | ✅ | Single-title + bulk catalog + franchise-bulk + future-releases multi-year. **V44 enforces global exclusivity locks.** Negotiation 3-round counter system. |
| **Bid Wars** | ✅ | Hot rival titles surface in streaming hub; first to outbid wins. **V44 filters out exclusively-locked titles.** |
| **TV Networks (own)** | ✅ | Launch broadcast/cable/premium channels. Air own content for free. License rival content. |
| **TV Networks (rival)** | 🟡 | V44 grouped by sister-network prefix (Heritage Network × 14, etc.). Whole-network INBOUND UI still missing (sim ready). |
| **TV Manager** | ✅ | V44 always visible + dedicated tab. Suggests cable carriage, license inbound, license outbound, air own content. |
| **Cable Networks (own)** | ✅ | Bundle channels into packages with fees. |
| **Cable Carriage Deals** | ✅ | Sign rivals' channels to your cable, or yours to rivals'. |
| **TV Series** | ✅ | Multi-season, multi-episode. TV/Streaming/Hybrid release. Renewal + cancellation. |
| **Franchises** | ✅ | Auto-form from sequels. Cross-overs. Sell/buy whole franchises with rivals. |
| **IP Marketplace** | ✅ | External licensors offer franchise rights with packs/boPercent/merchPercent/exclusivity flags. Outbound listings (player as licensor). |
| **Rival AI** | ✅ | Movie production, licensing, exclusivity bidding, relationships, cable plays. |
| **Festivals** | ✅ | Submit movies for prestige boosts. |
| **Trends** | ✅ | Genre popularity shifts. |
| **Ledger** | ✅ | Every cash mutation tagged (`inflow.streaming_subs`, `outflow.cinema_opex`, etc.). |
| **News Feed** | ✅ | In-world events surfaced as a rolling 400-item log. |

---

## 4 · V44 Changelog (this release)

### Critical Bug Fixes

#### 4.0 Cinema Opex Rebalance (V44.1 hotfix)
User report: *"Cinema cost is too high… it eats about hundreds of millions with a few hundred [cinemas]."*

**Root cause**: V42 base opex of $0.5M / $1.2M / $2.5M / $4.5M per cinema/wk was ~10× real-world. 300 small cinemas → $150M/wk = ~$7B/yr — instantly bankrupting any large operator.

**Fix** (`sim.ts ~3955` + `~4100` for amenities):
| Tier | V43 opex/wk | V44.1 opex/wk |
|---|---|---|
| Small (2 screens) | $0.5M | **$0.08M** |
| Medium (6 screens) | $1.2M | **$0.20M** |
| Large (12 screens) | $2.5M | **$0.40M** |
| Mega (20 screens) | $4.5M | **$0.75M** |
| IMAX amenity | $0.4M | **$0.05M** |
| Recliners | $0.2M | **$0.02M** |
| Premium snacks | $0.1M | **$0.01M** |

Real-world ref: AMC ~600 theaters × $0.024M/wk ≈ $14M/wk total. Our values stay 3–7× above that to keep management strategic.

**Save migration**: `tickOwnedCinemas` now reads `weeklyOpex` from `OWNED_CINEMA_SPECS[c.size]` instead of the stored cinema field, so existing saves auto-rebalance. UI labels in `cinemas.tsx` also use the spec value for display consistency.

---

### Critical Bug Fixes (Cont.)

#### 4.1 Streaming Server Cost — $9 trillion/month
**The big one.** `svc.subscribers` is an absolute count (e.g. 50,000,000). The legacy V43 formula treated it as already-in-millions:
```ts
// V43 (broken)
const serverMonthlyM = svc.subscribers * 0.18 + catalogLen * 0.012;
// → 50M subs × 0.18 = $9,000,000M = $9T/mo
```
Fixed in `sim.ts ~2371`:
```ts
const subsInMillions = svc.subscribers / 1_000_000;
const serverMonthlyM = subsInMillions * 0.18 + catalogLen * 0.012;
// → 50M subs ≈ $9M/mo ≈ $2.25M/wk
```
Two companion fixes for the same units bug:
- Ad ARPU recompute (`sim.ts ~2365`) — divided by 1M.
- Marketing-boost revenue recompute (`sim.ts ~2349`) — divided by 1M.

**Verification**: Testing agent ran Week 1 → modeled costs ≈ $191M (sane). Pre-fix would have been $T-scale.

#### 4.2 Global Exclusivity Lock Enforcement
User report: *"I was able to license a movie that was already exclusive. Exclusives are exclusives everywhere — cinemas, franchises, movies, channels, TV shows etc."*

New public helper in `sim.ts ~940`:
```ts
export function findMovieExclusivityLock(state, movieId, excludingServiceId?): ExclusivityLock | null
```
Detects two kinds of locks:
1. **owner_exclusive** — owner's own service marks the movie in `exclusiveMovieIds`.
2. **licensed** — any service has the movie in `licensedMovies` with `exclusivity: true` and not yet expired.

Enforced in:
- `licenseMovieToStreaming` — also blocks duplicate license on the player's own other service.
- `negotiateMovieLicense` — fails fast before AI cost calc.
- `proposeBulkCatalogLicense` — each title in a catalog/franchise bulk deal is checked.
- `acceptLicenseOffer` — player can't accept a rival offer for a title that's been re-locked since the offer arrived.
- `proposeTVNetworkDeal` — TV broadcast deals respect streaming-exclusives.

UI feedback added to `streaming/[id].tsx` and `streaming.tsx`:
- `exclusiveLockMap` memo precomputes per-movie lock state.
- Browse Licensable list: locked rows render with opacity 0.6, orange border, 🔒 in the title, disabled "Locked" button with "*🔒 EXCLUSIVE to {svc} ({owner}) until {expiry}*".
- Catalog rows show clear badges: `★ OWN-EXCL` (owner-exclusive) vs `🔒 EXCL LICENSE` (licensed-exclusive).
- Bid Wars panel skips locked titles.

#### 4.3 Tier-Change / Remove Buttons Unresponsive
Root cause: catalog rows in `streaming/[id].tsx` were rendered as `<TouchableOpacity onPress={navigate}>` wrapping inner `<TouchableOpacity onPress={openModal}>`. On React Native Web, even with `e.stopPropagation()`, the outer press handler fired after the inner one — so tapping "edit tiers" navigated away before the modal could open.

Fix: outer row is now a `<View>`. Only the icon+title region is a `<TouchableOpacity>` (`testID: catalog-open-{id}`). Each action button (tier-edit, remove, exclusive-star, bulk-check) is its own sibling TouchableOpacity. **Pattern to apply elsewhere if you see "buttons not responding" reports.**

#### 4.4 Marketing Dashboard Button Misrouted
The Marketing tile on the dashboard branched:
- 0 in-production movies → `/current-movies` (?!).
- ≥1 in-production movies → `/marketing/{lastMovieId}` (jumped past the index).
Never reached `/marketing` itself. User reported it as "duplicate of current movies — bugged".

Fix: always navigate to `/marketing` (the index page that shows the proper list).

#### 4.5 UI Reorganization (carried-forward from V44 round 1)
- **Cinemas page** — added missing **Calendar** tab; **unified Manager** tab (chain + owned proposals together); **grouped "My Cinemas"** by region+size into `SMALL CINEMAS × N` cards with expand/collapse; supplier-deal button now discoverable on Mine tab.
- **TV Networks page** — Manager banner **always visible**; added dedicated **Manager tab**; **grouped rival channels** by sister-network prefix (`Heritage Network × 14`, etc.).
- **Series Creator** — **"BROWSE TALENT DATABASE →"** CTA + per-cast **"🤝 Open Full Negotiation →"** button (parity with movie creator).
- **Streaming detail** — prominent **EDIT TIERS** button next to Tiers header; tier cards themselves tappable to enter edit mode.

### Infra / Tooling
- `package.json` start script changed to `expo start --web --port 3000` (needed for the Emergent web preview). Native dev still works via `yarn android` / `yarn ios`.
- `amenityWeeklyOpex` (was private) → `export`ed for use in the grouped cinema summary.

---

## 5 · Known Bugs / Glitches / Hazards (V45 — fix these as they appear)

### High-Priority Latent Bugs
1. **Unit-conversion landmines.** Every `subscribers × X` is a candidate. Search for them. Streaming subs are absolute; TV subs are in millions. `cash` is $B everywhere. Movie budgets are $M. Drop the wrong unit into the wrong field and you get either pennies or trillions.
2. **`exclusiveLockedBy` (sim.ts ~1451)** — *Local* closure helper inside the AI ticker. Predates `findMovieExclusivityLock` (V44). It currently checks only the `licensed` kind. **Not a bug yet** but if AI gains "buy owner-exclusive movies away" logic, update it to also check `exclusiveMovieIds`.
3. **WEEKS_PER_YEAR drift.** Real value is 48 (`data.ts`). Some legacy spots hard-code `* 48`. If you ever change it to 52, you must search-and-replace.
4. **Cash never goes negative is not enforced everywhere.** Most pay-X functions check, but some weekly opex sub-ticks subtract regardless. The player can dip negative if they over-commit before a tick.

### Stylistic / Quality-of-Life
5. **Auto-save toggle.** Currently always saves after every tick. Some users want a "pause autosave" for experimentation.
6. **No clipboard import/export** of save data — users have no way to back up.
7. **Studio Financials lacks sparklines** — data exists, chart UI not built.
8. **Recap modal** can't be reopened from `/financials`.
9. **Shadow* / textShadow*** deprecation warnings in console — React Native Web 0.20+ wants new syntax. Cosmetic only.

### UX Annoyances Reported by User
10. The user repeatedly asks for things to be "less spread out". When in doubt, **consolidate** — merge tabs, group lists, hide noise. The cinema grouping (V44) is the canonical example.
11. They dislike "data dumps" — they want clear status pills, not paragraphs. Look at the OWN-EXCL / EXCL LICENSE badges for the pattern.
12. They want **parity** between movies and TV series. If you build a feature for movies, plan how the series version will work in the same screen.

### Specific Features Asked-For But Not Yet Built (carry into V45)
13. **Whole-Network INBOUND UI** (~80 LOC frontend). Sim function `signWholeNetworkLicenseInbound` exists. UI to consume it (on "My TV" tab) is missing.
14. **TV Series marketing chip row** (~30 LOC). Sim handles `setEntityMarketing('series', …)`; UI absent.
15. **Apply marketing growth boost to cinemas + cable** (~30 LOC sim). Currently only streaming & TV channels apply mktBoost.
16. **Series Creator inline DEAL SPLIT / CONTRACT chips.** V44 added "Open Full Negotiation" link; inline chip parity with movie creator still missing.
17. **Balance re-tuning pass** — after a full playthrough with the V44 economy fix, verify costs are still 7–15% of gross. The user has not yet completed a 50-week playthrough on the fixed economy.

---

## 6 · Tricks & Patterns You Will Need

### Pattern: Editable Catalog Rows
Use a `<View>` as the row container. Make only the *information region* a TouchableOpacity. Each action icon (edit / remove / star) is its own sibling TouchableOpacity. **Never nest** unless you absolutely have to. See `streaming/[id].tsx` catalog row (V44) for the canonical example.

### Pattern: Group Long Lists by `(category, subcategory)`
When the user complains "too many of X listed individually", group by name-prefix or by `(region, size)` or by `(network-prefix)`. Render the group header card with count and aggregate stats; expand on tap. Compact grouping is consistent across:
- Cinemas Mine tab (V44).
- TV Networks Networks tab (V44).
- TV Networks cable add-channel modal (V42d).

### Pattern: AI Manager Banner + Tab
Each major page that has an AI Manager system should have:
1. A **banner** at the top that's always visible (even with 0 proposals — shows "Tap to review").
2. A dedicated **Manager tab** with the full list + Scan button + empty-state copy.
3. A badge on the Manager tab equal to pending-count.
Compare cinemas Manager tab (V44) and TV networks Manager tab (V44).

### Pattern: Exclusivity Lock Check
Before any new license / sale / transfer, call:
```ts
const lock = findMovieExclusivityLock(state, movieId, currentServiceId);
if (lock) return { state, error: `🔒 Locked to ${lock.svcName} (${lock.ownerStudioName})` };
```
Re-use the helper rather than rebuilding the scan. UI side: pre-build an `exclusiveLockMap` memo so you don't recompute per row.

### Pattern: Talent Acceptance Chip
`calculateAcceptance(talent, contractMult, salary, dealSplitMod, salaryMult)` returns `{ verdict, reason }`. Render a colored chip in the cast row. If verdict ≠ `will_accept` / `likely_accept`, surface an "Open Full Negotiation →" button that routes to `/negotiate/[talentId]`. Movies and Series should use this same flow.

### Pattern: Ledger + Recap
Every cash movement inside `tickWeek` must go through `_bump`/`_bumpL` so it lands on the ledger AND the recap. If you skip the ledger, the user will spot the missing money — they read the recap carefully.

### Pattern: SafeArea + TopBar
Every screen begins with:
```tsx
<SafeAreaView style={s.container} edges={['top', 'bottom']}>
  <TopBar title="Foo" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
  …
</SafeAreaView>
```
No exceptions.

### Pattern: testID on Every Interactive Element
Always. Testing agent uses these. Examples in V44: `tab-{kind}`, `tv-tab-{kind}`, `edit-tier-access-{id}`, `license-{id}`, `series-cast-{idx}-negotiate`.

### Pattern: Cyberpunk-Neon Palette
Defined in `src/ui/theme.ts` as `T = { cyan, magenta, yellow, green, orange, red, pink, bg, card, cardDark, border, text, textDim, textMute, … }`. Use these tokens; never hardcode colors. The user likes it neon-bright on dark backgrounds — DO NOT use translucent backgrounds (they look bad on dark/light system themes).

### Anti-Pattern: Modal Stacking
Avoid more than 2 modals deep. If you must, add explicit close buttons on each and `onRequestClose` handlers.

### Anti-Pattern: useState in Render-Function Closures
Always declare state at the top of the component. expo-router will sometimes re-render aggressively and stale closures will bite you.

---

## 7 · How to Set Up After Inheritance

1. `cd /tmp && git clone https://github.com/MoonDevMX/Tycoon-V36.git tycoon && cd tycoon && git checkout V44`.
2. `cp -r tycoon/frontend tycoon/backend tycoon/memory tycoon/tests /app/`.
3. `cd /app/frontend && yarn install --silent`.
4. `cd /app/backend && pip install -q -r requirements.txt` (harmless even though backend is unused).
5. `sudo supervisorctl restart frontend backend`. Wait 15 seconds for Metro to bundle.
6. Open the preview URL from the system prompt. You should see the splash and be able to create a new studio.
7. Run a test simulate to confirm: dashboard → Simulate Multiple Weeks → 12 → recap should show plausible (sub-$1B/wk) costs.

If frontend fails to start, check `/var/log/supervisor/frontend.err.log`. 99% of the time it's a stale `node_modules` — `rm -rf node_modules && yarn install` resolves it.

---

## 8 · User Data Format

`AsyncStorage` key: `tycoon_v4`. Value is the JSON-stringified `GameState`. Top-level fields you'll find:
- `player: Studio`, `rivals: Studio[]`.
- `movies: Movie[]`, `tvSeries: TVSeries[]`, `franchises: Franchise[]`.
- `streamingServices: StreamingService[]`, `tvNetworks: TVNetwork[]`.
- `playerCableNetworks: CableNetwork[]`, `cableCarriageDeals: CableCarriageDeal[]`.
- `ownedCinemas: OwnedCinema[]`, `cinemaChainDeals: CinemaChainDeal[]`.
- `cinemaProposals: CinemaChainProposal[]`, `cinemaOwnedManagerProposals: OwnedManagerProposal[]`, `tvManagerProposals: TVManagerProposal[]`.
- `cinemaSupplierDeals: CinemaSupplierDeal[]`, `cinemaCalendar: ChainSchedule[]`.
- `bulkCatalogOffers: BulkCatalogOffer[]`, `pendingOffers: LicenseOffer[]`, `franchiseOffers: FranchiseOffer[]`.
- `externalLicensors: ExternalLicensor[]`, `externalIPOffers: IPOffer[]`.
- `talents: Talent[]`.
- `ledger: LedgerEntry[]`, `weeklyRecap: RecapDelta`.
- `studioStats: WeeklyStatsSnapshot[]` (rolling 200).
- `newsLog: NewsItem[]` (rolling 400).
- `relationships: { [studioIdA__studioIdB]: number }`.
- `week: number`, `year: number`.
- `trends: TrendSnapshot[]`, `festivals: Festival[]`.

**Do not bump the storage key** unless you intentionally want to invalidate all 41 prior agents' save data. If you change schema, write a migration in `state.tsx` `useEffect` (load step) — gracefully convert old shape to new and write back.

---

## 9 · Verification Checklist for V45

Before declaring V45 done, manually:

- [ ] Boot → new studio (any treasury) → dashboard renders.
- [ ] Simulate 12 weeks → recap shows reasonable numbers (no trillions in any field).
- [ ] Open Streaming → create service → add an owned movie → tap pencil → tier modal opens → select tiers → Save → catalog row shows new tier label.
- [ ] Browse licensable titles → confirm 🔒 Locked rows render where applicable.
- [ ] Cinemas: 4 tabs work; My Cinemas shows grouped cards; Manager shows both chain + owned suggestions.
- [ ] TV Networks: banner visible, 5 tabs work, rival channels show grouped cards.
- [ ] Series Creator → "Browse Talent Database" → /talent → back → cast picker works → "Open Full Negotiation" works.
- [ ] Marketing button on dashboard → goes to /marketing (NOT /current-movies, NOT /marketing/{id}).
- [ ] Test no red screens / no critical console errors (shadow* warnings are OK).
- [ ] Run `testing_agent_v3` after any non-trivial change.

---

## 10 · Decision Log (why things are the way they are)

| Decision | Rationale |
|---|---|
| Offline-only, no backend gameplay | User's #1 priority is mobile play without network. Server costs unsupported on personal account. |
| AsyncStorage key `tycoon_v4` | Persist across V4x releases. Migrations live in `state.tsx`. |
| Cyberpunk-neon UI | User's aesthetic. Do not redesign without explicit request. |
| Sim in one big file | 41 agents have indexed it that way. Refactoring is risk without benefit. |
| ESLint not TS-aware | Pre-existing config the user inherited; not worth fighting. Use Metro/Babel for real errors. |
| Cinema grouping by (region, size) | User's explicit ask — "no need to list every cinema individually, group small × 50". |
| TV Manager + Cinema Manager unified | User's "split in 2" complaint. Single source of suggestions wins. |
| Exclusivity is global | User's "exclusives are exclusives everywhere" rule. |
| Marketing button → index page only | User's "duplicate of current movies" complaint. The deep-link shortcut was misinterpreted as a bug. |
| `expo start --web --port 3000` in `package.json` | Emergent supervisor expects `yarn start` to bind 3000. |

---

## 11 · Quick Reference: Commands

```bash
# Restart frontend after a deps/env change
sudo supervisorctl restart frontend

# Tail logs (most useful)
tail -n 50 /var/log/supervisor/frontend.out.log /var/log/supervisor/frontend.err.log

# Lint TS (note: ESLint will false-error; use Metro output as source of truth)
yarn --cwd /app/frontend tsc --noEmit 2>&1 | head -50

# Add a backend dep (rarely needed)
cd /app/backend && pip install <pkg> && pip freeze > requirements.txt

# Add a frontend dep
cd /app/frontend && yarn add <pkg>

# Commit on V44 branch
cd /app && git add -A && git -c user.email=v44@emergent.ai -c user.name="V44 Agent" commit -m "msg"

# Run testing agent (preferred over manual playwright scripts)
# See system prompt for the testing_agent_v3 tool.
```

---

## 12 · Things the User Will Probably Ask in V45 (preempt them)

- *"Can we push to GitHub now?"* — Ask for a PAT (`repo` scope), single-push, don't store. Or tell them to use Emergent's "Save to GitHub" UI; branch is currently `V44`.
- *"Why is my treasury so big/small?"* — They picked a tier in `setup.tsx`. Conglomerate = $50B.
- *"Why doesn't my movie make money?"* — Marketing was 0, or release window was bad, or crew quality was low, or it was scheduled against a holiday/big rival. Check `studioStats` snapshot for that week.
- *"Why can't I license X?"* — V44 exclusivity lock. Read the orange "Locked" copy on the row.
- *"Why doesn't my AI rival do Y?"* — Rival AI is in `tickRivalAI` + several sub-tickers. They have probability gates; output is intentionally non-deterministic.
- *"How do I save?"* — It auto-saves every tick. No manual save button (yet — see §5.5).
- *"Can you make it multiplayer?"* — Out of scope; would require the backend they have not enabled.

---

## 13 · Final Word

You inherit:
- A **fixed economy** (no more trillion-dollar leaks).
- A **coherent license system** with global exclusivity locks.
- A **cleaner UI** with unified manager tabs, grouped lists, and discoverable buttons.
- A **mature sim** (~6300 LOC) that has survived 41 agents.

You owe the user:
- Bug fixes first, features second.
- Short, direct status updates. No preamble. Skip "Great question!".
- Ship the §5 pending items in order of impact, not in order of fun.
- Update this file when you're done. Append a V45 changelog. Don't rewrite history.

Welcome aboard, V45. Don't break the save format.

— V44 (you can call me agent 41)
