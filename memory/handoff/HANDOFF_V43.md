# HANDOFF V43 — Tycoon Cinema (DEFINITIVE, for V44 agent)

> **Read this first. Read it whole. ~5 min.** V42d had ~40 agents of accumulated work. V43 added the full economic-sim depth the user has been asking for since V20s: per-week recap, persistent stat history, an outflow economy with costs, ad revenue, marketing as a real growth lever, whole-network licensing, and extended manager auto-deals. Sim layer is feature-complete. UI surfaces are ~90% complete. The remaining work is small UI polish + balance tuning.

---

## 1 · Five-Second Orientation

- **Repo**: `https://github.com/MoonDevMX/Tycoon-V36.git`, branch `V42` (V43 lives in `/app`, push back via Emergent "Save to GitHub" → land as V43 branch)
- **Stack**: Expo SDK 54, React Native, expo-router, AsyncStorage. **OFFLINE app** — backend FastAPI is present but **gameplay never touches it**.
- **Main files**:
  - `/app/frontend/src/game/sim.ts` — pure sim functions (~6200 LOC, big but well-organised)
  - `/app/frontend/src/game/state.tsx` — React Context wrapper around sim
  - `/app/frontend/src/game/types.ts` — all type defs
  - `/app/frontend/src/game/data.ts` — seeds + constants
  - `/app/frontend/src/game/ledger.ts` — **NEW in V43**: per-week accumulator helpers
  - `/app/frontend/src/ui/` — shared components (theme.ts, WeeklyRecapModal.tsx, NegotiationModal.tsx, components.tsx)
  - `/app/frontend/app/` — expo-router screens (dashboard, financials, streaming/[id], tv-networks, cinemas, etc.)
- **Game state persistence**: AsyncStorage key `tycoon_v4`; manual save slots under `tycoon_v4_slot_*`.

---

## 2 · The 3-Edit Pattern (don't break it)

For every new sim action:
1. **Write pure function** in `src/game/sim.ts` — takes state, returns `{ state, error?, ... }` (or just new state).
2. **Wire it** in `src/game/state.tsx` — add to `Ctx` type + provider value (action closes over `stateRef.current`, calls sim fn, `setStateInner(next)`, `persist(next)`).
3. **Consume** in a screen via `useGame()`.

For every new state field: add to `types.ts`, default in `data.ts > newGame()` (if needed), reset in `resetGame()`.

For every cash mutation inside `tickWeek`: also **bump the ledger** via `_bumpL(state, key, amountB)` (or `_bump(key, amountB)` inside `simulateWeek` local).

---

## 3 · What V43 Shipped

### 3.1 Weekly Recap Modal (`src/ui/WeeklyRecapModal.tsx`)
Auto-appears in `app/dashboard.tsx` whenever `state.pendingRecap` is truthy. Shows:
- Period label: `"Week 5, Year 52"` (single) or `"W2 51 → W13 51 (12 weeks)"` (multi).
- NET RESULT big number, cash transition.
- Owned-revenue rows: cinemas (theatrical share + owned), streaming (subs + ads), TV (subs + ads), cable carriage in/out, channel packs.
- Licensed-revenue rows: license deals, IP royalties, crossovers.
- Costs rows: cinema opex, streaming servers, TV broadcast, cable carriage out, production, marketing, license fees paid, IP royalties paid, crossover fees paid.
- Ops pills: movies released, series episodes, awards won, nominations.
- Two buttons: **See Full Stats** (→ `/financials`), **OK** (dismisses via `dismissRecap`).

### 3.2 Studio Financials Screen (`app/financials.tsx`)
- Range selector (4w / 12w / 24w / 48w / All up to **200 weeks**).
- Aggregate NET card, ops pills.
- Revenue breakdown (12 categories) and Costs breakdown (9 categories) each rendered as proportional bars.
- Per-week expandable timeline — tap a row to see its full ledger.

