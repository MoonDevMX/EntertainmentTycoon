# HANDOFF — Tycoon Cinema App, V42d

**Date:** February 2026
**Outgoing agent:** Claude (Emergent E1 / Sonnet 4.5)
**Codebase branch:** V41 on GitHub (`https://github.com/MoonDevMX/Tycoon-V36.git`) — V42 changes are local-only, not yet pushed
**Status:** Stable. App loads cleanly, no React errors. Last verified live URL: `https://media-mogul-portal.preview.emergentagent.com/`

---

## 1. WHO IS THE USER & WHAT ARE THEY BUILDING

The user is the **"heir of a Movie Cinema Tycoon"** — a creative project framing. They are building a complete single-player **studio/streaming/cable/cinema tycoon sim** in React Native Expo. They speak Spanish-English mix, type fast, often emotionally; they push hard but they're a great product partner — they know exactly what's wrong and they describe it well. **Read their messages slowly. They embed multiple feature requests + bug reports in one paragraph.**

### Their core mental model
- They run a media empire: **Studio → Movies → Streaming Service → TV Channels → Cable Carriage Network → Cinemas**
- Every "vertical" should have a Manager that auto-proposes deals (Cinema Manager, TV Network Manager, Streaming Manager)
- Channels should be programmable like real TV (sister channels grouped into packs, premium tiers should bundle premium content)
- They want **depth without micromanagement** — they're happy clicking "approve" on auto-proposals but want the granular knobs available

### Their pet peeves (will keep coming back)
1. UI being too cramped / buttons too small
2. Features that exist in the sim but aren't reachable from the UI
3. AI making 12-film franchises (they want trilogies)
4. Things being "still not fixed" between sessions — make sure your fixes are *visible*, not just code-correct

---

## 2. ARCHITECTURE OVERVIEW

### Tech stack
- **Frontend:** Expo SDK 54, React Native, expo-router file-based routing, AsyncStorage
- **Backend:** FastAPI (Python, port 8001) — **mostly unused** since game state lives client-side
- **Database:** MongoDB (configured but unused by current game logic)

### Critical files
```
/app/frontend/
├── app/                          # expo-router screens
│   ├── _layout.tsx               # root nav layout
│   ├── index.tsx                 # splash
│   ├── setup.tsx                 # new studio screen (cash tier picker)
│   ├── dashboard.tsx             # main hub
│   ├── tv-networks.tsx           # ⭐ TV/Cable hub (1655+ lines, the user's hot spot)
│   ├── cinemas.tsx               # cinema chain deals + owned cinemas
│   ├── streaming.tsx             # streaming services
│   ├── create-movie.tsx          # movie creator (gold standard for UX)
│   ├── create-series.tsx         # TV series creator (needs parity work)
│   ├── marketing/[movieId].tsx   # marketing per-movie (needs expansion)
│   └── ...
├── src/
│   ├── game/
│   │   ├── types.ts              # ⭐ all TypeScript interfaces (~820 lines)
│   │   ├── data.ts               # ⭐ static seeds + procedural generators (~1130 lines after V42b)
│   │   ├── sim.ts                # ⭐ all game logic — pure functions, ~5800 lines
│   │   └── state.tsx             # ⭐ React Context provider, persistence, action dispatch
│   └── ui/                       # shared UI components, theme
└── .env                          # EXPO_PACKAGER_PROXY_URL, BACKEND_URL — DO NOT MODIFY
```

### State flow (memorize this)
1. **`src/game/types.ts`** defines `GameState` and every entity (Movie, StreamingService, TVChannel, PlayerCableNetwork, etc.)
2. **`src/game/data.ts`** has static + procedural seeds (rivals, talents, genres, TV channels, cable providers)
3. **`src/game/sim.ts`** contains **all** game logic as pure functions: `newGame()`, `simulateWeek()`, `tickWeek()`, `createMovie()`, `addChannelToPlayerCable()`, etc. Each returns `{ state: GameState; error?: string }`. **No side effects.** Always do `return { ...state, foo: newFoo }` (immutable).
4. **`src/game/state.tsx`** is the React Context. It:
   - Loads from AsyncStorage (`mooncinema_save_v8`) on mount
   - Calls migrate + `ensureTVNetworks` + `ensureCableProviders` on load
   - Exposes every sim action as a method on the context value
   - Persists after every action via `persist(state)` helper
   - Saves/loads manual slots via keys `mooncinema_slot_<name>` + index `mooncinema_slots_index`
