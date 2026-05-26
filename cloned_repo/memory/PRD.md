# Tycoon V44 — Session PRD (Inherited from V43)

## Inheritance
- V44 branched from `MoonDevMX/Tycoon-V36.git` (V43 branch). 41 agents of prior work preserved.
- All P0/P1/P2 from HANDOFF_V43.md carried forward.

## Session Status: ✅ V44 BUG-FIX RELEASE COMPLETE

## V44 Bug Fixes (this session)

### Economy (P0 critical)
- ✅ Streaming server cost was treating `svc.subscribers` (absolute count) as if in millions → $9T/mo. Fixed at `sim.ts ~2371` plus 2 companion units bugs (ad ARPU recompute, marketing-boost revenue recompute).

### UI / UX
- ✅ Cinemas — added missing **Calendar** tab to the tab bar.
- ✅ Cinemas — **unified Manager tab** (chain + owned-cinema proposals together; no more split).
- ✅ Cinemas — **grouped "My Cinemas"** by region+size into "SMALL CINEMAS × N" cards with expand/collapse.
- ✅ TV Networks — Manager banner **always visible**; added dedicated **Manager tab**.
- ✅ TV Networks — **grouped rival channels by sister-network prefix** with expand/collapse.
- ✅ Series Creator — **"BROWSE TALENT DATABASE →"** CTA + per-cast **"Open Full Negotiation →"** button (parity with movie creator).
- ✅ Streaming — prominent **EDIT TIERS** button + tappable tier cards.
- ✅ Streaming catalog rows — fixed nested-TouchableOpacity bug (tier-edit/remove now responsive).
- ✅ Marketing dashboard button — now routes to `/marketing` index (was misrouting to /current-movies).

### Game Coherence (P0 critical)
- ✅ **Global exclusivity lock enforcement** (`findMovieExclusivityLock` helper) — blocks duplicate / over-exclusive licensing across:
  - `licenseMovieToStreaming`
  - `negotiateMovieLicense`
  - `proposeBulkCatalogLicense`
  - `acceptLicenseOffer`
  - `proposeTVNetworkDeal`
- ✅ **UI lock indicators** — 🔒 EXCLUSIVE badges, disabled "Locked" buttons with reason text, OWN-EXCL vs EXCL LICENSE differentiation on catalog rows.

## Pending for V45 (deferred to next session)
1. **Whole-Network INBOUND UI** (~80 LOC) — sim ready, UI not yet built.
2. **TV Series marketing chip row** (~30 LOC) — sim handles `setEntityMarketing('series', …)`; UI missing.
3. **Apply marketing boost to cinemas + cable** (~30 LOC sim).
4. **Series Creator inline DEAL SPLIT / CONTRACT chips** — full-screen path works; inline parity left.
5. **Balance re-tuning** — after playthrough with V44 economy fix.
6. **Save QoL** — auto-save toggle, clipboard import/export.
7. **Studio Financials charts / sparklines**.

## Architecture (unchanged)
- Expo SDK 54, expo-router, AsyncStorage. **OFFLINE app.** Backend (`/api/*`) unused for gameplay.
- Sim: `frontend/src/game/sim.ts` (~6298 LOC), `state.tsx`, `data.ts`, `types.ts`, `ledger.ts`.
- Storage key: `tycoon_v4` (preserved). Tests: `tests/test_simulator.py`.
- Supervisor: `expo start --web --port 3000` (set in V44 in package.json).