### 3.3 Ledger System (`src/game/ledger.ts`, NEW MODULE)
- `freshLedger(week, year)` — initialise.
- `addLedger(ledger, key, amount)` — pure delta.
- `bumpLedger(state, key, amount)` — returns new state with bumped ledger.
- `finalizeWeek(state)` — at end of `tickWeek`: snapshots ledger into `weekHistory` (cap 200), folds into `pendingRecap`, clears `weeklyLedger`.
- `startRecap(state)` / `clearPendingRecap(state)` — accumulator lifecycle.
- `sumInflowsB(recap)` / `sumOutflowsB(recap)`.

Inside `sim.ts` there's a local helper `_bumpL(state, key, amount)` used by all tick functions, and a closure `_bump(key, amount)` used inside `simulateWeek`.

### 3.4 Outflow Economy

| Category | Where | Formula |
|---|---|---|
| **Streaming server cost** | inside streaming subs loop in `simulateWeek` (~line 2356) | `monthlyM = subs(M) × 0.18 + catalog × 0.012` → /4 weekly |
| **TV broadcast cost** | `tickTVNetworks` | `weeklyM = base(kind) + subs × perSub + progCount × 0.05` |
| **Cinema opex** | `tickOwnedCinemas` (pre-existing) | per-cinema opex_per_week_M (set when built) |
| **Cable carriage out** | `tickPlayerCableNetworks` (pre-existing) | `subs × feePerSubPerMonthUSD / 4` per carried channel |
| **Production** | `createMovie` / `createSeries` (pre-existing) | budget deducted upfront |
| **Marketing** | per-entity, deducted in respective tick fns | $0–10M/wk per entity, capped |
| **License/IP/Crossover fees** | various (pre-existing) | one-time or quarterly |

**TV broadcast base + perSub by kind**:
- `public`: base 0.5M, perSub 0.045 (high reach = high cost per sub, and no subscription revenue → must rely on ads)
- `cable`: base 0.8M, perSub 0.030
- `premium`: base 1.5M, perSub 0.020 (high base but low per-sub overhead)

**Target balance**: costs ≈ 7-15% of gross revenue when player is well-managed. Crackhead-hard pushes >25%; sleepy-easy is <3%. Adjust the multipliers above if user reports the numbers feel off in playthroughs.

### 3.5 Ad Support
- **Streaming, per-tier**: `SubscriptionTier.adSupported: boolean` + `adArpuUSD?: number` (default $5/sub/mo). UI: toggle + numeric field in tier editor on `/streaming/[id]`.
- **TV channels**: `TVNetwork.adProgrammingRatio: number` (0..1; default per kind: public 0.35, cable 0.15, premium 0.05). UI: 6-chip selector (0/10/20/35/50/60%) on each owned channel card. Ad ARPU by kind: public $6, cable $4, premium $2.
- **Attrition**: if `adProgrammingRatio > 0.35`, weekly sub decay increases by `(ratio - 0.35) × 0.02`. So 60% ads → -0.5%/wk extra attrition. Intentional realism.

### 3.6 Whole-Network Single-Deal Licensing
**Sim** (`sim.ts` end, V43 section):
```ts
quoteWholeNetworkLicense({ rivalStudioId, movieIds, years })  // → { feeB, channelCount }
signWholeNetworkLicenseOutbound({ ..., askingFeeB })          // player sells. tolerance 1.2× fair
signWholeNetworkLicenseInbound({ ..., askingFeeB })           // player buys (≥2 own channels). min 0.8× fair
```
Bulk pricing: `feeB = singleChannelFee × channelCount^0.7`. Acceptance returns either `accepted: true` or `counterFeeB`.