5. **Screens** use `const { state, doThing } = useGame()`. They never mutate state directly — they call context methods which call sim functions which return a new state.

### The 3-edit pattern for adding a new sim action
Whenever you need a new piece of state mutation:
1. **`sim.ts`**: write `export function doThing(state: GameState, ...args): { state: GameState; error?: string }`
2. **`state.tsx`**: import it (as alias like `doThing as doT`), add to the Ctx type signature, wire it in the `value` of the GameContext provider:
   ```ts
   doThing: (args) => {
     const state = stateRef.current; if (!state) return { error: 'No game.' };
     const r = doT(state, args);
     if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
     return { error: r.error };
   },
   ```
3. **Screen**: destructure from `useGame()` and call.

---

## 3. RULES OF HOOKS — TRAP I JUST HIT

The screen `tv-networks.tsx` had a pre-existing **Rules of Hooks violation** that crashed the app intermittently:
```ts
if (!state) return null;   // line 92 — early return
// ... but THEN below ...
const filtered = useMemo(...);   // line 102 — hook AFTER conditional return ❌
const [mgrOpen, ...] = useState(...);   // line 134 — hook AFTER conditional return ❌
```

**Fix:** Move ALL `useState` / `useMemo` / `useEffect` calls **above** the `if (!state) return null;` guard. For hooks that depend on `state`, do the null-check inside the hook callback:
```ts
const filtered = useMemo(() => {
  if (!state) return [];
  return state.tvNetworks.filter(...);
}, [state, ...deps]);

if (!state) return null;  // NOW safe
```

**ALWAYS audit every screen for this pattern** before adding more hooks. Other screens may have the same latent bug. Search for `if (!state) return null` and check what's below it.

---

## 4. CHANGES I MADE THIS SESSION (V42 → V42d)

### V42 — Foundations
1. **Halved cinema build costs** in `OWNED_CINEMA_SPECS` (sim.ts) — was 2-3× too expensive per user feedback
2. **Starting cash tiers** in `setup.tsx`: 500M / 1B / 10B / 50B / 100B / 250B (was capped at 10B)
3. **Manual save slots** in `state.tsx` + `dashboard.tsx` — adds `saveToSlot/loadFromSlot/listSlots/deleteSlot` context methods. Stored at `mooncinema_slot_<name>` with metadata index at `mooncinema_slots_index`
4. **AI franchise discipline** in `sim.ts`:
   - `seedHistory()`: trilogy-weighted distribution (45% chance of exactly 3 films)
   - `tickAIWorldDynamics()`: weights franchises with ≥5 films at 0.15× and skips 70% of the time when picked

### V42b — Cable Empire Expansion
5. **1,200 TV channels** seeded across 6 regions in `data.ts` — procedural generator pushes ~200 channels per region (60 public + 100 cable + 40 premium = 30/50/20 ratio). Names use region prefixes ("Pacific", "Discovery"...) + genre flavor ("Sports", "Drama"...) + kind suffixes ("Cable", "Premium"...).
   - Calls `ensureTVNetworks(state)` from `newGame()`, `tickWeek()`, and the save-load path so existing saves backfill automatically
6. **Bulk multi-select licensing** in `tv-networks.tsx` for cable carriage:
   - Search input, kind filter chips, sort chips (reputation/subscribers/name)
   - "Select All Visible" / "Clear" actions
   - Display capped at 60 (refine search to see more)
   - One LICENSE button bulk-licenses all selected at the same fee
7. **Channel pack channel mgmt**: `addChannelToPack` / `removeChannelFromPack` in sim.ts (keeps min 2 channels)
8. **Editable tier name** (TextInput in tv-networks.tsx)
9. **Channel pack as tier add-on**: new `includedChannelPackIds` field on `PlayerCableTier` in `types.ts`