**UI**: Outbound is live — TV Networks tab shows "🤝 WHOLE-NETWORK DEALS" section when any rival owns ≥2 channels; tap → modal with movie multi-select, years input, asking fee, accept/counter feedback. **Inbound UI is NOT yet built** (sim is wired, just needs a button on player's channels list).

### 3.7 Extended Manager Auto-Deals
| Manager | Function | Probability/wk | New proposal kind | Approval handler |
|---|---|---|---|---|
| Cinema | `tickCinemaOwnedManagerExtended` | 35% if idle cinema + recent movie | `schedule_movie_owned` | `approveCinemaOwnedManagerProposalV2` (delegates to old for supplier_deal kinds) |
| TV | `tickTVManagerOwnContent` | 20% if light programming | `air_own_movie` | `approveTVManagerOwnContent` (delegates to original) |

Both run from `tickAIWorldDynamics` → which runs in `tickWeek`.

**Dashboard banner** shows when proposals are pending, with section deep-links.

### 3.8 Marketing as Real Growth Lever (not just cost)
Inside streaming subs loop AND `tickTVNetworks`:
```ts
const mktBoost = Math.min(0.04, (entity.marketingBudgetM || 0) * 0.005);
// Applied as a multiplier on weekly subscriber growth
```
So $8M/wk = +4% weekly sub bump (caps). Tune the `0.005` coefficient and the `0.04` cap if marketing feels too strong/weak.

**Note**: Cinemas + cable + TV series don't yet apply this multiplier — they only deduct the cost. Easy add later (see Pending §6).

### 3.9 Types Added (`src/game/types.ts`)
- `SubscriptionTier`: `adSupported?`, `adArpuUSD?`
- `TVNetwork`: `adProgrammingRatio?`, `marketingBudgetM?`
- `TVSeries`, `StreamingService`, `OwnedCinema`, `PlayerCableNetwork`: `marketingBudgetM?`
- `GameState`: `weeklyLedger?`, `weekHistory?`, `pendingRecap?`
- **NEW**: `WeeklyLedger`, `WeekHistoryRecord`, `PendingRecap`

### 3.10 New Context Methods (`state.tsx`)
- `dismissRecap()`
- `quoteWholeNetworkLicense(args)`
- `signWholeNetworkLicenseOutbound(args)` / `signWholeNetworkLicenseInbound(args)`
- `setStreamingTierAdSupport(svcId, tierId, on, adArpuUSD?)`
- `setChannelAdProgrammingRatio(chId, ratio)`
- `setEntityMarketing(kind, id, budgetM)` — `kind: 'channel' | 'series' | 'streaming' | 'cinema' | 'cable'`
- `approveCinemaOwnedManagerProposalV2(proposalId)`
- `approveTVManagerOwnContent(proposalId)`

---

## 4 · File Map (V43 touches)

| File | What changed | Look for |
|---|---|---|
| `src/game/types.ts` | New types, ad/marketing fields | `WeeklyLedger`, `PendingRecap`, `adSupported`, `adProgrammingRatio`, `marketingBudgetM` |
| `src/game/sim.ts` | Ledger plumbing in 7 tick fns + new tick fns + sim actions | grep `_bumpL\|_bump\|V43` |
| `src/game/state.tsx` | 8 new context methods + dismissRecap | grep `qWNL\|signWNL\|setStrTierAd\|setChAdRatio\|setEntMkt\|appCOMP2\|appTVMOC` |
| `src/game/ledger.ts` | **NEW MODULE** | the whole file |
| `src/ui/WeeklyRecapModal.tsx` | **NEW** | the whole file |
| `app/financials.tsx` | **NEW** | the whole file |
| `app/dashboard.tsx` | Financials btn + WeeklyRecapModal mount + manager banner | grep `WeeklyRecapModal\|financials\|mgrBanner` |
| `app/streaming/[id].tsx` | Per-tier ad toggle + marketing chips | grep `adSupported\|streaming-mkt` |
| `app/tv-networks.tsx` | Search, whole-network modal, ad-ratio + marketing chips, V43 proposal kind | grep `searchQ\|rivalGroups\|wnDealStudioId\|tv-ratio\|tv-mkt\|pcn-mkt` |
| `app/cinemas.tsx` | Marketing chips, V2 approve, cleaned duplicate styles | grep `cinema-mkt\|approveCinemaOwnedManagerProposalV2` |
| `memory/PRD.md` | Updated | — |
| `memory/handoff/HANDOFF_V43.md` | **This file** | — |
| `memory/test_credentials.md` | Updated (offline app, no auth) | — |

---

## 5 · Verified Working (end-to-end on web preview)

1. New Studio → Major Studio ($250B) → Dashboard ✓
2. Simulate Week → recap modal shows W2 with empty ledger ✓
3. Simulate Multiple Weeks → 12w → recap shows `"W2 51 → W13 51 (12 weeks)"` with accumulated totals ✓
4. See Full Stats → Financials page renders range selector, aggregate card, breakdowns, expandable timeline ✓
5. TV Networks tab → search bar filters channels by name/region, 1200 channels render ✓
6. Bundle clean — 908 modules, no errors (just expo-router deprecation warnings about `shadow*` props, harmless) ✓
7. Dashboard renders manager banner when proposals are queued ✓

---

## 6 · Pending for V44 (effort estimates included)

### Quick wins
1. **Whole-Network INBOUND UI** (~80 LOC): on player's "My TV" tab when player owns ≥2 channels, add a button "🤝 Buy from Rival (whole network)". Sim fn `signWholeNetworkLicenseInbound` already exists.
2. **TV Series marketing chip row** (~30 LOC): on `app/series/[id].tsx` add a 6-chip selector calling `setEntityMarketing('series', seriesId, $M)`. Sim already deducts in `tickTVSeries` with a 12-week post-release window.
3. **Apply marketing growth boost to cinemas + cable** (~30 LOC sim, no UI): in `tickOwnedCinemas` bump `weeklyRevenue *= (1 + mktBoost)`; in `tickPlayerCableNetworks` apply to subs growth.
4. **Series creator salary counter-offer** (~80 LOC, in `app/create-series.tsx`): port the inline negotiation row from `app/create-movie.tsx` (lines ~580-620). User has been requesting series ↔ movie parity since V20s.

### Medium
5. **Save slot QoL** (~150 LOC, P2 from V42d): auto-save toggle, export to clipboard, import from clipboard. AsyncStorage paths are `tycoon_v4_slot_*`.
6. **Balance tuning pass**: after real playthroughs, adjust:
   - `streamingServerCost` coefficients (`sim.ts` ~line 2358): `subs × 0.18 + catalog × 0.012`
   - `tickTVNetworks` broadcast base/perSub by kind (~line 4400)
   - Ad ARPU values (streaming default 5, TV by kind 6/4/2)
   - `mktBoost` coefficient (0.005) and cap (0.04)

### Longer-tail
7. **Studio Financials charts** — `app/financials.tsx` currently shows aggregate + per-week table. Could add a sparkline-style multi-week chart for revenue-vs-cost trend.
8. **Reopen Weekly Recap from Financials** — there's a hidden placeholder modal in `financials.tsx` (`showFullRecap` state) that's wired but not exposed; tiny addition.
9. **Recap shows recently signed manager deals** — give credit visibility when manager auto-deals fired during the week.

---

## 7 · Sim Cheat Sheet

```ts
const game = useGame();

// Recap lifecycle
game.dismissRecap();                                        // clears pendingRecap
// state.pendingRecap is null after dismiss; state.weekHistory persists

// Ads
game.setStreamingTierAdSupport(svcId, tierId, true, 5);    // $5/sub/mo
game.setChannelAdProgrammingRatio(chId, 0.25);             // 25% ad airtime

// Marketing (any entity)
game.setEntityMarketing('streaming', svcId, 2.0);          // $2M/wk
game.setEntityMarketing('channel'  , chId, 1.0);
game.setEntityMarketing('series'   , srId, 0.5);
game.setEntityMarketing('cinema'   , cnId, 0.25);
game.setEntityMarketing('cable'    , cbId, 1.0);

// Whole-network deals
const q = game.quoteWholeNetworkLicense({ rivalStudioId, movieIds, years: 5 });
const r = game.signWholeNetworkLicenseOutbound({ rivalStudioId, movieIds, years: 5, askingFeeB: q.feeB });
if (r.accepted)        toast(`Deal closed!`);
else if (r.counterFeeB) toast(`Rival counters $${r.counterFeeB}B`);

// Inbound (when player owns ≥2 channels)
const r2 = game.signWholeNetworkLicenseInbound({ rivalStudioId, movieIds, years, askingFeeB });

// Extended manager approvals
game.approveCinemaOwnedManagerProposalV2(propId);  // schedule_movie_owned + delegates
game.approveTVManagerOwnContent(propId);           // air_own_movie + delegates
```

---

## 8 · Patterns to Preserve

- **Immutable state**: every sim fn returns a new object. Never mutate `state.xxx` directly.
- **Ledger writes**: every cash mutation inside `tickWeek` should bump the ledger. Use `_bumpL(state, key, amount)` in sub-tick fns, `_bump(key, amount)` inside `simulateWeek` local.
- **MongoDB / backend**: leave alone. This is an offline app. Don't add server-side state.
- **MaterialCommunityIcons**: this app uses `@expo/vector-icons` — never use emojis as icons for status/affordances (they're fine for flavor text).
- **TestIDs**: every interactive element should have a stable `testID` for the testing agent (e.g. `tv-mkt-${channelId}-${budget}`).

---

## 9 · Known Non-Issues (don't waste cycles)

- **ESLint parser errors on .ts/.tsx files**: pre-existing. ESLint config isn't TS-aware. Metro/Babel compile fine. Ignore.
- **Web warns about deprecated `shadow*` / `textShadow*` style props**: pre-existing React Native Web quirk. Ignore.
- **Ngrok tunnel sometimes flakes for 30–60s**: restart `supervisorctl restart expo` and wait 30s. Don't blame your code.
- **Bundler shows "shadow*" warning lines after every edit**: those are runtime warnings from React Native Web — not bundle errors.

---

## 10 · Critical Gotchas

- `useGame()` **cannot be called inside onPress callbacks** — must be at component top-level. If you need an action inside a callback, add it to the destructure.
- `cinemas.tsx` had a duplicated `StyleSheet.create({...})` block with a stray `al` between them (pre-V43 damage from a prior agent). It's fixed now but watch for similar drift in other big files.
- `state.weeklyLedger` is **cleared** at the start of every `simulateWeek` call. If you need cumulative across weeks, read `state.pendingRecap` instead.
- `state.pendingRecap` accumulates across `simulateMultiple(N)` calls. `simulateWeek` starts a fresh recap (clears any leftover). `dismissRecap()` is the only way to clear it manually.
- AsyncStorage key for primary save is `tycoon_v4`. Save slots: `tycoon_v4_slot_*`. Slot index: `tycoon_v4_slots_index`. Don't change these names or saves break.
- When testing in browser dev preview: AsyncStorage is per-incognito-session. Each new browser test loses prior state. Use the same browser context for multi-step tests.

---

## 11 · User Context & Tone

The user is the long-standing project owner ("heir of 40 agents") who has been driving this tycoon since V20s. They want:
- **Depth over breadth** — they've called out shallow features before. Make sims real (e.g. don't add marketing as just a cost without growth boost).
- **Difficulty curve**: sensible challenge, not crackhead-hard, not sleepy-easy. Managers are crucial to reduce micromanagement burden.
- **Series ↔ Movie parity** — they've been bothered for many versions that Series Maker isn't a full clone of Movie Maker. V43 closed most of the gap but salary counter-offer inline is still on the list.
- **Reference inspiration**: Box Office Sim by Jaco (Lazy Sow Games). Their weekly recap was the model for ours.
- **Persistence matters**: 200-week history is short for some playthroughs. If they ask, bump it.

---

## 12 · How to Continue (next agent quick-start)

1. Read this doc top-to-bottom (5 min).
2. `git log -10` to see what changed.
3. Pick item from `§6 · Pending for V44`. Smallest impactful: **Whole-Network INBOUND UI** (~80 LOC, sim already done).
4. Use the 3-edit pattern in `§2`. Test via Expo preview at `https://media-empire-sim.preview.emergentagent.com/`.
5. Update this doc + PRD.md when done.

You inherit a clean, compiling, feature-complete sim. Don't refactor unless something is on fire. Build the polish items, tune the balance, ship V44.