### V42c — Tier Configurator UX
10. **Per-cable-tier streaming bundle**: new `includedStreamingTiers: { serviceId, tierId }[]` field on `PlayerCableTier`. Premium cable can bundle the streaming Premium tier, basic cable bundles Basic. Legacy `includedStreamingServiceIds` kept in sync for old code paths
11. **Auto-grouped sister channels** in tier configurator: clusters carried channels by first word of name (e.g. "Pacific Sports Cable", "Pacific Drama Cable" → "📦 Pacific Pack (3/12)"). Tap pack → toggle all. Tap "view" chevron → expand to individual chips
12. **Default-in for new channels**: `addChannelToPlayerCable` now auto-adds the channel to every existing tier (matches user's "default toggled in, tap to remove" expectation)

### V42d — UI breathing room + bug fix
13. **Tab order**: `Networks → My TV Network → My Cable → Cable` (My Cable moved next to My TV Network)
14. **Collapsible carried channels list**: big tappable header with chevron, frees up vertical space
15. **Bigger touch targets**:
    - New `tcChip` style: 42pt min-height, 14×10 padding, 13px font, 2px borders
    - Tier card padding doubled, 2px borders, name input 17px font
    - Delete/PPV buttons enlarged
16. **Critical Rules of Hooks fix** (see Section 3)

---

## 5. MENTAL FLOW & TRICKS

### When you start a session
1. **Read the user's message twice.** They embed multiple asks per paragraph.
2. **Clone the repo if `/app/frontend/app/` is empty** (only `index.tsx` + `+html.tsx` initially). Use `git clone --depth 1 --branch V41 https://github.com/MoonDevMX/Tycoon-V36.git /tmp/tycoon && cp -r /tmp/tycoon/frontend/* /app/frontend/`. Then `cd /app/frontend && yarn install`.
3. **Don't ask too many clarifying questions.** This user wants velocity. They said "go all out" once — that's the standing instruction.
4. **Restart expo via `sudo supervisorctl restart expo`** after major changes. Wait ~30-60s for the tunnel to come back (ngrok takes a while).

### Verifying changes
- The **Metro bundler is the source of truth**, not ESLint. ESLint TS parser chokes on these big files with `error Parsing error: Unexpected token :` — **ignore those**.
- Screenshot via `mcp_screenshot_tool` to confirm UI changes. Use `await page.evaluate("() => localStorage.getItem(...)")` to inspect state directly.
- To test from a clean slate: `await page.evaluate("() => localStorage.clear()")` then reload.

### Editing the big files
- `sim.ts` is ~5800 lines, `tv-networks.tsx` is ~1655 lines. **Never rewrite them**. Use `mcp_search_replace` with enough surrounding context to be unique.
- When adding a new field to an entity, you usually need to edit 3 files: `types.ts` (add field), `sim.ts` (use it in tick/calculation), screen (render & edit).

### Debugging UI bugs
- **Blank page** = either no game state (clear localStorage and restart) OR a JS error in render. Always inject a `page.on("pageerror", ...)` listener in Playwright scripts to see real errors.
- **"Rendered more hooks than during the previous render"** = hook below a conditional return. See Section 3.
- **State not persisting** = check that the action calls `persist(r.state)` in `state.tsx`.

### What the user calls things vs. what they are in code
| User says | Code term |
|---|---|
| "Cable network" / "My Cable" | `PlayerCableNetwork` |
| "TV network" / "TV channel" | `TVNetwork` (with `kind: public/cable/premium`) |
| "Cable carriage" / "Cable provider" | `CableProvider` (rival aggregator that pays player) |
| "Channel pack" | `ChannelPack` (player bundles owned channels for streaming-like sub) |
| "Streaming service" | `StreamingService` (with internal `SubscriptionTier[]`) |
| "Owned cinema" | `OwnedCinema` (distinct from `CinemaChain` which is rival-owned) |
| "Tier" | Ambiguous! Could be `SubscriptionTier` (streaming) or `PlayerCableTier` (cable). Always clarify by context. |

---

## 6. MISSING FEATURES ROADMAP — TECHNICAL DETAILS

These are the user's outstanding requests, ordered by impact. Each has implementation notes.

### 🔥 P0 — Whole-network single-deal licensing
**User quote:** *"licensing to my tv network channels are still divided per channels and not the whole network I need it fixed ASAP so I can play with the programing between channels"*

**Current:** Player licenses content to one channel at a time via `proposeChannelContentLicense`.
**Wanted:** Sign one deal that covers all channels in a rival network (or all sister channels) for a bulk price.

**Implementation:**
1. Add `licenseToNetworkBulk(state, args)` to `sim.ts` where args = `{ networkId, movieIds, years, exclusivity, feePerSubMonthly }`. Find all rival channels with same `ownerStudioId` (or matching name prefix for sister channels), apply the deal to all in one transaction.
2. Wire in `state.tsx` (3-edit pattern).
3. In `tv-networks.tsx` "Networks" tab, on each rival row add a "License whole network" button alongside the existing "License Content" button. Modal shows the bundle of channels + total reach + price.

**Estimated effort:** 1-2 hours.

---

### 🔥 P0 — TV Series creator parity with movie NegotiationModal
**User quote:** *"THE RV SERIES CREATOR IS STILL NOT FIXED I NEED IT NOW!!! TALENT POOL REDIRECTION AS MOVIE CREATOR"*

**Current:** `create-series.tsx` has a simple talent picker.
**Wanted:** The same `NegotiationModal` UX as `create-movie.tsx` — talent can counter-offer, you can negotiate salary/role, see acceptance probability.

**Implementation:**
1. Look at `create-movie.tsx` for the `NegotiationModal` component (around the talent picker section). It uses `calculateAcceptance(talent, role, offer)` from sim.ts.
2. Copy that flow into `create-series.tsx`. The sim functions (`calculateAcceptance`, `calculateTalentExpectations`) already work — they're talent-agnostic.
3. Show counter-offer + accept/reject flow.

**Estimated effort:** 1-2 hours (mostly UI copy-paste with naming tweaks).

---

### 🔥 P0 — Cinema Manager auto-deals for owned cinemas
**User quote:** *"CINEMA MANAGER STILL NOT DOING OWNED CINEMAS DEALS"*

**Current:** `cinemaOwnedManagerProposals` exists for the rival cinema chain deals but the user wants the auto-manager to also propose deals **between owned cinemas and content** (e.g., "schedule your new movie in your owned cinemas this week").

**Implementation:**
1. In `sim.ts`, find `tickCinemaOwnedManager(state)`. It generates proposals for things like ticket-price changes or amenity upgrades.
2. Add proposal types for: "Auto-schedule released movie X in owned cinemas Y, Z", "Re-run profitable franchise re-release", etc.
3. The proposal type should be a discriminated union — search for `CinemaOwnedProposal` type or similar.
4. The approval handler `approveCinemaOwnedManagerProposal` will need new branches.

**Estimated effort:** 2-3 hours.

---

### 🔥 P0 — TV Network Manager auto-deals for own channels & cable
**User quote:** *"TV NETWORK MANAGER (AUTO DEALS RELATED TO MY OWN CHANNELS/ CABLE CARRIAGES AND MY OWN CABLE TV NETWORK IS STILL MISSING!)"*

**Current:** `tvManagerProposals` exists but only proposes inbound content licenses.
**Wanted:** The manager should auto-propose:
- "License your own movie X to your TV channel Y for $A/sub"
- "Sign cable carriage deal with rival provider Z for $B/sub"
- "Add sister channel to existing channel pack"
- "Raise/lower fee on channel Q based on subscriber elasticity"

**Implementation:**
1. In `sim.ts`, find `tickTVManagerProposals(state)`.
2. Add new proposal types for the above. Use existing helpers like `quoteTVNetworkDeal`, `quoteCableCarriageDeal` to compute realistic values.
3. Update `approveTVManagerProposal` to handle the new types.
4. Existing UI in `tv-networks.tsx` (the "TV Manager Proposals" modal) should auto-render — it just maps over proposals.

**Estimated effort:** 3-4 hours.

---

### 🟡 P1 — Marketing expansion to TV series, channels, cable carriage
**User quote:** *"AND MARKETING SHOULD EXPEND TO STREAMING CINEMAS CHANNELS AND CABLE CARRIAGE NETWORK..AND TV SERIES NOT ONLY MOVIES"*

**Current:** `/app/frontend/app/marketing/[movieId].tsx` — marketing per movie only. `Movie` type has `marketingBudgetM`, `marketingAllocation`, etc.
**Wanted:** Marketing should also boost:
- TV Series viewership
- Specific TV channels (subscriber growth)
- Cable carriage network (subscriber growth across tiers)
- Streaming service (subscriber growth)
- Owned cinemas (foot traffic / awareness)

**Implementation:**
1. Add `marketingBudgetM` and `marketingAllocation` fields to `TVSeries`, `TVNetwork`, `PlayerCableNetwork`, `StreamingService`, `OwnedCinema` in `types.ts`.
2. In the relevant tick functions (e.g. `tickPlayerCableNetworks`, `tickStreamingServices`), apply a multiplier based on marketing spend: `growthRate *= 1 + Math.min(0.05, marketingBudgetM * 0.001)`. Subtract budget from cash each week.
3. Generalize the marketing screen: route changes from `/marketing/[movieId]` to `/marketing/[type]/[id]` (e.g. `/marketing/series/abc123`, `/marketing/channel/xyz789`).
4. Add marketing buttons to each entity's management screen (TV series detail, channel manage, cable manage, streaming manage, cinema manage).

**Estimated effort:** 4-6 hours. Biggest win for the user.

---

### 🟡 P1 — Cable tier rename should be more discoverable
**Status:** Already implemented in V42d (editable TextInput on tier name). But verify the user actually sees it — the TextInput is a `defaultValue` that updates on `onEndEditing`, which might confuse mobile users. Consider adding a pencil icon affordance.

---

### 🟢 P2 — Player should be able to filter/search channels in the Networks tab
With 1200 channels, the existing region + kind filter is barely enough. Add a text search input. Use `useMemo` (above any conditional return!) to filter.

---

### 🟢 P2 — Save slot improvements
- Auto-save slot every N weeks
- Show "last played" time + game progress score
- Export/import slot JSON (for power users)

---

### 🟢 P3 — Backend persistence (currently unused)
The FastAPI backend exists but the game is fully client-side. Could:
- Sync save slots to backend (cloud save)
- Leaderboards / global stats
- Multiplayer features ("trade franchise to a friend")

Would require auth (Emergent Google Auth integration via `integration_playbook_expert_v2`).

---

## 7. KNOWN TECHNICAL DEBT / GOTCHAS

### ESLint TypeScript parser errors
These files all fail ESLint with "Parsing error: Unexpected token :" — **safe to ignore**:
- `src/game/sim.ts`
- `src/game/state.tsx`
- `src/game/data.ts`
- `app/tv-networks.tsx`
- `app/dashboard.tsx`

Reason: ESLint config doesn't fully support TypeScript syntax in these files. Metro bundler compiles them fine. **Don't try to "fix" the ESLint errors** — it'll waste hours.

### MongoDB `_id` rule
Although the backend is unused for game state, if you ever add backend-backed features, **always exclude `_id` from MongoDB query projections** (`db.collection.find({}, {"_id": 0})`) or use Pydantic response models. ObjectId is not JSON serializable.

### React Native vs. Web peculiarities
- The app is built to also run on **web** (current preview URL is web). Some RN-only features (Camera, Location) won't work on web — wrap in `Platform.select()` or check `Platform.OS === 'web'`.
- `boxShadow` deprecation warnings in console are harmless — RN style props are auto-converted.

### Procedural channel generator collisions
The `_genTVChannel` function in `data.ts` uses `prefix + suffix + variant tag` for uniqueness. With 100 cable channels per region and only 16 prefixes × 17 suffixes = 272 combos, collisions are rare but possible. If you bump per-region counts higher, ensure variant tag increments properly (currently `Math.floor(i / (prefixes.length * suffixPool.length))`).

### `ensureTVNetworks` / `ensureCableProviders` performance
These functions are called every `tickWeek()`. With 1200 channels they do `state.tvNetworks.length >= TV_NETWORKS_SEED.length` check first — O(1) when fully seeded. But the actual merge does O(n) `find` lookups. For now it's fine, but if seed grows >5000 you'll want a `Set` of existing IDs.

### Save migration
`state.tsx` has a `migrate(raw)` function that handles old save versions. When you add new required fields to entities, **add backfill logic in migrate** to avoid undefined-access crashes on old saves. Example: `pcn.tiers = pcn.tiers.map(t => ({ ...t, includedChannelPackIds: t.includedChannelPackIds || [] }))`.

### Number formatting
- Cash at studio level is in `$B` (billions) — stored as float like `10.0`
- Movie budgets in `$M` (millions) — stored as float like `150.0`
- Convert when crossing the boundary: `player.cash += weeklyRevM / 1000`

### Time
- Year = 12 months × 4 weeks = 48 weeks
- `state.week` is 1-48, `state.year` increments after week 48
- Use `monthOf(week)` helper for "Jan W1" labels

---

## 8. POSSIBLE QUALITY-OF-LIFE IMPROVEMENTS

These are nice-to-haves the user hasn't asked for but would appreciate:

1. **Onboarding tour** — first-time player tutorial walking through the studio screens
2. **Activity log filter** — `state.newsLog` gets huge over 50+ years. Add a category filter (financial / awards / releases / deals)
3. **Search history** in the search modal — let user re-search recent queries
4. **Better number formatting** — `formatCash(b)` helper to show `$2.5B` instead of `2.5 B`, `$12.4M`, etc.
5. **Confirmation modals** for destructive actions — currently delete-channel-pack just deletes silently
6. **Undo last action** — keep `previousState` in context, expose `undoLast()` for the latest non-tick mutation
7. **Performance:** memoize the procedural seed in `data.ts` — currently re-runs on every module import (cheap but could be cached)
8. **Accessibility:** add `accessibilityLabel` to icon-only buttons, ensure all touch targets are ≥44pt (the V42d enlargements help here)
9. **Visual hierarchy in tier configurator:** use color-coded tier badges (Basic=gray, Standard=blue, Premium=gold) so users instantly recognize each tier's role
10. **Analytics screen** — already exists (`/trends.tsx`) but could plot more: subscriber growth per tier, channel ROI heatmap, franchise lifetime value

---

## 9. INTEGRATION NOTES

The app doesn't currently use any third-party integrations (no LLM, no payments, no auth). If you add any:

- **Always go through `integration_playbook_expert_v2`** — don't write integration code from scratch
- **Emergent LLM Key** is available for OpenAI/Anthropic/Gemini text models, Gemini Nano Banana image gen, GPT Image 1, Sora 2, OpenAI Whisper/TTS. **NOT** for Stripe, ElevenLabs, fal.ai, etc.
- **Auth requests** → use Emergent-managed Google OAuth (default) or offer JWT custom auth (always present both)
- Test credentials live at `/app/memory/test_credentials.md` if/when auth is added

---

## 10. QUICK COMMANDS

```bash
# Restart frontend (Metro + tunnel)
sudo supervisorctl restart expo

# Restart backend
sudo supervisorctl restart backend

# Watch frontend logs
tail -f /var/log/supervisor/expo.out.log

# Watch backend logs
tail -f /var/log/supervisor/backend.err.log

# Check preview URL HTTP status
curl -s -o /dev/null -w "%{http_code}" https://media-mogul-portal.preview.emergentagent.com/

# Clean Metro cache if bundling acts weird
rm -rf /app/frontend/.expo /app/frontend/node_modules/.cache
sudo supervisorctl restart expo

# Find all uses of a sim function
grep -rn "addChannelToPlayerCable" /app/frontend/app /app/frontend/src

# Check save state in browser console
localStorage.getItem('mooncinema_save_v8')
```

---

## 11. CLOSING NOTES

This user is one of the most engaged tycoon-game builders you'll work with. They have a clear vision, they iterate fast, and they accept rough edges as long as **the core flow they care about works end-to-end**. Don't get stuck polishing one feature — ship the rough version of all four things they asked for in a message, then they'll tell you which one to deepen.

If you only have time for ONE thing next session, **build the whole-network single-deal license** — it's been on the roadmap for three rounds and unblocks his "channel programming play" mental model.

Good luck. 🎬📺
