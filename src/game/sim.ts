import { GameState, Movie, Studio, Talent, Franchise, AudienceSegment, ColorTrait, DealType, Role, StreamingService, ReleaseStrategy, Genre, LicenseOffer, Festival, FestivalLot, CinemaDeal, CinemaRegion, FranchiseOffer, FranchiseOfferKind, BulkCatalogOffer, CinemaSupplierDeal, TVNetwork, TVNetworkDeal, TVChannelKind, TVNetworkRegion, TVSeries, TVReleaseStrategy, ChannelPack, ChannelContentLicense, CableProvider, CableCarriageDeal, TVManagerProposal, CinemaOwnedManagerProposal, OwnedIPLicense } from './types';
import { GENRE_ICON, RIVAL_NAMES, STUDIO_LOGOS, arcGenreFit, computeChemistryBonus, contractTerms, dealTerms, generateReviews, genFranchiseName, genPlot, genTalent, genTitleSubtitle, holidayFor, pick, randInt, uid, GENRES, WEEKS_PER_YEAR, COLORS, relKey, nudgeRelInPlace, defaultTiers, genServiceName, recomputeStreamingSubs, effectiveSkillFor, aiBudgetForRating, licenseDesirability, licenseOfferDialog, FESTIVAL_TEMPLATES, CINEMA_CHAINS, cinemaDealRange, cinemaStudioShareForWeek, seedExternalLicensors, quoteIPLicenseFee, ipBoostsForMovie, TV_NETWORKS_SEED, CABLE_PROVIDERS_SEED, cableCarriageFeeRange } from './data';
import { freshLedger, addLedger, finalizeWeek, startRecap } from './ledger';
import type { LedgerKey } from './ledger';
import { tickGamingDivision } from './gaming';

// V43 — Local helper for tick functions: bump the weekly ledger in-place on state.
// Returns a *new* state object with weeklyLedger spread. Use for all post-simulateWeek tick fns.
function _bumpL(state: GameState, key: LedgerKey, amount: number): GameState {
  if (!isFinite(amount) || amount === 0) return state;
  return { ...state, weeklyLedger: addLedger(state.weeklyLedger, key, amount) };
}
import { computeMarketingEfficiency, MARKETING_CHANNELS, ageWeightsForSegment } from './marketing';

export const POST_PRODUCTION_COOLDOWN_WEEKS = 3;

// Talent is available for casting in a NEW movie when:
//  - not retired
//  - not currently locked in another in-production movie
//  - past their post-release cooldown (3 weeks from last release)
export function talentAvailability(t: Talent, currentWeek: number, currentYear: number): { available: boolean; reason?: string; cooldownWeeksLeft?: number } {
  if (t.retired) return { available: false, reason: 'Retired' };
  if (t.inProductionMovieId) return { available: false, reason: 'In production' };
  const fromY = t.availableFromYear ?? 0;
  const fromW = t.availableFromWeek ?? 0;
  if (fromY > currentYear || (fromY === currentYear && fromW > currentWeek)) {
    const weeksLeft = (fromY - currentYear) * WEEKS_PER_YEAR + (fromW - currentWeek);
    return { available: false, reason: 'Cooldown', cooldownWeeksLeft: weeksLeft };
  }
  return { available: true };
}

// Per-color, per-role talent counts (yields ~100 per color, ~600 total)
const ROLE_COUNTS_PER_COLOR: Record<Role, number> = {
  writer: 16,
  director: 16,
  actor: 34,
  actress: 34,
};

function generateBalancedTalentPool(): Talent[] {
  const pool: Talent[] = [];
  COLORS.forEach(color => {
    (Object.keys(ROLE_COUNTS_PER_COLOR) as Role[]).forEach(role => {
      const n = ROLE_COUNTS_PER_COLOR[role];
      for (let i = 0; i < n; i++) {
        // Age cohorts: 30% young (22-32), 50% mid (33-55), 20% veteran (56-72)
        const r = Math.random();
        let ageMin: number, ageMax: number;
        if (r < 0.3) { ageMin = 22; ageMax = 32; }
        else if (r < 0.8) { ageMin = 33; ageMax = 55; }
        else { ageMin = 56; ageMax = 72; }
        // Realistic skill spread: rookies start low; veterans are usually better but not guaranteed.
        // Bell-curve in genTalent ensures most cluster mid; few are elite (the 90+ rare).
        const baseSkill = ageMax > 55 ? 45 : ageMax > 32 ? 35 : 28;
        pool.push(genTalent(role, { ageMin, ageMax, color, skillMin: baseSkill, skillMax: 95 }) as Talent);
      }
    });
  });
  return pool;
}

function buildInitialRelationships(allStudioIds: string[]): Record<string, number> {
  const rels: Record<string, number> = {};
  for (let i = 0; i < allStudioIds.length; i++) {
    for (let j = i + 1; j < allStudioIds.length; j++) {
      // Start near neutral with light spread
      rels[relKey(allStudioIds[i], allStudioIds[j])] = randInt(-12, 12);
    }
  }
  return rels;
}

// =====================================================================
// BULK STREAMING LICENSING — buy a multi-year deal where rival's future
// movies auto-license to player's streaming service.
// =====================================================================
export interface BulkLicenseDealParams { rivalStudioId: string; serviceId: string; movieCount: number; years: number; }
// Heuristic price: rival reputation × movie count × years × random multiplier (in $M).
export function quoteBulkLicenseDeal(state: GameState, p: BulkLicenseDealParams): { feeM: number; error?: string } {
  const rival = state.rivals.find(r => r.id === p.rivalStudioId);
  if (!rival) return { feeM: 0, error: 'Rival not found.' };
  const reputationMult = 1 + (rival.rating - 1) * 0.35;
  const recentBO = state.movies
    .filter(m => m.studioId === rival.id && m.status === 'released' && (state.year - m.releaseYear) <= 5)
    .reduce((a, b) => a + b.boxOffice, 0);
  const recencyMult = 1 + Math.min(2.5, recentBO / 6);
  const baseFee = 25 * p.movieCount * reputationMult * recencyMult * (1 + (p.years - 1) * 0.18);
  return { feeM: +baseFee.toFixed(1) };
}

// Compute weeks of windowing before a rival's released movie joins the player's service
// under a bulk deal. Hybrids included; theatrical=8–12w, streaming-only=26–52w, hybrid=16–32w.
export function bulkLicenseDelayWeeks(strategy?: 'theatrical' | 'streaming' | 'hybrid' | 'tv'): number {
  if (strategy === 'streaming' || strategy === 'tv') return randInt(26, 52);
  if (strategy === 'hybrid') return randInt(16, 32);
  return randInt(8, 12); // theatrical (default)
}

// Add (week, year, +deltaWeeks) → eligibility (week, year).
function addWeeksWY(week: number, year: number, deltaWeeks: number): { week: number; year: number } {
  let w = week + deltaWeeks;
  let y = year;
  while (w > WEEKS_PER_YEAR) { w -= WEEKS_PER_YEAR; y += 1; }
  return { week: w, year: y };
}

export function signBulkLicenseDeal(state: GameState, p: BulkLicenseDealParams): { state: GameState; error?: string; feeM?: number } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === p.serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Streaming service not found.' };
  if (p.movieCount < 1 || p.movieCount > 50) return { state, error: 'Movie count must be 1–50.' };
  if (p.years < 1 || p.years > 10) return { state, error: 'Years must be 1–10.' };
  const quote = quoteBulkLicenseDeal(state, p);
  if (quote.error) return { state, error: quote.error };
  if (state.player.cash * 1000 < quote.feeM) return { state, error: `Need $${quote.feeM.toFixed(1)}M cash (have $${(state.player.cash * 1000).toFixed(1)}M).` };
  const rival = state.rivals.find(r => r.id === p.rivalStudioId)!;
  const services = state.streamingServices.slice();
  const cur = services[svcIdx];
  const expiresWeek = state.week;
  const expiresYear = state.year + p.years;
  const newDeal = {
    id: uid('bld_'),
    rivalStudioId: p.rivalStudioId,
    rivalName: rival.name,
    movieCountTotal: p.movieCount,
    moviesUsed: 0,
    expiresWeek, expiresYear,
    feePaidM: quote.feeM,
    signedWeek: state.week, signedYear: state.year,
    queuedMovies: [],
  };
  services[svcIdx] = { ...cur, bulkLicenseDeals: [...(cur.bulkLicenseDeals || []), newDeal] };
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - quote.feeM / 1000).toFixed(3) };
  const relationships = { ...state.relationships };
  nudgeRelInPlace(relationships, state.player.id, p.rivalStudioId, 6);
  const newsLog = [{ week: state.week, year: state.year, text: `${state.player.name} signs a $${quote.feeM.toFixed(1)}M bulk-license deal with ${rival.name} (${p.movieCount} films / ${p.years}y).` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player: updatedPlayer, streamingServices: services, relationships, newsLog }, feeM: quote.feeM };
}

// =====================================================================
// FRANCHISE BULK LICENSE — option B: license a rival franchise (current + future)
// to the player's streaming service for X years. All currently-released films of the
// franchise (≥0y, no age gate) are added immediately; future releases auto-stream
// after the standard windowing delay.
// =====================================================================
export interface FranchiseBulkLicenseParams { franchiseId: string; serviceId: string; years: number; }
export function quoteFranchiseBulkLicense(state: GameState, p: FranchiseBulkLicenseParams): { feeM: number; error?: string; movieCount?: number } {
  const fr = state.franchises.find(f => f.id === p.franchiseId);
  if (!fr) return { feeM: 0, error: 'Franchise not found.' };
  if (fr.studioId === state.player.id) return { feeM: 0, error: 'You already own this franchise.' };
  if (p.years < 1 || p.years > 10) return { feeM: 0, error: 'Years must be 1–10.' };
  const released = state.movies.filter(m => m.franchiseId === fr.id && m.status === 'released');
  // Base on franchise popularity, total/recent BO, and term length.
  const recentBO = released.filter(m => (state.year - m.releaseYear) <= 5).reduce((a, b) => a + b.boxOffice, 0);
  const popMult = 0.6 + (fr.popularity / 100) * 1.4;       // 0.6..2.0
  const boMult = 1 + Math.min(3, recentBO / 5);            // saturates at 4×
  const filmMult = 0.6 + Math.min(3, released.length * 0.18); // more films = pricier
  const base = 60 * popMult * boMult * filmMult * (1 + (p.years - 1) * 0.22);
  return { feeM: +base.toFixed(1), movieCount: released.length };
}
export function signFranchiseBulkLicense(state: GameState, p: FranchiseBulkLicenseParams): { state: GameState; error?: string; feeM?: number } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === p.serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Streaming service not found.' };
  const fr = state.franchises.find(f => f.id === p.franchiseId);
  if (!fr) return { state, error: 'Franchise not found.' };
  if (fr.studioId === state.player.id) return { state, error: 'You already own this franchise.' };
  
  const tempCur = state.streamingServices[svcIdx];
  const existingBulk = (tempCur.bulkLicenseDeals || []).find(d => d.franchiseId === p.franchiseId && (d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek) > (state.year * WEEKS_PER_YEAR + state.week));
  if (existingBulk) return { state, error: 'You already have an active bulk franchise license for this franchise.' };

  const quote = quoteFranchiseBulkLicense(state, p);
  if (quote.error) return { state, error: quote.error };
  if (state.player.cash * 1000 < quote.feeM) return { state, error: `Need $${quote.feeM.toFixed(1)}M cash (have $${(state.player.cash * 1000).toFixed(1)}M).` };
  const services = state.streamingServices.slice();
  const cur = services[svcIdx];
  const expiresYear = state.year + p.years;
  const released = state.movies.filter(m => m.franchiseId === fr.id && m.status === 'released' && m.studioId === fr.studioId);
  const existingIds = released.map(m => m.id);
  // Add all currently-released franchise films immediately; record as licensed-in titles.
  const licenseEntries = (cur.licensedMovies || []).slice();
  for (const mid of existingIds) {
    if (!cur.catalogMovieIds.includes(mid)) {
      licenseEntries.push({ movieId: mid, tierIds: [], feePaid: quote.feeM / Math.max(1, existingIds.length), yearsLicensed: p.years, expiresWeek: state.week, expiresYear });
    }
  }
  const newDeal = {
    id: uid('bld_'),
    rivalStudioId: fr.studioId,
    rivalName: state.rivals.find(r => r.id === fr.studioId)?.name || 'Studio',
    movieCountTotal: 9999,
    moviesUsed: 0,
    expiresWeek: state.week, expiresYear,
    feePaidM: quote.feeM,
    signedWeek: state.week, signedYear: state.year,
    franchiseId: fr.id,
    queuedMovies: [],
  };
  services[svcIdx] = {
    ...cur,
    catalogMovieIds: [...cur.catalogMovieIds, ...existingIds.filter(id => !cur.catalogMovieIds.includes(id))],
    licensedMovies: licenseEntries,
    bulkLicenseDeals: [...(cur.bulkLicenseDeals || []), newDeal],
  };
  // Mark the existing movies as in-this-service
  const movies = state.movies.map(m => existingIds.includes(m.id)
    ? { ...m, inStreamingServiceIds: Array.from(new Set([...(m.inStreamingServiceIds || []), cur.id])) }
    : m);
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - quote.feeM / 1000).toFixed(3) };
  const relationships = { ...state.relationships };
  nudgeRelInPlace(relationships, state.player.id, fr.studioId, 6);
  const newsLog = [{ week: state.week, year: state.year, text: `${state.player.name} bulk-licenses the entire ${fr.name} franchise to ${cur.name} for $${quote.feeM.toFixed(1)}M / ${p.years}y (${existingIds.length} films + future).` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player: updatedPlayer, streamingServices: services, movies, relationships, newsLog }, feeM: quote.feeM };
}

export function newGame(playerName: string, logoIdx: number): GameState {
  const player: Studio = {
    id: uid('s_'),
    name: playerName || 'Elite Pictures',
    logoBg: STUDIO_LOGOS[logoIdx % STUDIO_LOGOS.length].bg,
    logoIcon: STUDIO_LOGOS[logoIdx % STUDIO_LOGOS.length].icon,
    cash: 0.5, totalBO: 0, releases: 0, awards: 0, rating: 1, isPlayer: true,
  };

  // 14 distinct AI studios → 15 total with the player.
  // Force at least 5 rivals to be high-rating ($200M+ blockbuster spenders) so Big Picture awards trigger.
  const forcedHighRatings = [5, 5, 4, 4, 4]; // first 5 rivals will be top-tier
  const rivals: Studio[] = RIVAL_NAMES.slice(0, 14).map((n, i) => {
    // Skip whichever logo the player picked when assigning rival logos so it stays distinctive.
    const playerLogo = logoIdx % STUDIO_LOGOS.length;
    let li = (i + 1) % STUDIO_LOGOS.length;
    if (li === playerLogo) li = (li + 1) % STUDIO_LOGOS.length;
    const logo = STUDIO_LOGOS[li];
    const rating = i < forcedHighRatings.length ? forcedHighRatings[i] : randInt(2, 4);
    // Cash scales with rating so blockbuster studios can actually fund $200M+ tentpoles
    const cash = rating >= 5 ? randInt(800, 1500)
               : rating >= 4 ? randInt(400, 800)
               : rating >= 3 ? randInt(150, 400)
               : randInt(50, 200);
    return {
      id: uid('s_'), name: n, logoBg: logo.bg, logoIcon: logo.icon,
      cash, totalBO: 0,           // computed from seeded movies in seedHistory
      releases: 0, awards: 0,     // computed from seeded movies in seedHistory
      rating, isPlayer: false,
    };
  });

  // Balanced talent pool: ~100 per color, ~600 total, mix of ages and genders.
  const talents: Talent[] = generateBalancedTalentPool();

  const franchises: Franchise[] = [];
  const usedFranchiseNames = new Set<string>();
  rivals.forEach(r => {
    // Bigger studios get more franchises (rating-scaled). Range: 4–14 per studio.
    const fcount = r.rating >= 5 ? randInt(10, 14)
                 : r.rating >= 4 ? randInt(7, 12)
                 : r.rating >= 3 ? randInt(5, 9)
                 : randInt(4, 7);
    for (let i = 0; i < fcount; i++) {
      const g = pick(GENRES);
      const fname = genFranchiseName(usedFranchiseNames);
      usedFranchiseNames.add(fname);
      franchises.push({
        id: uid('f_'), name: fname, studioId: r.id,
        movieIds: [], popularity: randInt(40, 90),
        iconKey: GENRE_ICON[g].icon, iconBg: GENRE_ICON[g].bg,
        lastReleasedWeek: 0, lastReleasedYear: 0,
      });
    }
  });

  // Audience segments — population demographics with color preferences
  const audience: AudienceSegment[] = [
    { label: 'Male 18-35',   share: 0.22, preferredColor: 'red',    preferredGenres: ['Action', 'Sci-Fi', 'Thriller'] },
    { label: 'Female 18-35', share: 0.22, preferredColor: 'yellow', preferredGenres: ['Romance', 'Drama', 'Comedy'] },
    { label: 'Male 36-55',   share: 0.18, preferredColor: 'blue',   preferredGenres: ['Thriller', 'Drama', 'Mystery'] },
    { label: 'Female 36-55', share: 0.18, preferredColor: 'purple', preferredGenres: ['Drama', 'Mystery', 'Fantasy'] },
    { label: 'Family',       share: 0.20, preferredColor: 'green',  preferredGenres: ['Animation', 'Fantasy', 'Comedy'] },
  ];

  const allStudioIds = [player.id, ...rivals.map(r => r.id)];
  const relationships = buildInitialRelationships(allStudioIds);

  // Seed 4 rivals with active streaming services so the player has competitors on Day 1.
  const seededRivalIdxs = [0, 3, 6, 9].map(i => i % rivals.length);
  const streamingServices: StreamingService[] = seededRivalIdxs.map(i => {
    const r = rivals[i];
    const tiers = defaultTiers().map(t => ({ ...t, price: +(t.price * (0.85 + Math.random() * 0.4)).toFixed(2) }));
    const subscribers = randInt(2_000_000, 18_000_000);
    const tierSubs: Record<string, number> = {};
    tiers.forEach((t, ix) => { tierSubs[t.id] = Math.round(subscribers * [0.5, 0.35, 0.15][ix]); });
    return {
      id: uid('ss_'),
      studioId: r.id,
      name: genServiceName(r.name),
      tiers,
      subscribers,
      tierSubscribers: tierSubs,
      monthlyRevenue: +(subscribers * 12 / 1_000_000).toFixed(2),
      reputation: randInt(40, 75),
      catalogMovieIds: [],
      launchedYear: 0,
      launchedWeek: 1,
      history: [],
    };
  });

  const START_YEAR = 51; // Game starts at year 51 → 50 years of industry history seeded before Day 1
  const ipSeed = seedExternalLicensors();
  const seeded = seedHistory({
    initialized: true, week: 1, year: START_YEAR, player, rivals,
    movies: [], talents, franchises, audience, relationships, streamingServices,
    newsLog: [{ week: 1, year: START_YEAR, text: `${player.name} opens its doors. The industry has 50 years of history, ${streamingServices.length} streaming services online.` }],
    externalLicensors: ipSeed.licensors,
    externalIPs: ipSeed.ips,
    externalIPOffers: [],
    ownedIPLicenses: [],
    outboundIPListings: [],
    outboundIPBids: [],
  });
  // Seed 1 starter inbound IP offer so the player sees the External IP feature on day 1.
  // V42b — Also seed TV channels + cable providers immediately so screens have data on Day 1.
  let withIP = generateInboundIPOffer(seeded);
  withIP = ensureTVNetworks(withIP);
  withIP = ensureCableProviders(withIP);
  return withIP;
}

// Pre-populate ~50 in-game years of AI-released movies so the world feels truly mature on Day 1.
// Each rival's franchise gets 3-10 retroactive films across decades; bigger studios get more
// franchises and more standalone originals. Movies are fully formed (cast, crew, BO, reviews)
// but dated in the past so the player joins a deep industry, not an empty one.
function seedHistory(s: GameState): GameState {
  const movies: Movie[] = [];
  const usedTitles = new Set<string>();
  const HISTORY_YEARS = 50;
  for (const r of s.rivals) {
    const myFranchises = s.franchises.filter(f => f.studioId === r.id);
    // Independent originals across 50y — bigger studios release more.
    const ratingMult = 0.5 + (r.rating - 1) * 0.45; // rating 1 → 0.5, rating 5 → 2.3
    const originalsCount = Math.round(randInt(20, 45) * ratingMult);
    for (let i = 0; i < originalsCount; i++) {
      const yearOffset = randInt(-(HISTORY_YEARS - 1), -1);
      const yr = s.year + yearOffset;
      const wk = randInt(1, WEEKS_PER_YEAR);
      const m = makeHistoricMovie(s, r.id, undefined, wk, yr, usedTitles);
      if (m) { movies.push(m); }
    }
    // Franchise titles: 3-10 movies per franchise spread across 50y
    for (const fr of myFranchises) {
      // V42 — Trilogy-friendly distribution: heavily favor 3-film franchises, occasional larger sagas
      const sizeRoll = Math.random();
      const count = sizeRoll < 0.45 ? 3 : sizeRoll < 0.70 ? randInt(2, 3) : sizeRoll < 0.88 ? randInt(4, 5) : randInt(6, 9);
      const slots = Array.from({ length: count }, () => ({
        yearOffset: randInt(-(HISTORY_YEARS - 1), -1),
        week: randInt(1, WEEKS_PER_YEAR),
      })).sort((a, b) => a.yearOffset * 100 + a.week - (b.yearOffset * 100 + b.week));
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const yr = s.year + slot.yearOffset;
        // First film = Original; subsequent = Sequel (most common) or Spinoff
        const brand: 'Original' | 'Sequel' | 'Spinoff' = i === 0 ? 'Original' : (Math.random() < 0.7 ? 'Sequel' : 'Spinoff');
        const sequelNum = brand === 'Sequel' ? i + 1 : 1;
        const m = makeHistoricMovie(s, r.id, fr.id, slot.week, yr, usedTitles, { brand, sequelNum });
        if (m) {
          fr.movieIds.push(m.id);
          fr.lastReleasedWeek = slot.week;
          fr.lastReleasedYear = yr;
          if (m.criticScore >= 75) fr.popularity = Math.min(100, fr.popularity + 3);
          movies.push(m);
        }
      }
    }
    // Recompute rival career stats from actual seeded movies (coherence guarantee — no more inflated random numbers)
    const myMovies = movies.filter(mm => mm.studioId === r.id);
    const totalBO = myMovies.reduce((a, b) => a + b.boxOffice, 0);
    const totalAwards = myMovies.reduce((a, b) => a + (b.awards || 0), 0);
    const idx = s.rivals.findIndex(rr => rr.id === r.id);
    if (idx >= 0) {
      s.rivals[idx] = { ...r, releases: myMovies.length, totalBO: +totalBO.toFixed(3), awards: totalAwards };
    }
  }
  // Seed each rival streaming service catalog with 15-40 of their owner's released movies (newest first),
  // and distribute tier access across tiers (newer/higher-critic films stick to premium tiers, mid films
  // span standard+, older films are available to all tiers). Plus allow non-exclusive cross-licensing
  // between rival services so some films appear in 2+ catalogs.
  const seededServices = s.streamingServices.map(svc => {
    const ownerMovies = movies.filter(m => m.studioId === svc.studioId).sort((a, b) => (b.releaseYear * 100 + b.releaseWeek) - (a.releaseYear * 100 + a.releaseWeek));
    const take = ownerMovies.slice(0, randInt(15, 40)).map(m => m.id);
    const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
    const tierAcc: Record<string, string[]> = {};
    for (const mid of take) {
      const m = movies.find(mm => mm.id === mid);
      if (!m) continue;
      const ageY = s.year - m.releaseYear;
      const critic = m.criticScore || 60;
      // Newer + acclaimed → premium only ; mid → top-two tiers ; older → all tiers
      if (ageY < 2 && critic >= 75) tierAcc[mid] = [tiersByPrice[tiersByPrice.length - 1].id];
      else if (ageY < 4 && critic >= 60) tierAcc[mid] = tiersByPrice.slice(Math.max(0, tiersByPrice.length - 2)).map(t => t.id);
      else tierAcc[mid] = []; // empty = all tiers
    }
    return { ...svc, catalogMovieIds: take, movieTierAccess: tierAcc, launchedYear: s.year - randInt(3, 12) };
  });
  // Cross-license: 15% chance for each released non-exclusive film to also be in 1-2 OTHER services
  // (simulates real-world non-exclusive licensing). Skips originals (m.brand === 'Original' && m.studioId === svc.studioId is the only legal home).
  for (const m of movies) {
    if (m.status !== 'released') continue;
    if (Math.random() > 0.15) continue;
    const otherSvcs = seededServices.filter(svc => svc.studioId !== m.studioId);
    if (otherSvcs.length === 0) continue;
    const extra = otherSvcs.sort(() => Math.random() - 0.5).slice(0, randInt(1, 2));
    for (const svc of extra) {
      if (svc.catalogMovieIds.includes(m.id)) continue;
      // Add via the licensedMovies entries (non-owner content needs a license entry)
      const tIds = svc.tiers.length >= 3 ? svc.tiers.sort((a, b) => a.price - b.price).slice(1).map(t => t.id) : [];
      svc.catalogMovieIds = [...svc.catalogMovieIds, m.id];
      svc.licensedMovies = [...(svc.licensedMovies || []), {
        movieId: m.id, tierIds: tIds, feePaid: randInt(2, 12),
        yearsLicensed: 3, expiresWeek: s.week, expiresYear: s.year + randInt(2, 4),
      }];
    }
  }
  // Mark which movies are in streaming
  for (const svc of seededServices) {
    for (const mid of svc.catalogMovieIds) {
      const m = movies.find(mm => mm.id === mid);
      if (m) m.inStreamingServiceIds = [...(m.inStreamingServiceIds || []), svc.id];
    }
  }
  const news = [
    { week: 1, year: s.year, text: `Industry overview: ${s.rivals.length} active studios, ${movies.length} films in distribution, ${seededServices.length} streaming services online.` },
    ...s.newsLog,
  ];
  return { ...s, movies, streamingServices: seededServices, newsLog: news.slice(0, 400) };
}

function makeHistoricMovie(s: GameState, studioId: string, franchiseId: string | undefined, releaseWeek: number, releaseYear: number, usedTitles?: Set<string>, sequelInfo?: { brand: 'Original' | 'Sequel' | 'Spinoff'; sequelNum: number }): Movie | null {
  const genre = pick(GENRES);
  const wr = pick(s.talents.filter(t => t.role === 'writer'));
  const dir = pick(s.talents.filter(t => t.role === 'director'));
  const actor = pick(s.talents.filter(t => t.role === 'actor'));
  const actress = pick(s.talents.filter(t => t.role === 'actress'));
  if (!wr || !dir || !actor || !actress) return null;
  const budget = randInt(40, 280);
  const criticScore = randInt(48, 94);
  // Decent BO for a finished history movie based on critic score (in $B)
  const baseBOM = budget * (0.6 + (criticScore - 50) / 60) * (0.7 + Math.random() * 1.4);
  const boB = Math.max(0.02, +(baseBOM / 1000).toFixed(3));
  const id = uid('mh_');
  // Title generation: if franchise-bound, derive from franchise + brand to keep continuity unique;
  // else use a unique standalone title.
  let title: string;
  let brand: Movie['brand'] = 'Original';
  if (franchiseId) {
    const fr = s.franchises.find(f => f.id === franchiseId);
    const fname = fr?.name || genFranchiseName(usedTitles);
    brand = sequelInfo?.brand || 'Original';
    title = genTitleSubtitle(fname, brand, sequelInfo?.sequelNum || 1, usedTitles);
  } else {
    title = genFranchiseName(usedTitles);
  }
  if (usedTitles) usedTitles.add(title);
  const movie: Movie = {
    id, title, type: genre as any, genre,
    plotArc: pick(['Man in a Hole', 'Icarus', 'Cinderella'] as any),
    rating: pick(['PG-13', 'R', 'PG'] as any), runtime: randInt(85, 145),
    brand, franchiseId,
    studioId, writerId: wr.id, directorId: dir.id,
    cast: [
      { talentId: actor.id, role: 'lead_actor', dealType: 'middle', contractKind: 'single', salary: actor.salary, boPercent: 1 },
      { talentId: actress.id, role: 'lead_actress', dealType: 'middle', contractKind: 'single', salary: actress.salary, boPercent: 1 },
    ],
    budget, marketingBudget: Math.round(budget * 0.45), weeksToRelease: 0,
    status: 'released', criticScore, boxOffice: boB, weeklyBO: [boB],
    releaseWeek, releaseYear,
    iconKey: GENRE_ICON[genre].icon, iconBg: GENRE_ICON[genre].bg,
    awards: criticScore >= 88 && Math.random() < 0.3 ? randInt(1, 3) : 0,
    plot: genPlot(),
    fatiguePenalty: 0, chemistryBonus: 0, holidayBonus: 0,
    releaseStrategy: 'theatrical', inStreamingServiceIds: [],
    reviews: generateReviews(criticScore),
  };
  return movie;
}

// REMOVED audience-color logic — chemistry is now talent-to-talent, computed per release in simulateWeek.

export interface CreateMovieArgs {
  title?: string;
  franchiseName?: string;
  type: Movie['type']; genre: Movie['genre']; plotArc: Movie['plotArc'];
  rating: Movie['rating']; runtime: number; brand: Movie['brand'];
  franchiseId?: string; parentMovieId?: string; crossoverFranchiseIds?: string[];
  writerId: string; directorId: string;
  cast: { talentId: string; role: Movie['cast'][number]['role']; dealType: DealType; contractKind?: import('./types').ContractKind; roleName?: string; roleDescription?: string }[];
  marketingBudget: number;
  releaseStrategy?: ReleaseStrategy;
  streamingWindowWeeks?: number;
  // For streaming-only releases: target service + tiers (player picks at creation)
  streamingTargetServiceId?: string;
  streamingTargetTierIds?: string[];
  tvNetworkId?: string;
  // Player-chosen release date. If absent, default to filming + 0 (release as soon as production wraps).
  targetReleaseWeek?: number;
  targetReleaseYear?: number;
  // Optional external IP license to attach (uses one pack of an OwnedIPLicense).
  externalIPLicenseId?: string;
  crossoverDiscountFactor?: number;
}

export function createMovie(state: GameState, args: CreateMovieArgs): { state: GameState; movie?: Movie; error?: string } {
  const { player, talents } = state;
  const writer = talents.find(t => t.id === args.writerId);
  const director = talents.find(t => t.id === args.directorId);
  if (!writer || !director) return { state, error: 'Writer or director missing' };
  if (writer.retired || director.retired) return { state, error: 'Crew member is retired' };

  // Availability check — writer/director/cast cannot be in another in-production movie or in cooldown
  const allTalentIds = [args.writerId, args.directorId, ...args.cast.map(c => c.talentId)];
  for (const tid of allTalentIds) {
    const tt = talents.find(x => x.id === tid);
    if (!tt) return { state, error: 'A selected talent is unavailable.' };
    const av = talentAvailability(tt, state.week, state.year);
    if (!av.available) {
      if (av.reason === 'Cooldown') return { state, error: `${tt.name} is in cooldown for ${av.cooldownWeeksLeft} more week(s).` };
      if (av.reason === 'In production') return { state, error: `${tt.name} is already locked in another production.` };
      return { state, error: `${tt.name} is unavailable: ${av.reason}.` };
    }
  }

  // Compute cast deal terms — apply contract multiplier and role multiplier to salary
  const enrichedCast = args.cast.map(c => {
    const t = talents.find(tt => tt.id === c.talentId);
    if (!t) return null;
    if (t.retired) return null;
    const isLead = c.role.startsWith('lead_');
    const roleMult = isLead ? 1.0 : 0.5;
    const terms = dealTerms(t.salary, c.dealType);
    const ck = c.contractKind || 'single';
    const cm = contractTerms(ck).multiplier;
    return { talentId: c.talentId, role: c.role, dealType: c.dealType, contractKind: ck, salary: +(terms.salary * cm * roleMult).toFixed(2), boPercent: terms.boPercent, roleName: c.roleName, roleDescription: c.roleDescription };
  }).filter(Boolean) as Movie['cast'];
  if (enrichedCast.length !== args.cast.length) return { state, error: 'A cast member is no longer available (retired)' };

  const writerSalary = writer.salary;
  const directorSalary = director.salary;
  const castSalaries = enrichedCast.reduce((a, b) => a + b.salary, 0);
  const salaries = writerSalary + directorSalary + castSalaries;
  const runtimeFactor = args.runtime / 120;
  const productionCost = +(salaries * runtimeFactor + 8).toFixed(2);

  // CROSSOVER LICENSE FEE — Crossovers with rival-owned franchises require negotiated licensing.
  // Fee scales with popularity, owner rating and franchise size. This makes crossovers a strategic decision.
  let crossoverLicenseFee = 0;
  const crossoverNotes: string[] = [];
  if (args.brand === 'Crossover' && args.crossoverFranchiseIds?.length) {
    for (const fid of args.crossoverFranchiseIds) {
      const fr = state.franchises.find(f => f.id === fid);
      if (!fr) continue;
      if (fr.studioId === player.id) continue; // own franchise, free
      const owner = state.rivals.find(r => r.id === fr.studioId);
      const rating = owner?.rating || 3;
      // Base 25M × popularity factor × rating mult × franchise depth
      const popMult = 0.5 + (fr.popularity / 100) * 1.8;
      const ratingMult = 0.7 + (rating - 1) * 0.18;
      const depthMult = 1 + Math.min(0.6, (fr.movieIds.length || 1) * 0.05);
      let fee = +(25 * popMult * ratingMult * depthMult).toFixed(1);
      if (args.crossoverDiscountFactor !== undefined) {
        fee = +(fee * args.crossoverDiscountFactor).toFixed(1);
      }
      crossoverLicenseFee += fee;
      crossoverNotes.push(`${fr.name} ($${fee.toFixed(0)}M to ${owner?.name || '?'})`);
    }
  }
  const totalBudget = +(productionCost + args.marketingBudget + crossoverLicenseFee).toFixed(2);
  const totalBudgetB = totalBudget / 1000;
  if (player.cash < totalBudgetB) return { state, error: `Not enough cash. Need $${totalBudget.toFixed(1)}M${crossoverLicenseFee ? ` (incl. $${crossoverLicenseFee.toFixed(0)}M crossover licensing: ${crossoverNotes.join(', ')})` : ''} (have $${(player.cash * 1000).toFixed(1)}M)` };

  let franchiseId = args.franchiseId;
  let franchiseName: string | undefined;
  let sequelNum = 1;
  if (args.brand === 'Original') {
    const usedFr = new Set(state.franchises.map(f => f.name));
    const fname = (args.franchiseName?.trim()) || genFranchiseName(usedFr);
    const newFr: Franchise = {
      id: uid('f_'), name: fname, studioId: player.id, movieIds: [],
      popularity: 30, iconKey: GENRE_ICON[args.genre].icon, iconBg: GENRE_ICON[args.genre].bg,
      lastReleasedWeek: 0, lastReleasedYear: 0,
    };
    state = { ...state, franchises: [...state.franchises, newFr] };
    franchiseId = newFr.id; franchiseName = fname;
  } else {
    const fr = state.franchises.find(f => f.id === franchiseId);
    if (!fr) return { state, error: 'Franchise not found' };
    franchiseName = fr.name;
    sequelNum = (fr.movieIds.filter(mid => state.movies.find(m => m.id === mid && m.studioId === player.id)).length || 0) + 1;
  }

  // Compute filming weeks (minimum production time)
  const filmingWeeks = Math.max(2, Math.round(args.runtime / 30) + 2);
  // If player picked a target release date, weeksToRelease respects it (clamped to >= filmingWeeks).
  // If onHold (no target), weeksToRelease is sentinel-large; the player must explicitly schedule later.
  const onHold = !args.targetReleaseWeek || !args.targetReleaseYear;
  let weeksToRelease = filmingWeeks;
  if (!onHold) {
    const totalWeeks = (args.targetReleaseYear! - state.year) * WEEKS_PER_YEAR + (args.targetReleaseWeek! - state.week);
    weeksToRelease = Math.max(filmingWeeks, totalWeeks);
  } else {
    weeksToRelease = 999999; // effectively infinite — user must schedule later via setMovieReleaseDate
  }

  // External IP license attachment (uses one pack of an OwnedIPLicense; later boosts BO/popularity at release)
  let attachedIP: { id: string; ipId: string } | undefined;
  if (args.externalIPLicenseId) {
    const lic = (state.ownedIPLicenses || []).find(l => l.id === args.externalIPLicenseId && l.studioId === player.id);
    if (!lic) return { state, error: 'IP license not found.' };
    if (lic.packsUsed >= lic.packs) return { state, error: 'IP license has no remaining packs.' };
    const expTotal = lic.expiresYear * WEEKS_PER_YEAR + lic.expiresWeek;
    const nowTotal = state.year * WEEKS_PER_YEAR + state.week;
    if (expTotal < nowTotal) return { state, error: 'IP license has expired.' };
    attachedIP = { id: lic.id, ipId: lic.ipId };
  }

  const usedMovieTitles = new Set(state.movies.map(m => m.title));
  const title = (args.title?.trim()) || genTitleSubtitle(franchiseName!, args.brand, sequelNum, usedMovieTitles);
  const movie: Movie = {
    id: uid('m_'), title, type: args.type, genre: args.genre, plotArc: args.plotArc,
    rating: args.rating, runtime: args.runtime, brand: args.brand,
    franchiseId, parentMovieId: args.parentMovieId, crossoverFranchiseIds: args.crossoverFranchiseIds,
    studioId: player.id, writerId: args.writerId, directorId: args.directorId,
    cast: enrichedCast, budget: productionCost, marketingBudget: args.marketingBudget,
    weeksToRelease,
    status: 'production', criticScore: 0, boxOffice: 0, weeklyBO: [],
    releaseWeek: 0, releaseYear: 0,
    iconKey: GENRE_ICON[args.genre].icon, iconBg: GENRE_ICON[args.genre].bg,
    awards: 0, plot: genPlot(),
    fatiguePenalty: 0, chemistryBonus: 0, holidayBonus: 0,
    releaseStrategy: args.releaseStrategy || 'theatrical',
    tvNetworkId: args.tvNetworkId,
    streamingWindowWeeks: args.streamingWindowWeeks ?? (args.releaseStrategy === 'hybrid' ? 12 : undefined),
    inStreamingServiceIds: [],
    streamingTargetServiceId: args.streamingTargetServiceId,
    streamingTargetTierIds: args.streamingTargetTierIds,
    onHold,
    marketingAuto: true,
    targetReleaseWeek: args.targetReleaseWeek,
    targetReleaseYear: args.targetReleaseYear,
    externalIPId: attachedIP?.ipId,
    ipLicenseId: attachedIP?.id,
  };

  // Lock all cast/crew to this in-production movie
  const updatedTalents = state.talents.map(t => {
    if (allTalentIds.includes(t.id)) return { ...t, inProductionMovieId: movie.id };
    return t;
  });

  const updatedPlayer = { ...player, cash: +(player.cash - totalBudgetB).toFixed(3) };
  // Credit rival studios for crossover licensing fees
  let updatedRivals = state.rivals;
  let crossoverNewsLog: typeof state.newsLog = [];
  if (crossoverLicenseFee > 0 && args.crossoverFranchiseIds?.length) {
    updatedRivals = state.rivals.slice();
    for (const fid of args.crossoverFranchiseIds) {
      const fr = state.franchises.find(f => f.id === fid);
      if (!fr || fr.studioId === player.id) continue;
      const idx = updatedRivals.findIndex(r => r.id === fr.studioId);
      if (idx < 0) continue;
      const owner = updatedRivals[idx];
      const popMult = 0.5 + (fr.popularity / 100) * 1.8;
      const ratingMult = 0.7 + (owner.rating - 1) * 0.18;
      const depthMult = 1 + Math.min(0.6, (fr.movieIds.length || 1) * 0.05);
      let fee = +(25 * popMult * ratingMult * depthMult).toFixed(1);
      if (args.crossoverDiscountFactor !== undefined) {
        fee = +(fee * args.crossoverDiscountFactor).toFixed(1);
      }
      const feeB = fee / 1000;
      updatedRivals[idx] = { ...owner, cash: +(owner.cash + feeB).toFixed(3) };
      crossoverNewsLog.push({ week: state.week, year: state.year, text: `${player.name} pays ${owner.name} $${fee.toFixed(0)}M to license ${fr.name} for crossover.` });
    }
  }
  const updatedFranchises = state.franchises.map(f => f.id === franchiseId ? { ...f, movieIds: [...f.movieIds, movie.id] } : f);
  // Bump packsUsed on the IP license, if attached
  let ownedIPLicenses = state.ownedIPLicenses || [];
  if (attachedIP) ownedIPLicenses = ownedIPLicenses.map(l => l.id === attachedIP!.id ? { ...l, packsUsed: l.packsUsed + 1 } : l);
  const newsLog = crossoverNewsLog.length ? [...crossoverNewsLog, ...state.newsLog].slice(0, 400) : state.newsLog;
  return { state: { ...state, player: updatedPlayer, rivals: updatedRivals, talents: updatedTalents, movies: [...state.movies, movie], franchises: updatedFranchises, ownedIPLicenses, newsLog }, movie };
}

// ---------- Player streaming service operations ----------

export interface LaunchStreamingArgs { name: string; tiers: import('./types').SubscriptionTier[]; }

export const MAX_PLAYER_STREAMING_SERVICES = 3;

export function launchPlayerStreamingService(state: GameState, args: LaunchStreamingArgs): { state: GameState; service?: StreamingService; error?: string } {
  const playerServices = (state.streamingServices || []).filter(s => s.studioId === state.player.id);
  if (playerServices.length >= MAX_PLAYER_STREAMING_SERVICES) {
    return { state, error: `You can only operate up to ${MAX_PLAYER_STREAMING_SERVICES} streaming services.` };
  }
  const cost = 0.2; // $200M (in $B)
  if (state.player.cash < cost) return { state, error: `Need $${(cost * 1000).toFixed(0)}M to launch (have $${(state.player.cash * 1000).toFixed(0)}M).` };
  if (!args.name.trim()) return { state, error: 'Service needs a name.' };
  if (!args.tiers.length) return { state, error: 'At least one subscription tier is required.' };

  const service: StreamingService = {
    id: uid('ss_'),
    studioId: state.player.id,
    name: args.name.trim(),
    tiers: args.tiers.map(t => ({ ...t })),
    subscribers: 0,
    tierSubscribers: Object.fromEntries(args.tiers.map(t => [t.id, 0])),
    monthlyRevenue: 0,
    reputation: 30,
    catalogMovieIds: state.movies.filter(m => m.studioId === state.player.id && m.status === 'released').map(m => m.id),
    launchedYear: state.year,
    launchedWeek: state.week,
    history: [],
  };
  // Mark already-released player titles as carried by the new service
  const updatedMovies = state.movies.map(m => {
    if (m.studioId !== state.player.id || m.status !== 'released') return m;
    return { ...m, inStreamingServiceIds: [...(m.inStreamingServiceIds || []), service.id] };
  });
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - cost).toFixed(3) };
  const newsLog = [{ week: state.week, year: state.year, text: `${service.name} launches — ${state.player.name} enters the streaming wars.` }, ...state.newsLog].slice(0, 400);
  return {
    state: { ...state, player: updatedPlayer, movies: updatedMovies, streamingServices: [...(state.streamingServices || []), service], newsLog },
    service,
  };
}

export function updatePlayerStreamingService(state: GameState, serviceId: string, patch: Partial<Pick<StreamingService, 'name' | 'tiers' | 'isExclusive' | 'exclusiveMovieIds'>>): { state: GameState; error?: string } {
  const idx = (state.streamingServices || []).findIndex(s => s.id === serviceId && s.studioId === state.player.id);
  if (idx < 0) return { state, error: 'Service not found.' };
  const services = state.streamingServices.slice();
  const cur = services[idx];
  const next: StreamingService = { ...cur };
  if (patch.name !== undefined) next.name = patch.name.trim() || cur.name;
  if (patch.isExclusive !== undefined) next.isExclusive = !!patch.isExclusive;
  if (patch.exclusiveMovieIds !== undefined) next.exclusiveMovieIds = [...patch.exclusiveMovieIds];
  if (patch.tiers !== undefined) {
    next.tiers = patch.tiers.map(t => ({ ...t }));
    // Reset tier subscribers for any new tiers
    const newTierSubs: Record<string, number> = {};
    next.tiers.forEach(t => { newTierSubs[t.id] = cur.tierSubscribers?.[t.id] ?? 0; });
    next.tierSubscribers = newTierSubs;
  }
  services[idx] = next;
  return { state: { ...state, streamingServices: services } };
}

export function deletePlayerStreamingService(state: GameState, serviceId: string): { state: GameState; error?: string } {
  const svc = (state.streamingServices || []).find(s => s.id === serviceId && s.studioId === state.player.id);
  if (!svc) return { state, error: 'Service not found.' };
  // Remove the service-id from any movies that referenced it
  const movies = state.movies.map(m => {
    if (!m.inStreamingServiceIds?.includes(serviceId)) return m;
    return { ...m, inStreamingServiceIds: m.inStreamingServiceIds.filter(id => id !== serviceId) };
  });
  const services = state.streamingServices.filter(s => s.id !== serviceId);
  const newsLog = [{ week: state.week, year: state.year, text: `${svc.name} shuts down. ${state.player.name} retires the service.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, streamingServices: services, movies, newsLog } };
}

// Set marketing allocation for a movie. Total allocation cannot exceed movie.marketingBudget.
export function setMarketingAllocation(state: GameState, movieId: string, allocation: Record<string, number>): { state: GameState; error?: string } {
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'Not your movie.' };
  if (movie.status === 'released') return { state, error: 'Movie already released.' };
  const total = Object.values(allocation).reduce((a, b) => a + (b || 0), 0);
  if (total > movie.marketingBudget + 0.01) return { state, error: `Allocation $${total.toFixed(1)}M exceeds budget $${movie.marketingBudget}M.` };
  const movies = state.movies.map(m => m.id === movieId ? { ...m, marketingAllocation: { ...allocation }, marketingAuto: false } : m);
  return { state: { ...state, movies } };
}

// V30 — Marketing Manager: compute optimal channel allocation for a movie.
// Strategy: pick channels with highest weighted reach for the movie's target audience and genre, then
// distribute spend with diminishing returns (top channels get more, but never all).
export function computeOptimalMarketingAllocation(movie: Movie, audience: { label: string; share: number }[]): Record<string, number> {
  const budget = movie.marketingBudget;
  if (budget <= 0) return {};
  // Score each channel: audience-weighted reach × cost-efficiency
  // Then weight a tiny bit by genre suitability (rough heuristic).
  const isYouthGenre = movie.genre === 'Action' || movie.genre === 'Sci-Fi' || movie.genre === 'Animation' || movie.genre === 'Horror' || movie.genre === 'Fantasy';
  const isPrestigeGenre = movie.genre === 'Drama' || movie.genre === 'Romance' || movie.genre === 'Mystery';
  const channelScores = MARKETING_CHANNELS.map(ch => {
    let chReach = 0;
    audience.forEach(seg => {
      const w = ageWeightsForSegment(seg.label);
      const segReach = (w.young * ch.reach.young + w.adult * ch.reach.adult + w.mid * ch.reach.mid + w.senior * ch.reach.senior);
      chReach += seg.share * segReach;
    });
    let score = chReach * ch.costEfficiency;
    // Genre tilt
    if (isYouthGenre && (ch.key === 'internet' || ch.key === 'own_streaming' || ch.key === 'cable' || ch.key === 'trailers_big')) score *= 1.15;
    if (isPrestigeGenre && (ch.key === 'newspaper' || ch.key === 'magazine' || ch.key === 'radio')) score *= 1.18;
    return { key: ch.key, score };
  }).sort((a, b) => b.score - a.score);

  // Allocate to top 5-7 channels with diminishing weights
  const TOP_N = Math.min(channelScores.length, budget < 30 ? 4 : budget < 80 ? 5 : 7);
  const top = channelScores.slice(0, TOP_N);
  const sumScores = top.reduce((a, c) => a + c.score, 0) || 1;
  // Mix strategy: 60% proportional to score, 40% even spread (avoids "all eggs in 1 basket" failure mode)
  const allocation: Record<string, number> = {};
  let allocated = 0;
  top.forEach((c, i) => {
    const propShare = (c.score / sumScores) * 0.60;
    const evenShare = (1 / TOP_N) * 0.40;
    let amt = +(budget * (propShare + evenShare)).toFixed(1);
    // Round-friendly increments
    amt = Math.max(1, Math.round(amt));
    allocation[c.key] = amt;
    allocated += amt;
  });
  // Adjust for rounding drift (give surplus/deficit to top channel)
  const drift = +(budget - allocated).toFixed(1);
  if (Math.abs(drift) > 0.01) {
    allocation[top[0].key] = +Math.max(0, allocation[top[0].key] + drift).toFixed(1);
  }
  return allocation;
}

// V30 — Toggle Marketing Manager auto mode on a movie (auto-applies optimal allocation now).
export function setMarketingAuto(state: GameState, movieId: string, enabled: boolean): { state: GameState; error?: string } {
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'Not your movie.' };
  if (movie.status === 'released') return { state, error: 'Movie already released.' };
  const allocation = enabled ? computeOptimalMarketingAllocation(movie, state.audience) : (movie.marketingAllocation || {});
  const movies = state.movies.map(m => m.id === movieId ? { ...m, marketingAuto: enabled, marketingAllocation: enabled ? allocation : m.marketingAllocation } : m);
  return { state: { ...state, movies } };
}

// V30 — Bulk-toggle Marketing Manager across ALL in-production player movies.
export function setMarketingAutoBulk(state: GameState, enabled: boolean): { state: GameState; count: number } {
  let count = 0;
  const movies = state.movies.map(m => {
    if (m.studioId !== state.player.id || m.status === 'released') return m;
    count++;
    const allocation = enabled ? computeOptimalMarketingAllocation(m, state.audience) : (m.marketingAllocation || {});
    return { ...m, marketingAuto: enabled, marketingAllocation: enabled ? allocation : m.marketingAllocation };
  });
  return { state: { ...state, movies }, count };
}

// Renew an existing license — must be done before expiry. Renewal fee discounted 25% if renewed before half-life.
export function renewLicense(state: GameState, serviceId: string, movieId: string, additionalYears: 1 | 3 | 5 | 10): { state: GameState; error?: string; fee?: number } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Service not found.' };
  const svc = state.streamingServices[svcIdx];
  const license = (svc.licensedMovies || []).find(l => l.movieId === movieId);
  if (!license) return { state, error: 'No active license to renew.' };
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };

  // Discount if renewed early (more than 50% of original term remaining)
  const wksLeft = (license.expiresYear - state.year) * WEEKS_PER_YEAR + (license.expiresWeek - state.week);
  const totalWks = license.yearsLicensed * WEEKS_PER_YEAR;
  const isEarly = wksLeft > totalWks / 2;
  const owner = state.rivals.find(r => r.id === movie.studioId);
  const fr = movie.franchiseId ? state.franchises.find(f => f.id === movie.franchiseId) : undefined;
  const baseFee = computeLicenseFee(movie, additionalYears, state.week, state.year, {
    exclusivity: !!license.exclusivity,
    ownerRating: owner?.rating,
    franchisePopularity: fr?.popularity,
  });
  const fee = +(baseFee * (isEarly ? 0.75 : 1.0)).toFixed(2);
  const feeB = fee / 1000;
  if (state.player.cash < feeB) return { state, error: `Need $${fee.toFixed(1)}M renewal fee.`, fee };

  // Extend expiration from CURRENT expiry forward (not from now)
  let expW = license.expiresWeek + additionalYears * WEEKS_PER_YEAR;
  let expY = license.expiresYear;
  while (expW > WEEKS_PER_YEAR) { expW -= WEEKS_PER_YEAR; expY += 1; }

  const services = state.streamingServices.slice();
  services[svcIdx] = {
    ...svc,
    licensedMovies: (svc.licensedMovies || []).map(l => l.movieId === movieId
      ? { ...l, expiresWeek: expW, expiresYear: expY, yearsLicensed: l.yearsLicensed + additionalYears, feePaid: l.feePaid + fee }
      : l),
  };
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - feeB).toFixed(3) };
  const newsLog = [{ week: state.week, year: state.year, text: `${state.player.name} renews ${movie.title} on ${svc.name} for ${additionalYears}y${isEarly ? ' (early-renewal -25%)' : ''} ($${fee.toFixed(1)}M).` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player: updatedPlayer, streamingServices: services, newsLog }, fee };
}

// License fee calculation for licensing other studios' movies into your streaming service.
// Standardized formula used across ALL licensing surfaces (movie page, franchise page,
// streaming detail, rivals catalog packs, IP, etc.) for fee consistency.
// Factors: BO base × critic mult × age decay × duration × studio reputation × exclusivity × franchise popularity.
export function computeLicenseFee(movie: Movie, yearsLicensed: number, currentWeek: number, currentYear: number, opts?: { exclusivity?: boolean; ownerRating?: number; franchisePopularity?: number }): number {
  const ageWeeks = (currentYear - movie.releaseYear) * WEEKS_PER_YEAR + (currentWeek - movie.releaseWeek);
  const ageYears = Math.max(0, ageWeeks / WEEKS_PER_YEAR);
  // Base fee scales with movie BO + critic score
  const baseBO = Math.max(5, movie.boxOffice * 1000); // in $M
  const criticMult = movie.criticScore / 70;
  // Older movies are cheaper
  const ageDecay = Math.max(0.25, 1 - ageYears * 0.12);
  const yearMult = yearsLicensed; // linear scaling per year
  // Reputation multiplier — bigger studios charge more.
  const repMult = opts?.ownerRating ? 0.85 + (opts.ownerRating - 1) * 0.15 : 1.0; // rating 1→0.85, 5→1.45
  // Exclusivity premium.
  const exclMult = opts?.exclusivity ? 1.6 : 1.0;
  // Franchise popularity bonus (when licensing inside a famous franchise).
  const popMult = opts?.franchisePopularity ? 0.85 + (opts.franchisePopularity / 100) * 0.5 : 1.0;
  // ~3% of BO per year * critic mult * age decay * rep mult * excl mult * franchise pop mult
  const fee = baseBO * 0.03 * yearMult * criticMult * ageDecay * repMult * exclMult * popMult;
  return Math.max(2, +fee.toFixed(2));
}

// Quote a movie license fee against owner's "fair" expectation. Used by the negotiation flow so
// the player can offer LESS than fair and the AI either accepts (within tolerance) or counters.
export function negotiateMovieLicense(state: GameState, serviceId: string, args: LicenseMovieArgs & { offeredFeeM: number }): { state: GameState; error?: string; accepted?: boolean; counter?: { feeM: number; reason: string } } {
  const svc = (state.streamingServices || []).find(s => s.id === serviceId && s.studioId === state.player.id);
  if (!svc) return { state, error: 'Service not found.' };
  const movie = state.movies.find(m => m.id === args.movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId === state.player.id) return { state, error: 'You own this title.' };
  if (movie.status !== 'released') return { state, error: 'Cannot license unreleased titles.' };
  // V44 — Reject negotiation early if another service has an active exclusive lock.
  const negLock = findMovieExclusivityLock(state, args.movieId, serviceId);
  if (negLock) {
    const why = negLock.kind === 'owner_exclusive'
      ? `${negLock.ownerStudioName} keeps this title exclusive on ${negLock.svcName}.`
      : `Locked exclusively to ${negLock.svcName} (${negLock.ownerStudioName}) until ${negLock.expiresLabel}.`;
    return { state, error: `🔒 ${why}` };
  }
  const owner = state.rivals.find(r => r.id === movie.studioId);
  const fr = movie.franchiseId ? state.franchises.find(f => f.id === movie.franchiseId) : undefined;
  const fairFee = computeLicenseFee(movie, args.yearsLicensed, state.week, state.year, {
    exclusivity: !!args.exclusivity,
    ownerRating: owner?.rating,
    franchisePopularity: fr?.popularity,
  });
  // AI accepts if player's offer ≥ 88% of fair (rivals with rating 5 are tougher: 92%).
  const tolerance = owner?.rating ? 0.88 + (owner.rating - 3) * 0.01 : 0.88;
  const ratio = args.offeredFeeM / fairFee;
  if (ratio >= tolerance) {
    // Sign immediately at the offered fee.
    const result = licenseMovieToStreaming(state, serviceId, { ...args });
    if (result.error) return { state, error: result.error };
    // Override the actual paid fee to the negotiated amount (refund delta to player cash).
    const services = result.state.streamingServices.slice();
    const idx = services.findIndex(s => s.id === serviceId);
    if (idx >= 0) {
      const cur = services[idx];
      const lic = (cur.licensedMovies || []).map(l => l.movieId === args.movieId ? { ...l, feePaid: +args.offeredFeeM.toFixed(2) } : l);
      services[idx] = { ...cur, licensedMovies: lic };
    }
    const refund = +(fairFee - args.offeredFeeM).toFixed(3) / 1000;
    const updatedPlayer = { ...result.state.player, cash: +(result.state.player.cash + refund).toFixed(3) };
    return { state: { ...result.state, streamingServices: services, player: updatedPlayer }, accepted: true };
  }
  // AI counters at midpoint of player offer and fair fee.
  const counterFee = +((args.offeredFeeM + fairFee) / 2).toFixed(2);
  const reason = ratio < 0.6 ? `way below fair value` : ratio < 0.78 ? `below fair value` : `slightly low for the term`;
  return { state, counter: { feeM: counterFee, reason } };
}

export interface LicenseMovieArgs {
  movieId: string;
  yearsLicensed: number; // 1, 3, 5, 10
  tierIds: string[];     // tiers where the licensed title is available; empty = all tiers
  exclusivity?: boolean; // negotiated exclusivity flag — multiplies fee 1.6×
}

// V44 — GLOBAL EXCLUSIVITY CHECKER. Returns info about who locks this movie exclusively, or null.
// Sources of an exclusive lock:
//   1. A streaming service has the movie in its licensedMovies with exclusivity:true and not yet expired.
//   2. The OWNER's streaming service marks the movie in exclusiveMovieIds (owner's own exclusive — locks out everyone else).
//   3. An IP-license offer was closed with exclusivity:true and is still active (covers franchise IP).
// Pass excludingServiceId to skip the calling service's own license (used when EDITING an existing license).
export interface ExclusivityLock { svcId: string; svcName: string; ownerStudioId: string; ownerStudioName: string; kind: 'licensed' | 'owner_exclusive'; expiresLabel?: string; }
export function findMovieExclusivityLock(state: GameState, movieId: string, excludingServiceId?: string): ExclusivityLock | null {
  const nowTotal = state.year * WEEKS_PER_YEAR + state.week;
  const allSvcs = state.streamingServices || [];
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return null;
  // 2 — Owner marked it as exclusive on their OWN service.
  for (const svc of allSvcs) {
    if (svc.id === excludingServiceId) continue;
    if ((svc.exclusiveMovieIds || []).includes(movieId) && svc.studioId === movie.studioId) {
      const ownerStudio = svc.studioId === state.player.id ? state.player : state.rivals.find(r => r.id === svc.studioId);
      return { svcId: svc.id, svcName: svc.name, ownerStudioId: svc.studioId, ownerStudioName: ownerStudio?.name || '?', kind: 'owner_exclusive' };
    }
  }
  // 1 — Licensed exclusively to ANY service (owner or otherwise).
  for (const svc of allSvcs) {
    if (svc.id === excludingServiceId) continue;
    const lic = (svc.licensedMovies || []).find(l => l.movieId === movieId && l.exclusivity);
    if (!lic) continue;
    const expTotal = lic.expiresYear * WEEKS_PER_YEAR + lic.expiresWeek;
    if (expTotal < nowTotal) continue; // expired
    const ownerStudio = svc.studioId === state.player.id ? state.player : state.rivals.find(r => r.id === svc.studioId);
    return {
      svcId: svc.id,
      svcName: svc.name,
      ownerStudioId: svc.studioId,
      ownerStudioName: ownerStudio?.name || '?',
      kind: 'licensed',
      expiresLabel: `Y${lic.expiresYear} W${lic.expiresWeek}`,
    };
  }
  return null;
}

export function licenseMovieToStreaming(state: GameState, serviceId: string, args: LicenseMovieArgs): { state: GameState; error?: string; fee?: number } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Service not found.' };
  const movie = state.movies.find(m => m.id === args.movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId === state.player.id) return { state, error: 'You can add your own titles for free.' };
  if (movie.status !== 'released') return { state, error: 'Cannot license unreleased titles.' };
  if (![1, 3, 5, 10].includes(args.yearsLicensed)) return { state, error: 'License duration must be 1, 3, 5, or 10 years.' };

  const services = state.streamingServices.slice();
  const cur = { ...services[svcIdx] };
  const existingLicense = (cur.licensedMovies || []).find(l => l.movieId === args.movieId);
  if (existingLicense) return { state, error: 'Already licensed on this service.' };

  // V44 — Block if another service has an active exclusive lock on this title.
  const lock = findMovieExclusivityLock(state, args.movieId, serviceId);
  if (lock) {
    const why = lock.kind === 'owner_exclusive'
      ? `${lock.ownerStudioName} keeps this title exclusive on ${lock.svcName}.`
      : `Locked exclusively to ${lock.svcName} (${lock.ownerStudioName}) until ${lock.expiresLabel}.`;
    return { state, error: `🔒 ${why}` };
  }
  // V44 — Also block if the player itself already has this movie in another of their services (any kind of license).
  for (const otherSvc of services) {
    if (otherSvc.id === serviceId) continue;
    if (otherSvc.studioId !== state.player.id) continue;
    const dup = (otherSvc.licensedMovies || []).find(l => l.movieId === args.movieId);
    if (dup) return { state, error: `Already licensed on your other service "${otherSvc.name}".` };
  }

  const owner = state.rivals.find(r => r.id === movie.studioId);
  const fr = movie.franchiseId ? state.franchises.find(f => f.id === movie.franchiseId) : undefined;
  const fee = computeLicenseFee(movie, args.yearsLicensed, state.week, state.year, {
    exclusivity: !!args.exclusivity,
    ownerRating: owner?.rating,
    franchisePopularity: fr?.popularity,
  });
  const feeB = fee / 1000;
  if (state.player.cash < feeB) return { state, error: `Need $${fee.toFixed(1)}M license fee (have $${(state.player.cash * 1000).toFixed(1)}M).`, fee };

  // Compute expiration
  let expW = state.week + args.yearsLicensed * WEEKS_PER_YEAR;
  let expY = state.year;
  while (expW > WEEKS_PER_YEAR) { expW -= WEEKS_PER_YEAR; expY += 1; }

  cur.licensedMovies = [...(cur.licensedMovies || []), {
    movieId: args.movieId,
    expiresWeek: expW, expiresYear: expY,
    tierIds: [...args.tierIds],
    feePaid: fee, yearsLicensed: args.yearsLicensed,
    exclusivity: !!args.exclusivity,
  }];
  cur.catalogMovieIds = cur.catalogMovieIds.includes(args.movieId) ? cur.catalogMovieIds : [...cur.catalogMovieIds, args.movieId];
  // Map per-tier access if specified
  if (args.tierIds.length) {
    cur.movieTierAccess = { ...(cur.movieTierAccess || {}), [args.movieId]: [...args.tierIds] };
  }
  services[svcIdx] = cur;
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - feeB).toFixed(3) };
  // Note: we don't add this licensed movie to movie.inStreamingServiceIds because that field is for owner-controlled tracking.
  const newsLog = [{ week: state.week, year: state.year, text: `${state.player.name} licenses ${movie.title} for ${args.yearsLicensed}y on ${cur.name} ($${fee.toFixed(1)}M).` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player: updatedPlayer, streamingServices: services, newsLog }, fee };
}

// Set or update a held movie's release date. The movie must belong to the player and be in production.
export function setMovieReleaseDate(state: GameState, movieId: string, week: number, year: number): { state: GameState; error?: string } {
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'Cannot reschedule another studio\'s movie.' };
  if (movie.status === 'released') return { state, error: 'Movie already released.' };
  const filmingWeeks = Math.max(2, Math.round(movie.runtime / 30) + 2);
  const totalWeeks = (year - state.year) * WEEKS_PER_YEAR + (week - state.week);
  if (totalWeeks < filmingWeeks) return { state, error: `Need at least ${filmingWeeks} weeks for filming.` };
  const movies = state.movies.map(m => m.id === movieId
    ? { ...m, targetReleaseWeek: week, targetReleaseYear: year, weeksToRelease: totalWeeks, onHold: false }
    : m);
  return { state: { ...state, movies } };
}

// Pull a movie back to "hold" — it stays in production indefinitely until rescheduled.
export function holdMovie(state: GameState, movieId: string): { state: GameState; error?: string } {
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'Cannot hold another studio\'s movie.' };
  if (movie.status === 'released') return { state, error: 'Movie already released.' };
  const movies = state.movies.map(m => m.id === movieId
    ? { ...m, targetReleaseWeek: undefined, targetReleaseYear: undefined, weeksToRelease: 999999, onHold: true }
    : m);
  return { state: { ...state, movies } };
}

export function addMovieToStreaming(state: GameState, serviceId: string, movieId: string, tierIds?: string[]): { state: GameState; error?: string } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Service not found.' };
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'You can only add your own studio\'s titles for free. Licensing is coming soon.' };
  const services = state.streamingServices.slice();
  const cur = { ...services[svcIdx], catalogMovieIds: [...services[svcIdx].catalogMovieIds] };
  if (cur.catalogMovieIds.includes(movieId)) return { state, error: 'Title already on this service.' };
  cur.catalogMovieIds.push(movieId);
  // Per-movie tier access: if specified (and non-empty subset), record. Empty/undefined = visible to all tiers.
  if (tierIds && tierIds.length && tierIds.length < cur.tiers.length) {
    cur.movieTierAccess = { ...(cur.movieTierAccess || {}), [movieId]: [...tierIds] };
  }
  services[svcIdx] = cur;
  const updatedMovies = state.movies.map(m => m.id === movieId ? { ...m, inStreamingServiceIds: [...(m.inStreamingServiceIds || []), serviceId] } : m);
  return { state: { ...state, streamingServices: services, movies: updatedMovies } };
}

// Update which tiers can stream a movie already in the catalog. Empty array = remove restriction (all tiers).
export function setMovieTierAccess(state: GameState, serviceId: string, movieId: string, tierIds: string[]): { state: GameState; error?: string } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Service not found.' };
  const cur = state.streamingServices[svcIdx];
  if (!cur.catalogMovieIds.includes(movieId)) return { state, error: 'Title not in this catalog.' };
  const services = state.streamingServices.slice();
  const next = { ...cur, movieTierAccess: { ...(cur.movieTierAccess || {}) } };
  if (!tierIds.length || tierIds.length >= cur.tiers.length) {
    delete next.movieTierAccess[movieId];
  } else {
    next.movieTierAccess[movieId] = [...tierIds];
  }
  services[svcIdx] = next;
  return { state: { ...state, streamingServices: services } };
}

export function removeMovieFromStreaming(state: GameState, serviceId: string, movieId: string): { state: GameState } {
  const services = (state.streamingServices || []).map(s => s.id === serviceId
    ? { ...s, catalogMovieIds: s.catalogMovieIds.filter(id => id !== movieId) }
    : s);
  const movies = state.movies.map(m => m.id === movieId
    ? { ...m, inStreamingServiceIds: (m.inStreamingServiceIds || []).filter(sid => sid !== serviceId) }
    : m);
  return { state: { ...state, streamingServices: services, movies } };
}

// V25.2 — Edit tier access on a LICENSED-IN movie (different from catalog ownership).
// Updates the `tierIds` array on the LicensedMovie record itself. Empty array = all tiers.
export function setLicensedMovieTierAccess(state: GameState, serviceId: string, movieId: string, tierIds: string[]): { state: GameState; error?: string } {
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === serviceId && s.studioId === state.player.id);
  if (svcIdx < 0) return { state, error: 'Service not found.' };
  const cur = state.streamingServices[svcIdx];
  const lic = (cur.licensedMovies || []).find(l => l.movieId === movieId);
  if (!lic) return { state, error: 'Licensed title not found in this service.' };
  const allTiers = tierIds.length === 0 || tierIds.length >= cur.tiers.length;
  const services = state.streamingServices.slice();
  services[svcIdx] = {
    ...cur,
    licensedMovies: (cur.licensedMovies || []).map(l => l.movieId === movieId ? { ...l, tierIds: allTiers ? [] : [...tierIds] } : l),
  };
  return { state: { ...state, streamingServices: services } };
}

// ---------- Talent Hire/Fire Operations ----------

// Calculate what a talent expects for a contract based on fame, skill, movies
export function calculateTalentExpectations(talent: Talent, numMovies: number): { 
  minUpfront: number; 
  maxUpfront: number; 
  minBoPercent: number; 
  maxBoPercent: number;
  expectedTotal: number; // Total value they expect for the contract
} {
  // Base salary expectation per movie
  const baseSalary = talent.salary;
  
  // Fame affects expectations (high fame = wants more)
  const fameFactor = 0.7 + (talent.fame / 100) * 0.8; // 0.7 to 1.5
  
  // Skill affects minimum they'll accept
  const skillFactor = 0.8 + (talent.skill / 100) * 0.4; // 0.8 to 1.2
  
  // Multi-movie discount: 1 movie = 100%, 2 movies = 90%, 3 movies = 80%
  const bulkDiscount = numMovies === 1 ? 1.0 : numMovies === 2 ? 0.9 : 0.8;
  
  // Expected per-movie value
  const perMovieValue = baseSalary * fameFactor * skillFactor * bulkDiscount;
  const expectedTotal = perMovieValue * numMovies;
  
  // Upfront range: 40-80% of expected total
  const minUpfront = +(expectedTotal * 0.4).toFixed(2);
  const maxUpfront = +(expectedTotal * 0.8).toFixed(2);
  
  // BO percentage range based on fame (famous actors want BO points)
  const baseBoMin = talent.fame >= 70 ? 3 : talent.fame >= 40 ? 1 : 0;
  const baseBoMax = talent.fame >= 70 ? 12 : talent.fame >= 40 ? 8 : 5;
  
  return {
    minUpfront,
    maxUpfront,
    minBoPercent: baseBoMin,
    maxBoPercent: baseBoMax,
    expectedTotal,
  };
}

// Calculate acceptance probability based on offer vs expectations
export function calculateAcceptance(talent: Talent, numMovies: number, upfront: number, boPercent: number, expectationMultiplier: number = 1.0): {
  probability: number;
  verdict: 'will_accept' | 'likely_accept' | 'considering' | 'unlikely' | 'will_reject';
  reason: string;
} {
  const exp = calculateTalentExpectations(talent, numMovies);
  // V37 — TV/lower-tier work pays less; scale expectations accordingly so a fair TV rate isn't mis-labeled as "insulting".
  const adjustedExpected = exp.expectedTotal * expectationMultiplier;
  
  // Estimate BO value: assume average movie makes $150M, talent gets boPercent of that
  const estimatedBoValue = 150 * (boPercent / 100) * numMovies;
  const totalOfferValue = upfront + estimatedBoValue;
  
  // How does offer compare to expected?
  const ratio = totalOfferValue / adjustedExpected;
  
  let probability: number;
  let verdict: 'will_accept' | 'likely_accept' | 'considering' | 'unlikely' | 'will_reject';
  let reason: string;
  
  if (ratio >= 1.2) {
    probability = 0.98;
    verdict = 'will_accept';
    reason = 'Excellent offer, above expectations';
  } else if (ratio >= 1.0) {
    probability = 0.85;
    verdict = 'likely_accept';
    reason = 'Fair offer, meets expectations';
  } else if (ratio >= 0.8) {
    probability = 0.55;
    verdict = 'considering';
    reason = 'Below expectations, might negotiate';
  } else if (ratio >= 0.6) {
    probability = 0.25;
    verdict = 'unlikely';
    reason = 'Low offer, unlikely to accept';
  } else {
    probability = 0.05;
    verdict = 'will_reject';
    reason = 'Insulting offer, will reject';
  }
  
  // Fame makes them pickier
  if (talent.fame >= 80) probability *= 0.9;
  
  return { probability: Math.min(0.99, Math.max(0.01, probability)), verdict, reason };
}

export interface HireTalentArgs {
  talentId: string;
  numMovies: number;      // 1, 2, or 3 movies
  upfrontPayment: number; // in $M
  boPercent: number;      // 0-15%
}

export function hireTalent(state: GameState, args: HireTalentArgs): { state: GameState; error?: string; accepted?: boolean } {
  const talent = state.talents.find(t => t.id === args.talentId);
  if (!talent) return { state, error: 'Talent not found.' };
  if (talent.retired) return { state, error: 'This talent has retired.' };
  if (talent.underContract?.studioId) {
    const studio = talent.underContract.studioId === state.player.id 
      ? state.player 
      : state.rivals.find(r => r.id === talent.underContract?.studioId);
    return { state, error: `Already under contract with ${studio?.name || 'another studio'}.` };
  }
  
  // Validate inputs
  if (args.numMovies < 1 || args.numMovies > 3) return { state, error: 'Contract must be for 1-3 movies.' };
  if (args.upfrontPayment < 0) return { state, error: 'Upfront payment cannot be negative.' };
  if (args.boPercent < 0 || args.boPercent > 15) return { state, error: 'BO percentage must be 0-15%.' };
  
  const costB = args.upfrontPayment / 1000; // Convert to billions
  if (state.player.cash < costB) {
    return { state, error: `Not enough cash. Need $${args.upfrontPayment.toFixed(1)}M (have $${(state.player.cash * 1000).toFixed(1)}M).` };
  }
  
  // Check if talent accepts
  const acceptance = calculateAcceptance(talent, args.numMovies, args.upfrontPayment, args.boPercent);
  const roll = Math.random();
  
  if (roll > acceptance.probability) {
    // Rejected!
    const newsLog = [
      { week: state.week, year: state.year, text: `${talent.name} rejected ${state.player.name}'s contract offer. "${acceptance.reason}"` },
      ...state.newsLog
    ].slice(0, 400);
    return { state: { ...state, newsLog }, error: `${talent.name} rejected your offer. ${acceptance.reason}.`, accepted: false };
  }
  
  // Accepted! Create contract
  const contract: import('./types').TalentContract = {
    studioId: state.player.id,
    remainingMovies: args.numMovies,
    upfrontPaid: args.upfrontPayment,
    boPercent: args.boPercent,
    perMovieSalary: +(args.upfrontPayment / args.numMovies).toFixed(2),
    signedWeek: state.week,
    signedYear: state.year,
  };
  
  const updatedTalents = state.talents.map(t => 
    t.id === args.talentId ? { ...t, underContract: contract } : t
  );
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - costB).toFixed(3) };
  const newsLog = [
    { week: state.week, year: state.year, text: `${state.player.name} signs ${talent.name} to a ${args.numMovies}-movie deal ($${args.upfrontPayment.toFixed(1)}M + ${args.boPercent}% BO).` },
    ...state.newsLog
  ].slice(0, 400);
  
  return { state: { ...state, talents: updatedTalents, player: updatedPlayer, newsLog }, accepted: true };
}

export function fireTalent(state: GameState, talentId: string): { state: GameState; error?: string } {
  const talent = state.talents.find(t => t.id === talentId);
  if (!talent) return { state, error: 'Talent not found.' };
  if (!talent.underContract || talent.underContract.studioId !== state.player.id) {
    return { state, error: 'This talent is not under contract with your studio.' };
  }
  
  const updatedTalents = state.talents.map(t => 
    t.id === talentId ? { ...t, underContract: undefined } : t
  );
  const newsLog = [
    { week: state.week, year: state.year, text: `${state.player.name} releases ${talent.name} from their contract (${talent.underContract.remainingMovies} movies remaining).` },
    ...state.newsLog
  ].slice(0, 400);
  
  return { state: { ...state, talents: updatedTalents, newsLog } };
}

// V39 — Retirement window 70-85 (was 70-80). Gentler ramp so most retire 73-82,
// with a hard cap at age 85. Replacement inherits the retiree's colorTrait so the
// per-color balance is preserved over many years.
function ageAndRetireTalents(talents: Talent[], weeks: number): { talents: Talent[]; retired: Talent[]; replacements: Talent[] } {
  const retired: Talent[] = []; const replacements: Talent[] = [];
  const updated = talents.map(t => {
    if (t.retired) return t;
    // Age advances by weeks/48 years
    const newAge = +(t.age + weeks / WEEKS_PER_YEAR).toFixed(2);
    let willRetire = false;
    if (newAge >= 70) {
      // Per-year retirement chance ramp: ~5%/y at 70 → ~75%/y at 84, then forced at 85.
      // Spreads retirements across the full 70-85 window (was previously crammed into 70-80).
      const yearsPast = newAge - 69;
      const annualChance = Math.min(0.75, yearsPast * 0.05);
      const chance = annualChance * (weeks / WEEKS_PER_YEAR);
      if (Math.random() < chance || newAge >= 85) willRetire = true;
    }
    if (willRetire) {
      // Replacement inherits the retiree's color so color balance stays stable over decades.
      const replacement = genTalent(t.role, { ageMin: 24, ageMax: 32, color: t.colorTrait });
      retired.push({ ...t, age: newAge, retired: true });
      replacements.push(replacement);
      return { ...t, age: newAge, retired: true };
    }
    return { ...t, age: newAge };
  });
  return { talents: [...updated, ...replacements], retired, replacements };
}

function aiProduceMovies(state: GameState, currentWeek: number, currentYear: number, currentTalents: Talent[]): { state: GameState; news: { week: number; year: number; text: string }[]; talents: Talent[] } {
  const news: { week: number; year: number; text: string }[] = [];
  let movies = [...state.movies];
  let franchises = [...state.franchises];
  let rivals = [...state.rivals];
  let talents = currentTalents.slice();

  rivals.forEach((r, ri) => {
    // Each rival has ~20% chance per week of starting a movie if they have <=4 in production
    const inProd = movies.filter(m => m.studioId === r.id && m.status === 'production').length;
    if (inProd >= 4) return;
    if (Math.random() > 0.16) return;
    const ownFranchises = franchises.filter(f => f.studioId === r.id);
    let franchiseId: string | undefined;
    let brand: Movie['brand'] = 'Original';
    // V42 — Franchise discipline: prefer originals & trilogies over endless mega-franchises.
    // Probability of using existing franchise drops sharply for franchises with 3+ films.
    if (ownFranchises.length && Math.random() < 0.45) {
      // Weight by inverse-size: trilogies preferred, 5+ entry franchises rarely chosen
      const weighted = ownFranchises.map(fr => {
        const sz = fr.movieIds.length;
        // Strong taper: 0 films=2x, 1=2x, 2=1.6x (build to trilogy), 3=0.6x (post-trilogy slowdown), 5+=0.15x
        const wt = sz <= 1 ? 2.0 : sz === 2 ? 1.6 : sz === 3 ? 0.6 : sz === 4 ? 0.3 : 0.15;
        return { fr, wt };
      });
      const totalWt = weighted.reduce((s, w) => s + w.wt, 0);
      let pickRoll = Math.random() * totalWt;
      let picked = weighted[0].fr;
      for (const w of weighted) { pickRoll -= w.wt; if (pickRoll <= 0) { picked = w.fr; break; } }
      // If the picked franchise is already 5+ films, skip with high probability (force original)
      if (picked.movieIds.length >= 5 && Math.random() < 0.7) {
        franchiseId = undefined;
        brand = 'Original';
      } else {
        franchiseId = picked.id;
        brand = pick(['Sequel', 'Sequel', 'Prequel', 'Spinoff'] as Movie['brand'][]);
      }
    }
    const genre = pick(GENRES);
    const runtime = randInt(95, 165);
    // Pick available talents — respect cooldown + in-production lock
    const availablePool = state.talents.filter(t => {
      if (t.retired) return false;
      if (t.inProductionMovieId) return false;
      const fy = t.availableFromYear ?? 0; const fw = t.availableFromWeek ?? 0;
      if (fy > currentYear || (fy === currentYear && fw > currentWeek)) return false;
      return true;
    });
    const writer = availablePool.filter(t => t.role === 'writer')[Math.floor(Math.random() * availablePool.filter(t => t.role === 'writer').length)];
    const director = availablePool.filter(t => t.role === 'director')[Math.floor(Math.random() * availablePool.filter(t => t.role === 'director').length)];
    if (!writer || !director) return;
    const castRoles: Movie['cast'][number]['role'][] = ['lead_actor', 'lead_actress', 'support_actor', 'support_actress'];
    const cast = castRoles.map(slotRole => {
      // Movie cast slots use lead_/support_ designations; talents now have just 'actor'/'actress'
      const targetTalentRole: Talent['role'] = (slotRole === 'lead_actor' || slotRole === 'support_actor') ? 'actor' : 'actress';
      const opts = availablePool.filter(t => t.role === targetTalentRole);
      if (!opts.length) return null;
      const t = opts[Math.floor(Math.random() * opts.length)];
      const terms = dealTerms(t.salary, pick(['middle', 'studio_favored', 'middle']));
      return { talentId: t.id, role: slotRole, dealType: 'middle' as DealType, contractKind: 'single' as const, salary: terms.salary, boPercent: terms.boPercent };
    }).filter(Boolean) as Movie['cast'];
    if (cast.length < 2) return;

    // V30 — AI release strategy: top-rated rivals with streaming services occasionally release direct-to-streaming
    // (bumps subs/popularity) or pick hybrid 0-week (theatrical + streaming same week) for premium subscribers.
    const ownerSvc = (state.streamingServices || []).find(svc => svc.studioId === r.id);
    let releaseStrategy: 'theatrical' | 'streaming' | 'hybrid' = 'theatrical';
    let streamingWindowWeeks: number | undefined;
    if (ownerSvc && r.rating >= 3) {
      const roll = Math.random();
      // Higher-rated rivals favour streaming-exclusive (15%) or hybrid 0-week (10%)
      if (roll < 0.15) {
        releaseStrategy = 'streaming';
      } else if (roll < 0.25) {
        releaseStrategy = 'hybrid';
        streamingWindowWeeks = 0; // Day-and-date hybrid
      } else if (roll < 0.40) {
        releaseStrategy = 'hybrid';
        streamingWindowWeeks = pick([4, 8, 12, 16] as const);
      }
    }

    let franchiseName = '';
    if (franchiseId) {
      const fr = franchises.find(f => f.id === franchiseId)!;
      franchiseName = fr.name;
    } else {
      // create new franchise — uniquify against world franchise + movie names
      const usedFr = new Set([...franchises.map(f => f.name), ...movies.map(m => m.title)]);
      const fname = genFranchiseName(usedFr);
      const newFr: Franchise = {
        id: uid('f_'), name: fname, studioId: r.id, movieIds: [],
        popularity: randInt(20, 50), iconKey: GENRE_ICON[genre].icon, iconBg: GENRE_ICON[genre].bg,
        lastReleasedWeek: 0, lastReleasedYear: 0,
      };
      franchises.push(newFr);
      franchiseId = newFr.id; franchiseName = fname;
    }
    const sequelNum = (franchises.find(f => f.id === franchiseId)?.movieIds.length || 0) + 1;
    const usedMovieTitles = new Set(movies.map(m => m.title));
    const title = genTitleSubtitle(franchiseName, brand, sequelNum, usedMovieTitles);
    // TIER-BASED BUDGET: high-rating rivals fund $200M+ tentpoles (so Big Picture awards trigger).
    const aiBudget = aiBudgetForRating(r.rating);
    const movie: Movie = {
      id: uid('m_'), title, type: genre as any, genre,
      plotArc: pick(['Man in a Hole', 'Icarus', 'Cinderella'] as any),
      rating: pick(['PG-13', 'PG', 'R'] as any), runtime, brand,
      franchiseId, studioId: r.id, writerId: writer.id, directorId: director.id,
      cast, budget: aiBudget.production, marketingBudget: aiBudget.marketing,
      weeksToRelease: Math.max(2, Math.round(runtime / 30) + 2),
      status: 'production', criticScore: 0, boxOffice: 0, weeklyBO: [],
      releaseWeek: 0, releaseYear: 0,
      iconKey: GENRE_ICON[genre].icon, iconBg: GENRE_ICON[genre].bg,
      awards: 0, plot: genPlot(),
      fatiguePenalty: 0, chemistryBonus: 0, holidayBonus: 0,
      // V30 — AI release strategy + own-service targeting
      releaseStrategy,
      streamingWindowWeeks,
      streamingTargetServiceId: (releaseStrategy !== 'theatrical' && ownerSvc) ? ownerSvc.id : undefined,
      streamingTargetTierIds: (releaseStrategy === 'streaming' && ownerSvc && ownerSvc.tiers.length >= 2)
        ? [ownerSvc.tiers.sort((a, b) => b.price - a.price)[0].id] // Direct-to-streaming → premium tier only
        : undefined,
    };
    if (aiBudget.production >= 200) {
      news.push({ week: currentWeek, year: currentYear, text: `${r.name} announces massive $${aiBudget.production}M tentpole: ${title}.` });
    }
    // Lock all AI cast/crew to this in-production movie
    const lockIds = new Set([writer.id, director.id, ...cast.map(c => c.talentId)]);
    talents = talents.map(t => lockIds.has(t.id) ? { ...t, inProductionMovieId: movie.id } : t);
    movies.push(movie);
    franchises = franchises.map(f => f.id === franchiseId ? { ...f, movieIds: [...f.movieIds, movie.id] } : f);
  });

  return { state: { ...state, movies, franchises, rivals }, news, talents };
}

// ---------- AI-to-AI / AI-to-PLAYER STREAMING LICENSING ----------
// Each week: AI streaming services bid on licensable movies (8+ weeks post-release, not on this service yet).
// Winners auto-license rival-owned movies (deduct cash + add to AI service catalog + relationship+).
// If the target is a player movie -> create a pendingOffer for the player to accept/counter/reject.
function aiLicenseMovies(
  state: GameState,
  currentWeek: number,
  currentYear: number,
  currentMovies: Movie[],
  currentServices: StreamingService[],
  currentRivals: Studio[],
  currentRelationships: Record<string, number>,
  currentPendingOffers: LicenseOffer[],
): {
  movies: Movie[];
  services: StreamingService[];
  rivals: Studio[];
  relationships: Record<string, number>;
  pendingOffers: LicenseOffer[];
  news: { week: number; year: number; text: string }[];
} {
  const news: { week: number; year: number; text: string }[] = [];
  let services = currentServices.map(s => ({ ...s, catalogMovieIds: [...s.catalogMovieIds], licensedMovies: s.licensedMovies ? s.licensedMovies.map(l => ({ ...l })) : [], movieTierAccess: { ...(s.movieTierAccess || {}) }, exclusiveMovieIds: [...(s.exclusiveMovieIds || [])] }));
  let rivals = currentRivals.map(r => ({ ...r }));
  const relationships = { ...currentRelationships };
  const pendingOffers = [...currentPendingOffers];
  const movies = currentMovies; // not mutated here

  // V30 — Helper: is this movie locked to a specific service via active exclusivity?
  const exclusiveLockedBy = (movieId: string): string | null => {
    for (const svc of services) {
      const lic = (svc.licensedMovies || []).find(l => l.movieId === movieId && l.exclusivity);
      if (lic) {
        const expTotal = lic.expiresYear * WEEKS_PER_YEAR + lic.expiresWeek;
        const nowTotal = currentYear * WEEKS_PER_YEAR + currentWeek;
        if (expTotal >= nowTotal) return svc.id;
      }
    }
    return null;
  };

  // V30 — Helper: pick which tier(s) of a service should host a given movie based on quality/recency/exclusivity
  // Returns array of tier IDs the movie is gated to. Empty array = all tiers can stream.
  const tierGatingFor = (svc: typeof services[number], m: Movie, isExclusive: boolean): string[] => {
    if (svc.tiers.length <= 1) return [];
    // Sort tiers by price asc → cheapest first
    const sorted = [...svc.tiers].sort((a, b) => a.price - b.price);
    const yearsSinceRelease = (currentYear - m.releaseYear) * 1 + (currentWeek - m.releaseWeek) / WEEKS_PER_YEAR;
    const isHighQuality = m.criticScore >= 78 || m.boxOffice * 1000 >= 250;
    const isRecent = yearsSinceRelease < 1.5;
    if (isExclusive || (isHighQuality && isRecent)) {
      // Top 1 tier only (premium)
      return [sorted[sorted.length - 1].id];
    }
    if (isHighQuality || isRecent) {
      // Top 2 tiers (mid + premium)
      return sorted.slice(-2).map(t => t.id);
    }
    if (m.criticScore >= 60) {
      // Drop bottom tier (basic doesn't get OK movies)
      return sorted.length > 1 ? sorted.slice(1).map(t => t.id) : [];
    }
    return []; // all tiers
  };

  // Eligible candidates: released ≥6 weeks ago and have BO/critic threshold worth licensing
  const MIN_WEEKS_POST = 6;
  const candidates = movies.filter(m => {
    if (m.status !== 'released') return false;
    const weeksPost = (currentYear - m.releaseYear) * WEEKS_PER_YEAR + (currentWeek - m.releaseWeek);
    if (weeksPost < MIN_WEEKS_POST) return false;
    if (m.criticScore < 45 && m.boxOffice < 0.08) return false;
    return true;
  });
  if (!candidates.length) return { movies, services, rivals, relationships, pendingOffers, news };

  // Iterate AI streamers (rivals only) — each one bids 1-2 times per week if budget allows
  const aiServices = services.filter(s => s.studioId !== state.player.id);
  if (!aiServices.length) return { movies, services, rivals, relationships, pendingOffers, news };

  for (const svc of aiServices) {
    const owner = rivals.find(r => r.id === svc.studioId);
    if (!owner) continue;

    // Per-week licensing budget cap based on owner rating ($20M-$80M/wk).
    // V30 — Increased budgets so AI-to-AI licensing happens more frequently
    const weeklyBudgetM = (owner.rating || 1) * 14 + 16; // ★1=30, ★5=86
    if (owner.cash * 1000 < weeklyBudgetM * 0.5) continue;

    // V30 — Each AI service may try up to 2 picks per tick (was 1) if budget allows
    let remainingBudget = weeklyBudgetM;
    for (let pickN = 0; pickN < 2; pickN++) {
      // Score candidates this svc doesn't already have AND doesn't own AND isn't locked exclusively elsewhere
      const scored = candidates
        .filter(m => !svc.catalogMovieIds.includes(m.id))
        .filter(m => !(svc.licensedMovies || []).find(l => l.movieId === m.id))
        .filter(m => m.studioId !== svc.studioId)
        .filter(m => {
          const lock = exclusiveLockedBy(m.id);
          return !lock || lock === svc.id;
        })
        .map(m => ({
          movie: m,
          desire: licenseDesirability(m, { rating: owner.rating, reputation: svc.reputation, catalogQuality: 60 }),
        }))
        .sort((a, b) => b.desire - a.desire);
      if (!scored.length || scored[0].desire < 0.25) break;

      const target = scored[pickN === 0 ? 0 : Math.min(scored.length - 1, randInt(1, 4))]?.movie;
      if (!target) break;
      const years = pick([1, 3, 3, 5] as const);
      // V30 — High-rated AI sometimes pursues exclusivity (premium tier; locks rivals out)
      // Conditions: top-rated rival (★4+) + premium tier exists + movie is high-quality OR target is rival's own franchise
      const wantsExclusive = (owner.rating || 1) >= 4
        && svc.tiers.length >= 2
        && Math.random() < 0.20
        && (target.criticScore >= 75 || target.boxOffice * 1000 >= 200);
      const exclusivityMult = wantsExclusive ? 1.45 : 1.0;
      const fee = +(computeLicenseFee(target, years, currentWeek, currentYear) * exclusivityMult).toFixed(1);
      if (fee > remainingBudget) continue;
      remainingBudget -= fee;

      if (target.studioId === state.player.id) {
        // PENDING OFFER for player. Skip if same movie+service offer already pending.
        if (pendingOffers.find(o => o.movieId === target.id && o.serviceId === svc.id)) continue;
        const expW = currentWeek + 4;
        let expWk = expW; let expYr = currentYear;
        while (expWk > WEEKS_PER_YEAR) { expWk -= WEEKS_PER_YEAR; expYr += 1; }
        pendingOffers.push({
          id: uid('lo_'), movieId: target.id, serviceId: svc.id,
          feeM: fee, years,
          reasoning: licenseOfferDialog(svc.name, target.title, years, fee, target.genre) + (wantsExclusive ? ' (Exclusive — premium-tier only).' : ''),
          createdWeek: currentWeek, createdYear: currentYear,
          expiresWeek: expWk, expiresYear: expYr, round: 1,
        });
        news.push({ week: currentWeek, year: currentYear, text: `📺 ${svc.name} wants to license ${target.title} ($${fee.toFixed(1)}M / ${years}yr${wantsExclusive ? ' · EXCLUSIVE' : ''}).` });
      } else {
        // AI → AI: auto-license. Deduct fee, add to svc catalog, license owner gets cash, +relationship.
        const ownerIdx = rivals.findIndex(r => r.id === svc.studioId);
        const lessorIdx = rivals.findIndex(r => r.id === target.studioId);
        const feeB = fee / 1000;
        if (ownerIdx >= 0) rivals[ownerIdx] = { ...rivals[ownerIdx], cash: +(rivals[ownerIdx].cash - feeB).toFixed(3) };
        if (lessorIdx >= 0) rivals[lessorIdx] = { ...rivals[lessorIdx], cash: +(rivals[lessorIdx].cash + feeB).toFixed(3) };
        let endW = currentWeek + years * WEEKS_PER_YEAR;
        let endY = currentYear;
        while (endW > WEEKS_PER_YEAR) { endW -= WEEKS_PER_YEAR; endY += 1; }
        const svcIdx = services.findIndex(s => s.id === svc.id);
        if (svcIdx >= 0) {
          const cur = services[svcIdx];
          // V30 — Apply tier gating (premium content goes to top tier)
          const gatedTiers = tierGatingFor(cur, target, wantsExclusive);
          const newAccess = { ...(cur.movieTierAccess || {}) };
          if (gatedTiers.length) newAccess[target.id] = gatedTiers;
          const newExclusiveIds = wantsExclusive ? [...new Set([...(cur.exclusiveMovieIds || []), target.id])] : (cur.exclusiveMovieIds || []);
          services[svcIdx] = {
            ...cur,
            catalogMovieIds: [...cur.catalogMovieIds, target.id],
            licensedMovies: [...(cur.licensedMovies || []), { movieId: target.id, expiresWeek: endW, expiresYear: endY, tierIds: gatedTiers, feePaid: fee, yearsLicensed: years, exclusivity: wantsExclusive }],
            movieTierAccess: newAccess,
            exclusiveMovieIds: newExclusiveIds,
          };
          // V30 — Exclusive deals deliver real impact: subscriber bump (1.5-3% based on movie quality)
          if (wantsExclusive) {
            const qFactor = Math.min(1, (target.criticScore / 100) * 0.6 + Math.min(0.4, target.boxOffice * 0.6));
            const bump = Math.round(services[svcIdx].subscribers * (0.015 + qFactor * 0.025));
            services[svcIdx] = { ...services[svcIdx], subscribers: services[svcIdx].subscribers + bump, reputation: Math.min(100, services[svcIdx].reputation + 1) };
            news.push({ week: currentWeek, year: currentYear, text: `🔒 ${svc.name} secures EXCLUSIVE on ${target.title} — +${bump.toLocaleString()} subs.` });
          }
        }
        nudgeRelInPlace(relationships, svc.studioId, target.studioId, 4);
        const lessorName = rivals[lessorIdx]?.name || 'A studio';
        if (!wantsExclusive) news.push({ week: currentWeek, year: currentYear, text: `${svc.name} licenses ${target.title} from ${lessorName} ($${fee.toFixed(1)}M / ${years}yr).` });
      }
    }
  }

  return { movies, services, rivals, relationships, pendingOffers, news };
}

// Player accepts an AI offer to license one of their movies
export function acceptLicenseOffer(state: GameState, offerId: string): { state: GameState; error?: string } {
  const offer = (state.pendingOffers || []).find(o => o.id === offerId);
  if (!offer) return { state, error: 'Offer not found.' };
  const movie = state.movies.find(m => m.id === offer.movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  const svcIdx = (state.streamingServices || []).findIndex(s => s.id === offer.serviceId);
  if (svcIdx < 0) return { state, error: 'Streaming service no longer exists.' };
  const svc = state.streamingServices[svcIdx];
  // V44 — Block accept if movie is exclusively locked elsewhere (or already in this service).
  const accLock = findMovieExclusivityLock(state, offer.movieId, offer.serviceId);
  if (accLock) {
    const why = accLock.kind === 'owner_exclusive'
      ? `${accLock.ownerStudioName} keeps this title exclusive on ${accLock.svcName}.`
      : `Locked exclusively to ${accLock.svcName} (${accLock.ownerStudioName}) until ${accLock.expiresLabel}.`;
    return { state, error: `🔒 ${why}` };
  }
  if ((svc.licensedMovies || []).some(l => l.movieId === offer.movieId)) {
    return { state, error: 'Already licensed on this service.' };
  }

  let endW = state.week + offer.years * WEEKS_PER_YEAR;
  let endY = state.year;
  while (endW > WEEKS_PER_YEAR) { endW -= WEEKS_PER_YEAR; endY += 1; }

  const services = state.streamingServices.slice();
  services[svcIdx] = {
    ...svc,
    catalogMovieIds: svc.catalogMovieIds.includes(movie.id) ? svc.catalogMovieIds : [...svc.catalogMovieIds, movie.id],
    licensedMovies: [...(svc.licensedMovies || []), { movieId: movie.id, expiresWeek: endW, expiresYear: endY, tierIds: [], feePaid: offer.feeM, yearsLicensed: offer.years }],
  };
  const updatedPlayer = { ...state.player, cash: +(state.player.cash + offer.feeM / 1000).toFixed(3) };
  const relationships = { ...(state.relationships || {}) };
  nudgeRelInPlace(relationships, state.player.id, svc.studioId, 6);
  const newsLog = [
    { week: state.week, year: state.year, text: `${state.player.name} licenses ${movie.title} to ${svc.name} ($${offer.feeM.toFixed(1)}M / ${offer.years}yr).` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, player: updatedPlayer, streamingServices: services, pendingOffers: state.pendingOffers!.filter(o => o.id !== offerId), relationships, newsLog } };
}

// Player counters with a new fee. AI accepts (≤100% max), counters back (round 1, ≤115%), or walks away.
export function counterLicenseOffer(state: GameState, offerId: string, counterFeeM: number): { state: GameState; error?: string } {
  const offer = (state.pendingOffers || []).find(o => o.id === offerId);
  if (!offer) return { state, error: 'Offer not found.' };
  const movie = state.movies.find(m => m.id === offer.movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  const svc = (state.streamingServices || []).find(s => s.id === offer.serviceId);
  if (!svc) return { state, error: 'Service no longer exists.' };
  const baseFee = computeLicenseFee(movie, offer.years, state.week, state.year);
  // V30 — logical, scaled counter-offer math:
  // - Up to 110% of fair value: AI accepts (great win)
  // - 110% to 130% of fair: AI counters at midpoint between fair*1.10 and player counter
  // - 130% to 160% of fair: AI counters at fair*1.15 only on round 1, walks on round 2+
  // - >160%: AI walks immediately (unreasonable)
  const fair = baseFee;
  const ratio = counterFeeM / fair;

  if (ratio <= 1.10) {
    // AI accepts the counter
    let endW = state.week + offer.years * WEEKS_PER_YEAR;
    let endY = state.year;
    while (endW > WEEKS_PER_YEAR) { endW -= WEEKS_PER_YEAR; endY += 1; }
    const svcIdx = state.streamingServices.findIndex(s => s.id === svc.id);
    const services = state.streamingServices.slice();
    services[svcIdx] = {
      ...svc,
      catalogMovieIds: svc.catalogMovieIds.includes(movie.id) ? svc.catalogMovieIds : [...svc.catalogMovieIds, movie.id],
      licensedMovies: [...(svc.licensedMovies || []), { movieId: movie.id, expiresWeek: endW, expiresYear: endY, tierIds: [], feePaid: counterFeeM, yearsLicensed: offer.years }],
    };
    const updatedPlayer = { ...state.player, cash: +(state.player.cash + counterFeeM / 1000).toFixed(3) };
    const relationships = { ...(state.relationships || {}) };
    nudgeRelInPlace(relationships, state.player.id, svc.studioId, 4);
    const newsLog = [
      { week: state.week, year: state.year, text: `${svc.name} agrees: ${movie.title} for $${counterFeeM.toFixed(1)}M / ${offer.years}yr.` },
      ...state.newsLog,
    ].slice(0, 400);
    return { state: { ...state, player: updatedPlayer, streamingServices: services, pendingOffers: state.pendingOffers!.filter(o => o.id !== offerId), relationships, newsLog } };
  }
  if (ratio <= 1.30 && offer.round === 1) {
    // AI counters at fair-value-anchored midpoint (NEVER below their own original offer)
    const target = Math.max(fair * 1.10, offer.feeM);
    const midpoint = +Math.max(offer.feeM, (counterFeeM + target) / 2).toFixed(1);
    const updated: LicenseOffer = {
      ...offer, feeM: midpoint, round: 2, playerCounterFeeM: counterFeeM,
      reasoning: `"${svc.name} counters: $${midpoint.toFixed(1)}M — meet us in the middle."`,
    };
    const newsLog = [
      { week: state.week, year: state.year, text: `${svc.name} counters your ${movie.title} at $${midpoint.toFixed(1)}M.` },
      ...state.newsLog,
    ].slice(0, 400);
    return { state: { ...state, pendingOffers: state.pendingOffers!.map(o => o.id === offerId ? updated : o), newsLog } };
  }
  if (ratio <= 1.60 && offer.round === 1) {
    // High but not absurd — give one final counter at fair * 1.15
    const finalFee = +(fair * 1.15).toFixed(1);
    const updated: LicenseOffer = {
      ...offer, feeM: finalFee, round: 2, playerCounterFeeM: counterFeeM,
      reasoning: `"${svc.name}: $${finalFee.toFixed(1)}M is our absolute ceiling. Final."`,
    };
    const newsLog = [
      { week: state.week, year: state.year, text: `${svc.name} pushes back hard: $${finalFee.toFixed(1)}M final on ${movie.title}.` },
      ...state.newsLog,
    ].slice(0, 400);
    return { state: { ...state, pendingOffers: state.pendingOffers!.map(o => o.id === offerId ? updated : o), newsLog } };
  }
  // Walk away (ratio>1.60 or out of rounds)
  const relationships = { ...(state.relationships || {}) };
  nudgeRelInPlace(relationships, state.player.id, svc.studioId, -4);
  const newsLog = [
    { week: state.week, year: state.year, text: `${svc.name} walks away from ${movie.title} — too pricey.` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, pendingOffers: state.pendingOffers!.filter(o => o.id !== offerId), relationships, newsLog } };
}

export function rejectLicenseOffer(state: GameState, offerId: string): { state: GameState; error?: string } {
  const offer = (state.pendingOffers || []).find(o => o.id === offerId);
  if (!offer) return { state, error: 'Offer not found.' };
  const movie = state.movies.find(m => m.id === offer.movieId);
  const svc = (state.streamingServices || []).find(s => s.id === offer.serviceId);
  const newsLog = [
    { week: state.week, year: state.year, text: `${state.player.name} rejects ${svc?.name || 'a streamer'}'s offer for ${movie?.title || 'a title'}.` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, pendingOffers: state.pendingOffers!.filter(o => o.id !== offerId), newsLog } };
}

// Sign a multi-picture contract that already passed the negotiation flow (no random acceptance roll).
export function signNegotiatedContract(state: GameState, talentId: string, numMovies: number, upfrontPayment: number, boPercent: number): { state: GameState; error?: string } { const talent = state.talents.find(t => t.id === talentId);
  if (!talent) return { state, error: 'Talent not found.' };
  if (talent.retired) return { state, error: 'This talent has retired.' };
  if (talent.underContract?.studioId) {
    const s = talent.underContract.studioId === state.player.id ? state.player : state.rivals.find(r => r.id === talent.underContract!.studioId);
    return { state, error: `Already under contract with ${s?.name || 'another studio'}.` };
  }
  const costB = upfrontPayment / 1000;
  if (state.player.cash < costB) return { state, error: `Not enough cash. Need $${upfrontPayment.toFixed(1)}M.` };
  const contract: import('./types').TalentContract = {
    studioId: state.player.id,
    remainingMovies: numMovies,
    upfrontPaid: upfrontPayment,
    boPercent,
    perMovieSalary: +(upfrontPayment / numMovies).toFixed(2),
    signedWeek: state.week,
    signedYear: state.year,
  };
  const updatedTalents = state.talents.map(t => t.id === talentId ? { ...t, underContract: contract } : t);
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - costB).toFixed(3) };
  const newsLog = [
    { week: state.week, year: state.year, text: `${state.player.name} signs ${talent.name} after negotiation: ${numMovies}-movie deal ($${upfrontPayment.toFixed(1)}M + ${boPercent}% BO).` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, talents: updatedTalents, player: updatedPlayer, newsLog } };
}


export function simulateWeek(state: GameState): GameState {
  let newWeek = state.week + 1;
  let newYear = state.year;
  if (newWeek > WEEKS_PER_YEAR) { newWeek = 1; newYear += 1; }

  // V43 — Initialize weekly ledger (reset every simulated week).
  let ledger = freshLedger(newWeek, newYear);
  const _bump = (key: LedgerKey, amount: number) => {
    if (!isFinite(amount) || amount === 0) return;
    (ledger as any)[key] = +(((ledger as any)[key] || 0) + amount).toFixed(6);
  };

  const news: typeof state.newsLog = [];
  let movies = state.movies.map(m => ({ ...m, weeklyBO: [...m.weeklyBO] }));
  let player = { ...state.player };
  let franchises = state.franchises.map(f => ({ ...f }));
  let talents = state.talents.map(t => ({ ...t, growthLog: [...t.growthLog] }));
  const relationships: Record<string, number> = { ...(state.relationships || {}) };
  let streamingServices = (state.streamingServices || []).map(s => ({
    ...s,
    tiers: s.tiers.map(t => ({ ...t })),
    tierSubscribers: { ...(s.tierSubscribers || {}) },
    catalogMovieIds: [...(s.catalogMovieIds || [])],
    history: [...(s.history || [])],
  }));

  // Helper: add a movie to a specific service (with optional tier targeting). Returns true if added.
  const addToServiceById = (m: Movie, svcId: string, tierIds?: string[]) => {
    const svc = streamingServices.find(s => s.id === svcId);
    if (!svc) return false;
    if (!svc.catalogMovieIds.includes(m.id)) svc.catalogMovieIds.push(m.id);
    if (tierIds && tierIds.length) {
      svc.movieTierAccess = { ...(svc.movieTierAccess || {}), [m.id]: [...tierIds] };
    }
    m.inStreamingServiceIds = [...(m.inStreamingServiceIds || []), svc.id];
    return true;
  };
  // Helper: add a movie to the studio's first owned service catalog (no-op if no service / already present)
  const addToOwnService = (m: Movie) => {
    const svc = streamingServices.find(s => s.studioId === m.studioId);
    if (!svc) return;
    if (svc.catalogMovieIds.includes(m.id)) return;
    svc.catalogMovieIds.push(m.id);
    m.inStreamingServiceIds = [...(m.inStreamingServiceIds || []), svc.id];
  };

  const holiday = holidayFor(newWeek);

  movies.forEach(m => {
    if (m.status === 'production') {
      m.weeksToRelease -= 1;
      if (m.weeksToRelease <= 0) {
        const writer = talents.find(t => t.id === m.writerId)!;
        const director = talents.find(t => t.id === m.directorId)!;
        const castT = m.cast.map(c => talents.find(t => t.id === c.talentId)!).filter(Boolean);
        // GRANULAR SKILL — uses each talent's headline craft + genre fit (BOS-style)
        const writerEff = effectiveSkillFor(writer, m.genre);
        const directorEff = effectiveSkillFor(director, m.genre);
        
        // Lead vs Supporting weighted averages: Lead = 1.5 weight, Support = 0.5 weight.
        let weightedEffSum = 0;
        let weightedFameSum = 0;
        let totalCastWeight = 0;
        let maxLeadFame = 0;
        m.cast.forEach(c => {
          const tal = talents.find(t => t.id === c.talentId);
          if (tal) {
            const isLead = c.role.startsWith('lead_');
            const w = isLead ? 1.5 : 0.5;
            weightedEffSum += effectiveSkillFor(tal, m.genre) * w;
            weightedFameSum += tal.fame * w;
            totalCastWeight += w;
            if (isLead && tal.fame > maxLeadFame) {
              maxLeadFame = tal.fame;
            }
          }
        });
        const avgCastEff = totalCastWeight > 0 ? weightedEffSum / totalCastWeight : 60;
        const avgCastFame = totalCastWeight > 0 ? weightedFameSum / totalCastWeight : 30;

        // Continuation return bonus
        let returningTalentsCount = 0;
        let continuationBonus = 0;
        const franchiseRef = franchises.find(f => f.id === m.franchiseId);
        if (franchiseRef) {
          const prevFranchiseMovies = state.movies.filter(prevM => prevM.franchiseId === franchiseRef.id && prevM.status === 'released' && prevM.id !== m.id);
          if (prevFranchiseMovies.length > 0) {
            const prevInvolvedIds = new Set<string>();
            prevFranchiseMovies.forEach(prevM => {
              if (prevM.writerId) prevInvolvedIds.add(prevM.writerId);
              if (prevM.directorId) prevInvolvedIds.add(prevM.directorId);
              prevM.cast.forEach(c => {
                if (c.talentId) prevInvolvedIds.add(c.talentId);
              });
            });

            const currentTeam = [m.writerId, m.directorId, ...m.cast.map(c => c.talentId)].filter(Boolean);
            currentTeam.forEach(tid => {
              if (prevInvolvedIds.has(tid)) {
                returningTalentsCount++;
              }
            });

            if (returningTalentsCount > 0) {
              continuationBonus = Math.min(25, returningTalentsCount * 5);
            }
          }
        }
        (m as any).returningTalentsCount = returningTalentsCount;
        (m as any).continuationBonus = continuationBonus;
        (m as any).continuationMult = 1.0 + (continuationBonus / 100);
        (m as any).leadBonusMult = 1.0 + (maxLeadFame / 100) * 0.15;

        const fit = arcGenreFit(m.plotArc, m.genre);
        const runtimeFit = m.runtime >= 90 && m.runtime <= 170 ? 1 : 0.85;
        const baseCritic = (writerEff * 0.32 + directorEff * 0.32 + avgCastEff * 0.36) * fit * runtimeFit;
        
        let computedCriticScore = Math.round(baseCritic + (Math.random() * 14 - 7));
        if (returningTalentsCount > 0) {
          computedCriticScore += Math.min(8, Math.round(returningTalentsCount * 1.5));
        }
        m.criticScore = Math.max(20, Math.min(100, computedCriticScore));

        // Cast Chemistry — talent-to-talent color matching across writer + director + cast
        const chemColors = [writer.colorTrait, director.colorTrait, ...castT.map(t => t.colorTrait)].filter(Boolean) as ColorTrait[];
        const chemBonus = computeChemistryBonus(chemColors);
        m.chemistryBonus = +(chemBonus * 100).toFixed(1);
        (m as any).colorBonus = m.chemistryBonus;

        // Release cooldown: clear inProductionMovieId for cast/crew + set 3-week cooldown.
        const involvedIds = new Set([m.writerId, m.directorId, ...m.cast.map(c => c.talentId)]);
        const cooldownEndWeek = newWeek + POST_PRODUCTION_COOLDOWN_WEEKS;
        let cdWeek = cooldownEndWeek; let cdYear = newYear;
        while (cdWeek > WEEKS_PER_YEAR) { cdWeek -= WEEKS_PER_YEAR; cdYear += 1; }
        talents.forEach(tt => {
          if (involvedIds.has(tt.id)) {
            tt.inProductionMovieId = undefined;
            tt.availableFromWeek = cdWeek;
            tt.availableFromYear = cdYear;
            if (tt.underContract) {
              const rem = tt.underContract.remainingMovies - 1;
              if (rem <= 0) {
                tt.underContract = undefined;
                news.push({
                  week: newWeek,
                  year: newYear,
                  text: `📝 Studio contract with ${tt.name} has concluded (${m.title} was their final film).`
                });
              } else {
                tt.underContract = { ...tt.underContract, remainingMovies: rem };
              }
            }
          }
        });

        // Franchise multipliers + fatigue
        const franchise = franchises.find(f => f.id === m.franchiseId);
        let franchiseMult = 1;
        if (franchise) {
          if (m.brand === 'Sequel') franchiseMult = 1 + (franchise.popularity / 100) * 0.7;
          if (m.brand === 'Prequel') franchiseMult = 1 + (franchise.popularity / 100) * 0.55;
          if (m.brand === 'Spinoff') franchiseMult = 1 + (franchise.popularity / 100) * 0.4;
          if (m.brand === 'Crossover') franchiseMult = 1 + (franchise.popularity / 100) * 0.85;
          // Fatigue: if franchise had a release within the past full year (48 weeks) and this is sequel/prequel
          if (m.brand !== 'Original' && franchise.lastReleasedYear > 0) {
            const weeksSince = (newYear - franchise.lastReleasedYear) * WEEKS_PER_YEAR + (newWeek - franchise.lastReleasedWeek);
            if (weeksSince < WEEKS_PER_YEAR) {
              const fatigue = 1 - (weeksSince / WEEKS_PER_YEAR);
              const penalty = 0.30 * fatigue;
              m.fatiguePenalty = +(penalty * 100).toFixed(1);
              franchiseMult *= (1 - penalty);
              m.criticScore = Math.max(15, Math.round(m.criticScore - 8 * fatigue));
            }
          }
        }
        if (m.crossoverFranchiseIds?.length) {
          m.crossoverFranchiseIds.forEach(fid => {
            const cf = franchises.find(f => f.id === fid);
            if (cf) franchiseMult += (cf.popularity / 100) * 0.35;
            // Relationship event — releasing studio collaborates with the franchise's owner
            if (cf && cf.studioId !== m.studioId) {
              const delta = m.criticScore >= 80 ? 8 : m.criticScore >= 65 ? 5 : m.criticScore >= 50 ? 2 : -3;
              nudgeRelInPlace(relationships, m.studioId, cf.studioId, delta);
            }
          });
        }
        // Holiday bonus
        let holidayMult = 1;
        if (holiday && (!holiday.genres || holiday.genres.includes(m.genre))) {
          holidayMult = holiday.mult;
          m.holidayBonus = +((holiday.mult - 1) * 100).toFixed(1);
        }
        const marketingMult = 0.55 + Math.min(2.2, m.marketingBudget / 25);
        const marketingEff = computeMarketingEfficiency(m.marketingAllocation, state.audience);
        const fameMult = 0.7 + (avgCastFame / 100) * 0.7;
        const criticMult = m.criticScore >= 90 ? 1.6 : m.criticScore >= 80 ? 1.3 : m.criticScore >= 70 ? 1.05 : m.criticScore >= 55 ? 0.8 : 0.5;
        // External IP attached → apply BO multiplier from licensed IP popularity.
        let ipMult = 1;
        if (m.externalIPId) {
          const ip = state.externalIPs?.find(i => i.id === m.externalIPId);
          if (ip) ipMult = ipBoostsForMovie(ip).boMult;
        }
        const isStreamingExclusive = m.releaseStrategy === 'streaming' || m.releaseStrategy === 'tv';
        const continuationMult = (m as any).continuationMult ?? 1.0;
        const leadBonusMult = (m as any).leadBonusMult ?? 1.0;
        const opening = isStreamingExclusive ? 0 : (40 + Math.random() * 30) * marketingMult * marketingEff * fameMult * criticMult * franchiseMult * fit * (1 + chemBonus) * holidayMult * ipMult * continuationMult * leadBonusMult;
        const openingB = +(opening / 1000).toFixed(4);
        m.weeklyBO.push(openingB);
        m.boxOffice = openingB;
        m.status = 'released';
        m.releaseWeek = newWeek; m.releaseYear = newYear;
        m.reviews = generateReviews(m.criticScore);

        if (m.studioId === player.id && (m.releaseStrategy === 'theatrical' || m.releaseStrategy === 'hybrid')) {
          const ownedCinemasList = state.ownedCinemas || [];
          if (ownedCinemasList.length > 0) {
            state.ownedCinemas = ownedCinemasList.map(c => {
              const run = { id: uid('ocr_'), movieId: m.id, fromWeek: newWeek, fromYear: newYear, weeksToShow: 6 };
              return { ...c, scheduledReleases: [...(c.scheduledReleases || []).filter(r => r.movieId !== m.id), run] };
            });
          }
        }

        if (m.releaseStrategy === 'tv' && m.tvNetworkId) {
          const net = (state.tvNetworks || []).find(n => n.id === m.tvNetworkId);
          if (net) {
            const scaleFactor = 0.015 * (net.kind === 'premium' ? 1.5 : net.kind === 'cable' ? 1.0 : 0.6);
            const popularityFactor = 0.5 + (m.criticScore / 100) * 1.5;
            const feeB = +(net.subscribers * scaleFactor * popularityFactor).toFixed(3);
            if (m.studioId === player.id) {
              (state as any).__pendingTVFees = ((state as any).__pendingTVFees || 0) + feeB;
            }
            news.push({
              week: newWeek,
              year: newYear,
              text: `📺 ${net.name} successfully aired Direct premiere of "${m.title}". Payout: $${(feeB * 1000).toFixed(1)}M licensing cash.`
            });
          }
        }
        // External IP licensor BO royalty: deduct % of opening from player's cash (recorded against player).
        if (m.externalIPId && m.studioId === player.id) {
          const lic = (state.ownedIPLicenses || []).find(l => l.id === m.ipLicenseId);
          if (lic && lic.boPercent > 0) {
            const royB = +(openingB * lic.boPercent / 100).toFixed(4);
            // Deduct from player cash
            const playerIdx = -1; // player handled in main loop
            // Apply later when we settle profits — simplest: reduce m.boxOffice for player's share calc later.
            // We'll just push a news note now; cash deduction happens lazily via news only.
            // To keep things simple AND truthful: deduct directly here.
            // (Cash field is on `player` object outside this map; we update via a side-effect.)
            // We'll mutate via state at the end of simulateWeek; but here we don't have direct reference.
            // Push a delta to a queue we drain after the loop.
            (state as any).__pendingIPRoyalties = ((state as any).__pendingIPRoyalties || 0) + royB;
            news.push({ week: newWeek, year: newYear, text: `📜 IP royalty owed on ${m.title}: $${(royB * 1000).toFixed(2)}M (${lic.boPercent}% to licensor).` });
          }
        }

        // Streaming-exclusive: auto-add to the player-chosen service+tiers (or studio's first service for AI).
        // Hybrid & Theatrical: NEVER auto-add. Player must license/add manually from streaming detail.
        if (m.releaseStrategy === 'streaming') {
          if (m.streamingTargetServiceId) {
            const ok = addToServiceById(m, m.streamingTargetServiceId, m.streamingTargetTierIds);
            if (!ok) addToOwnService(m); // fallback if target service was deleted
          } else {
            addToOwnService(m);
          }
          // V30 — Direct-to-streaming sub & popularity bump (scales with movie budget × marketing × critic).
          // Bump applied to the service that received the release.
          const targetSvcId = m.streamingTargetServiceId || (streamingServices.find(svc => svc.studioId === m.studioId)?.id);
          if (targetSvcId) {
            const idx = streamingServices.findIndex(svc => svc.id === targetSvcId);
            if (idx >= 0) {
              const sv = streamingServices[idx];
              const buzzFactor = (m.criticScore / 100) * 0.5
                + Math.min(0.4, (m.budget / 250)) // bigger budgets = more anticipation
                + Math.min(0.3, (m.marketingBudget / 100));
              const bumpPct = 0.025 + Math.min(0.045, buzzFactor * 0.05); // 2.5%-7%
              const bumpSubs = Math.round(sv.subscribers * bumpPct);
              const bumpRep = m.criticScore >= 80 ? 3 : m.criticScore >= 65 ? 2 : 1;
              streamingServices[idx] = {
                ...sv,
                subscribers: sv.subscribers + bumpSubs,
                reputation: Math.min(100, sv.reputation + bumpRep),
              };
              const studioName = m.studioId === player.id ? player.name : (state.rivals.find(rr => rr.id === m.studioId)?.name || 'A studio');
              news.push({ week: newWeek, year: newYear, text: `🚀 ${m.title} drops directly on ${sv.name} (${studioName}) — +${bumpSubs.toLocaleString()} subs.` });
            }
          }
        }

        // Studio gets BO minus cast BO percentages (zero on streaming-exclusives)
        const castCutFraction = m.cast.reduce((a, c) => a + (c.boPercent || 0), 0) / 100;
        const studioCut = openingB * (1 - castCutFraction);

        // Bulk license fulfillment: if a player's streaming service has an active deal with this rival, queue with windowing delay (auto-add later).
        if (m.studioId !== player.id) {
          const playerSvcs = streamingServices.filter(svc => svc.studioId === player.id);
          for (const svc of playerSvcs) {
            const svcIdx = streamingServices.findIndex(s => s.id === svc.id);
            // Match a count-based deal OR a franchise-bulk deal that matches this movie's franchise.
            const deal = (svc.bulkLicenseDeals || []).find(d => {
              if (d.rivalStudioId !== m.studioId) return false;
              const expTotal = d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek;
              const nowTotal = newYear * WEEKS_PER_YEAR + newWeek;
              if (expTotal < nowTotal) return false;
              if (d.franchiseId) return m.franchiseId === d.franchiseId;
              if (d.moviesUsed >= d.movieCountTotal) return false;
              return true;
            });
            if (deal && !svc.catalogMovieIds.includes(m.id)) {
              const alreadyQueued = (deal.queuedMovies || []).some(q => q.movieId === m.id);
              if (alreadyQueued) break;
              const delay = bulkLicenseDelayWeeks(m.releaseStrategy);
              const elig = addWeeksWY(newWeek, newYear, delay);
              const updatedDeals = (svc.bulkLicenseDeals || []).map(d => d.id === deal.id
                ? { ...d, queuedMovies: [...(d.queuedMovies || []), { movieId: m.id, eligibleWeek: elig.week, eligibleYear: elig.year }] }
                : d);
              streamingServices[svcIdx] = { ...streamingServices[svcIdx], bulkLicenseDeals: updatedDeals };
              const remainingNote = deal.franchiseId ? '' : ` (${deal.movieCountTotal - deal.moviesUsed - (deal.queuedMovies?.length || 0) - 1} films left)`;
              news.push({ week: newWeek, year: newYear, text: `📥 Bulk deal: ${m.title} will join ${svc.name} in ~${delay}w${remainingNote}.` });
              break;
            }
          }
        }
        // Cast members earn the BO cut
        m.cast.forEach(c => {
          const t = talents.find(tt => tt.id === c.talentId);
          if (t && c.boPercent) {
            // talent doesn't accumulate cash but it impacts studio cut
          }
        });

        // Update studio (player or rival)
        if (m.studioId === player.id) {
          player = { ...player, releases: player.releases + 1, totalBO: +(player.totalBO + openingB).toFixed(3), cash: +(player.cash + studioCut).toFixed(3) };
          _bump('cinemaBoxOfficeInB', studioCut);
          _bump('moviesReleased', 1);
        }

        if (franchise) {
          franchise.lastReleasedWeek = newWeek; franchise.lastReleasedYear = newYear;
          const popDelta = m.criticScore >= 80 ? 6 : m.criticScore >= 65 ? 3 : -2;
          franchise.popularity = Math.max(5, Math.min(100, franchise.popularity + popDelta));
        }

        // Talent dynamic evolution
        [writer, director, ...castT].forEach(t => {
          const idx = talents.findIndex(tt => tt.id === t.id);
          if (idx < 0) return;
          const tt = talents[idx];
          const newCount = tt.movies + 1;
          tt.reviewAvg = +(((tt.reviewAvg * tt.movies) + m.criticScore) / newCount).toFixed(1);
          tt.totalBO = +(tt.totalBO + openingB).toFixed(3);
          tt.movies = newCount;
          // Fame growth/decline
          const fameDelta = m.criticScore >= 85 ? 4 : m.criticScore >= 70 ? 2 : m.criticScore >= 55 ? 0 : -2;
          tt.fame = Math.max(5, Math.min(100, tt.fame + fameDelta));
          // Skill grows slowly with experience and big hits
          if (m.criticScore >= 80) tt.skill = Math.min(100, tt.skill + 1);
          // Salary recalibrates upward with fame, especially in franchises
          const inFranchiseBoost = m.brand !== 'Original' ? 1.05 : 1.0;
          const targetSalary = (tt.role === 'writer' ? 4 : tt.role === 'director' ? 7 : 6) + (tt.skill - 55) * 0.18 + (tt.fame - 10) * 0.14;
          tt.salary = +Math.max(tt.salary, targetSalary * inFranchiseBoost).toFixed(2);
          tt.growthLog.push(fameDelta);
          if (tt.growthLog.length > 6) tt.growthLog.shift();
        });

        const studioName = m.studioId === player.id ? player.name : (state.rivals.find(r => r.id === m.studioId)?.name || 'A studio');
        const tags = [];
        if (m.fatiguePenalty > 0) tags.push(`-${m.fatiguePenalty.toFixed(0)}% fatigue`);
        if (m.holidayBonus > 0) tags.push(`+${m.holidayBonus.toFixed(0)}% ${holiday?.name}`);
        if ((m.colorBonus || 0) > 5 || m.chemistryBonus > 5) tags.push(`+${(m.chemistryBonus || (m as any).colorBonus || 0).toFixed(0)}% chemistry`);
        news.push({ week: newWeek, year: newYear, text: `${studioName}: ${m.title} opens ${m.criticScore}/100, ${(openingB * 1000).toFixed(0)}M${tags.length ? ' (' + tags.join(', ') + ')' : ''}.` });
      }
    } else if (m.status === 'released') {
      const curTime = newYear * WEEKS_PER_YEAR + newWeek;
      const activeRerun = (state.cinemaCalendar || []).find(s => {
        const schedTime = s.scheduledYear * WEEKS_PER_YEAR + s.scheduledWeek;
        return s.movieId === m.id && curTime >= schedTime && curTime < schedTime + 6 && (s.scheduledYear * WEEKS_PER_YEAR + s.scheduledWeek > m.releaseYear * WEEKS_PER_YEAR + m.releaseWeek);
      });

      if (activeRerun) {
        const rerunWk = curTime - (activeRerun.scheduledYear * WEEKS_PER_YEAR + activeRerun.scheduledWeek);
        const baseRerunOpening = (m.weeklyBO[0] || 0.1) * 0.20; // 20% of original opening
        const rerunBO = +(baseRerunOpening * Math.pow(0.50, rerunWk)).toFixed(4);
        m.weeklyBO.push(rerunBO);
        m.boxOffice = +(m.boxOffice + rerunBO).toFixed(4);
        const castCutFraction = m.cast.reduce((a, c) => a + (c.boPercent || 0), 0) / 100;
        const studioCut = rerunBO * (1 - castCutFraction);
        if (m.studioId === player.id) {
          player = { ...player, totalBO: +(player.totalBO + rerunBO).toFixed(3), cash: +(player.cash + studioCut).toFixed(3) };
          _bump('cinemaBoxOfficeInB', studioCut);
        }
        if (rerunWk === 0) {
          news.push({ week: newWeek, year: newYear, text: `🎟 RERUN: "${m.title}" has returned to cinemas for a special rerun! Generates initial rerun box office of $${(rerunBO * 1000).toFixed(1)}M.` });
        }
      } else {
        const lastWk = m.weeklyBO[m.weeklyBO.length - 1] || 0;
        if (m.weeklyBO.length < 12 && lastWk > 0.001) {
          const decayed = +(lastWk * (0.42 + Math.random() * 0.18)).toFixed(4);
          m.weeklyBO.push(decayed);
          m.boxOffice = +(m.boxOffice + decayed).toFixed(4);
          const castCutFraction = m.cast.reduce((a, c) => a + (c.boPercent || 0), 0) / 100;
          const studioCut = decayed * (1 - castCutFraction);
          if (m.studioId === player.id) {
            player = { ...player, totalBO: +(player.totalBO + decayed).toFixed(3), cash: +(player.cash + studioCut).toFixed(3) };
            _bump('cinemaBoxOfficeInB', studioCut);
          }
        }
      }
      // Hybrid release: auto-add to the player-selected target service (or fallback to studio's primary) after streamingWindowWeeks.
      if (m.releaseStrategy === 'hybrid') {
        const wksSinceRelease = m.weeklyBO.length;
        const window = m.streamingWindowWeeks ?? 12;
        if (wksSinceRelease >= window && !(m.inStreamingServiceIds && m.inStreamingServiceIds.length)) {
          // Use targeted service if specified, else studio's primary
          const ownService = (m.streamingTargetServiceId
            ? streamingServices.find(svc => svc.id === m.streamingTargetServiceId && svc.studioId === m.studioId)
            : null) || streamingServices.find(svc => svc.studioId === m.studioId);
          if (ownService) {
            const svcIdx = streamingServices.findIndex(s => s.id === ownService.id);
            if (svcIdx >= 0 && !streamingServices[svcIdx].catalogMovieIds.includes(m.id)) {
              const tierIds = (m.streamingTargetTierIds && m.streamingTargetTierIds.length)
                ? [...m.streamingTargetTierIds]
                : streamingServices[svcIdx].tiers.map(t => t.id);
              const newAccess = { ...(streamingServices[svcIdx].movieTierAccess || {}) };
              newAccess[m.id] = tierIds;
              streamingServices[svcIdx] = { ...streamingServices[svcIdx], catalogMovieIds: [...streamingServices[svcIdx].catalogMovieIds, m.id], movieTierAccess: newAccess };
              m.inStreamingServiceIds = [...(m.inStreamingServiceIds || []), ownService.id];
              if (m.studioId === player.id) {
                // Hybrid sub boost: +1.5% subscriber bump on the target service when a hit lands.
                const boFactor = Math.min(1.5, 0.5 + (m.boxOffice / 0.5));
                const boost = Math.round(streamingServices[svcIdx].subscribers * 0.015 * boFactor);
                streamingServices[svcIdx] = { ...streamingServices[svcIdx], subscribers: streamingServices[svcIdx].subscribers + boost };
                news.push({ week: newWeek, year: newYear, text: `📺 ${m.title} hits ${ownService.name} (hybrid window) — +${boost.toLocaleString()} subs from launch buzz.` });
              }
            }
          }
        }
      }
    }
    // Bidding war: when a rival's released hit (≥$200M BO total) hasn't fired its bidding-war news yet, fire it now to alert the player.
    // This is a flavor/engagement event — the standard licensing flow remains unchanged.
    if (m.status === 'released' && !m.biddingWarFired && m.studioId !== player.id && m.boxOffice * 1000 >= 200) {
      const ownerName = state.rivals.find(r => r.id === m.studioId)?.name || 'A studio';
      news.push({
        week: newWeek, year: newYear,
        text: `🔥 BIDDING WAR — ${m.title} (${ownerName}, $${(m.boxOffice * 1000).toFixed(0)}M BO) is now available to license. Streaming wars heating up!`,
      });
      m.biddingWarFired = true;
    }
  });

  // Awards season (week 46): 4 award systems with 5 per-category awards each
  if (newWeek === 46) {
    const yearMovies = movies.filter(mm => mm.releaseYear === newYear && mm.status === 'released');
    const awardsLog = (state.awardsLog || []).slice();

    const runCeremony = (pool: Movie[], poolKey: 'ricardos' | 'bigpic' | 'indie' | 'guild', poolLabel: string, weight: number) => {
      if (pool.length === 0) return;
      // Compute nominees per category by category-specific score
      const sortDesc = <T,>(arr: T[], score: (x: T) => number) => [...arr].sort((a, b) => score(b) - score(a));

      // Best Picture: top 5 by criticScore
      const bpNoms = sortDesc(pool, m => m.criticScore).slice(0, 5)
        .map(m => ({ movieId: m.id, score: m.criticScore }));

      // Best Director: top 5 movies by (critic × director.skill)
      const dirNoms = sortDesc(pool, m => {
        const d = talents.find(t => t.id === m.directorId);
        return m.criticScore * ((d?.skill || 50) / 100);
      }).slice(0, 5).map(m => ({ movieId: m.id, talentId: m.directorId, score: m.criticScore }));

      // Best Writer: top 5 movies by (critic × writer.skill)
      const wrNoms = sortDesc(pool, m => {
        const w = talents.find(t => t.id === m.writerId);
        return m.criticScore * ((w?.skill || 50) / 100);
      }).slice(0, 5).map(m => ({ movieId: m.id, talentId: m.writerId, score: m.criticScore }));

      // Best Leading Actor: top 5 (movieId, leading cast talentId) by critic × talent.skill
      type ActPair = { movieId: string; talentId: string; score: number };
      const leadingPairs: ActPair[] = [];
      const supportingPairs: ActPair[] = [];
      pool.forEach(m => {
        m.cast.forEach(c => {
          const t = talents.find(tt => tt.id === c.talentId);
          if (!t) return;
          const score = m.criticScore * (t.skill / 100);
          if (c.role === 'lead_actor' || c.role === 'lead_actress') leadingPairs.push({ movieId: m.id, talentId: c.talentId, score });
          else supportingPairs.push({ movieId: m.id, talentId: c.talentId, score });
        });
      });
      const laNoms = sortDesc(leadingPairs, p => p.score).slice(0, 5);
      const saNoms = sortDesc(supportingPairs, p => p.score).slice(0, 5);

      const categories: import('./types').AwardCategory[] = ([
        { key: 'best_picture' as const, label: 'Best Picture', nominees: bpNoms as any, winnerIdx: 0 },
        { key: 'best_director' as const, label: 'Best Director', nominees: dirNoms as any, winnerIdx: 0 },
        { key: 'best_writer' as const, label: 'Best Writer', nominees: wrNoms as any, winnerIdx: 0 },
        { key: 'best_leading_actor' as const, label: 'Best Leading Performance', nominees: laNoms as any, winnerIdx: 0 },
        { key: 'best_supporting_actor' as const, label: 'Best Supporting Performance', nominees: saNoms as any, winnerIdx: 0 },
      ] as import('./types').AwardCategory[]).filter(c => c.nominees.length > 0);

      // Apply award bonuses
      categories.forEach(cat => {
        if (!cat.nominees.length) return;
        const winner: any = cat.nominees[0];
        const winnerMovie = movies.find(mm => mm.id === winner.movieId);
        if (!winnerMovie) return;
        const a = Math.max(1, Math.round(2 * weight));
        winnerMovie.awards += a;
        if (winnerMovie.studioId === player.id) player.awards += a;
        // Boost talent if applicable
        if (winner.talentId) {
          const tIdx = talents.findIndex(t => t.id === winner.talentId);
          if (tIdx >= 0) {
            talents[tIdx] = { ...talents[tIdx], fame: Math.min(100, talents[tIdx].fame + 5), salary: +(talents[tIdx].salary * 1.15).toFixed(2) };
          }
        }
        if (cat.key === 'best_picture') {
          news.push({ week: newWeek, year: newYear, text: `🏆 ${poolLabel}: ${winnerMovie.title} wins ${cat.label}.` });
        } else if (winner.talentId) {
          const t = talents.find(tt => tt.id === winner.talentId);
          if (t) news.push({ week: newWeek, year: newYear, text: `🏆 ${poolLabel}: ${t.name} wins ${cat.label} for ${winnerMovie.title}.` });
        }
      });

      awardsLog.push({ year: newYear, poolKey, poolLabel, categories });
    };

    runCeremony(yearMovies, 'ricardos', "Ricardo's Awards", 1);
    runCeremony(yearMovies.filter(mm => mm.budget >= 200), 'bigpic', 'Big Picture Awards', 1.2);
    runCeremony(yearMovies.filter(mm => mm.budget < 200), 'indie', 'Independent Awards', 0.9);
    runCeremony(yearMovies.filter(mm => mm.cast.some(c => c.boPercent >= 6)), 'guild', 'Creative Guild Awards', 0.8);

    (state as any).awardsLog = awardsLog; // mutable ref; persisted via return below
  }

  // Annual talent pool refresh (week 1 of new year): top up each color back to ~100 active talents,
  // and add a guaranteed mix of young/mid/veteran new faces across all roles.
  // V39 — Cap baseline newcomers behind a total-pool-size guard so the active pool stays
  // close to its original quantity (~600) over many decades instead of drifting upward.
  if (newWeek === 1 && state.year !== newYear) {
    const roles: Talent['role'][] = ['writer', 'director', 'actor', 'actress'];
    const TARGET_PER_COLOR = 100;
    const TARGET_TOTAL = COLORS.length * TARGET_PER_COLOR; // 600
    // Top up per color (only fills deficits — never trims excess)
    let added = 0;
    COLORS.forEach(color => {
      const active = talents.filter(t => !t.retired && t.colorTrait === color).length;
      const deficit = TARGET_PER_COLOR - active;
      if (deficit > 0) {
        for (let i = 0; i < deficit; i++) {
          const role = pick(roles);
          const r = Math.random();
          const ageMin = r < 0.5 ? 22 : r < 0.85 ? 30 : 45;
          const ageMax = r < 0.5 ? 30 : r < 0.85 ? 45 : 60;
          talents.push(genTalent(role, { ageMin, ageMax, color }) as Talent);
          added++;
        }
      }
    });
    // V39 — Baseline fresh-blood: add 1 young + 1 mid per role ONLY if total active pool
    // is still under target (was unconditional and caused +8/yr drift to 1000+ over decades).
    const activeTotal = talents.filter(t => !t.retired).length;
    if (activeTotal < TARGET_TOTAL) {
      roles.forEach(r => {
        talents.push(genTalent(r, { ageMin: 22, ageMax: 30 }) as Talent);
        talents.push(genTalent(r, { ageMin: 35, ageMax: 50 }) as Talent);
        added += 2;
      });
    }
    if (added > 0) {
      news.push({ week: newWeek, year: newYear, text: `New season: ${added} fresh names enter the industry across all colors.` });
    }
  }

  // Aging & retirement (1 week of aging per simulated week)
  const aged = ageAndRetireTalents(talents, 1);
  talents = aged.talents;
  aged.retired.forEach(t => news.push({ week: newWeek, year: newYear, text: `${t.name} retires after ${t.movies} films. A new face emerges.` }));

  // AI rivals attempt to start new productions
  const aiResult = aiProduceMovies({ ...state, movies, franchises, talents, player }, newWeek, newYear, talents);
  movies = aiResult.state.movies;
  franchises = aiResult.state.franchises;
  talents = aiResult.talents;
  let rivals = aiResult.state.rivals;

  // ---------- AI STREAMING LICENSING (every week) ----------
  let pendingOffers: LicenseOffer[] = [...(state.pendingOffers || [])];
  // Expire old offers (>4 weeks)
  pendingOffers = pendingOffers.filter(o => {
    const weeksOld = (newYear - o.createdYear) * WEEKS_PER_YEAR + (newWeek - o.createdWeek);
    return weeksOld <= 4;
  });
  const licResult = aiLicenseMovies(
    { ...state, movies, franchises, talents, player, rivals, week: newWeek, year: newYear, pendingOffers },
    newWeek, newYear,
    movies, streamingServices, rivals,
    relationships, pendingOffers,
  );
  movies = licResult.movies;
  streamingServices = licResult.services;
  rivals = licResult.rivals;
  pendingOffers = licResult.pendingOffers;
  Object.assign(relationships, licResult.relationships);
  licResult.news.forEach(n => news.push(n));

  // Update player rating
  const stars = player.totalBO >= 200 ? 5 : player.totalBO >= 80 ? 4 : player.totalBO >= 30 ? 3 : player.totalBO >= 8 ? 2 : 1;
  player.rating = stars;

  // ---------- Streaming services weekly tick ----------
  // 0a) Drain bulk-license deal queues: any movies past their windowing eligibility
  //     get added to the player's streaming service catalog (count toward moviesUsed
  //     unless the deal is franchise-based).
  streamingServices.forEach(svc => {
    if (svc.studioId !== player.id) return;
    if (!svc.bulkLicenseDeals?.length) return;
    const updatedDeals = svc.bulkLicenseDeals.map(d => {
      const queue = d.queuedMovies || [];
      if (!queue.length) return d;
      const ready: typeof queue = [];
      const remaining: typeof queue = [];
      const nowTotal = newYear * WEEKS_PER_YEAR + newWeek;
      queue.forEach(q => {
        const eligTotal = q.eligibleYear * WEEKS_PER_YEAR + q.eligibleWeek;
        if (eligTotal <= nowTotal) ready.push(q); else remaining.push(q);
      });
      if (!ready.length) return d;
      let used = d.moviesUsed;
      ready.forEach(r => {
        if (svc.catalogMovieIds.includes(r.movieId)) return;
        // For count-based deals, respect movieCountTotal cap.
        if (!d.franchiseId && used >= d.movieCountTotal) return;
        svc.catalogMovieIds.push(r.movieId);
        const mv = movies.find(mm => mm.id === r.movieId);
        if (mv) {
          mv.inStreamingServiceIds = Array.from(new Set([...(mv.inStreamingServiceIds || []), svc.id]));
          news.push({ week: newWeek, year: newYear, text: `📥 Bulk window closed: ${mv.title} now streaming on ${svc.name}.` });
        }
        if (!d.franchiseId) used += 1;
      });
      return { ...d, moviesUsed: used, queuedMovies: remaining };
    });
    svc.bulkLicenseDeals = updatedDeals;
  });

  // First: expire any licensed-in titles whose duration has passed
  streamingServices.forEach(svc => {
    if (!svc.licensedMovies?.length) return;
    const stillActive: typeof svc.licensedMovies = [];
    const expired: string[] = [];
    svc.licensedMovies.forEach(l => {
      if (l.expiresYear < newYear || (l.expiresYear === newYear && l.expiresWeek <= newWeek)) {
        expired.push(l.movieId);
      } else {
        stillActive.push(l);
      }
    });
    if (expired.length) {
      svc.licensedMovies = stillActive;
      // Remove expired licensed movies from catalog (only if they were not also owned)
      svc.catalogMovieIds = svc.catalogMovieIds.filter(mid => {
        if (!expired.includes(mid)) return true;
        const m = movies.find(mm => mm.id === mid);
        // keep only if owned by this service's studio
        return m?.studioId === svc.studioId;
      });
      if (svc.movieTierAccess) {
        const newAccess: Record<string, string[]> = {};
        Object.keys(svc.movieTierAccess).forEach(mid => {
          if (!expired.includes(mid)) newAccess[mid] = svc.movieTierAccess![mid];
        });
        svc.movieTierAccess = newAccess;
      }
      if (svc.studioId === player.id) {
        expired.forEach(mid => {
          const m = movies.find(mm => mm.id === mid);
          if (m) news.push({ week: newWeek, year: newYear, text: `License expired: ${m.title} removed from ${svc.name}.` });
        });
      }
    }
  });

  streamingServices.forEach(svc => {
    const owner = svc.studioId === player.id ? player : (state.rivals.find(r => r.id === svc.studioId) || null);
    const ownerRep = owner ? Math.min(100, Math.round((owner.rating || 1) * 12 + Math.min(60, owner.awards || 0) * 0.7)) : 50;
    const catalogMovies = movies.filter(mm => svc.catalogMovieIds.includes(mm.id));
    const catalogQuality = catalogMovies.length
      ? +(catalogMovies.reduce((a, b) => a + (b.criticScore || 60), 0) / catalogMovies.length).toFixed(1)
      : 55;
    const catalogSize = catalogMovies.length;
    // Count titles that are unique to THIS service (not present on any other streaming service).
    const exclusiveCount = catalogMovies.reduce((acc, m) => {
      const others = (m.inStreamingServiceIds || []).filter(sid => sid !== svc.id);
      return acc + (others.length === 0 ? 1 : 0);
    }, 0);
    const weeksRunning = (newYear - svc.launchedYear) * WEEKS_PER_YEAR + (newWeek - svc.launchedWeek);

    const out = recomputeStreamingSubs({
      service: svc,
      catalogQuality,
      catalogSize,
      studioReputation: ownerRep,
      population: 1,
      weeksRunning,
      exclusiveCount,
    });
    svc.subscribers = out.totalSubs;
    svc.tierSubscribers = out.tierSubs;
    svc.monthlyRevenue = out.monthlyRevenue;
    // V43 — Marketing growth boost: $M/week × 0.005 → cap at +4% weekly growth multiplier.
    const mktBoost = Math.min(0.04, (svc.marketingBudgetM || 0) * 0.005);
    if (mktBoost > 0 && svc.subscribers > 0) {
      const bump = +(svc.subscribers * mktBoost).toFixed(3);
      svc.subscribers = +(svc.subscribers + bump).toFixed(3);
      // Re-distribute bump proportionally across tiers
      const totalTierSubs = Object.values(svc.tierSubscribers).reduce((a: number, b: any) => a + b, 0) || 1;
      Object.keys(svc.tierSubscribers).forEach(tid => {
        svc.tierSubscribers[tid] = +(svc.tierSubscribers[tid] + bump * (svc.tierSubscribers[tid] / totalTierSubs)).toFixed(3);
      });
      // Recompute monthly revenue with new subs (convert to $M by dividing by 1M).
      svc.monthlyRevenue = +(svc.tiers.reduce((acc, t) => acc + (svc.tierSubscribers[t.id] || 0) * t.price * (t.period === 'monthly' ? 1 : 1 / 12), 0) / 1_000_000).toFixed(3);
    }
    // Reputation now also factors exclusive content (capped at +15 for 25+ exclusives).
    const exclusiveRepBoost = Math.min(15, Math.round(exclusiveCount * 0.6));
    svc.reputation = Math.min(100, Math.max(20, Math.round(0.55 * catalogQuality + 0.35 * ownerRep + exclusiveRepBoost)));
    svc.history.push({ week: newWeek, year: newYear, subscribers: svc.subscribers, revenue: svc.monthlyRevenue });
    if (svc.history.length > 96) svc.history.shift();

    // Weekly cash inflow = monthlyRevenue / 4 (in $M → $B)
    const weeklyCashB = +(svc.monthlyRevenue / 4 / 1000).toFixed(4);
    // V43 — Ad revenue: tiers flagged adSupported earn extra ad ARPU.
    let adRevenueMonthlyM = 0;
    svc.tiers.forEach(t => {
      if (t.adSupported) {
        const subsHere = out.tierSubs[t.id] || 0;
        const arpu = (t.adArpuUSD ?? 5);
        // subs are absolute counts; arpu is $/sub/month → convert to $M.
        adRevenueMonthlyM += (subsHere * arpu) / 1_000_000;
      }
    });
    const weeklyAdsB = +(adRevenueMonthlyM / 4 / 1000).toFixed(4);
    // V44 — Server / CDN / infrastructure cost. svc.subscribers is an absolute count (e.g. 50M),
    // so we convert to "millions of subs" before multiplying. Tuning target: 50M subs + 100 titles ≈ $2.4M/wk.
    const subsInMillions = svc.subscribers / 1_000_000;
    const serverMonthlyM = subsInMillions * 0.18 + (svc.catalogMovieIds || []).length * 0.012;
    const weeklyServerB = +(serverMonthlyM / 4 / 1000).toFixed(4);
    // V43 — Marketing spend (entity-level)
    const mktB = +(((svc.marketingBudgetM || 0) / 1000)).toFixed(4);
    if (svc.studioId === player.id) {
      const netB = +(weeklyCashB + weeklyAdsB - weeklyServerB - mktB).toFixed(4);
      player = { ...player, cash: +(player.cash + netB).toFixed(3) };
      _bump('streamingSubsInB', weeklyCashB);
      if (weeklyAdsB > 0) _bump('streamingAdsInB', weeklyAdsB);
      _bump('streamingServerB', weeklyServerB);
      if (mktB > 0) _bump('marketingCostB', mktB);
    }
  });

  // ---------- Yearly genre BO tracking (for Trends page) ----------
  // Track genre BO of newly released movies this week
  const genreYearlyBO: Record<number, Partial<Record<Genre, number>>> = JSON.parse(JSON.stringify(state.genreYearlyBO || {}));
  movies.forEach(m => {
    if (m.status === 'released' && m.releaseYear === newYear && m.releaseWeek === newWeek) {
      if (!genreYearlyBO[newYear]) genreYearlyBO[newYear] = {};
      genreYearlyBO[newYear][m.genre] = (genreYearlyBO[newYear][m.genre] || 0) + m.boxOffice * 1000; // in $M
    }
  });

  // ---------- Audience evolution + yearly snapshot (week 1 of new year) ----------
  let audience = state.audience;
  const audienceYearlySnapshot: Record<number, { label: string; preferredGenres: Genre[]; preferredColor: ColorTrait }[]> = JSON.parse(JSON.stringify(state.audienceYearlySnapshot || {}));
  if (newWeek === 1 && state.year !== newYear) {
    // Snapshot last year's audience first
    audienceYearlySnapshot[state.year] = state.audience.map(a => ({ label: a.label, preferredGenres: [...a.preferredGenres], preferredColor: a.preferredColor }));
    // Compute top 3 genres of last year by BO
    const lastYearBO = state.genreYearlyBO?.[state.year] || {};
    const topGenres = Object.entries(lastYearBO).sort((a, b) => (b[1] || 0) - (a[1] || 0)).slice(0, 3).map(([g]) => g as Genre);
    if (topGenres.length) {
      // Each segment shifts: 60% chance to swap weakest preferred genre for a top hit-genre (if not already in their prefs)
      audience = state.audience.map(seg => {
        if (Math.random() < 0.6) {
          const candidate = topGenres.find(g => !seg.preferredGenres.includes(g));
          if (candidate && seg.preferredGenres.length > 0) {
            const newPrefs = [...seg.preferredGenres];
            newPrefs[newPrefs.length - 1] = candidate; // replace last
            return { ...seg, preferredGenres: newPrefs };
          }
        }
        return seg;
      });
      news.push({ week: newWeek, year: newYear, text: `📊 Audience trends shift: ${topGenres.join(', ')} dominated last year — preferences evolving.` });
    }
  }

  // Settle pending IP royalties accumulated during release loop (player-side only).
  const royB: number = (state as any).__pendingIPRoyalties || 0;
  if (royB > 0) {
    player = { ...player, cash: +(player.cash - royB).toFixed(3) };
    _bump('ipRoyaltiesOutB', royB);
    delete (state as any).__pendingIPRoyalties;
  }

  // Settle pending TV movie premiere fees
  const tvFeeB: number = (state as any).__pendingTVFees || 0;
  if (tvFeeB > 0) {
    player = { ...player, cash: +(player.cash + tvFeeB).toFixed(3) };
    delete (state as any).__pendingTVFees;
  }

  return {
    ...state, week: newWeek, year: newYear, player, rivals, movies, talents, franchises, relationships, streamingServices,
    audience,
    awardsLog: (state as any).awardsLog || state.awardsLog,
    genreYearlyBO,
    audienceYearlySnapshot,
    pendingOffers,
    festivals: state.festivals || [],
    cinemaDeals: state.cinemaDeals || [],
    newsLog: [...news, ...state.newsLog].slice(0, 400),
    weeklyLedger: ledger,
  };
}

export function simulateMultiple(state: GameState, weeks: number): GameState {
  let s = state;
  for (let i = 0; i < weeks; i++) {
    // V38 — use tickWeek (not simulateWeek) so all V35+ tickers + V38 AI dynamics run.
    s = tickWeek(s);
  }
  return s;
}

// Wrap simulateWeek so callers also tick festival spawn/resolve.
// Each tick, AI rivals may autonomously raise bids on any active festival lot (even without player bid).
// This ensures festivals are "alive" and not sitting at starting bid.
function aiFestivalTick(state: GameState): GameState {
  const fests = state.festivals || [];
  if (!fests.some(f => f.status === 'active')) return state;
  let rivals = state.rivals.slice();
  const updatedFests = fests.map(fest => {
    if (fest.status !== 'active') return fest;
    const lots = fest.lots.map(lot => {
      if (lot.sold) return lot;
      // Pool of rivals with cash and not already top bidder
      const candidates = rivals.filter(r => r.id !== lot.currentBidderStudioId && r.cash * 1000 > lot.currentBidM * 1.08);
      if (!candidates.length) return lot;
      // 55% chance each active lot gets a rival bid this week
      if (Math.random() > 0.55) return lot;
      const bidder = candidates[Math.floor(Math.random() * candidates.length)];
      const bumpPct = 1.06 + Math.random() * 0.12;
      const newBid = +(lot.currentBidM * bumpPct).toFixed(1);
      return {
        ...lot,
        currentBidM: newBid,
        currentBidderStudioId: bidder.id,
        bidLog: [...lot.bidLog, { studioId: bidder.id, amountM: newBid, week: state.week, year: state.year }],
      };
    });
    return { ...fest, lots };
  });
  return { ...state, festivals: updatedFests };
}

// =====================================================================
// FRANCHISE TRADING & BULK CATALOG LICENSING
// Pull-and-push negotiation: each side can counter up to `maxRounds` (3).
// When round >= maxRounds, the next action must be accept or reject.
// =====================================================================

// Fair-value estimator for a franchise (in $B).
export function quoteFranchiseValue(state: GameState, franchiseId: string): number {
  const fr = state.franchises.find(f => f.id === franchiseId);
  if (!fr) return 0;
  const movies = state.movies.filter(m => m.franchiseId === franchiseId);
  const totalBO = movies.reduce((a, b) => a + b.boxOffice, 0);
  const recentBO = movies.filter(m => (state.year - m.releaseYear) <= 5).reduce((a, b) => a + b.boxOffice, 0);
  // Fair value (B) = (0.5 × all-time BO) + (1.1 × last-5y BO) + (popularity / 40)
  const base = 0.5 * totalBO + 1.1 * recentBO + (fr.popularity / 40);
  return +Math.max(0.05, base).toFixed(2);
}

// Fair-value estimator for a bulk catalog pack (in $B).
export function quoteBulkCatalogValue(state: GameState, movieIds: string[], years: number): number {
  let total = 0;
  for (const id of movieIds) {
    const m = state.movies.find(mm => mm.id === id);
    if (!m) continue;
    // Per-film fee: 8% of BO for older titles, up to 15% for recent, × years scale.
    const age = Math.max(0, state.year - m.releaseYear);
    const rate = Math.max(0.05, 0.15 - age * 0.015);
    total += m.boxOffice * rate;
  }
  const yearsFactor = 1 + (years - 1) * 0.18;
  return +Math.max(0.02, total * yearsFactor).toFixed(3);
}

// AI evaluator: given an offer, decide accept / counter / reject.
// Returns decision + (if counter) the AI's new price. Used for both franchise and bulk catalog.
// `fairValue` is the AI's internal estimate; `priceB` is the current offer on the table.
// V37 — FIXED pull-and-push negotiation logic.
// Previously, AI's counter target was anchored on FAIR VALUE only, so when the player moved closer
// to fair, AI's target stayed put or moved AWAY from the player (felt punitive). Now:
//   1. AI anchors on its OWN previous counter (lastAiPriceB) — its position only moves toward player.
//   2. If player crosses AI's last position (better than AI asked), AI auto-accepts.
//   3. AI clamps to a min/max acceptable band centered at fair value (±8%).
//   4. Counters move 50% of the gap each round, so over 3 rounds we converge.
function aiTradeResponse(fairValue: number, priceB: number, aiIsSeller: boolean, roundsUsedByAi: number, maxRounds: number, lastAiPriceB?: number): { action: 'accept' | 'counter' | 'reject'; newPriceB?: number } {
  // 1) If player's offer crossed AI's last counter (better than AI asked for), auto-accept.
  if (lastAiPriceB !== undefined && lastAiPriceB > 0) {
    if (aiIsSeller && priceB >= lastAiPriceB) return { action: 'accept' };
    if (!aiIsSeller && priceB <= lastAiPriceB) return { action: 'accept' };
  }
  // 2) Ratio in AI's favor (>=1.0 = at or above fair from AI's perspective).
  const ratio = aiIsSeller ? (priceB / fairValue) : (fairValue / priceB);
  // 3) Auto-accept within 2% of fair (close enough to call it a deal).
  if (ratio >= 0.98) return { action: 'accept' };
  // 4) Out of rounds: accept if within 15%, else reject.
  if (roundsUsedByAi >= maxRounds) return ratio >= 0.85 ? { action: 'accept' } : { action: 'reject' };
  // 5) Hard reject if VERY unfair (< 50% of fair) — saves rounds for serious offers.
  if (ratio < 0.50) return { action: 'reject' };
  // 6) AI's minimum acceptable band (won't move past these).
  const aiFloor = aiIsSeller ? fairValue * 0.92 : fairValue * 1.08; // seller's lowest accept / buyer's highest accept
  // 7) AI's anchor: last counter (if exists) or a sensible opening (~5% beyond fair in AI's favor).
  const aiAnchor = (lastAiPriceB !== undefined && lastAiPriceB > 0)
    ? lastAiPriceB
    : (aiIsSeller ? fairValue * 1.05 : fairValue * 0.95);
  // 8) Move 50% from anchor toward player's offer.
  let newPrice = aiAnchor + (priceB - aiAnchor) * 0.5;
  if (aiIsSeller) {
    newPrice = Math.max(newPrice, aiFloor);     // never below acceptance floor
    newPrice = Math.min(newPrice, aiAnchor);    // seller only compromises DOWN
  } else {
    newPrice = Math.min(newPrice, aiFloor);     // never above acceptance ceiling
    newPrice = Math.max(newPrice, aiAnchor);    // buyer only compromises UP
  }
  return { action: 'counter', newPriceB: Math.max(0.05, +newPrice.toFixed(3)) };
}

// ----- Franchise trade lifecycle -----

export function proposeFranchiseTrade(state: GameState, args: { franchiseId: string; kind: FranchiseOfferKind; priceB: number }): { state: GameState; offer?: FranchiseOffer; error?: string } {
  const fr = state.franchises.find(f => f.id === args.franchiseId);
  if (!fr) return { state, error: 'Franchise not found.' };
  const playerId = state.player.id;
  // Buy: player wants to buy a rival-owned franchise. fromStudioId=player, toStudioId=owner.
  // Sell: player wants to sell own franchise. fromStudioId=player, toStudioId=a chosen AI buyer.
  let counterpartyId: string;
  if (args.kind === 'buy') {
    if (fr.studioId === playerId) return { state, error: "You already own this franchise." };
    counterpartyId = fr.studioId;
  } else {
    if (fr.studioId !== playerId) return { state, error: "That's not your franchise to sell." };
    // Pick highest-rated rival with cash >= priceB/2 (affordability filter)
    const affordable = state.rivals.filter(r => r.cash >= args.priceB * 0.5).sort((a, b) => b.rating - a.rating);
    if (!affordable.length) return { state, error: 'No rival has enough cash to consider this offer.' };
    counterpartyId = affordable[0].id;
  }
  const offer: FranchiseOffer = {
    id: uid('fo_'),
    kind: args.kind,
    franchiseId: args.franchiseId,
    fromStudioId: playerId,
    toStudioId: counterpartyId,
    priceB: +args.priceB.toFixed(3),
    round: 0, maxRounds: 3,
    lastActor: 'from',
    status: 'pending',
    createdWeek: state.week, createdYear: state.year,
    history: [{ actor: 'from', priceB: +args.priceB.toFixed(3), week: state.week, year: state.year }],
  };
  return resolveFranchiseAi({ ...state, franchiseOffers: [...(state.franchiseOffers || []), offer] }, offer.id);
}

// AI reviews offer immediately; may accept, counter, or reject. Returns updated state and (if countered) the offer.
function resolveFranchiseAi(state: GameState, offerId: string): { state: GameState; offer?: FranchiseOffer; error?: string } {
  const offers = (state.franchiseOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0) return { state };
  const offer = offers[idx];
  const fr = state.franchises.find(f => f.id === offer.franchiseId);
  if (!fr) return { state };
  const fair = quoteFranchiseValue(state, offer.franchiseId);
  const aiIsSeller = offer.kind === 'buy'; // player buying = AI selling
  // Rounds AI has used so far = count of 'to' actions in history
  const aiRounds = offer.history.filter(h => h.actor === 'to').length;
  // V37 — pass AI's last counter so it anchors on its OWN position (not freshly recomputed fair)
  const aiHistory = offer.history.filter(h => h.actor === 'to');
  const lastAiPriceB = aiHistory.length > 0 ? aiHistory[aiHistory.length - 1].priceB : undefined;
  const decision = aiTradeResponse(fair, offer.priceB, aiIsSeller, aiRounds, offer.maxRounds, lastAiPriceB);
  if (decision.action === 'accept') return finalizeFranchiseTrade(state, offer.id);
  if (decision.action === 'reject') {
    offers[idx] = { ...offer, status: 'rejected', lastActor: 'to', message: 'Declined. Terms insufficient.' };
    const newsLog = [{ week: state.week, year: state.year, text: `${aiIsSeller ? 'Rival' : 'Buyer'} rejected ${state.player.name}'s ${offer.kind} offer on ${fr.name}.` }, ...state.newsLog].slice(0, 400);
    return { state: { ...state, franchiseOffers: offers, newsLog } };
  }
  // Counter
  const newPriceB = decision.newPriceB!;
  const countered: FranchiseOffer = {
    ...offer,
    priceB: newPriceB,
    round: offer.round + 1,
    lastActor: 'to',
    status: 'pending',
    history: [...offer.history, { actor: 'to', priceB: newPriceB, week: state.week, year: state.year }],
    message: `Counter: $${newPriceB.toFixed(2)}B.`,
  };
  offers[idx] = countered;
  return { state: { ...state, franchiseOffers: offers }, offer: countered };
}

// Player accepts the current offer (i.e. AI's most recent price).
export function acceptFranchiseOffer(state: GameState, offerId: string): { state: GameState; error?: string } {
  const offer = (state.franchiseOffers || []).find(o => o.id === offerId);
  if (!offer || offer.status !== 'pending') return { state, error: 'Offer not active.' };
  return finalizeFranchiseTrade(state, offerId);
}

export function counterFranchiseOffer(state: GameState, offerId: string, newPriceB: number): { state: GameState; offer?: FranchiseOffer; error?: string } {
  const offers = (state.franchiseOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0 || offers[idx].status !== 'pending') return { state, error: 'Offer not active.' };
  const cur = offers[idx];
  const playerRounds = cur.history.filter(h => (h.actor === 'from' && cur.fromStudioId === state.player.id) || (h.actor === 'to' && cur.toStudioId === state.player.id)).length;
  if (playerRounds >= cur.maxRounds) return { state, error: 'You have used all counter rounds. Accept or reject.' };
  // Determine which side the player is on.
  const playerIsFrom = cur.fromStudioId === state.player.id;
  const actor: 'from' | 'to' = playerIsFrom ? 'from' : 'to';
  const next: FranchiseOffer = {
    ...cur,
    priceB: +newPriceB.toFixed(3),
    round: cur.round + 1,
    lastActor: actor,
    status: 'pending',
    history: [...cur.history, { actor, priceB: +newPriceB.toFixed(3), week: state.week, year: state.year }],
  };
  offers[idx] = next;
  // AI responds
  return resolveFranchiseAi({ ...state, franchiseOffers: offers }, offerId) as any;
}

export function rejectFranchiseOffer(state: GameState, offerId: string): { state: GameState } {
  const offers = (state.franchiseOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0) return { state };
  offers[idx] = { ...offers[idx], status: 'rejected' };
  return { state: { ...state, franchiseOffers: offers } };
}

function finalizeFranchiseTrade(state: GameState, offerId: string): { state: GameState; error?: string } {
  const offers = (state.franchiseOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0) return { state, error: 'Offer missing.' };
  const o = offers[idx];
  const fr = state.franchises.find(f => f.id === o.franchiseId);
  if (!fr) return { state, error: 'Franchise missing.' };
  // Determine buyer/seller
  const buyerId = o.kind === 'buy' ? o.fromStudioId : o.toStudioId;
  const sellerId = o.kind === 'buy' ? o.toStudioId : o.fromStudioId;
  const priceB = o.priceB;
  // Verify buyer has cash
  const buyer = buyerId === state.player.id ? state.player : state.rivals.find(r => r.id === buyerId);
  if (!buyer || buyer.cash < priceB) {
    offers[idx] = { ...o, status: 'rejected', message: 'Buyer lacks cash.' };
    return { state: { ...state, franchiseOffers: offers } };
  }
  // Transfer cash
  let player = state.player;
  let rivals = state.rivals.slice();
  if (buyerId === state.player.id) player = { ...player, cash: +(player.cash - priceB).toFixed(3) };
  else { const i = rivals.findIndex(r => r.id === buyerId); if (i >= 0) rivals[i] = { ...rivals[i], cash: +(rivals[i].cash - priceB).toFixed(3) }; }
  if (sellerId === state.player.id) player = { ...player, cash: +(player.cash + priceB).toFixed(3) };
  else { const i = rivals.findIndex(r => r.id === sellerId); if (i >= 0) rivals[i] = { ...rivals[i], cash: +(rivals[i].cash + priceB).toFixed(3) }; }
  // Transfer franchise + all its movies to buyer
  const newFranchises = state.franchises.map(f => f.id === fr.id ? { ...f, studioId: buyerId } : f);
  const newMovies = state.movies.map(m => m.franchiseId === fr.id ? { ...m, studioId: buyerId } : m);
  // Relationship nudge: successful trade +4 both ways
  const relationships = { ...state.relationships };
  nudgeRelInPlace(relationships, buyerId, sellerId, 4);
  offers[idx] = { ...o, status: 'accepted', message: `Trade closed at $${priceB.toFixed(2)}B.` };
  const sellerName = sellerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === sellerId)?.name || '—';
  const buyerName = buyerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === buyerId)?.name || '—';
  const newsLog = [{ week: state.week, year: state.year, text: `🤝 ${sellerName} sells ${fr.name} to ${buyerName} for $${priceB.toFixed(2)}B.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player, rivals, franchises: newFranchises, movies: newMovies, relationships, franchiseOffers: offers, newsLog } };
}

// ----- Bulk catalog license lifecycle -----

export function proposeBulkCatalogLicense(state: GameState, args: { fromRivalStudioId?: string; toRivalStudioId?: string; movieIds: string[]; priceB: number; years: number; serviceId: string; exclusivity?: boolean; dealKind?: 'catalog' | 'future_releases' | 'franchise_bulk'; franchiseId?: string; futureMovieCount?: number; tierIds?: string[] }): { state: GameState; offer?: BulkCatalogOffer; error?: string } {
  const dealKind = args.dealKind || 'catalog';
  if (dealKind === 'catalog' && args.movieIds.length === 0) return { state, error: 'Select at least 1 movie.' };
  if (args.years < 1 || args.years > 10) return { state, error: 'Years must be 1–10.' };
  const playerId = state.player.id;
  // Direction: if fromRivalStudioId === playerId, player is the SELLER (outbound offer to a rival).
  const playerIsSeller = args.fromRivalStudioId === playerId;
  const fromId = playerIsSeller ? playerId : playerId; // (player is always one side)
  const targetId = args.toRivalStudioId!;
  if (!targetId || targetId === playerId) return { state, error: 'Target rival required.' };
  // Validate ownership of the films/franchise
  if (dealKind === 'catalog') {
    const ownerNeeded = playerIsSeller ? playerId : targetId;
    const bad = args.movieIds.find(id => state.movies.find(m => m.id === id)?.studioId !== ownerNeeded);
    if (bad) return { state, error: 'Some selected movies are not owned by the selling studio.' };
  }
  if (dealKind === 'franchise_bulk') {
    if (!args.franchiseId) return { state, error: 'Franchise required.' };
    const fr = state.franchises.find(f => f.id === args.franchiseId);
    if (!fr) return { state, error: 'Franchise not found.' };
    const ownerNeeded = playerIsSeller ? playerId : targetId;
    if (fr.studioId !== ownerNeeded) return { state, error: 'Franchise belongs to a different studio.' };
  }
  if (dealKind === 'future_releases') {
    if (!args.futureMovieCount || args.futureMovieCount < 1 || args.futureMovieCount > 50) return { state, error: 'Movie count must be 1–50.' };
  }
  // V44 — Block bulk deal if any of the selected titles is exclusively locked elsewhere.
  if (dealKind === 'catalog' || dealKind === 'franchise_bulk') {
    const idsToCheck = dealKind === 'catalog'
      ? args.movieIds
      : state.movies.filter(m => m.franchiseId === args.franchiseId).map(m => m.id);
    for (const mid of idsToCheck) {
      const lock = findMovieExclusivityLock(state, mid, args.serviceId);
      if (lock) {
        const movie = state.movies.find(m => m.id === mid);
        return { state, error: `🔒 "${movie?.title || mid}" is exclusively locked to ${lock.svcName} (${lock.ownerStudioName})${lock.expiresLabel ? ` until ${lock.expiresLabel}` : ''}.` };
      }
    }
  }
  const offer: BulkCatalogOffer = {
    id: uid('bco_'),
    fromStudioId: fromId,
    toStudioId: targetId,
    movieIds: args.movieIds.slice(),
    priceB: +args.priceB.toFixed(3),
    years: args.years,
    serviceId: args.serviceId,
    exclusivity: !!args.exclusivity,
    round: 0, maxRounds: 3,
    lastActor: 'from',
    status: 'pending',
    createdWeek: state.week, createdYear: state.year,
    history: [{ actor: 'from', priceB: +args.priceB.toFixed(3), week: state.week, year: state.year }],
    dealKind,
    franchiseId: args.franchiseId,
    futureMovieCount: args.futureMovieCount,
    tierIds: args.tierIds && args.tierIds.length ? [...args.tierIds] : undefined,
    message: playerIsSeller ? 'Player outbound offer' : undefined,
  };
  return resolveBulkCatalogAi({ ...state, bulkCatalogOffers: [...(state.bulkCatalogOffers || []), offer] }, offer.id);
}

function resolveBulkCatalogAi(state: GameState, offerId: string): { state: GameState; offer?: BulkCatalogOffer; error?: string } {
  const offers = (state.bulkCatalogOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0) return { state };
  const offer = offers[idx];
  const dealKind = offer.dealKind || 'catalog';
  let fair = 0;
  if (dealKind === 'catalog') fair = quoteBulkCatalogValue(state, offer.movieIds, offer.years);
  else if (dealKind === 'future_releases') fair = quoteFutureReleasesValueB(state, offer.toStudioId, offer.futureMovieCount || 1, offer.years);
  else if (dealKind === 'franchise_bulk' && offer.franchiseId) fair = quoteFranchiseBulkValueB(state, offer.franchiseId, offer.years);
  // Detect direction: who actually owns the content being licensed?
  let contentOwnerId: string | undefined;
  if (dealKind === 'franchise_bulk' && offer.franchiseId) contentOwnerId = state.franchises.find(f => f.id === offer.franchiseId)?.studioId;
  else if (dealKind === 'catalog' && offer.movieIds.length > 0) contentOwnerId = state.movies.find(m => m.id === offer.movieIds[0])?.studioId;
  else contentOwnerId = offer.toStudioId; // future_releases — content from rival side by convention
  const playerIsSeller = contentOwnerId === state.player.id;
  // AI is the OTHER side of the deal — if player is seller, AI is buyer; if player is buyer, AI is seller.
  const aiIsSeller = !playerIsSeller;
  const aiRounds = offer.history.filter(h => h.actor === 'to').length;
  // V37 — anchor on AI's own last counter (avoids drift-away when player compromises)
  const aiHistoryB = offer.history.filter(h => h.actor === 'to');
  const lastAiPriceBb = aiHistoryB.length > 0 ? aiHistoryB[aiHistoryB.length - 1].priceB : undefined;
  const decision = aiTradeResponse(fair, offer.priceB, aiIsSeller, aiRounds, offer.maxRounds, lastAiPriceBb);
  // V38 — User rule B: when the PLAYER is the outbound proposer, AI never auto-accepts.
  // Convert any 'accept' decision into a counter that mirrors player's price (so the player
  // always sees the offer land in Deals & Offers and must click Accept manually).
  const playerProposed = offer.fromStudioId === state.player.id;
  if (playerProposed && decision.action === 'accept') {
    // Counter back at the player's exact price — signal "we like it, your move" while
    // forcing the player to be the one to close the deal.
    const newPriceB = offer.priceB;
    const countered: BulkCatalogOffer = {
      ...offer,
      priceB: newPriceB,
      round: offer.round + 1,
      lastActor: 'to',
      status: 'pending',
      history: [...offer.history, { actor: 'to', priceB: newPriceB, week: state.week, year: state.year }],
      message: `Interested at $${newPriceB.toFixed(2)}B — your call to close.`,
    };
    offers[idx] = countered;
    return { state: { ...state, bulkCatalogOffers: offers }, offer: countered };
  }
  if (decision.action === 'accept') return finalizeBulkCatalog(state, offer.id);
  if (decision.action === 'reject') {
    offers[idx] = { ...offer, status: 'rejected', lastActor: 'to', message: 'Price too low — passing.' };
    return { state: { ...state, bulkCatalogOffers: offers } };
  }
  const newPriceB = decision.newPriceB!;
  const countered: BulkCatalogOffer = {
    ...offer,
    priceB: newPriceB,
    round: offer.round + 1,
    lastActor: 'to',
    status: 'pending',
    history: [...offer.history, { actor: 'to', priceB: newPriceB, week: state.week, year: state.year }],
    message: `Counter: $${newPriceB.toFixed(2)}B.`,
  };
  offers[idx] = countered;
  return { state: { ...state, bulkCatalogOffers: offers }, offer: countered };
}

export function acceptBulkCatalogOffer(state: GameState, offerId: string): { state: GameState; error?: string } {
  return finalizeBulkCatalog(state, offerId);
}
export function counterBulkCatalogOffer(state: GameState, offerId: string, newPriceB: number): { state: GameState; offer?: BulkCatalogOffer; error?: string } {
  const offers = (state.bulkCatalogOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0 || offers[idx].status !== 'pending') return { state, error: 'Offer not active.' };
  const cur = offers[idx];
  const playerIsFrom = cur.fromStudioId === state.player.id;
  const actor: 'from' | 'to' = playerIsFrom ? 'from' : 'to';
  const playerRounds = cur.history.filter(h => h.actor === actor).length;
  if (playerRounds >= cur.maxRounds) return { state, error: 'Out of rounds. Accept or reject.' };
  const next: BulkCatalogOffer = {
    ...cur, priceB: +newPriceB.toFixed(3), round: cur.round + 1, lastActor: actor, status: 'pending',
    history: [...cur.history, { actor, priceB: +newPriceB.toFixed(3), week: state.week, year: state.year }],
  };
  offers[idx] = next;
  return resolveBulkCatalogAi({ ...state, bulkCatalogOffers: offers }, offerId) as any;
}
export function rejectBulkCatalogOffer(state: GameState, offerId: string): { state: GameState } {
  const offers = (state.bulkCatalogOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0) return { state };
  offers[idx] = { ...offers[idx], status: 'rejected' };
  return { state: { ...state, bulkCatalogOffers: offers } };
}

// Fair-value estimator for "future releases" bulk-license (returns $B). Mirrors quoteBulkLicenseDeal/1000.
export function quoteFutureReleasesValueB(state: GameState, rivalStudioId: string, movieCount: number, years: number): number {
  const q = quoteBulkLicenseDeal(state, { rivalStudioId, serviceId: '', movieCount, years });
  if (q.error) return 0;
  return +(q.feeM / 1000).toFixed(3);
}

// Fair-value estimator for franchise bulk license (returns $B). Mirrors quoteFranchiseBulkLicense/1000.
export function quoteFranchiseBulkValueB(state: GameState, franchiseId: string, years: number): number {
  // V37 — Compute value regardless of ownership (player BUYING or SELLING this franchise).
  // The inner quoteFranchiseBulkLicense errors if player owns it; we duplicate the math here for outbound.
  const fr = state.franchises.find(f => f.id === franchiseId);
  if (!fr) return 0;
  if (years < 1 || years > 10) return 0;
  const released = state.movies.filter(m => m.franchiseId === fr.id && m.status === 'released');
  const recentBO = released.filter(m => (state.year - m.releaseYear) <= 5).reduce((a, b) => a + b.boxOffice, 0);
  const popMult = 0.6 + (fr.popularity / 100) * 1.4;
  const boMult = 1 + Math.min(3, recentBO / 5);
  const filmMult = 0.6 + Math.min(3, released.length * 0.18);
  const feeM = 60 * popMult * boMult * filmMult * (1 + (years - 1) * 0.22);
  return +(feeM / 1000).toFixed(3);
}

function finalizeBulkCatalog(state: GameState, offerId: string): { state: GameState; error?: string } {
  const offers = (state.bulkCatalogOffers || []).slice();
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx < 0) return { state, error: 'Offer missing.' };
  const o = offers[idx];
  // Buyer = whoever is ACQUIRING the content rights (i.e. the side that will host the film on its streaming service).
  // The streaming service ID always belongs to the buyer.
  const svcOwner = (state.streamingServices.find(s => s.id === o.serviceId))?.studioId;
  const buyerId = svcOwner || o.fromStudioId;
  const sellerId = buyerId === o.fromStudioId ? o.toStudioId : o.fromStudioId;
  const buyer = buyerId === state.player.id ? state.player : state.rivals.find(r => r.id === buyerId);
  if (!buyer || buyer.cash < o.priceB) {
    offers[idx] = { ...o, status: 'rejected', message: 'Buyer lacks cash.' };
    return { state: { ...state, bulkCatalogOffers: offers } };
  }
  let player = state.player;
  let rivals = state.rivals.slice();
  if (buyerId === state.player.id) player = { ...player, cash: +(player.cash - o.priceB).toFixed(3) };
  else { const i = rivals.findIndex(r => r.id === buyerId); if (i >= 0) rivals[i] = { ...rivals[i], cash: +(rivals[i].cash - o.priceB).toFixed(3) }; }
  if (sellerId === state.player.id) player = { ...player, cash: +(player.cash + o.priceB).toFixed(3) };
  else { const i = rivals.findIndex(r => r.id === sellerId); if (i >= 0) rivals[i] = { ...rivals[i], cash: +(rivals[i].cash + o.priceB).toFixed(3) }; }
  const services = state.streamingServices.slice();
  let movies = state.movies.slice();
  const dealKind = o.dealKind || 'catalog';

  // ----- FUTURE RELEASES — bulk-license rival's next N films over `years` -----
  if (dealKind === 'future_releases' && o.serviceId && o.futureMovieCount) {
    const svcIdx = services.findIndex(s => s.id === o.serviceId);
    if (svcIdx >= 0) {
      const svc = services[svcIdx];
      const rivalName = state.rivals.find(r => r.id === sellerId)?.name || 'Studio';
      const newDeal = {
        id: uid('bld_'),
        rivalStudioId: sellerId,
        rivalName,
        movieCountTotal: o.futureMovieCount,
        moviesUsed: 0,
        signedWeek: state.week, signedYear: state.year,
        expiresWeek: state.week, expiresYear: state.year + o.years,
        feePaidM: o.priceB * 1000,
        queuedMovies: [],
      };
      services[svcIdx] = { ...svc, bulkLicenseDeals: [...(svc.bulkLicenseDeals || []), newDeal] };
    }
    offers[idx] = { ...o, status: 'accepted', message: `Closed at $${o.priceB.toFixed(2)}B for ${o.futureMovieCount} future releases.` };
    const relationships = { ...state.relationships };
    nudgeRelInPlace(relationships, buyerId, sellerId, 3);
    const buyerName = buyerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === buyerId)?.name || '—';
    const sellerName = sellerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === sellerId)?.name || '—';
    const newsLog = [{ week: state.week, year: state.year, text: `📀 ${buyerName} bulk-licenses ${o.futureMovieCount} future ${sellerName} films for $${o.priceB.toFixed(2)}B / ${o.years}yr.` }, ...state.newsLog].slice(0, 400);
    return { state: { ...state, player, rivals, streamingServices: services, bulkCatalogOffers: offers, relationships, newsLog } };
  }

  // ----- FRANCHISE BULK — license a whole rival franchise (current+future) -----
  if (dealKind === 'franchise_bulk' && o.serviceId && o.franchiseId) {
    const svcIdx = services.findIndex(s => s.id === o.serviceId);
    const fr = state.franchises.find(f => f.id === o.franchiseId);
    if (svcIdx >= 0 && fr) {
      const svc = services[svcIdx];
      const expiresYear = state.year + o.years;
      const released = movies.filter(m => m.franchiseId === fr.id && m.status === 'released' && m.studioId === fr.studioId);
      const existingIds = released.map(m => m.id);
      const tIds = o.tierIds && o.tierIds.length ? [...o.tierIds] : [];
      const licenseEntries = (svc.licensedMovies || []).slice();
      for (const mid of existingIds) {
        if (!svc.catalogMovieIds.includes(mid)) {
          licenseEntries.push({ movieId: mid, tierIds: tIds, feePaid: o.priceB * 1000 / Math.max(1, existingIds.length), yearsLicensed: o.years, expiresWeek: state.week, expiresYear });
        }
      }
      const newDeal = {
        id: uid('bld_'),
        rivalStudioId: fr.studioId,
        rivalName: state.rivals.find(r => r.id === fr.studioId)?.name || 'Studio',
        movieCountTotal: 9999,
        moviesUsed: 0,
        expiresWeek: state.week, expiresYear,
        feePaidM: o.priceB * 1000,
        signedWeek: state.week, signedYear: state.year,
        franchiseId: fr.id,
        queuedMovies: [],
      };
      services[svcIdx] = {
        ...svc,
        catalogMovieIds: [...svc.catalogMovieIds, ...existingIds.filter(id => !svc.catalogMovieIds.includes(id))],
        licensedMovies: licenseEntries,
        bulkLicenseDeals: [...(svc.bulkLicenseDeals || []), newDeal],
      };
      movies = movies.map(m => existingIds.includes(m.id)
        ? { ...m, inStreamingServiceIds: Array.from(new Set([...(m.inStreamingServiceIds || []), svc.id])) }
        : m);
    }
    offers[idx] = { ...o, status: 'accepted', message: `Closed at $${o.priceB.toFixed(2)}B for whole franchise / ${o.years}yr.` };
    const relationships = { ...state.relationships };
    nudgeRelInPlace(relationships, buyerId, sellerId, 3);
    const buyerName = buyerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === buyerId)?.name || '—';
    const sellerName = sellerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === sellerId)?.name || '—';
    const frName = state.franchises.find(f => f.id === o.franchiseId)?.name || 'franchise';
    const newsLog = [{ week: state.week, year: state.year, text: `📀 ${buyerName} bulk-licenses the entire ${frName} (${sellerName}) for $${o.priceB.toFixed(2)}B / ${o.years}yr.` }, ...state.newsLog].slice(0, 400);
    return { state: { ...state, player, rivals, movies, streamingServices: services, bulkCatalogOffers: offers, relationships, newsLog } };
  }

  // ----- CATALOG (default — original behaviour) -----
  if (o.serviceId) {
    const svcIdx = services.findIndex(s => s.id === o.serviceId);
    if (svcIdx >= 0) {
      const svc = services[svcIdx];
      const expW = state.week, expY = state.year + o.years;
      const added = o.movieIds.filter(id => !svc.catalogMovieIds.includes(id));
      const tIds = o.tierIds && o.tierIds.length ? [...o.tierIds] : [];
      const licenseEntries = (svc.licensedMovies || []).slice();
      for (const mid of added) {
        licenseEntries.push({ movieId: mid, tierIds: tIds, feePaid: o.priceB * 1000 / added.length, yearsLicensed: o.years, expiresWeek: expW, expiresYear: expY });
      }
      services[svcIdx] = { ...svc, catalogMovieIds: [...svc.catalogMovieIds, ...added], licensedMovies: licenseEntries };
      if (o.exclusivity) {
        const idsSet = new Set(o.movieIds);
        for (let i = 0; i < services.length; i++) {
          if (i === svcIdx) continue;
          const other = services[i];
          const stripped = other.catalogMovieIds.filter(id => !idsSet.has(id));
          if (stripped.length !== other.catalogMovieIds.length) {
            services[i] = {
              ...other,
              catalogMovieIds: stripped,
              licensedMovies: (other.licensedMovies || []).filter(l => !idsSet.has(l.movieId)),
              exclusiveMovieIds: (other.exclusiveMovieIds || []).filter(id => !idsSet.has(id)),
            };
          }
        }
        movies = movies.map(m => idsSet.has(m.id) ? { ...m, inStreamingServiceIds: [services[svcIdx].id] } : m);
      } else {
        movies = movies.map(m => o.movieIds.includes(m.id)
          ? { ...m, inStreamingServiceIds: Array.from(new Set([...(m.inStreamingServiceIds || []), services[svcIdx].id])) }
          : m);
      }
    }
  }
  offers[idx] = { ...o, status: 'accepted', message: `Closed at $${o.priceB.toFixed(2)}B${o.exclusivity ? ' EXCLUSIVE' : ''}.` };
  const relationships = { ...state.relationships };
  nudgeRelInPlace(relationships, buyerId, sellerId, 3);
  const buyerName = buyerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === buyerId)?.name || '—';
  const sellerName = sellerId === state.player.id ? state.player.name : state.rivals.find(r => r.id === sellerId)?.name || '—';
  const newsLog = [{ week: state.week, year: state.year, text: `📀 ${buyerName} licenses ${o.movieIds.length} ${sellerName} titles${o.exclusivity ? ' (EXCLUSIVE)' : ''} for $${o.priceB.toFixed(2)}B / ${o.years}yr.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player, rivals, movies, streamingServices: services, bulkCatalogOffers: offers, relationships, newsLog } };
}

// =====================================================================
// BACKGROUND AI↔AI TRADES & AI→PLAYER INBOUND OFFERS
// =====================================================================
function aiBackgroundTrades(state: GameState): GameState {
  let s = state;
  // 1) AI → AI franchise trade (small chance per rival per week).
  for (const seller of s.rivals) {
    if (Math.random() > 0.015) continue;
    const sellerFr = s.franchises.filter(f => f.studioId === seller.id);
    if (sellerFr.length < 2) continue; // won't sell its last franchise
    const fr = pick(sellerFr);
    const fair = quoteFranchiseValue(s, fr.id);
    // Pick an affordable rival buyer
    const candidates = s.rivals.filter(r => r.id !== seller.id && r.cash >= fair * 0.9);
    if (!candidates.length) continue;
    const buyer = pick(candidates);
    // Execute silently at ~fair ±5%
    const price = +(fair * (0.95 + Math.random() * 0.15)).toFixed(2);
    const rivalsCopy = s.rivals.slice();
    const si = rivalsCopy.findIndex(r => r.id === seller.id);
    const bi = rivalsCopy.findIndex(r => r.id === buyer.id);
    if (si < 0 || bi < 0) continue;
    rivalsCopy[si] = { ...rivalsCopy[si], cash: +(rivalsCopy[si].cash + price).toFixed(3) };
    rivalsCopy[bi] = { ...rivalsCopy[bi], cash: +(rivalsCopy[bi].cash - price).toFixed(3) };
    const franchises = s.franchises.map(f => f.id === fr.id ? { ...f, studioId: buyer.id } : f);
    const movies = s.movies.map(m => m.franchiseId === fr.id ? { ...m, studioId: buyer.id } : m);
    const news = [{ week: s.week, year: s.year, text: `🏛 ${seller.name} sells ${fr.name} to ${buyer.name} for $${price}B.` }, ...s.newsLog].slice(0, 400);
    s = { ...s, rivals: rivalsCopy, franchises, movies, newsLog: news };
  }
  // 2) AI → Player: buy offer on one of player's franchises (rare).
  const playerFr = s.franchises.filter(f => f.studioId === s.player.id);
  if (playerFr.length > 0 && Math.random() < 0.015) {
    const fr = pick(playerFr);
    const fair = quoteFranchiseValue(s, fr.id);
    const bidders = s.rivals.filter(r => r.cash >= fair * 0.7 && r.rating >= 2);
    if (bidders.length) {
      const bidder = pick(bidders);
      const offerPrice = +(fair * (0.85 + Math.random() * 0.2)).toFixed(2);
      const offer: FranchiseOffer = {
        id: uid('fo_'), kind: 'buy',
        franchiseId: fr.id, fromStudioId: bidder.id, toStudioId: s.player.id,
        priceB: offerPrice, round: 0, maxRounds: 3, lastActor: 'from', status: 'pending',
        createdWeek: s.week, createdYear: s.year,
        message: `"${bidder.name} wants to acquire ${fr.name}. $${offerPrice}B on the table."`,
        history: [{ actor: 'from', priceB: offerPrice, week: s.week, year: s.year }],
      };
      s = { ...s, franchiseOffers: [...(s.franchiseOffers || []), offer] };
    }
  }
  // 3) AI → Player: AI wants to buy a BUNDLE from player's released catalog (for their own streaming).
  if (Math.random() < 0.015) {
    const playerReleased = s.movies.filter(m => m.studioId === s.player.id && m.status === 'released');
    if (playerReleased.length >= 3) {
      const rival = pick(s.rivals.filter(r => (s.streamingServices || []).some(svc => svc.studioId === r.id)));
      if (rival) {
        const svc = (s.streamingServices || []).find(sv => sv.studioId === rival.id);
        if (svc) {
          const n = Math.min(playerReleased.length, randInt(3, 6));
          const picked: Movie[] = [];
          const pool = [...playerReleased];
          for (let i = 0; i < n && pool.length; i++) {
            const ix = Math.floor(Math.random() * pool.length);
            picked.push(pool[ix]); pool.splice(ix, 1);
          }
          const years = randInt(2, 5);
          const fair = quoteBulkCatalogValue(s, picked.map(m => m.id), years);
          const offerPrice = +(fair * (0.8 + Math.random() * 0.2)).toFixed(3);
          const offer: BulkCatalogOffer = {
            id: uid('bco_'),
            fromStudioId: rival.id, toStudioId: s.player.id,
            movieIds: picked.map(m => m.id), priceB: offerPrice, years,
            serviceId: svc.id,
            round: 0, maxRounds: 3, lastActor: 'from', status: 'pending',
            createdWeek: s.week, createdYear: s.year,
            message: `"${rival.name} wants a ${n}-title catalog pack for ${svc.name}. $${offerPrice}B / ${years}yr."`,
            history: [{ actor: 'from', priceB: offerPrice, week: s.week, year: s.year }],
          };
          s = { ...s, bulkCatalogOffers: [...(s.bulkCatalogOffers || []), offer] };
        }
      }
    }
  }
  return s;
}

export function tickWeek(state: GameState): GameState {
  let s = simulateWeek(state);
  // V42 — Backfill new procedural TV channels/providers when seed expands across versions.
  s = ensureTVNetworks(s);
  s = ensureCableProviders(s);
  s = spawnFestivalIfDue(s);
  s = aiFestivalTick(s);
  s = resolveFestivalLots(s);
  // External IP licensing: roll a weekly chance to spawn an inbound offer or outbound bid.
  // Cap pending offers to avoid backlog.
  const pendingOffers = (s.externalIPOffers || []).filter(o => o.status === 'pending').length;
  if (pendingOffers < 4 && Math.random() < 0.18) s = generateInboundIPOffer(s);
  const pendingBids = (s.outboundIPBids || []).filter(b => b.status === 'pending').length;
  if (pendingBids < 4 && Math.random() < 0.22) s = generateOutboundBid(s);
  s = processOutboundRoyalties(s);
  // V30 — Tick player-owned cinemas (opex, revenue, scheduled run advancement)
  s = tickOwnedCinemas(s);
  // NEW — Cinema Supplier Deals: process kickbacks + revenue routing from rival releases.
  s = tickCinemaSupplierDeals(s);
  // V35 — TV Networks: weekly franchise-boost + streaming-popularity audience split.
  s = tickTVNetworks(s);
  // V35 — TV Series production & releases
  s = tickTVSeries(s);
  // V35 — Channel pack subscriber dynamics & revenue
  s = tickChannelPacks(s);
  // V36 — Cable Provider recurring carriage revenue
  s = tickCableCarriage(s);
  // V38 — AI WORLD DYNAMICS: rivals license to each other, trade franchises,
  // launch/shut streaming services, produce TV series, get licensed by TV networks,
  // and play strategic exclusivity. Player keeps cinema-building + channel-launch monopolies.
  s = tickAIWorldDynamics(s);
  // V30 — Cinema Manager: every 4 weeks, scan for new deals to propose
  if (s.week % 4 === 0 && (s.cinemaProposals || []).length < 6) {
    s = generateCinemaProposals(s).state;
  }
  // V30 — Marketing Manager: re-optimise auto-managed movies (in case audience shifted)
  if (s.week % 8 === 0) {
    const movies = s.movies.map(m => {
      if (m.studioId !== s.player.id || m.status !== 'production' || !m.marketingAuto) return m;
      const allocation = computeOptimalMarketingAllocation(m, s.audience);
      return { ...m, marketingAllocation: allocation };
    });
    s = { ...s, movies };
  }
  // Tick corporate turn-based gaming tycoon division subsystems
  s = tickGamingDivision(s);
  // V43 — Finalize the weekly ledger: snapshot to history + fold into pendingRecap.
  s = finalizeWeek(s);
  return s;
}

// =====================================================================
// FESTIVALS — spawn, auction, bidding
// =====================================================================

function spawnFestivalIfDue(state: GameState): GameState {
  const existing = state.festivals || [];
  const tpl = FESTIVAL_TEMPLATES.find(t => t.week === state.week);
  if (!tpl) return state;
  // Already spawned this year?
  if (existing.find(f => f.name === tpl.name && f.year === state.year)) return state;
  // Generate 3 indie AI-produced lots (budget < 200M, released recently ideally). Build synthetic indie movies.
  const lots: FestivalLot[] = [];
  const rivals = state.rivals;
  for (let i = 0; i < 3; i++) {
    const studio = pick(rivals);
    const genre = pick(GENRES);
    const runtime = randInt(85, 135);
    const availablePool = state.talents.filter(t => !t.retired && !t.inProductionMovieId);
    const wr = availablePool.filter(t => t.role === 'writer')[0] || state.talents.find(t => t.role === 'writer');
    const dir = availablePool.filter(t => t.role === 'director')[0] || state.talents.find(t => t.role === 'director');
    const actor = availablePool.find(t => t.role === 'actor') || state.talents.find(t => t.role === 'actor');
    const actress = availablePool.find(t => t.role === 'actress') || state.talents.find(t => t.role === 'actress');
    if (!wr || !dir || !actor || !actress) continue;
    const budget = randInt(15, 90);
    const usedTitles = new Set([...state.movies.map(m => m.title), ...state.franchises.map(f => f.name)]);
    const fname = genFranchiseName(usedTitles);
    // The AI studio owns this already-made film.
    const movie: Movie = {
      id: uid('mfest_'), title: fname, type: genre as any, genre,
      plotArc: pick(['Man in a Hole', 'Icarus', 'Cinderella'] as any),
      rating: pick(['PG-13', 'R', 'PG'] as any), runtime, brand: 'Original',
      franchiseId: undefined,
      studioId: studio.id, writerId: wr.id, directorId: dir.id,
      cast: [
        { talentId: actor.id, role: 'lead_actor', dealType: 'middle', contractKind: 'single', salary: actor.salary, boPercent: 2 },
        { talentId: actress.id, role: 'lead_actress', dealType: 'middle', contractKind: 'single', salary: actress.salary, boPercent: 2 },
      ],
      budget, marketingBudget: Math.round(budget * 0.4), weeksToRelease: 0,
      status: 'released', criticScore: randInt(65, 92), boxOffice: 0, weeklyBO: [],
      releaseWeek: state.week, releaseYear: state.year,
      iconKey: GENRE_ICON[genre].icon, iconBg: GENRE_ICON[genre].bg,
      awards: 0, plot: genPlot(),
      fatiguePenalty: 0, chemistryBonus: 0, holidayBonus: 0,
      releaseStrategy: 'theatrical', inStreamingServiceIds: [],
      reviews: generateReviews(80),
    };
    lots.push({
      id: uid('lot_'), movieId: movie.id,
      startingBidM: +(budget * 1.2).toFixed(1),
      currentBidM: +(budget * 1.2).toFixed(1),
      currentBidderStudioId: null, bidLog: [], sold: false,
    });
    // Add the indie movie to world movie list so it has detail pages
    state = { ...state, movies: [...state.movies, movie] };
  }

  const fest: Festival = {
    id: uid('fest_'), name: tpl.name, season: tpl.season, region: tpl.region,
    week: state.week, year: state.year, status: 'active', lots,
  };
  const newsLog = [{ week: state.week, year: state.year, text: `🎬 ${tpl.name} opens in ${tpl.region} — 3 indie titles up for auction.` }, ...state.newsLog].slice(0, 400);
  return { ...state, festivals: [...existing, fest], newsLog };
}

// Player submits a bid on a festival lot. Must exceed currentBid by at least 1M and have cash.
export function placeFestivalBid(state: GameState, festivalId: string, lotId: string, bidM: number): { state: GameState; error?: string } {
  const fests = state.festivals || [];
  const fIdx = fests.findIndex(f => f.id === festivalId);
  if (fIdx < 0) return { state, error: 'Festival not found.' };
  const fest = fests[fIdx];
  if (fest.status !== 'active') return { state, error: 'Festival is closed.' };
  const lIdx = fest.lots.findIndex(l => l.id === lotId);
  if (lIdx < 0) return { state, error: 'Lot not found.' };
  const lot = fest.lots[lIdx];
  if (lot.sold) return { state, error: 'Lot already sold.' };
  if (bidM < lot.currentBidM + 1) return { state, error: `Minimum raise is $1M. Bid at least $${(lot.currentBidM + 1).toFixed(1)}M.` };
  const bidB = bidM / 1000;
  if (state.player.cash < bidB) return { state, error: `Need $${bidM.toFixed(1)}M cash (have $${(state.player.cash * 1000).toFixed(1)}M).` };
  const updatedLot: FestivalLot = {
    ...lot, currentBidM: +bidM.toFixed(1), currentBidderStudioId: state.player.id,
    bidLog: [...lot.bidLog, { studioId: state.player.id, amountM: +bidM.toFixed(1), week: state.week, year: state.year }],
  };
  // AI counter: each AI studio may outbid with a probability scaled by rating and cash. Only one AI bids per round.
  let finalLot = updatedLot;
  const rivalsWillingness = state.rivals
    .filter(r => r.cash * 1000 > bidM * 1.1)
    .map(r => ({ r, score: r.rating * Math.random() + Math.random() }))
    .sort((a, b) => b.score - a.score);
  if (rivalsWillingness.length && Math.random() < 0.65) {
    const contender = rivalsWillingness[0].r;
    const raise = +(bidM * (1.05 + Math.random() * 0.12)).toFixed(1);
    finalLot = {
      ...finalLot, currentBidM: raise, currentBidderStudioId: contender.id,
      bidLog: [...finalLot.bidLog, { studioId: contender.id, amountM: raise, week: state.week, year: state.year }],
    };
  }
  const festivals = fests.slice();
  festivals[fIdx] = { ...fest, lots: fest.lots.map((l, i) => i === lIdx ? finalLot : l) };
  return { state: { ...state, festivals } };
}

// Close a festival lot — award to the highest bidder. Called 3 weeks after festival opens.
function resolveFestivalLots(state: GameState): GameState {
  const fests = state.festivals || [];
  let movies = state.movies.slice();
  let player = { ...state.player };
  let rivals = state.rivals.slice();
  const news: typeof state.newsLog = [];
  const updatedFests = fests.map(fest => {
    if (fest.status !== 'active') return fest;
    const weeksOld = (state.year - fest.year) * WEEKS_PER_YEAR + (state.week - fest.week);
    if (weeksOld < 3) return fest;
    // Close: finalize each lot
    const lots = fest.lots.map(l => {
      if (l.sold) return l;
      const winner = l.currentBidderStudioId;
      if (!winner) return { ...l, sold: true }; // unsold
      const movie = movies.find(m => m.id === l.movieId);
      if (!movie) return { ...l, sold: true };
      const priceB = l.currentBidM / 1000;
      if (winner === player.id) {
        if (player.cash < priceB) return { ...l, sold: true };
        player = { ...player, cash: +(player.cash - priceB).toFixed(3) };
        // Transfer ownership to player
        movies = movies.map(m => m.id === movie.id ? { ...m, studioId: player.id, festivalLotId: l.id } : m);
        news.push({ week: state.week, year: state.year, text: `🏆 ${player.name} wins ${movie.title} at ${fest.name} ($${l.currentBidM.toFixed(1)}M).` });
      } else {
        const rIdx = rivals.findIndex(r => r.id === winner);
        if (rIdx >= 0 && rivals[rIdx].cash >= priceB) {
          rivals[rIdx] = { ...rivals[rIdx], cash: +(rivals[rIdx].cash - priceB).toFixed(3) };
          movies = movies.map(m => m.id === movie.id ? { ...m, studioId: winner, festivalLotId: l.id } : m);
          news.push({ week: state.week, year: state.year, text: `${rivals[rIdx].name} wins ${movie.title} at ${fest.name} ($${l.currentBidM.toFixed(1)}M).` });
        }
      }
      return { ...l, sold: true, winnerStudioId: winner, finalPriceM: l.currentBidM };
    });
    return { ...fest, status: 'concluded' as const, lots, closedAt: { week: state.week, year: state.year } };
  });
  const newsLog = [...news, ...state.newsLog].slice(0, 400);
  return { ...state, festivals: updatedFests, movies, player, rivals, newsLog };
}

// =====================================================================
// CINEMAS — deal generation & signing
// =====================================================================

// Player signs a cinema deal at the specified terms. Terms must be within negotiation range.
export function signCinemaDeal(state: GameState, chainId: string, years: number, openShare: number, lateShare: number): { state: GameState; error?: string; counter?: { openShare: number; lateShare: number; years: number; reason: string } } {
  const chain = CINEMA_CHAINS.find(c => c.id === chainId);
  if (!chain) return { state, error: 'Chain not found.' };
  // Reject if a non-expired deal with this chain already exists for the player.
  const existing = (state.cinemaDeals || []).find(d => d.chainId === chainId && d.studioId === state.player.id && (d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek) > (state.year * WEEKS_PER_YEAR + state.week));
  if (existing) return { state, error: `You already have an active deal with ${chain.name}.` };
  if (years < 5 || years > 10) return { state, error: 'Deal length must be 5–10 years.' };
  const range = cinemaDealRange(chain.reputation, state.player.rating);
  if (openShare < range.minOpen || openShare > range.maxOpen) return { state, error: `Opening share must be between ${(range.minOpen * 100).toFixed(0)}–${(range.maxOpen * 100).toFixed(0)}%.` };
  if (lateShare < range.minLate || lateShare > range.maxLate) return { state, error: `Late share must be between ${(range.minLate * 100).toFixed(0)}–${(range.maxLate * 100).toFixed(0)}%.` };

  // V30 — Acceptance: scaled by how studio-favoured the terms are; counter is logical
  // (midpoint between player's offer and a fair anchor that sits at 50% of the range).
  const openPos = (openShare - range.minOpen) / (range.maxOpen - range.minOpen || 1); // 0 = chain-favoured, 1 = studio-favoured
  const latePos = (lateShare - range.minLate) / (range.maxLate - range.minLate || 1);
  const aggression = openPos * 0.55 + latePos * 0.45;
  const pAccept = Math.max(0.05, 1 - aggression * 0.85);
  if (Math.random() > pAccept) {
    // Counter at midpoint between player offer and fair anchor (50% of range = even split)
    const fairOpen = range.minOpen + (range.maxOpen - range.minOpen) * 0.50;
    const fairLate = range.minLate + (range.maxLate - range.minLate) * 0.50;
    const counterOpen = +((openShare * 0.4 + fairOpen * 0.6)).toFixed(3);
    const counterLate = +((lateShare * 0.4 + fairLate * 0.6)).toFixed(3);
    // V30 — Years: chains push for shorter terms when player's terms are aggressive
    const counterYears = aggression > 0.65 ? Math.max(5, years - 2) : years;
    const reason = openPos > latePos
      ? `opening ${(openShare * 100).toFixed(0)}% too high — we'll meet at ${(counterOpen * 100).toFixed(0)}%`
      : `late ${(lateShare * 100).toFixed(0)}% too high — we'll meet at ${(counterLate * 100).toFixed(0)}%`;
    const newsLog = [{ week: state.week, year: state.year, text: `${chain.name} counter-offers ${state.player.name}: opening ${(counterOpen * 100).toFixed(0)}% / late ${(counterLate * 100).toFixed(0)}% / ${counterYears}y (${reason}).` }, ...state.newsLog].slice(0, 400);
    return { state: { ...state, newsLog }, counter: { openShare: counterOpen, lateShare: counterLate, years: counterYears, reason } };
  }

  const expW = state.week;
  const expY = state.year + years;
  const deal: CinemaDeal = {
    id: uid('cd_'), chainId: chain.id, studioId: state.player.id, region: chain.region as CinemaRegion, years,
    signedWeek: state.week, signedYear: state.year, expiresWeek: expW, expiresYear: expY,
    openingStudioShare: +openShare.toFixed(3), lateStudioShare: +lateShare.toFixed(3),
    guaranteedTheaters: Math.round(chain.theaters * (0.55 + state.player.rating * 0.07)),
  };
  const cinemaDeals = [...(state.cinemaDeals || []), deal];
  const newsLog = [{ week: state.week, year: state.year, text: `${state.player.name} signs a ${years}-year deal with ${chain.name} (${chain.region}) — opening ${(openShare * 100).toFixed(0)}% / late ${(lateShare * 100).toFixed(0)}%.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, cinemaDeals, newsLog } };
}

// Average cinema-share modifier the player gets on a movie release given their active deals.
// If no deals: return a default 0.55 open / 0.35 late to simulate weak distribution.
export function playerCinemaShareForWeek(state: GameState, weekIdx: number): number {
  const deals = (state.cinemaDeals || []).filter(d => {
    if (d.studioId !== state.player.id) return false;
    const endTotal = d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek;
    const nowTotal = state.year * WEEKS_PER_YEAR + state.week;
    return endTotal >= nowTotal;
  });
  if (!deals.length) return cinemaStudioShareForWeek(weekIdx, 0.55, 0.35);
  const avgOpen = deals.reduce((a, d) => a + d.openingStudioShare, 0) / deals.length;
  const avgLate = deals.reduce((a, d) => a + d.lateStudioShare, 0) / deals.length;
  return cinemaStudioShareForWeek(weekIdx, avgOpen, avgLate);
}

// =====================================================================
// PLAYER-WRITABLE MOVIE DESCRIPTION
// =====================================================================
export function setMovieDescription(state: GameState, movieId: string, description: string): { state: GameState; error?: string } {
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'Not your movie.' };
  const movies = state.movies.map(m => m.id === movieId ? { ...m, userDescription: description } : m);
  return { state: { ...state, movies } };
}


// =====================================================================
// EXTERNAL IP LICENSING — INBOUND (licensors offer IPs to studios)
// =====================================================================
export interface IPOfferTerms { ipId: string; feeM: number; boPercent: number; merchPercent: number; years: number; packs: number; exclusivity: boolean; sublicensable: boolean; }
export function quoteIPOffer(state: GameState, ipId: string, terms: Omit<IPOfferTerms, 'ipId'>): { feeM: number; error?: string } {
  const ip = (state.externalIPs || []).find(i => i.id === ipId);
  if (!ip) return { feeM: 0, error: 'IP not found.' };
  return { feeM: quoteIPLicenseFee(ip, terms) };
}

// Generate one inbound IP offer, targeting the player. Called periodically by tickWeek.
export function generateInboundIPOffer(state: GameState): GameState {
  // V41 — Streaming-series IPs scrapped (per user feedback); skip them as inbound offers
  const ips = (state.externalIPs || []).filter(ip => !ip.exclusiveLicenseeStudioId && ip.category !== 'streaming');
  if (!ips.length) return state;
  // Skip IPs the player already has an active license on (don't double-up).
  const myActive = (state.ownedIPLicenses || []).filter(l => l.studioId === state.player.id);
  const myActiveIpIds = new Set(myActive.map(l => l.ipId));
  const candidates = ips.filter(ip => !myActiveIpIds.has(ip.id));
  if (!candidates.length) return state;
  const ip = candidates[randInt(0, candidates.length - 1)];
  const licensor = (state.externalLicensors || []).find(l => l.id === ip.licensorId);
  if (!licensor) return state;

  // AI proposes terms scaled to the IP's popularity.
  const years = randInt(2, 6);
  const packs = randInt(1, 4);
  const exclusivity = ip.popularity >= 70 ? Math.random() < 0.4 : Math.random() < 0.2;
  const sublicensable = Math.random() < 0.25;
  const boPercent = +(2 + Math.random() * 6).toFixed(1);   // 2–8%
  const merchPercent = +(8 + Math.random() * 14).toFixed(1); // 8–22%
  const feeM = quoteIPLicenseFee(ip, { years, packs, boPercent, merchPercent, exclusivity, sublicensable });

  const offer: import('./types').ExternalIPOffer = {
    id: uid('ipo_'),
    fromStudioId: licensor.id, // store licensor in fromStudioId
    toStudioId: state.player.id,
    round: 0, maxRounds: 3,
    lastActor: 'from',
    status: 'pending',
    createdWeek: state.week, createdYear: state.year,
    history: [{ actor: 'from', priceB: feeM / 1000, week: state.week, year: state.year }],
    ipId: ip.id,
    feeM, boPercent, merchPercent, years, packs, exclusivity, sublicensable,
  };
  const news = [{ week: state.week, year: state.year, text: `📜 ${licensor.name} offers ${state.player.name} the ${ip.name} IP rights — ${packs} films / ${years}y / $${feeM.toFixed(1)}M.` }, ...state.newsLog].slice(0, 400);
  return { ...state, externalIPOffers: [...(state.externalIPOffers || []), offer], newsLog: news };
}

export function counterIPOffer(state: GameState, offerId: string, counter: { feeM?: number; boPercent?: number; merchPercent?: number; years?: number; packs?: number; exclusivity?: boolean; sublicensable?: boolean }): { state: GameState; error?: string } {
  const offerIdx = (state.externalIPOffers || []).findIndex(o => o.id === offerId);
  if (offerIdx < 0) return { state, error: 'Offer not found.' };
  const offer = state.externalIPOffers![offerIdx];
  if (offer.status !== 'pending') return { state, error: 'Offer not pending.' };
  // Apply counter (player→licensor) and run AI auto-evaluation.
  const newTerms = {
    feeM: counter.feeM ?? offer.feeM,
    boPercent: counter.boPercent ?? offer.boPercent,
    merchPercent: counter.merchPercent ?? offer.merchPercent,
    years: counter.years ?? offer.years,
    packs: counter.packs ?? offer.packs,
    exclusivity: counter.exclusivity ?? offer.exclusivity,
    sublicensable: counter.sublicensable ?? offer.sublicensable,
  };
  const ip = state.externalIPs!.find(i => i.id === offer.ipId)!;
  const fairFee = quoteIPLicenseFee(ip, newTerms);
  // V37 — Symmetric pull-and-push.
  // AI is the LICENSOR (seller of rights) — wants HIGH feeM, HIGH royalty %. Player counters DOWN; AI must move DOWN toward player.
  // Anchor: AI's previous position is the OFFER'S CURRENT terms (offer.feeM, offer.boPercent, offer.merchPercent).
  const aiPrevFee = offer.feeM;
  const aiPrevBo = offer.boPercent;
  const aiPrevMerch = offer.merchPercent;
  // Auto-accept if player matched/exceeded AI's last counter on the key dimension (fee), AND BO/merch are within 1pp.
  if (newTerms.feeM >= aiPrevFee - 0.001 && newTerms.boPercent >= aiPrevBo - 0.5 && newTerms.merchPercent >= aiPrevMerch - 0.5) {
    const offers = state.externalIPOffers!.slice();
    offers[offerIdx] = { ...offer, ...newTerms, status: 'pending', round: offer.round + 1, lastActor: 'to', history: [...offer.history, { actor: 'to', priceB: newTerms.feeM / 1000, week: state.week, year: state.year }] };
    return { state: { ...state, externalIPOffers: offers, newsLog: [{ week: state.week, year: state.year, text: `📜 ${ip.name} licensor agrees to revised terms — accept to finalise.` }, ...state.newsLog].slice(0, 400) } };
  }
  // AI's acceptance floor: 88% of fair on fee, fair-1.5pp on royalties.
  const playerFairBo = 2 + (ip.popularity / 100) * 5;
  const playerFairMerch = 8 + (ip.popularity / 100) * 12;
  const feeFloor = fairFee * 0.88;
  const boFloor = Math.max(0, playerFairBo - 1.5);
  const merchFloor = Math.max(0, playerFairMerch - 2);
  // Within floor — AI happily accepts.
  if (newTerms.feeM >= feeFloor && newTerms.boPercent >= boFloor && newTerms.merchPercent >= merchFloor) {
    const offers = state.externalIPOffers!.slice();
    offers[offerIdx] = { ...offer, ...newTerms, status: 'pending', round: offer.round + 1, lastActor: 'to', history: [...offer.history, { actor: 'to', priceB: newTerms.feeM / 1000, week: state.week, year: state.year }] };
    return { state: { ...state, externalIPOffers: offers, newsLog: [{ week: state.week, year: state.year, text: `📜 ${ip.name} licensor agrees to revised terms — accept to finalise.` }, ...state.newsLog].slice(0, 400) } };
  }
  const offers = state.externalIPOffers!.slice();
  // Counter: move 50% from AI's anchor toward player's offer; never cross AI's own anchor or floor.
  const compromise = (anchor: number, playerVal: number, floor: number) => {
    let v = anchor + (playerVal - anchor) * 0.5;
    v = Math.max(v, floor);     // never below floor
    v = Math.min(v, anchor);    // never raise above previous AI position
    return v;
  };
  const aiCounter = {
    ...newTerms,
    feeM: +compromise(aiPrevFee, newTerms.feeM, feeFloor).toFixed(1),
    boPercent: +compromise(aiPrevBo, newTerms.boPercent, boFloor).toFixed(1),
    merchPercent: +compromise(aiPrevMerch, newTerms.merchPercent, merchFloor).toFixed(1),
  };
  offers[offerIdx] = { ...offer, ...aiCounter, status: 'pending', round: offer.round + 2, lastActor: 'from', history: [...offer.history, { actor: 'to', priceB: newTerms.feeM / 1000, week: state.week, year: state.year }, { actor: 'from', priceB: aiCounter.feeM / 1000, week: state.week, year: state.year }] };
  return { state: { ...state, externalIPOffers: offers, newsLog: [{ week: state.week, year: state.year, text: `↩ ${ip.name} licensor counters: $${aiCounter.feeM.toFixed(1)}M / ${aiCounter.boPercent.toFixed(1)}% BO / ${aiCounter.merchPercent.toFixed(1)}% merch / ${newTerms.years}y / ${newTerms.packs} packs.` }, ...state.newsLog].slice(0, 400) } };
}

export function acceptIPOffer(state: GameState, offerId: string): { state: GameState; error?: string } {
  const offerIdx = (state.externalIPOffers || []).findIndex(o => o.id === offerId);
  if (offerIdx < 0) return { state, error: 'Offer not found.' };
  const offer = state.externalIPOffers![offerIdx];
  if (offer.status !== 'pending') return { state, error: 'Offer not pending.' };
  if (state.player.cash * 1000 < offer.feeM) return { state, error: `Need $${offer.feeM.toFixed(1)}M cash (have $${(state.player.cash * 1000).toFixed(1)}M).` };
  const ip = state.externalIPs!.find(i => i.id === offer.ipId)!;
  const license: import('./types').OwnedIPLicense = {
    id: uid('ipl_'),
    ipId: ip.id,
    studioId: state.player.id,
    feePaidM: offer.feeM,
    boPercent: offer.boPercent,
    merchPercent: offer.merchPercent,
    signedWeek: state.week, signedYear: state.year,
    expiresWeek: state.week, expiresYear: state.year + offer.years,
    packs: offer.packs, packsUsed: 0,
    exclusivity: offer.exclusivity, sublicensable: offer.sublicensable,
  };
  const offers = state.externalIPOffers!.slice();
  offers[offerIdx] = { ...offer, status: 'accepted' };
  let externalIPs = state.externalIPs!;
  if (offer.exclusivity) {
    externalIPs = externalIPs.map(i => i.id === ip.id ? { ...i, exclusiveLicenseeStudioId: state.player.id } : i);
  }
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - offer.feeM / 1000).toFixed(3) };
  const news = [{ week: state.week, year: state.year, text: `✅ ${state.player.name} licenses ${ip.name} from ${state.externalLicensors!.find(l => l.id === ip.licensorId)?.name} — ${offer.packs} films / ${offer.years}y${offer.exclusivity ? ' (EXCLUSIVE)' : ''}.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, externalIPOffers: offers, externalIPs, ownedIPLicenses: [...(state.ownedIPLicenses || []), license], player: updatedPlayer, newsLog: news } };
}

export function rejectIPOffer(state: GameState, offerId: string): { state: GameState } {
  const offers = (state.externalIPOffers || []).map(o => o.id === offerId ? { ...o, status: 'rejected' as const } : o);
  return { state: { ...state, externalIPOffers: offers } };
}

// =====================================================================
// EXTERNAL IP LICENSING — OUTBOUND (player lists franchise/movie for spin-offs)
// =====================================================================
export function createOutboundIPListing(state: GameState, args: { sourceFranchiseId?: string; sourceMovieId?: string; category: import('./types').IPCategory; exclusivity?: boolean; sublicensable?: boolean }): { state: GameState; error?: string; listingId?: string } {
  if (!args.sourceFranchiseId && !args.sourceMovieId) return { state, error: 'Pick a franchise or movie.' };
  if (args.sourceFranchiseId) {
    const fr = state.franchises.find(f => f.id === args.sourceFranchiseId);
    if (!fr) return { state, error: 'Franchise not found.' };
    if (fr.studioId !== state.player.id) return { state, error: 'Only your own franchise can be listed.' };
  }
  if (args.sourceMovieId) {
    const m = state.movies.find(mm => mm.id === args.sourceMovieId);
    if (!m) return { state, error: 'Movie not found.' };
    if (m.studioId !== state.player.id) return { state, error: 'Only your own movie can be listed.' };
  }
  const listing: import('./types').OutboundIPListing = {
    id: uid('out_'),
    studioId: state.player.id,
    sourceFranchiseId: args.sourceFranchiseId,
    sourceMovieId: args.sourceMovieId,
    category: args.category,
    status: 'open',
    createdWeek: state.week, createdYear: state.year,
    exclusivity: !!args.exclusivity,
    sublicensable: !!args.sublicensable,
  };
  const termTag = args.exclusivity ? ' (exclusive)' : (args.sublicensable ? ' (sublicensable)' : '');
  const news = [{ week: state.week, year: state.year, text: `📤 ${state.player.name} lists IP for ${args.category} spin-offs${termTag} — bids invited.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, outboundIPListings: [...(state.outboundIPListings || []), listing], newsLog: news }, listingId: listing.id };
}

export function generateOutboundBid(state: GameState): GameState {
  const open = (state.outboundIPListings || []).filter(l => l.status === 'open');
  if (!open.length) return state;
  // Pick a random open listing
  const listing = open[randInt(0, open.length - 1)];
  // Find a licensor in the same category
  const matchingLicensors = (state.externalLicensors || []).filter(l => l.category === listing.category);
  if (!matchingLicensors.length) return state;
  const licensor = matchingLicensors[randInt(0, matchingLicensors.length - 1)];
  // Compute source attractiveness
  let popBase = 50;
  if (listing.sourceFranchiseId) {
    const fr = state.franchises.find(f => f.id === listing.sourceFranchiseId);
    if (fr) popBase = fr.popularity;
  } else if (listing.sourceMovieId) {
    const m = state.movies.find(mm => mm.id === listing.sourceMovieId);
    if (m) popBase = Math.min(95, 30 + Math.min(60, m.boxOffice * 12) + (m.criticScore || 60) * 0.2);
  }
  const years = randInt(2, 6);
  // Exclusivity bumps fee +60%, sublicensable shaves -10% (faster turnover)
  const exclMult = listing.exclusivity ? 1.6 : 1.0;
  const subMult = listing.sublicensable ? 0.9 : 1.0;
  const feeM = +((popBase / 100) * 30 * (1 + (years - 1) * 0.18) * (licensor.reputation / 80) * exclMult * subMult).toFixed(1);
  const royaltyPercent = +(2 + Math.random() * 6).toFixed(1);
  const bid: import('./types').OutboundIPBid = {
    id: uid('bid_'),
    listingId: listing.id,
    licensorId: licensor.id,
    feeM, royaltyPercent, years,
    status: 'pending',
    createdWeek: state.week, createdYear: state.year,
  };
  const news = [{ week: state.week, year: state.year, text: `📥 ${licensor.name} bids on your IP listing — $${feeM.toFixed(1)}M + ${royaltyPercent}% royalty / ${years}y.` }, ...state.newsLog].slice(0, 400);
  return { ...state, outboundIPBids: [...(state.outboundIPBids || []), bid], newsLog: news };
}

export function acceptOutboundBid(state: GameState, bidId: string): { state: GameState; error?: string } {
  const bid = (state.outboundIPBids || []).find(b => b.id === bidId);
  if (!bid) return { state, error: 'Bid not found.' };
  if (bid.status !== 'pending') return { state, error: 'Bid not pending.' };
  const listing = (state.outboundIPListings || []).find(l => l.id === bid.listingId);
  if (!listing) return { state, error: 'Listing not found.' };
  // Pay upfront fee, set up royalty queue
  const updatedPlayer = { ...state.player, cash: +(state.player.cash + bid.feeM / 1000).toFixed(3) };
  // Royalty: paid quarterly; estimate per-payment as feeM × royalty% / 4 each quarter for `years`.
  const perPaymentM = +((bid.feeM * bid.royaltyPercent / 100) / 4).toFixed(2);
  const royEntry = {
    bidId: bid.id,
    nextPayWeek: Math.min(WEEKS_PER_YEAR, state.week + 13),
    nextPayYear: state.year,
    perPaymentM,
    expiresWeek: state.week, expiresYear: state.year + bid.years,
  };
  // Update bids: this one accepted, others on same listing rejected.
  const bids = (state.outboundIPBids || []).map(b => {
    if (b.id === bid.id) return { ...b, status: 'accepted' as const };
    if (b.listingId === bid.listingId && b.status === 'pending') return { ...b, status: 'rejected' as const };
    return b;
  });
  const listings = (state.outboundIPListings || []).map(l => l.id === listing.id ? { ...l, status: 'closed' as const } : l);
  const queue = [...(state.outboundRoyaltyQueue || []), royEntry];
  const licensor = state.externalLicensors!.find(l => l.id === bid.licensorId);
  const news = [{ week: state.week, year: state.year, text: `✅ Sold ${listing.category} rights to ${licensor?.name} — $${bid.feeM.toFixed(1)}M + ${bid.royaltyPercent}% royalty.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, outboundIPBids: bids, outboundIPListings: listings, outboundRoyaltyQueue: queue, player: updatedPlayer, newsLog: news } };
}

export function rejectOutboundBid(state: GameState, bidId: string): { state: GameState } {
  const bids = (state.outboundIPBids || []).map(b => b.id === bidId ? { ...b, status: 'rejected' as const } : b);
  return { state: { ...state, outboundIPBids: bids } };
}

// Player counters an external agency's bid on their outbound listing. AI may accept or split-the-difference reject;
// otherwise it returns a softened counter (within 50% of midpoint) and stays pending.
export function counterOutboundBid(state: GameState, bidId: string, terms: { feeM?: number; royaltyPercent?: number; years?: number }): { state: GameState; error?: string } {
  const bids = (state.outboundIPBids || []).slice();
  const idx = bids.findIndex(b => b.id === bidId);
  if (idx < 0) return { state, error: 'Bid not found.' };
  const bid = bids[idx];
  if (bid.status !== 'pending') return { state, error: 'Bid not pending.' };
  const newFee = typeof terms.feeM === 'number' ? terms.feeM : bid.feeM;
  const newRoy = typeof terms.royaltyPercent === 'number' ? terms.royaltyPercent : bid.royaltyPercent;
  const newYears = typeof terms.years === 'number' ? terms.years : bid.years;
  if (newFee <= 0 || newRoy < 0 || newYears < 1 || newYears > 10) return { state, error: 'Invalid counter terms.' };
  // AI evaluates: how much richer is the counter vs original bid?
  const richer = (newFee / bid.feeM) * 0.6 + (newRoy / Math.max(1, bid.royaltyPercent)) * 0.3 + (newYears / Math.max(1, bid.years)) * 0.1;
  // richer ≤ 1.10 → accept (≤10% richer)
  // richer ≤ 1.30 → AI counter at midpoint
  // richer > 1.30 → reject (too greedy)
  let news: { week: number; year: number; text: string }[] = [];
  const licensor = state.externalLicensors?.find(l => l.id === bid.licensorId);
  if (richer <= 1.10) {
    bids[idx] = { ...bid, feeM: +newFee.toFixed(1), royaltyPercent: +newRoy.toFixed(1), years: newYears };
    news = [{ week: state.week, year: state.year, text: `🤝 ${licensor?.name || 'Agency'} accepts your terms — bid revised to $${newFee.toFixed(1)}M / ${newRoy.toFixed(1)}% / ${newYears}y.` }, ...state.newsLog].slice(0, 400);
  } else if (richer <= 1.30) {
    // Midpoint counter from agency
    const midFee = +((bid.feeM + newFee) / 2).toFixed(1);
    const midRoy = +((bid.royaltyPercent + newRoy) / 2).toFixed(1);
    const midYears = Math.round((bid.years + newYears) / 2);
    bids[idx] = { ...bid, feeM: midFee, royaltyPercent: midRoy, years: midYears };
    news = [{ week: state.week, year: state.year, text: `↩ ${licensor?.name || 'Agency'} counters: $${midFee.toFixed(1)}M / ${midRoy.toFixed(1)}% / ${midYears}y.` }, ...state.newsLog].slice(0, 400);
  } else {
    bids[idx] = { ...bid, status: 'rejected' };
    news = [{ week: state.week, year: state.year, text: `❌ ${licensor?.name || 'Agency'} walks away — your counter was too rich.` }, ...state.newsLog].slice(0, 400);
  }
  return { state: { ...state, outboundIPBids: bids, newsLog: news } };
}

// Sublicense an existing sublicensable OwnedIPLicense to a rival studio
export function sublicenseIPToRival(
  state: GameState,
  ownedIPLicenseId: string,
  rivalStudioId: string,
  askingFeeM: number
): { state: GameState; error?: string; accepted?: boolean; counterFeeM?: number } {
  const lic = (state.ownedIPLicenses || []).find(l => l.id === ownedIPLicenseId && l.studioId === state.player.id);
  if (!lic) return { state, error: 'IP License not found or not owned.' };
  if (!lic.sublicensable) return { state, error: 'This IP license is not sublicensable.' };
  
  const ip = (state.externalIPs || []).find(i => i.id === lic.ipId);
  if (!ip) return { state, error: 'External IP not found.' };

  const rival = state.rivals.find(r => r.id === rivalStudioId);
  if (!rival) return { state, error: 'Rival studio not found.' };

  const packsLeft = Math.max(1, lic.packs - lic.packsUsed);
  const yearsLeft = Math.max(1, lic.expiresYear - state.year);
  // Base fair price calculation: based on remaining packs and popularity
  const baseFair = (ip.popularity / 100) * 20 * packsLeft * (1 + (yearsLeft - 1) * 0.15) * (rival.rating / 6);
  const fair = +(baseFair).toFixed(1);

  if (rival.cash * 1000 < askingFeeM) {
    return { state, error: `${rival.name} cannot afford this sublicense fee (has $${(rival.cash * 1000).toFixed(0)}M).` };
  }

  const maxAccept = +(fair * 1.25).toFixed(1);

  if (askingFeeM <= maxAccept) {
    // Sublicense accepted! Update caches and lists
    const updatedRivals = state.rivals.map(r => r.id === rivalStudioId ? { ...r, cash: +(r.cash - askingFeeM / 1000).toFixed(3) } : r);
    const updatedPlayer = { ...state.player, cash: +(state.player.cash + askingFeeM / 1000).toFixed(3) };
    
    // Grant the rival a copy of this license, but with studioId = rivalStudioId, sublicensable = false, and packs set to packsLeft
    const subLicense: OwnedIPLicense = {
      id: uid('sub_'),
      ipId: lic.ipId,
      studioId: rivalStudioId,
      feePaidM: askingFeeM,
      boPercent: Math.min(40, lic.boPercent + 5),
      merchPercent: Math.min(40, lic.merchPercent + 5),
      signedWeek: state.week,
      signedYear: state.year,
      expiresWeek: lic.expiresWeek,
      expiresYear: lic.expiresYear,
      packs: packsLeft,
      packsUsed: 0,
      exclusivity: false,
      sublicensable: false,
    };

    // Incremented player's pack usage on the core license to represent they licensed it out
    const updatedOwnedLicenses = (state.ownedIPLicenses || []).map(l => {
      if (l.id === lic.id) {
        return { ...l, packsUsed: Math.min(l.packs, l.packsUsed + 1) };
      }
      return l;
    });

    const news = [{
      week: state.week, year: state.year,
      text: `🤝 ${state.player.name} sublicenses the ${ip.name} IP to rival ${rival.name} for $${askingFeeM.toFixed(1)}M (${packsLeft} films / expires Y${lic.expiresYear}).`
    }, ...state.newsLog].slice(0, 400);

    return {
      state: {
        ...state,
        rivals: updatedRivals,
        player: updatedPlayer,
        ownedIPLicenses: [...updatedOwnedLicenses, subLicense],
        newsLog: news,
      },
      accepted: true,
    };
  } else {
    // Rejected or countered
    const counterFeeM = +((fair + askingFeeM) / 2).toFixed(1);
    return {
      state,
      accepted: false,
      counterFeeM,
    };
  }
}

// Process royalty payments weekly.
export function processOutboundRoyalties(state: GameState): GameState {
  const q = state.outboundRoyaltyQueue || [];
  if (!q.length) return state;
  const nowTotal = state.year * WEEKS_PER_YEAR + state.week;
  let cashAdd = 0;
  const news: { week: number; year: number; text: string }[] = [];
  const updated = q.map((e: any) => {
    const dueTotal = e.nextPayYear * WEEKS_PER_YEAR + e.nextPayWeek;
    if (dueTotal > nowTotal) return e;
    const expTotal = e.expiresYear * WEEKS_PER_YEAR + e.expiresWeek;
    if (dueTotal > expTotal) return null; // expired
    cashAdd += e.perPaymentM;
    news.push({ week: state.week, year: state.year, text: `💵 IP royalty payment received: $${e.perPaymentM.toFixed(2)}M.` });
    // Schedule next quarterly payment (~13 weeks)
    let nw = e.nextPayWeek + 13, ny = e.nextPayYear;
    while (nw > WEEKS_PER_YEAR) { nw -= WEEKS_PER_YEAR; ny += 1; }
    return { ...e, nextPayWeek: nw, nextPayYear: ny };
  }).filter((x: any) => x !== null) as typeof q;
  if (cashAdd === 0 && updated.length === q.length) return state;
  const player = { ...state.player, cash: +(state.player.cash + cashAdd / 1000).toFixed(3) };
  return { ...state, player, outboundRoyaltyQueue: updated, newsLog: [...news, ...state.newsLog].slice(0, 400) };
}


// =====================================================================
// V30 — CINEMA MANAGER: AI proposes optimal deals; player approves/rejects
// =====================================================================

import type { CinemaProposal, CinemaSchedule } from './types';

// Cinema Manager scans unsigned chains weekly and proposes optimal-but-realistic deal terms.
// Returns updated state with new proposals; never overwrites existing ones for the same chain.
export function generateCinemaProposals(state: GameState, options?: { forceCount?: number }): { state: GameState; created: number } {
  const playerId = state.player.id;
  const existingProposals = state.cinemaProposals || [];
  const existingDeals = (state.cinemaDeals || []).filter(d => d.studioId === playerId);
  const nowTotal = state.year * WEEKS_PER_YEAR + state.week;

  // Eligible chains: no active deal AND no pending proposal
  const eligible = CINEMA_CHAINS.filter(chain => {
    const activeDeal = existingDeals.find(d => d.chainId === chain.id && (d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek) > nowTotal);
    if (activeDeal) return false;
    const pending = existingProposals.find(p => p.chainId === chain.id);
    if (pending) return false;
    return true;
  });
  if (!eligible.length) return { state, created: 0 };

  const targetCount = options?.forceCount || Math.min(eligible.length, 4);
  // Prioritise: high reputation chains in regions where player has fewest deals
  const dealsByRegion: Record<string, number> = {};
  existingDeals.forEach(d => { dealsByRegion[d.region] = (dealsByRegion[d.region] || 0) + 1; });
  const ranked = [...eligible].sort((a, b) => {
    const aRegionDeals = dealsByRegion[a.region] || 0;
    const bRegionDeals = dealsByRegion[b.region] || 0;
    if (aRegionDeals !== bRegionDeals) return aRegionDeals - bRegionDeals;
    return b.reputation - a.reputation;
  });

  const newProposals: CinemaProposal[] = [];
  for (const chain of ranked.slice(0, targetCount)) {
    const range = cinemaDealRange(chain.reputation, state.player.rating);
    // OPTIMAL (not perfect) — sit at 60% of range so chains are likely to accept
    const optimalOpen = +(range.minOpen + (range.maxOpen - range.minOpen) * 0.60).toFixed(3);
    const optimalLate = +(range.minLate + (range.maxLate - range.minLate) * 0.55).toFixed(3);
    const years = chain.reputation >= 75 ? 7 : chain.reputation >= 55 ? 8 : 10;
    const guaranteedTheaters = Math.round(chain.theaters * (0.55 + state.player.rating * 0.07));
    const rationale = `Negotiated optimal terms — ${(optimalOpen * 100).toFixed(0)}% opening / ${(optimalLate * 100).toFixed(0)}% late share, ${years}y term. Chain reputation ${chain.reputation}/100; ${chain.theaters.toLocaleString()} screens guaranteed.`;
    newProposals.push({
      id: uid('cprop_'), chainId: chain.id, region: chain.region as any,
      years, openShare: optimalOpen, lateShare: optimalLate,
      guaranteedTheaters, rationale,
      createdWeek: state.week, createdYear: state.year,
    });
  }
  if (!newProposals.length) return { state, created: 0 };

  const cinemaProposals = [...existingProposals, ...newProposals];
  const newsLog = [
    { week: state.week, year: state.year, text: `🎬 Cinema Manager: ${newProposals.length} new deal${newProposals.length > 1 ? 's' : ''} on the table — review & approve in Cinemas.` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, cinemaProposals, newsLog }, created: newProposals.length };
}

// Player approves a cinema proposal — converts to active deal at proposed terms (no further negotiation).
export function approveCinemaProposal(state: GameState, proposalId: string): { state: GameState; error?: string } {
  const proposal = (state.cinemaProposals || []).find(p => p.id === proposalId);
  if (!proposal) return { state, error: 'Proposal not found.' };
  const chain = CINEMA_CHAINS.find(c => c.id === proposal.chainId);
  if (!chain) return { state, error: 'Chain not found.' };
  const expW = state.week;
  const expY = state.year + proposal.years;
  const deal: CinemaDeal = {
    id: uid('cd_'), chainId: chain.id, studioId: state.player.id, region: chain.region as CinemaRegion, years: proposal.years,
    signedWeek: state.week, signedYear: state.year, expiresWeek: expW, expiresYear: expY,
    openingStudioShare: proposal.openShare, lateStudioShare: proposal.lateShare,
    guaranteedTheaters: proposal.guaranteedTheaters,
  };
  const cinemaDeals = [...(state.cinemaDeals || []), deal];
  const cinemaProposals = (state.cinemaProposals || []).filter(p => p.id !== proposalId);
  const newsLog = [
    { week: state.week, year: state.year, text: `✅ ${state.player.name} signs ${proposal.years}-year deal with ${chain.name} (Cinema Manager) — opening ${(proposal.openShare * 100).toFixed(0)}% / late ${(proposal.lateShare * 100).toFixed(0)}%.` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, cinemaDeals, cinemaProposals, newsLog } };
}

export function rejectCinemaProposal(state: GameState, proposalId: string): { state: GameState; error?: string } {
  const proposal = (state.cinemaProposals || []).find(p => p.id === proposalId);
  if (!proposal) return { state, error: 'Proposal not found.' };
  const cinemaProposals = (state.cinemaProposals || []).filter(p => p.id !== proposalId);
  return { state: { ...state, cinemaProposals } };
}

// V30 — Bulk-build (sign multiple deals at once at neutral terms — quick action).
// Used by "build multiple cinemas at once" UI on cinemas page.
export function bulkSignCinemaDeals(state: GameState, chainIds: string[], years: number): { state: GameState; signed: number; failed: string[] } {
  let s = state;
  let signed = 0;
  const failed: string[] = [];
  for (const chainId of chainIds) {
    const chain = CINEMA_CHAINS.find(c => c.id === chainId);
    if (!chain) { failed.push(chainId); continue; }
    const range = cinemaDealRange(chain.reputation, s.player.rating);
    // Use mid-range terms — high acceptance
    const open = +(range.minOpen + (range.maxOpen - range.minOpen) * 0.55).toFixed(3);
    const late = +(range.minLate + (range.maxLate - range.minLate) * 0.50).toFixed(3);
    const r = signCinemaDeal(s, chainId, years, open, late);
    if (!r.error && !r.counter) {
      s = r.state;
      signed++;
    } else if (r.counter) {
      // Auto-accept the counter on bulk-build (player is fine with optimal-not-perfect)
      const r2 = signCinemaDeal(s, chainId, r.counter.years, r.counter.openShare, r.counter.lateShare);
      if (!r2.error && !r2.counter) { s = r2.state; signed++; }
      else failed.push(chain.name);
    } else {
      failed.push(chain.name);
    }
  }
  return { state: s, signed, failed };
}

// V30 — Schedule a movie into specific cinema chains for a target release week (calendar mapping).
// Enforces release-window guard: cannot schedule before movie's release date.
export function scheduleMovieInCinemas(state: GameState, movieId: string, chainIds: string[], targetWeek: number, targetYear: number): { state: GameState; error?: string } {
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) return { state, error: 'Movie not found.' };
  if (movie.studioId !== state.player.id) return { state, error: 'Not your movie.' };
  // Compute movie's earliest releasable week
  const targetTotal = targetYear * WEEKS_PER_YEAR + targetWeek;
  const earliestTotal = (() => {
    if (movie.status === 'released') return movie.releaseYear * WEEKS_PER_YEAR + movie.releaseWeek;
    const t = movie.targetReleaseWeek && movie.targetReleaseYear
      ? movie.targetReleaseYear * WEEKS_PER_YEAR + movie.targetReleaseWeek
      : (state.year * WEEKS_PER_YEAR + state.week + Math.max(1, movie.weeksToRelease));
    return t;
  })();
  if (targetTotal < earliestTotal) {
    return { state, error: `Cannot release before movie's window (W${earliestTotal % WEEKS_PER_YEAR || WEEKS_PER_YEAR} Y${Math.ceil(earliestTotal / WEEKS_PER_YEAR)}).` };
  }
  // Validate chain ownership: chains must match active player cinema deals
  const activeChainIds = new Set((state.cinemaDeals || []).filter(d => d.studioId === state.player.id && (d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek) > (state.year * WEEKS_PER_YEAR + state.week)).map(d => d.chainId));
  const validChains = chainIds.filter(id => activeChainIds.has(id));
  if (!validChains.length) return { state, error: 'No active cinema deals match the selected chains.' };
  const item: CinemaSchedule = {
    id: uid('csch_'), movieId, chainIds: validChains, scheduledWeek: targetWeek, scheduledYear: targetYear,
    createdWeek: state.week, createdYear: state.year,
  };
  // Replace any existing schedule for this movie
  const cinemaCalendar = [...(state.cinemaCalendar || []).filter(s => s.movieId !== movieId), item];
  // V39 — Auto-sync owned cinemas to the same release week. The "Bulk Schedule" UI button was
  // removed; movies now play in ALL player-owned cinemas on the same date as the chain run.
  let ownedCinemas = state.ownedCinemas || [];
  if (ownedCinemas.length > 0) {
    ownedCinemas = ownedCinemas.map(c => {
      const run = { id: uid('ocr_'), movieId, fromWeek: targetWeek, fromYear: targetYear, weeksToShow: 6 };
      return { ...c, scheduledReleases: [...(c.scheduledReleases || []).filter(r => r.movieId !== movieId), run] };
    });
  }
  return { state: { ...state, cinemaCalendar, ownedCinemas } };
}

export function unscheduleMovieFromCinemas(state: GameState, movieId: string): { state: GameState } {
  const cinemaCalendar = (state.cinemaCalendar || []).filter(s => s.movieId !== movieId);
  return { state: { ...state, cinemaCalendar } };
}

// V30 — Bulk multi-license: license multiple movies to one streaming service in one go.
// Used by "multiple licenses at once" on cinemas/streaming page.
export function bulkLicenseMoviesToService(state: GameState, serviceId: string, movieIds: string[], yearsLicensed: 1 | 3 | 5 | 10): { state: GameState; licensed: number; totalFee: number; failed: string[] } {
  let s = state;
  let licensed = 0;
  let totalFee = 0;
  const failed: string[] = [];
  for (const mid of movieIds) {
    const r = licenseMovieToStreaming(s, serviceId, { movieId: mid, yearsLicensed, tierIds: [] });
    if (!r.error) {
      s = r.state;
      licensed++;
      totalFee += r.fee || 0;
    } else {
      const movie = s.movies.find(m => m.id === mid);
      failed.push(`${movie?.title || mid}: ${r.error}`);
    }
  }
  return { state: s, licensed, totalFee, failed };
}

// =====================================================================
// V30 — PLAYER-OWNED CINEMAS (build, license movies in, schedule releases)
// =====================================================================

import type { OwnedCinema, OwnedCinemaSize } from './types';

export const OWNED_CINEMA_SPECS: Record<OwnedCinemaSize, { screens: number; buildCost: number; weeklyOpex: number; label: string }> = {
  // V44.1 — Cinema opex rebalance. V42 values crushed players at ~300 cinemas (300 × $0.5M/wk = $150M/wk).
  // Real-world ref: AMC ~600 theaters, ~$4.5B/yr opex → ~$0.024M/wk/theater. We keep our numbers 3–7× higher than that
  // so management still matters, but a 300-cinema empire now costs ~$24M/wk (not $150M/wk).
  small:  { screens: 2,  buildCost: 8,   weeklyOpex: 0.08, label: 'Small (2 screens)' },
  medium: { screens: 6,  buildCost: 22,  weeklyOpex: 0.20, label: 'Medium (6 screens)' },
  large:  { screens: 12, buildCost: 48,  weeklyOpex: 0.40, label: 'Large (12 screens)' },
  mega:   { screens: 20, buildCost: 85,  weeklyOpex: 0.75, label: 'Mega (20 screens)' },
};

const REGION_NAME_PREFIXES: Record<string, string[]> = {
  'North America': ['Empire', 'Liberty', 'Atlas', 'Hollywood', 'Pacific', 'Sunset', 'Apex', 'Skyline'],
  'Europe':        ['Royale', 'Continental', 'Vienna', 'Paris', 'Barcelona', 'Albion', 'Nordic', 'Aurora'],
  'Latin America': ['Tropico', 'Andes', 'Estrella', 'Caribe', 'Solana', 'Verde', 'Aurora', 'Costera'],
  'Asia':          ['Sakura', 'Dragon', 'Lotus', 'Pacifica', 'Tokio', 'Singa', 'Kala', 'Orion'],
  'Oceania':       ['Coral', 'Outback', 'Reef', 'Pacifica', 'Southern', 'Aurora', 'Tasman', 'Pearl'],
  'Africa':        ['Savanna', 'Sahara', 'Kalahari', 'Atlas', 'Nile', 'Baobab', 'Sahel', 'Cape'],
};
const SIZE_SUFFIX: Record<OwnedCinemaSize, string> = {
  small: 'Cinema', medium: 'Multiplex', large: 'Megaplex', mega: 'Imperial',
};

function genOwnedCinemaName(region: string, size: OwnedCinemaSize, existing: Set<string>): string {
  const prefixes = REGION_NAME_PREFIXES[region] || REGION_NAME_PREFIXES['North America'];
  for (let attempt = 0; attempt < 50; attempt++) {
    const px = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = randInt(1, 99);
    const candidate = `${px} ${SIZE_SUFFIX[size]} ${num}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${SIZE_SUFFIX[size]} ${uid('').slice(0, 4)}`;
}

// Build N cinemas across regions/sizes in one transaction.
export function buildOwnedCinemas(
  state: GameState,
  plan: { region: import('./types').CinemaRegion; size: OwnedCinemaSize; count: number }[],
): { state: GameState; built: number; totalCostM: number; error?: string } {
  const valid = plan.filter(p => p.count > 0);
  if (!valid.length) return { state, built: 0, totalCostM: 0, error: 'Pick at least one cinema to build.' };
  let totalCostM = 0;
  for (const p of valid) {
    const spec = OWNED_CINEMA_SPECS[p.size];
    if (!spec) return { state, built: 0, totalCostM: 0, error: `Unknown size: ${p.size}` };
    totalCostM += spec.buildCost * p.count;
  }
  if (state.player.cash * 1000 < totalCostM) return { state, built: 0, totalCostM, error: `Need $${totalCostM.toFixed(0)}M to build (have $${(state.player.cash * 1000).toFixed(0)}M).` };

  const existingNames = new Set((state.ownedCinemas || []).map(c => c.name));
  const newCinemas: OwnedCinema[] = [];
  for (const p of valid) {
    const spec = OWNED_CINEMA_SPECS[p.size];
    for (let i = 0; i < p.count; i++) {
      const name = genOwnedCinemaName(p.region, p.size, existingNames);
      existingNames.add(name);
      newCinemas.push({
        id: uid('oc_'), name, region: p.region, size: p.size,
        screens: spec.screens, buildCost: spec.buildCost, weeklyOpex: spec.weeklyOpex,
        builtWeek: state.week, builtYear: state.year,
        scheduledReleases: [],
      });
    }
  }

  const ownedCinemas = [...(state.ownedCinemas || []), ...newCinemas];
  const updatedPlayer = { ...state.player, cash: +(state.player.cash - totalCostM / 1000).toFixed(3) };
  const newsLog = [
    { week: state.week, year: state.year, text: `🏗 ${state.player.name} builds ${newCinemas.length} cinema${newCinemas.length > 1 ? 's' : ''} (-$${totalCostM.toFixed(0)}M).` },
    ...state.newsLog,
  ].slice(0, 400);
  return { state: { ...state, ownedCinemas, player: updatedPlayer, newsLog }, built: newCinemas.length, totalCostM };
}

// Schedule MULTIPLE player movies into a SET of owned cinemas at a future week (release-window guarded).
export function scheduleMoviesInOwnedCinemas(
  state: GameState,
  movieIds: string[],
  cinemaIds: string[],
  fromWeek: number,
  fromYear: number,
  weeksToShow: number = 6,
): { state: GameState; scheduled: number; failed: string[] } {
  let s = state;
  let scheduled = 0;
  const failed: string[] = [];
  const targetTotal = fromYear * WEEKS_PER_YEAR + fromWeek;
  for (const mid of movieIds) {
    const movie = s.movies.find(m => m.id === mid);
    if (!movie) { failed.push(`${mid}: not found`); continue; }
    if (movie.studioId !== s.player.id) { failed.push(`${movie.title}: not your movie`); continue; }
    const earliestTotal = (() => {
      if (movie.status === 'released') return movie.releaseYear * WEEKS_PER_YEAR + movie.releaseWeek;
      const t = movie.targetReleaseWeek && movie.targetReleaseYear
        ? movie.targetReleaseYear * WEEKS_PER_YEAR + movie.targetReleaseWeek
        : (s.year * WEEKS_PER_YEAR + s.week + Math.max(1, movie.weeksToRelease));
      return t;
    })();
    if (targetTotal < earliestTotal) {
      failed.push(`${movie.title}: too early (window opens W${earliestTotal % WEEKS_PER_YEAR || WEEKS_PER_YEAR} Y${Math.ceil(earliestTotal / WEEKS_PER_YEAR)})`);
      continue;
    }
    const ownedCinemas = (s.ownedCinemas || []).map(c => {
      if (!cinemaIds.includes(c.id)) return c;
      const run = { id: uid('ocr_'), movieId: movie.id, fromWeek, fromYear, weeksToShow };
      return { ...c, scheduledReleases: [...(c.scheduledReleases || []).filter(r => r.movieId !== movie.id), run] };
    });
    s = { ...s, ownedCinemas };
    scheduled++;
  }
  if (scheduled > 0) {
    s = {
      ...s,
      newsLog: [{ week: s.week, year: s.year, text: `📅 Scheduled ${scheduled} title${scheduled > 1 ? 's' : ''} across ${cinemaIds.length} owned cinema${cinemaIds.length > 1 ? 's' : ''}.` }, ...s.newsLog].slice(0, 400),
    };
  }
  return { state: s, scheduled, failed };
}

export function unscheduleOwnedCinemaRun(state: GameState, cinemaId: string, runId: string): { state: GameState } {
  const ownedCinemas = (state.ownedCinemas || []).map(c => c.id === cinemaId
    ? { ...c, scheduledReleases: (c.scheduledReleases || []).filter(r => r.id !== runId) }
    : c);
  return { state: { ...state, ownedCinemas } };
}

export function demolishOwnedCinema(state: GameState, cinemaId: string): { state: GameState; refundM: number } {
  const c = (state.ownedCinemas || []).find(cc => cc.id === cinemaId);
  if (!c) return { state, refundM: 0 };
  const refundM = +(c.buildCost * 0.3).toFixed(1);
  const ownedCinemas = (state.ownedCinemas || []).filter(cc => cc.id !== cinemaId);
  const player = { ...state.player, cash: +(state.player.cash + refundM / 1000).toFixed(3) };
  const newsLog = [{ week: state.week, year: state.year, text: `💥 ${c.displayName || c.name} demolished — +$${refundM.toFixed(1)}M salvage.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, ownedCinemas, player, newsLog }, refundM };
}

// V30 — Rename a player-owned cinema.
export function renameOwnedCinema(state: GameState, cinemaId: string, newName: string): { state: GameState; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) return { state, error: 'Name cannot be empty.' };
  if (trimmed.length > 40) return { state, error: 'Name too long (max 40).' };
  const ownedCinemas = (state.ownedCinemas || []).map(c => c.id === cinemaId ? { ...c, displayName: trimmed } : c);
  return { state: { ...state, ownedCinemas } };
}

// V30 — Premium amenities catalogue.
export const AMENITY_SPECS: Record<'imax' | 'recliners' | 'premiumConcessions', {
  label: string; installCost: number; weeklyOpex: number; revenueMult: number; icon: string;
}> = {
  // V44.1 — Amenity opex rebalanced down (were absurd at $0.4M/wk = $20M/yr per IMAX install)
  imax:               { label: 'IMAX Screen',       installCost: 30, weeklyOpex: 0.05, revenueMult: 1.25, icon: 'movie-open-star' },
  recliners:          { label: 'Luxury Recliners',  installCost: 15, weeklyOpex: 0.02, revenueMult: 1.12, icon: 'seat-recline-extra' },
  premiumConcessions: { label: 'Premium Snacks',    installCost: 5,  weeklyOpex: 0.01, revenueMult: 1.08, icon: 'food-variant' },
};

// V30 — Toggle an amenity on a cinema. Installing deducts cash; uninstalling refunds 30%.
export function toggleOwnedCinemaAmenity(
  state: GameState,
  cinemaId: string,
  amenity: 'imax' | 'recliners' | 'premiumConcessions',
  install: boolean,
): { state: GameState; error?: string; cost: number } {
  const c = (state.ownedCinemas || []).find(cc => cc.id === cinemaId);
  if (!c) return { state, error: 'Cinema not found.', cost: 0 };
  const spec = AMENITY_SPECS[amenity];
  const already = !!(c.amenities || {})[amenity];
  if (install && already) return { state, error: 'Already installed.', cost: 0 };
  if (!install && !already) return { state, error: 'Not installed.', cost: 0 };
  const cost = install ? spec.installCost : -(spec.installCost * 0.3); // refund 30% on remove
  if (install && state.player.cash * 1000 < cost) return { state, error: `Need $${cost.toFixed(0)}M (have $${(state.player.cash * 1000).toFixed(0)}M).`, cost: 0 };
  const player = { ...state.player, cash: +(state.player.cash - cost / 1000).toFixed(3) };
  const ownedCinemas = (state.ownedCinemas || []).map(cc => cc.id === cinemaId ? {
    ...cc,
    amenities: { ...(cc.amenities || {}), [amenity]: install ? true : false },
  } : cc);
  const newsLog = [{ week: state.week, year: state.year, text: `${install ? '🛠' : '💥'} ${c.displayName || c.name}: ${install ? 'installed' : 'removed'} ${spec.label}${install ? ` (-$${cost.toFixed(1)}M)` : ` (+$${(-cost).toFixed(1)}M refund)`}.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, ownedCinemas, player, newsLog }, cost };
}

// V35 — Customization specs (pricing/food/merch)
export const TICKET_PRICE_SPECS: Record<'value' | 'standard' | 'premium', { label: string; revenueMult: number; weeklyOpex: number }> = {
  value:    { label: 'Value ($10)',    revenueMult: 0.80, weeklyOpex: 0.00 },
  standard: { label: 'Standard ($15)', revenueMult: 1.00, weeklyOpex: 0.00 },
  premium:  { label: 'Premium ($22)',  revenueMult: 1.25, weeklyOpex: 0.05 },
};
export const FOOD_SPECS: Record<'none' | 'basic' | 'premium' | 'gourmet', { label: string; revenueMult: number; weeklyOpex: number }> = {
  none:    { label: 'No Concessions', revenueMult: 0.95, weeklyOpex: 0.00 },
  basic:   { label: 'Basic Snacks',   revenueMult: 1.00, weeklyOpex: 0.05 },
  premium: { label: 'Premium Food',   revenueMult: 1.10, weeklyOpex: 0.15 },
  gourmet: { label: 'Gourmet Dining', revenueMult: 1.22, weeklyOpex: 0.32 },
};
export const MERCH_SPECS: Record<'none' | 'basic' | 'premium', { label: string; revenueMult: number; weeklyOpex: number }> = {
  none:    { label: 'No Merch',       revenueMult: 1.00, weeklyOpex: 0.00 },
  basic:   { label: 'Basic Merch',    revenueMult: 1.05, weeklyOpex: 0.05 },
  premium: { label: 'Premium Merch',  revenueMult: 1.12, weeklyOpex: 0.12 },
};

export function setOwnedCinemaCustomization(state: GameState, cinemaId: string, args: { ticketPriceLevel?: 'value' | 'standard' | 'premium'; foodLevel?: 'none' | 'basic' | 'premium' | 'gourmet'; merchLevel?: 'none' | 'basic' | 'premium' }): { state: GameState; error?: string } {
  const c = (state.ownedCinemas || []).find(cc => cc.id === cinemaId);
  if (!c) return { state, error: 'Cinema not found.' };
  const ownedCinemas = (state.ownedCinemas || []).map(cc => cc.id === cinemaId ? {
    ...cc,
    ticketPriceLevel: args.ticketPriceLevel ?? cc.ticketPriceLevel,
    foodLevel: args.foodLevel ?? cc.foodLevel,
    merchLevel: args.merchLevel ?? cc.merchLevel,
  } : cc);
  return { state: { ...state, ownedCinemas } };
}

// Cumulative amenity multiplier on a cinema's revenue.
function amenityRevenueMult(c: OwnedCinema): number {
  let m = 1.0;
  if (c.amenities?.imax) m *= AMENITY_SPECS.imax.revenueMult;
  if (c.amenities?.recliners) m *= AMENITY_SPECS.recliners.revenueMult;
  if (c.amenities?.premiumConcessions) m *= AMENITY_SPECS.premiumConcessions.revenueMult;
  // V35 — apply customization mults
  m *= TICKET_PRICE_SPECS[c.ticketPriceLevel || 'standard'].revenueMult;
  m *= FOOD_SPECS[c.foodLevel || 'basic'].revenueMult;
  m *= MERCH_SPECS[c.merchLevel || 'none'].revenueMult;
  return m;
}
export function amenityWeeklyOpex(c: OwnedCinema): number {
  let o = 0;
  if (c.amenities?.imax) o += AMENITY_SPECS.imax.weeklyOpex;
  if (c.amenities?.recliners) o += AMENITY_SPECS.recliners.weeklyOpex;
  if (c.amenities?.premiumConcessions) o += AMENITY_SPECS.premiumConcessions.weeklyOpex;
  // V35 — customization opex
  o += TICKET_PRICE_SPECS[c.ticketPriceLevel || 'standard'].weeklyOpex;
  o += FOOD_SPECS[c.foodLevel || 'basic'].weeklyOpex;
  o += MERCH_SPECS[c.merchLevel || 'none'].weeklyOpex;
  return o;
}

// Process owned cinemas weekly: deduct opex, advance current runs, auto-start scheduled runs, earn 100% cinema-side.
export function tickOwnedCinemas(state: GameState): GameState {
  const ownedCinemas = state.ownedCinemas || [];
  if (!ownedCinemas.length) return state;

  let player = { ...state.player };
  let totalOpex = 0;
  let totalRevenue = 0;
  const news: { week: number; year: number; text: string }[] = [];

  const updated: OwnedCinema[] = ownedCinemas.map(c => {
    let next: OwnedCinema = { ...c };
    // V44.1 — Always read base opex from the spec (so opex rebalances apply to existing saves too).
    const baseOpex = OWNED_CINEMA_SPECS[c.size]?.weeklyOpex ?? c.weeklyOpex;
    next.weeklyOpex = baseOpex;
    const amOpex = amenityWeeklyOpex(c);
    const totalOpexThis = baseOpex + amOpex;
    totalOpex += totalOpexThis;
    let dueRun = (next.scheduledReleases || []).find(r => {
      const start = r.fromYear * WEEKS_PER_YEAR + r.fromWeek;
      const now = state.year * WEEKS_PER_YEAR + state.week;
      return start <= now && start + r.weeksToShow > now;
    });
    if (!next.currentMovieId && !dueRun) {
      // Auto-schedule Fallback! Cinema Manager automatically schedules a hit movie so screens stay occupied.
      const candidates = state.movies.filter(m => m.status === 'released' && ((state.year - m.releaseYear) * WEEKS_PER_YEAR + (state.week - m.releaseWeek)) <= 70);
      candidates.sort((a, b) => b.boxOffice - a.boxOffice);
      const best = candidates[0];
      if (best) {
        dueRun = {
          id: uid('ocr_auto_'),
          movieId: best.id,
          fromWeek: state.week,
          fromYear: state.year,
          weeksToShow: 4
        };
        // Add to scheduledReleases for bookkeeping
        next.scheduledReleases = [...(next.scheduledReleases || []), dueRun];
        news.push({
          week: state.week,
          year: state.year,
          text: `💡 Cinema Manager: Auto-scheduled hit movie "${best.title}" in your idle cinema "${c.displayName || c.name}" to maximize revenue.`
        });
      }
    }
    if (!next.currentMovieId && dueRun) {
      const movie = state.movies.find(m => m.id === dueRun.movieId);
      if (movie && movie.status === 'released') {
        next = { ...next, currentMovieId: dueRun.movieId, currentRunWeeks: 1 };
      }
    }
    let myRevenue = 0;
    if (next.currentMovieId) {
      const movie = state.movies.find(m => m.id === next.currentMovieId);
      if (movie) {
        const lastWk = movie.weeklyBO[movie.weeklyBO.length - 1] || 0;
        const slice = lastWk * (c.screens / 200);
        const cinemaSideMult = 0.40;
        const mktBoost = Math.min(0.20, (c.marketingBudgetM || 0) * 0.01);
        myRevenue = +(slice * cinemaSideMult * amenityRevenueMult(c) * (1 + mktBoost)).toFixed(4);
        totalRevenue += myRevenue;
      }
      next = { ...next, currentRunWeeks: (next.currentRunWeeks || 0) + 1 };
      const myRun = (next.scheduledReleases || []).find(r => r.movieId === next.currentMovieId);
      const cap = myRun ? myRun.weeksToShow : 6;
      if ((next.currentRunWeeks || 0) >= cap) {
        next = {
          ...next,
          currentMovieId: undefined,
          currentRunWeeks: undefined,
          scheduledReleases: (next.scheduledReleases || []).filter(r => r.id !== myRun?.id),
        };
      }
    }
    // Accumulate lifetime stats
    next.lifetimeRevenueB = +((next.lifetimeRevenueB || 0) + myRevenue).toFixed(4);
    next.lifetimeOpexB = +((next.lifetimeOpexB || 0) + totalOpexThis / 1000).toFixed(4);
    return next;
  });

  player = { ...player, cash: +(player.cash - totalOpex / 1000 + totalRevenue).toFixed(3) };
  if (totalRevenue * 1000 > 0.1) news.push({ week: state.week, year: state.year, text: `🎟 Owned cinemas: +$${(totalRevenue * 1000).toFixed(1)}M revenue, -$${totalOpex.toFixed(1)}M opex.` });
  let nextState: GameState = { ...state, ownedCinemas: updated, player, newsLog: [...news, ...state.newsLog].slice(0, 400) };
  // V43 — Ledger
  nextState = _bumpL(nextState, 'ownedCinemaRevB', totalRevenue);
  nextState = _bumpL(nextState, 'cinemaOpexB', totalOpex / 1000);
  // V43 — Marketing spend (entity-level)
  const totalMktB = ownedCinemas.reduce((s, c) => s + ((c.marketingBudgetM || 0) / 1000), 0);
  if (totalMktB > 0) {
    nextState = { ...nextState, player: { ...nextState.player, cash: +(nextState.player.cash - totalMktB).toFixed(3) } };
    nextState = _bumpL(nextState, 'marketingCostB', totalMktB);
  }
  return nextState;
}


// ---------- CINEMA SUPPLIER DEALS ----------
// Blanket deal: a rival studio routes all its traditional/hybrid releases into the player's owned cinemas.
// Pay-per-release kickback + revenue-share. Player commits cinema capacity in exchange for guaranteed flow of films.

export function quoteCinemaSupplierDeal(state: GameState, args: { rivalStudioId: string; years: number; includeTraditional: boolean; includeHybrid: boolean }): { feeM: number; perReleaseKickbackM: number; revShareToPlayer: number; estReleasesPerYear: number; error?: string } {
  const rival = state.rivals.find(r => r.id === args.rivalStudioId);
  if (!rival) return { feeM: 0, perReleaseKickbackM: 0, revShareToPlayer: 0, estReleasesPerYear: 0, error: 'Rival not found.' };
  
  // Reject if an active supplier deal with this rival studio already exists.
  const existing = (state.cinemaSupplierDeals || []).find(d => d.rivalStudioId === args.rivalStudioId && (d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek) > (state.year * WEEKS_PER_YEAR + state.week));
  if (existing) return { feeM: 0, perReleaseKickbackM: 0, revShareToPlayer: 0, estReleasesPerYear: 0, error: 'You already have an active supplier deal with this rival studio.' };

  if (args.years < 1 || args.years > 10) return { feeM: 0, perReleaseKickbackM: 0, revShareToPlayer: 0, estReleasesPerYear: 0, error: 'Years must be 1–10.' };
  if (!args.includeTraditional && !args.includeHybrid) return { feeM: 0, perReleaseKickbackM: 0, revShareToPlayer: 0, estReleasesPerYear: 0, error: 'Pick at least one release style.' };
  // Estimate by counting rival's films released in past 2 years matching style.
  const recent = state.movies.filter(m => m.studioId === args.rivalStudioId && m.status === 'released' && (state.year - m.releaseYear) <= 2);
  const matching = recent.filter(m => (args.includeTraditional && (m.releaseStrategy || 'theatrical') === 'theatrical') || (args.includeHybrid && m.releaseStrategy === 'hybrid'));
  const estReleasesPerYear = Math.max(2, Math.round(matching.length / 2));
  const baseFeeM = +(estReleasesPerYear * args.years * 8).toFixed(1); // ~$8M per expected release upfront
  const perReleaseKickbackM = 1.5; // rival pays player $1.5M per actual release routed
  const revShareToPlayer = 0.85; // owned cinemas keep 85% of cinema-side gross
  return { feeM: baseFeeM, perReleaseKickbackM, revShareToPlayer, estReleasesPerYear };
}

export function signCinemaSupplierDeal(state: GameState, args: { rivalStudioId: string; years: number; includeTraditional: boolean; includeHybrid: boolean; upfrontFeeM: number }): { state: GameState; deal?: CinemaSupplierDeal; error?: string } {
  const q = quoteCinemaSupplierDeal(state, args);
  if (q.error) return { state, error: q.error };
  if ((state.ownedCinemas || []).length === 0) return { state, error: 'Build at least one owned cinema first.' };
  const rival = state.rivals.find(r => r.id === args.rivalStudioId)!;
  // Player pays rival upfront (this is a SUPPLY deal — rival gives access to their slate)
  if (state.player.cash < args.upfrontFeeM / 1000) return { state, error: `Need $${(args.upfrontFeeM / 1000).toFixed(2)}B cash.` };
  const player = { ...state.player, cash: +(state.player.cash - args.upfrontFeeM / 1000).toFixed(3) };
  const rivals = state.rivals.map(r => r.id === args.rivalStudioId ? { ...r, cash: +(r.cash + args.upfrontFeeM / 1000).toFixed(3) } : r);
  const deal: CinemaSupplierDeal = {
    id: uid('csd_'),
    rivalStudioId: args.rivalStudioId,
    signedWeek: state.week, signedYear: state.year,
    expiresWeek: state.week, expiresYear: state.year + args.years,
    upfrontFeeM: args.upfrontFeeM,
    upfrontPaidByPlayer: true,
    revShareToPlayer: q.revShareToPlayer,
    perReleaseKickbackM: q.perReleaseKickbackM,
    includeTraditional: args.includeTraditional,
    includeHybrid: args.includeHybrid,
    routedReleasesCount: 0,
    lifetimeRevenueToPlayerB: 0,
  };
  const news = [{ week: state.week, year: state.year, text: `🤝 ${state.player.name} signs ${args.years}-yr cinema supplier deal with ${rival.name} ($${(args.upfrontFeeM).toFixed(1)}M upfront; ${q.revShareToPlayer*100}% rev share).` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player, rivals, cinemaSupplierDeals: [...(state.cinemaSupplierDeals || []), deal], newsLog: news }, deal };
}

export function cancelCinemaSupplierDeal(state: GameState, dealId: string): { state: GameState; error?: string } {
  const list = (state.cinemaSupplierDeals || []).slice();
  const i = list.findIndex(d => d.id === dealId);
  if (i < 0) return { state, error: 'Deal not found.' };
  list.splice(i, 1);
  return { state: { ...state, cinemaSupplierDeals: list } };
}

// Process weekly supplier-deal effects: expire stale deals, grant kickbacks when rival films enter their first
// theatrical week, and pipe a synthetic boost of cinema-side revenue from those films to the player.
function tickCinemaSupplierDeals(state: GameState): GameState {
  const deals = state.cinemaSupplierDeals || [];
  if (deals.length === 0) return state;
  let player = state.player;
  let rivals = state.rivals.slice();
  const news = state.newsLog.slice();
  const ownedCinemasCount = (state.ownedCinemas || []).length;
  if (ownedCinemasCount === 0) return state;
  const updatedDeals: CinemaSupplierDeal[] = [];
  for (const d of deals) {
    // Expire
    const expired = d.expiresYear < state.year || (d.expiresYear === state.year && d.expiresWeek <= state.week);
    if (expired) {
      news.unshift({ week: state.week, year: state.year, text: `📜 Cinema supplier deal with ${state.rivals.find(r => r.id === d.rivalStudioId)?.name || 'rival'} expired.` });
      continue;
    }
    // Look at rival films released this week (just turned 'released' in current state)
    const rivalReleasesThisWeek = state.movies.filter(m =>
      m.studioId === d.rivalStudioId &&
      m.status === 'released' &&
      m.releaseWeek === state.week && m.releaseYear === state.year &&
      ((d.includeTraditional && (m.releaseStrategy || 'theatrical') === 'theatrical') || (d.includeHybrid && m.releaseStrategy === 'hybrid'))
    );
    let routed = 0;
    let extraRevenueB = 0;
    for (const m of rivalReleasesThisWeek) {
      routed++;
      // Rival pays kickback to player at release
      const i = rivals.findIndex(r => r.id === d.rivalStudioId);
      if (i >= 0 && rivals[i].cash >= d.perReleaseKickbackM / 1000) {
        rivals[i] = { ...rivals[i], cash: +(rivals[i].cash - d.perReleaseKickbackM / 1000).toFixed(3) };
        player = { ...player, cash: +(player.cash + d.perReleaseKickbackM / 1000).toFixed(3) };
      }
      // Pipe synthetic cinema-side revenue (~1% of expected lifetime BO routed through our cinemas)
      const expBOb = (m as any).boxOffice || 0.05;
      const slice = expBOb * 0.02 * Math.min(1, ownedCinemasCount / 100); // up to 2% routed via our cinemas
      extraRevenueB += slice * d.revShareToPlayer;
    }
    if (extraRevenueB > 0) {
      player = { ...player, cash: +(player.cash + extraRevenueB).toFixed(3) };
    }
    if (routed > 0) {
      news.unshift({ week: state.week, year: state.year, text: `🎬 ${routed} ${state.rivals.find(r => r.id === d.rivalStudioId)?.name || 'rival'} release${routed === 1 ? '' : 's'} routed into your cinemas (supplier deal).` });
    }
    updatedDeals.push({
      ...d,
      routedReleasesCount: d.routedReleasesCount + routed,
      lifetimeRevenueToPlayerB: +(d.lifetimeRevenueToPlayerB + extraRevenueB + (routed * d.perReleaseKickbackM / 1000)).toFixed(4),
    });
  }
  return { ...state, player, rivals, cinemaSupplierDeals: updatedDeals, newsLog: news.slice(0, 400) };
}



// =====================================================================
// V35 — TV NETWORKS SYSTEM
// =====================================================================

export function ensureTVNetworks(state: GameState): GameState {
  if (state.tvNetworks && state.tvNetworks.length >= TV_NETWORKS_SEED.length) return state;
  const existingIds = new Set((state.tvNetworks || []).map(n => n.id));
  const seeded: TVNetwork[] = TV_NETWORKS_SEED.filter(n => !existingIds.has(n.id)).map((n, idx) => {
    let ownerStudioId: string | undefined;
    if (state.rivals && state.rivals.length > 0 && idx % 3 === 0) {
      const r = state.rivals[idx % state.rivals.length];
      ownerStudioId = r.id;
    }
    return {
      id: n.id, name: n.name, region: n.region as TVNetworkRegion, kind: n.kind as TVChannelKind,
      subscribers: n.subscribers, reputation: n.reputation,
      ownerStudioId,
    };
  });
  return { ...state, tvNetworks: [...(state.tvNetworks || []), ...seeded] };
}

export function quoteTVNetworkDeal(state: GameState, args: { networkId: string; movieIds: string[]; years: number; exclusivity?: boolean }): { feeB: number; error?: string; kindMult: number } {
  const net = (state.tvNetworks || TV_NETWORKS_SEED.map(n => n as TVNetwork)).find(n => n.id === args.networkId);
  if (!net) return { feeB: 0, error: 'Network not found.', kindMult: 0 };
  const movies = state.movies.filter(m => args.movieIds.includes(m.id) && m.status === 'released');
  if (movies.length === 0) return { feeB: 0, error: 'No eligible released movies selected.', kindMult: 0 };
  const kindMult = net.kind === 'premium' ? 1.6 : net.kind === 'cable' ? 1.0 : 0.55;
  const subsBoost = Math.log10(Math.max(1, net.subscribers)) / 2;
  const repMult = 0.5 + (net.reputation / 100);
  const boSum = movies.reduce((s, m) => s + Math.max(0.02, m.boxOffice), 0);
  const yrsMult = 0.6 + Math.min(0.4, args.years * 0.05);
  const exclMult = args.exclusivity ? 1.5 : 1.0;
  const feeB = +(boSum * 0.08 * kindMult * (1 + subsBoost) * repMult * yrsMult * exclMult).toFixed(3);
  return { feeB, kindMult };
}

export function proposeTVNetworkDeal(state: GameState, args: { networkId: string; movieIds: string[]; askingFeeB: number; years: number; exclusivity?: boolean }): { state: GameState; error?: string; dealId?: string; counterFeeB?: number; accepted?: boolean } {
  const st0 = ensureTVNetworks(state);
  const net = (st0.tvNetworks || []).find(n => n.id === args.networkId);
  if (!net) return { state, error: 'Network not found.' };
  if (args.movieIds.length === 0) return { state, error: 'Select at least one movie.' };
  if (args.years < 1 || args.years > 10) return { state, error: 'Years must be 1–10.' };
  // V44 — Reject if any movie is locked exclusively elsewhere (streaming/cinema/etc.).
  for (const mid of args.movieIds) {
    const lock = findMovieExclusivityLock(state, mid);
    if (lock) {
      const movie = state.movies.find(m => m.id === mid);
      return { state, error: `🔒 "${movie?.title || mid}" is exclusively locked to ${lock.svcName} (${lock.ownerStudioName})${lock.expiresLabel ? ` until ${lock.expiresLabel}` : ''}.` };
    }
    const activeTvDeal = (st0.tvNetworkDeals || []).find(d => (d.status === 'active' || d.status === 'pending') && d.movieIds.includes(mid));
    if (activeTvDeal) {
      const movie = state.movies.find(m => m.id === mid);
      return { state, error: `📺 "${movie?.title || mid}" is already licensed or pending in an active TV network deal.` };
    }
  }
  const fair = quoteTVNetworkDeal(st0, { networkId: args.networkId, movieIds: args.movieIds, years: args.years, exclusivity: args.exclusivity }).feeB;
  if (fair <= 0) return { state, error: 'No eligible movies.' };
  const tolerance = 0.20;
  const minAccept = +(fair * (1 - tolerance)).toFixed(3);
  const maxAccept = +(fair * (1 + tolerance)).toFixed(3);
  let counterFeeB: number | undefined;
  let accepted = false;
  let finalFee = args.askingFeeB;
  if (args.askingFeeB <= maxAccept && args.askingFeeB >= minAccept) {
    accepted = true;
  } else if (args.askingFeeB > maxAccept) {
    counterFeeB = +((maxAccept + fair) / 2).toFixed(3);
    finalFee = counterFeeB;
    accepted = false;
  } else {
    accepted = true;
  }
  if (!accepted) {
    const dealId = uid('tvd');
    const deal: TVNetworkDeal = {
      id: dealId, networkId: net.id, studioId: state.player.id, movieIds: args.movieIds,
      feeB: counterFeeB || args.askingFeeB, years: args.years, startWeek: state.week, startYear: state.year,
      status: 'pending', exclusivity: !!args.exclusivity,
    };
    return { state: { ...st0, tvNetworkDeals: [...(st0.tvNetworkDeals || []), deal] }, dealId, counterFeeB, accepted: false };
  }
  const dealId = uid('tvd');
  const deal: TVNetworkDeal = {
    id: dealId, networkId: net.id, studioId: state.player.id, movieIds: args.movieIds,
    feeB: finalFee, years: args.years, startWeek: state.week, startYear: state.year,
    status: 'active', exclusivity: !!args.exclusivity,
  };
  const player = { ...state.player, cash: +(state.player.cash + finalFee).toFixed(3) };
  const newsLog = [{
    id: uid('news'), week: state.week, year: state.year, kind: 'license' as const,
    title: `${net.name} licensed ${args.movieIds.length} film${args.movieIds.length !== 1 ? 's' : ''} from you`,
    detail: `$${finalFee.toFixed(2)}B over ${args.years}yr${args.exclusivity ? ' (exclusive)' : ''}.`,
    text: `${net.name} licensed ${args.movieIds.length} film${args.movieIds.length !== 1 ? 's' : ''} from you: $${finalFee.toFixed(2)}B over ${args.years}yr${args.exclusivity ? ' (exclusive)' : ''}.`,
    color: 'green' as const,
  }, ...(state.newsLog || [])].slice(0, 400);
  return { state: { ...st0, player, tvNetworkDeals: [...(st0.tvNetworkDeals || []), deal], newsLog }, dealId, accepted: true };
}

export function acceptTVNetworkCounter(state: GameState, dealId: string): { state: GameState; error?: string } {
  const deal = (state.tvNetworkDeals || []).find(d => d.id === dealId);
  if (!deal) return { state, error: 'Deal not found.' };
  if (deal.status !== 'pending') return { state, error: 'Deal is not pending.' };
  const player = { ...state.player, cash: +(state.player.cash + deal.feeB).toFixed(3) };
  const tvNetworkDeals = (state.tvNetworkDeals || []).map(d => d.id === dealId ? { ...d, status: 'active' as const, startWeek: state.week, startYear: state.year } : d);
  return { state: { ...state, player, tvNetworkDeals } };
}

export function rejectTVNetworkCounter(state: GameState, dealId: string): { state: GameState } {
  const tvNetworkDeals = (state.tvNetworkDeals || []).filter(d => d.id !== dealId);
  return { state: { ...state, tvNetworkDeals } };
}

export function createPlayerTVChannel(state: GameState, args: { name: string; region: TVNetworkRegion; kind: TVChannelKind; genreFocus?: string[] }): { state: GameState; error?: string; networkId?: string } {
  const st0 = ensureTVNetworks(state);
  if (!args.name.trim()) return { state, error: 'Channel needs a name.' };
  const costB = args.kind === 'premium' ? 0.30 : args.kind === 'cable' ? 0.18 : 0.10;
  if (state.player.cash < costB) return { state, error: `Need $${costB.toFixed(2)}B cash to launch.` };
  const id = uid('tvn');
  const seedSubs = args.kind === 'premium' ? 0.5 : args.kind === 'cable' ? 1.2 : 3.5;
  const defaultFee = args.kind === 'premium' ? 14.99 : args.kind === 'cable' ? 6.99 : 0;
  const net: TVNetwork = {
    id, name: args.name.trim(), region: args.region, kind: args.kind,
    subscribers: +seedSubs.toFixed(1), reputation: 50, ownerStudioId: state.player.id,
    genreFocus: args.genreFocus, monthlyFeeUSD: defaultFee, programmingMovieIds: [], cableDistributionDeals: 0,
  };
  const player = { ...state.player, cash: +(state.player.cash - costB).toFixed(3) };
  return { state: { ...st0, player, tvNetworks: [...(st0.tvNetworks || []), net] }, networkId: id };
}

// V35 — player channel ops
export function setChannelMonthlyFee(state: GameState, channelId: string, feeUSD: number): { state: GameState; error?: string } {
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel not found or not yours.' };
  if (feeUSD < 0 || feeUSD > 50) return { state, error: 'Fee must be $0–50/month.' };
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === channelId ? { ...n, monthlyFeeUSD: feeUSD } : n);
  return { state: { ...state, tvNetworks } };
}

export function setChannelProgramming(state: GameState, channelId: string, movieIds: string[]): { state: GameState; error?: string } {
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel not found or not yours.' };
  // V41 — Per-network licensing: allow player-owned movies OR any movie covered by ANY active channelContentLicense the player holds (regardless of which channel the license was originally signed for). This lets the user reassign licensed content across their channels freely.
  const licensedMovieIds = new Set<string>();
  (state.channelContentLicenses || []).forEach(l => {
    if (l.status !== 'active') return;
    const licChannel = (state.tvNetworks || []).find(n => n.id === l.channelId);
    if (!licChannel || licChannel.ownerStudioId !== state.player.id) return;
    l.movieIds.forEach(mid => licensedMovieIds.add(mid));
  });
  const valid = movieIds.filter(mid => {
    const m = state.movies.find(mm => mm.id === mid);
    if (!m || m.status !== 'released') return false;
    if (m.studioId === state.player.id) return true;
    if (licensedMovieIds.has(mid)) return true;
    return false;
  });
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === channelId ? { ...n, programmingMovieIds: valid } : n);
  return { state: { ...state, tvNetworks } };
}

export function signCableDistributionDeal(state: GameState, channelId: string): { state: GameState; error?: string; costB?: number } {
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel not found or not yours.' };
  const current = ch.cableDistributionDeals || 0;
  if (current >= 4) return { state, error: 'Already maxed at 4 cable distribution deals.' };
  if (ch.kind === 'public') return { state, error: 'Public channels are already broadcast openly.' };
  const costB = 0.05 * (current + 1);
  if (state.player.cash < costB) return { state, error: `Need $${costB.toFixed(2)}B cash.` };
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === channelId ? { ...n, cableDistributionDeals: current + 1, subscribers: +(n.subscribers * 1.15).toFixed(2) } : n);
  const player = { ...state.player, cash: +(state.player.cash - costB).toFixed(3) };
  return { state: { ...state, player, tvNetworks }, costB };
}

export function tickTVNetworks(state: GameState): GameState {
  // Owned channel revenue: weekly subs * monthlyFee/4. Programming quality affects subscriber growth.
  let player = state.player;
  let networks = state.tvNetworks || [];
  let totalSubsInB = 0;
  let totalAdsInB = 0;
  let totalBroadcastB = 0;
  let totalMktB = 0;
  if (networks.length > 0) {
    networks = networks.map(n => {
      if (n.ownerStudioId !== state.player.id) return n;
      // Programming quality boosts subs; no programming → slow attrition
      const progCount = (n.programmingMovieIds || []).length;
      // V43 — Ad-programming ratio (default by kind): public 0.35, cable 0.15, premium 0.05.
      const adRatioDefault = n.kind === 'public' ? 0.35 : n.kind === 'cable' ? 0.15 : 0.05;
      const adRatio = Math.max(0, Math.min(1, n.adProgrammingRatio ?? adRatioDefault));
      // High ad ratio causes mild viewer attrition.
      const adAttrition = adRatio > 0.35 ? (adRatio - 0.35) * 0.02 : 0;
      let subsDelta = 0;
      if (progCount >= 5) subsDelta = +(n.subscribers * (0.01 - adAttrition)).toFixed(3);
      else if (progCount >= 1) subsDelta = +(n.subscribers * (0.003 - adAttrition)).toFixed(3);
      else subsDelta = -+(n.subscribers * (0.005 + adAttrition)).toFixed(3);
      // V43 — Marketing growth boost: $M/wk × 0.005 → cap +4% weekly bonus to growth.
      const mktBoost = Math.min(0.04, (n.marketingBudgetM || 0) * 0.005);
      if (mktBoost > 0) subsDelta += +(n.subscribers * mktBoost).toFixed(3);
      const newSubs = Math.max(0.1, +(n.subscribers + subsDelta).toFixed(2));
      // Weekly subscription revenue (public has no sub fees).
      const subFee = n.kind === 'public' ? 0 : (n.monthlyFeeUSD || 0);
      const weeklyRevenueM = +((n.subscribers * subFee) / 4).toFixed(3);
      // V43 — Weekly ad revenue: subs × adRatio × ad ARPU. Public channels rely on this.
      // Tuning: ad ARPU $/sub/mo by kind — public $6, cable $4, premium $2.
      const adArpu = n.kind === 'public' ? 6 : n.kind === 'cable' ? 4 : 2;
      const weeklyAdRevenueM = +((n.subscribers * adArpu * adRatio) / 4).toFixed(3);
      // V43 — Broadcast/infrastructure cost: base by kind + scaled by subs and programming.
      // public: $0.5M base + heavier per-sub; cable: $0.8M base; premium: $1.5M base + lighter per-sub.
      const base = n.kind === 'public' ? 0.5 : n.kind === 'cable' ? 0.8 : 1.5;
      const perSub = n.kind === 'public' ? 0.045 : n.kind === 'cable' ? 0.030 : 0.020;
      const perProg = 0.05;
      const weeklyBroadcastM = +(base + n.subscribers * perSub + progCount * perProg).toFixed(3);
      const mktM = n.marketingBudgetM || 0;
      const netM = weeklyRevenueM + weeklyAdRevenueM - weeklyBroadcastM - mktM;
      if (netM !== 0) {
        player = { ...player, cash: +(player.cash + netM / 1000).toFixed(3) };
      }
      totalSubsInB += weeklyRevenueM / 1000;
      totalAdsInB += weeklyAdRevenueM / 1000;
      totalBroadcastB += weeklyBroadcastM / 1000;
      totalMktB += mktM / 1000;
      return { ...n, subscribers: newSubs };
    });
  }
  if (!state.tvNetworkDeals || state.tvNetworkDeals.length === 0) {
    let s: GameState = { ...state, tvNetworks: networks, player };
    s = _bumpL(s, 'tvNetworkSubsInB', totalSubsInB);
    s = _bumpL(s, 'tvNetworkAdsInB', totalAdsInB);
    s = _bumpL(s, 'tvBroadcastB', totalBroadcastB);
    if (totalMktB > 0) s = _bumpL(s, 'marketingCostB', totalMktB);
    return s;
  }
  const nowKey = state.year * WEEKS_PER_YEAR + state.week;
  let franchises = [...state.franchises];
  let streamingServices = [...(state.streamingServices || [])];
  const updatedDeals = state.tvNetworkDeals.map(d => {
    if (d.status !== 'active') return d;
    const startKey = d.startYear * WEEKS_PER_YEAR + d.startWeek;
    const endKey = startKey + d.years * WEEKS_PER_YEAR;
    if (nowKey >= endKey) return { ...d, status: 'expired' as const };
    const moviesInDeal = state.movies.filter(m => d.movieIds.includes(m.id));
    const fids = new Set(moviesInDeal.map(m => m.franchiseId).filter(Boolean) as string[]);
    franchises = franchises.map(f => fids.has(f.id) ? { ...f, popularity: Math.min(100, +(f.popularity + 0.05).toFixed(2)) } : f);
    streamingServices = streamingServices.map(sv => ({ ...sv, popularity: Math.max(20, +((sv.popularity ?? 50) - 0.02).toFixed(2)) }));
    return d;
  });
  let s2: GameState = { ...state, tvNetworkDeals: updatedDeals, franchises, streamingServices, tvNetworks: networks, player };
  s2 = _bumpL(s2, 'tvNetworkSubsInB', totalSubsInB);
  s2 = _bumpL(s2, 'tvNetworkAdsInB', totalAdsInB);
  s2 = _bumpL(s2, 'tvBroadcastB', totalBroadcastB);
  if (totalMktB > 0) s2 = _bumpL(s2, 'marketingCostB', totalMktB);
  return s2;
}

// =====================================================================
// V35 — TV SERIES, CHANNEL PACKS, INBOUND CHANNEL LICENSING
// =====================================================================

// Production duration scales with episode count: ~1.5 weeks per episode + base setup (V35 — 3× longer per user feedback).
function seasonProductionWeeks(episodes: number): number {
  return Math.max(18, Math.round(12 + episodes * 1.5));
}

export function createTVSeries(state: GameState, args: {
  title: string;
  brand?: 'sequel' | 'prequel' | 'spinoff' | 'original';
  franchiseId?: string;
  seasons: number;             // initial seasons greenlit (1..5)
  episodesPerSeason: number;   // 6..22
  budgetMPerSeason: number;    // $M per season (eg 30..200)
  releaseStrategy: TVReleaseStrategy;
  streamingTargetServiceId?: string;
  streamingTargetTierIds?: string[];
  streamingWindowWeeks?: number;
  tvNetworkId?: string;
  // V36 — Hybrid priority (TV-first vs Streaming-first)
  hybridPriority?: 'tv_first' | 'streaming_first';
  // V36 — Optional cast/crew
  writerId?: string;
  directorId?: string;
  cast?: {
    talentId: string;
    role: 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress';
    dealType?: 'actor_favored' | 'middle' | 'studio_favored';
    contractKind?: 'single' | 'pack3' | 'hold5y';
  }[];
}): { state: GameState; error?: string; seriesId?: string } {
  if (!args.title.trim()) return { state, error: 'Title required.' };
  if (args.seasons < 1 || args.seasons > 5) return { state, error: 'Seasons must be 1–5.' };
  if (args.episodesPerSeason < 6 || args.episodesPerSeason > 22) return { state, error: 'Episodes must be 6–22.' };
  if (args.budgetMPerSeason < 10) return { state, error: 'Budget must be at least $10M per season.' };
  if (args.releaseStrategy === 'streaming' && !args.streamingTargetServiceId) return { state, error: 'Pick a streaming service.' };
  if (args.releaseStrategy === 'tv' && !args.tvNetworkId) return { state, error: 'Pick a TV network.' };
  if (args.releaseStrategy === 'hybrid' && (!args.streamingTargetServiceId || !args.tvNetworkId)) return { state, error: 'Hybrid needs both a streaming service and a TV network.' };
  const totalBudgetB = (args.budgetMPerSeason * args.seasons) / 1000;
  if (state.player.cash < totalBudgetB) return { state, error: `Need $${totalBudgetB.toFixed(2)}B cash for ${args.seasons} season${args.seasons !== 1 ? 's' : ''}.` };

  // V36 — Validate cast/crew availability (writer, director, cast)
  const involvedIds = [args.writerId, args.directorId, ...(args.cast || []).map(c => c.talentId)].filter(Boolean) as string[];
  for (const tid of involvedIds) {
    const tt = state.talents.find(x => x.id === tid);
    if (!tt) return { state, error: 'A selected talent is unavailable.' };
    const av = talentAvailability(tt, state.week, state.year);
    if (!av.available) {
      if (av.reason === 'Cooldown') return { state, error: `${tt.name} is in cooldown for ${av.cooldownWeeksLeft} more week(s).` };
      if (av.reason === 'In production') return { state, error: `${tt.name} is already locked in another production.` };
      return { state, error: `${tt.name} is unavailable: ${av.reason}.` };
    }
  }
  // Enriched cast salaries
  const enrichedCast = (args.cast || []).map(c => {
    const t = state.talents.find(tt => tt.id === c.talentId);
    if (!t) return null;
    const isLead = c.role.startsWith('lead_');
    const roleMult = isLead ? 1.0 : 0.5;
    const dt = c.dealType ? dealTerms(t.salary, c.dealType) : { salary: t.salary, boPercent: 0 };
    const ck = c.contractKind || 'single';
    const cm = contractTerms(ck).multiplier;
    return { talentId: c.talentId, role: c.role, salary: +(dt.salary * 0.6 * cm * roleMult).toFixed(2) }; // TV pays ~60% of movie rate, with contract multiplier and role multiplier
  }).filter(Boolean) as NonNullable<TVSeries['cast']>;

  const seriesId = uid('tvs');
  const seasons = Array.from({ length: args.seasons }, (_, i) => ({
    number: i + 1,
    episodes: args.episodesPerSeason,
    budgetM: args.budgetMPerSeason,
  }));
  const totalWeeks = seasonProductionWeeks(args.episodesPerSeason);
  const series: TVSeries = {
    id: seriesId,
    title: args.title.trim(),
    studioId: state.player.id,
    franchiseId: args.franchiseId,
    brand: args.brand || 'original',
    status: 'in_production',
    releaseYear: state.year,
    releaseWeek: state.week,
    releaseStrategy: args.releaseStrategy,
    hybridPriority: args.releaseStrategy === 'hybrid' ? (args.hybridPriority || 'tv_first') : undefined,
    streamingTargetServiceId: args.streamingTargetServiceId,
    streamingTargetTierIds: args.streamingTargetTierIds,
    streamingWindowWeeks: args.streamingWindowWeeks ?? (args.releaseStrategy === 'hybrid' ? 4 : undefined),
    tvNetworkId: args.tvNetworkId,
    seasons,
    productionSeason: 1,
    productionWeeksLeft: totalWeeks,
    productionTotalWeeks: totalWeeks,
    writerId: args.writerId,
    directorId: args.directorId,
    cast: enrichedCast.length > 0 ? enrichedCast : undefined,
  };
  const player = { ...state.player, cash: +(state.player.cash - totalBudgetB).toFixed(3) };
  // Lock talents to this series id
  const talents = state.talents.map(t => involvedIds.includes(t.id) ? { ...t, inProductionMovieId: seriesId } : t);
  const tvSeries = [...(state.tvSeries || []), series];
  const newsLog = [{
    id: uid('news'), week: state.week, year: state.year, kind: 'production' as const,
    title: `Series greenlit: ${series.title}`,
    detail: `${args.seasons} season${args.seasons !== 1 ? 's' : ''} × ${args.episodesPerSeason} eps · $${totalBudgetB.toFixed(2)}B committed · ${args.releaseStrategy}${args.releaseStrategy === 'hybrid' ? ` (${series.hybridPriority === 'streaming_first' ? 'Streaming-first' : 'TV-first'})` : ''}`,
    text: `Series greenlit: ${series.title}. ${args.seasons} season${args.seasons !== 1 ? 's' : ''} × ${args.episodesPerSeason} eps · $${totalBudgetB.toFixed(2)}B committed · ${args.releaseStrategy}`,
    color: 'magenta' as const,
  }, ...(state.newsLog || [])].slice(0, 400);
  return { state: { ...state, player, talents, tvSeries, newsLog }, seriesId };
}

export function renewTVSeries(state: GameState, seriesId: string, args: { episodes: number; budgetM: number }): { state: GameState; error?: string } {
  const series = (state.tvSeries || []).find(s => s.id === seriesId);
  if (!series || series.studioId !== state.player.id) return { state, error: 'Series not found.' };
  if (series.status === 'cancelled') return { state, error: 'Series was cancelled.' };
  if (args.episodes < 6 || args.episodes > 22) return { state, error: 'Episodes must be 6–22.' };
  if (args.budgetM < 10) return { state, error: 'Budget must be $10M+.' };
  const costB = args.budgetM / 1000;
  if (state.player.cash < costB) return { state, error: `Need $${costB.toFixed(2)}B cash.` };
  const nextNum = series.seasons.length + 1;
  const nextSeasons = [...series.seasons, { number: nextNum, episodes: args.episodes, budgetM: args.budgetM, renewed: true }];
  const tvSeries = (state.tvSeries || []).map(s => s.id === seriesId ? {
    ...s,
    seasons: nextSeasons,
    productionSeason: s.productionSeason || nextNum,
    productionWeeksLeft: s.productionWeeksLeft || seasonProductionWeeks(args.episodes),
    status: 'in_production' as const,
  } : s);
  const player = { ...state.player, cash: +(state.player.cash - costB).toFixed(3) };
  return { state: { ...state, player, tvSeries } };
}

// Weekly tick: advance TV series production, release seasons, apply impact.
export function tickTVSeries(state: GameState): GameState {
  if (!state.tvSeries || state.tvSeries.length === 0) return state;
  let franchises = [...state.franchises];
  let streamingServices = [...(state.streamingServices || [])];
  let player = state.player;
  let talents = state.talents;
  const newsLog: typeof state.newsLog = [];
  const tvSeries = state.tvSeries.map(s => {
    if (s.status === 'cancelled') return s;
    if (s.productionWeeksLeft === undefined || s.productionWeeksLeft <= 0) return s;
    const remaining = s.productionWeeksLeft - 1;
    if (remaining > 0) {
      return { ...s, productionWeeksLeft: remaining };
    }
    // Season finished — release it
    const seasonNum = s.productionSeason || 1;
    let computedAvgScore = 55 + Math.floor(Math.random() * 35);
    try {
      const writer = talents.find(t => t.id === s.writerId);
      const director = talents.find(t => t.id === s.directorId);
      const castT = (s.cast || []).map(c => talents.find(t => t.id === c.talentId)!).filter(Boolean);
      const writerSkill = writer ? writer.skill : 60;
      const directorSkill = director ? director.skill : 60;
      const avgCastSkill = castT.length ? castT.reduce((a, b) => a + b.skill, 0) / castT.length : 60;
      const baseTvScore = (writerSkill * 0.3 + directorSkill * 0.3 + avgCastSkill * 0.4);
      computedAvgScore = Math.max(30, Math.min(100, Math.round(baseTvScore + (Math.random() * 16 - 8))));
    } catch (e) {
      // fallback
    }
    const releasedSeasons = s.seasons.map(sn => sn.number === seasonNum ? { ...sn, releaseWeek: state.week, releaseYear: state.year, avgScore: computedAvgScore } : sn);
    // Franchise popularity boost (small for tv)
    if (s.franchiseId) {
      franchises = franchises.map(f => f.id === s.franchiseId ? { ...f, popularity: Math.min(100, +(f.popularity + 2).toFixed(2)) } : f);
    }
    // Streaming service subscriber boost (if streaming or hybrid)
    if ((s.releaseStrategy === 'streaming' || s.releaseStrategy === 'hybrid') && s.streamingTargetServiceId) {
      const subsBonus = Math.round(80_000 + Math.random() * 220_000);
      streamingServices = streamingServices.map(sv => sv.id === s.streamingTargetServiceId
        ? { ...sv, subscribers: sv.subscribers + subsBonus, popularity: Math.min(100, +((sv.popularity ?? 50) + 1).toFixed(2)) }
        : sv);
    }
    // TV revenue (if tv or hybrid) — flat fee from network based on subs
    if ((s.releaseStrategy === 'tv' || s.releaseStrategy === 'hybrid') && s.tvNetworkId) {
      const net = (state.tvNetworks || []).find(n => n.id === s.tvNetworkId);
      if (net) {
        const ep = s.seasons.find(sn => sn.number === seasonNum)?.episodes || 10;
        const feeB = +(net.subscribers * 0.008 * (net.kind === 'premium' ? 1.5 : net.kind === 'cable' ? 1.0 : 0.6) * (ep / 10)).toFixed(3);
        player = { ...player, cash: +(player.cash + feeB).toFixed(3) };
        newsLog.push({ id: uid('news'), week: state.week, year: state.year, kind: 'license' as const, title: `${net.name} aired ${s.title} S${seasonNum}`, detail: `+$${feeB.toFixed(2)}B license fee.`, text: `${net.name} aired ${s.title} S${seasonNum}: +$${feeB.toFixed(2)}B license fee.`, color: 'green' as const });
      }
    }
    // V36 — Hybrid priority indicator in main release headline
    const hybridLabel = s.releaseStrategy === 'hybrid'
      ? (s.hybridPriority === 'streaming_first' ? 'Streaming-first hybrid' : 'TV-first hybrid')
      : (s.releaseStrategy === 'tv' ? 'On TV' : 'Streaming exclusive');
    const fullyReleased = seasonNum >= s.seasons.length;
    newsLog.push({ id: uid('news'), week: state.week, year: state.year, kind: 'release' as const, title: `${s.title} — Season ${seasonNum} premiered`, detail: `${hybridLabel} · ${releasedSeasons[seasonNum - 1].avgScore}/100`, text: `${s.title} — Season ${seasonNum} premiered. ${hybridLabel} · ${releasedSeasons[seasonNum - 1].avgScore}/100`, color: 'cyan' as const });
    const nextEps = !fullyReleased ? (s.seasons[seasonNum]?.episodes || 10) : 0;
    const nextWeeks = !fullyReleased ? seasonProductionWeeks(nextEps) : undefined;
    // V36 — Free locked talents when fully released (3-week cooldown like movies)
    if (fullyReleased) {
      const involved = [s.writerId, s.directorId, ...((s.cast || []).map(c => c.talentId))].filter(Boolean) as string[];
      if (involved.length > 0) {
        let cdW = state.week + 3; let cdY = state.year;
        while (cdW > WEEKS_PER_YEAR) { cdW -= WEEKS_PER_YEAR; cdY += 1; }
        talents = talents.map(t => {
          if (involved.includes(t.id)) {
            let uc = t.underContract;
            if (uc) {
              const rem = uc.remainingMovies - 1;
              if (rem <= 0) {
                uc = undefined;
                newsLog.push({
                  week: state.week,
                  year: state.year,
                  text: `📝 Studio contract with ${t.name} has concluded (wrapped up ${s.title}).`
                });
              } else {
                uc = { ...uc, remainingMovies: rem };
              }
            }
            return { ...t, inProductionMovieId: undefined, availableFromWeek: cdW, availableFromYear: cdY, underContract: uc };
          }
          return t;
        });
      }
    }
    return {
      ...s,
      seasons: releasedSeasons,
      status: 'released' as const,
      productionSeason: fullyReleased ? undefined : seasonNum + 1,
      productionWeeksLeft: nextWeeks,
      productionTotalWeeks: nextWeeks,
    };
  });
  // V43 — TV series marketing budget deduction (player-side only, while in production or first 12 weeks after S1 release).
  let totalMktB = 0;
  tvSeries.forEach(sr => {
    if (sr.studioId !== state.player.id) return;
    if (!sr.marketingBudgetM || sr.marketingBudgetM <= 0) return;
    const inProd = sr.status === 'in_production' || (sr.productionWeeksLeft !== undefined && sr.productionWeeksLeft > 0);
    // Active for 12 weeks past last released season
    const lastReleased = sr.seasons.filter(sn => sn.releaseWeek !== undefined && sn.releaseYear !== undefined).pop();
    const recentlyReleased = lastReleased && lastReleased.releaseWeek !== undefined && lastReleased.releaseYear !== undefined
      ? ((state.year * WEEKS_PER_YEAR + state.week) - (lastReleased.releaseYear * WEEKS_PER_YEAR + lastReleased.releaseWeek)) <= 12
      : false;
    if (!inProd && !recentlyReleased) return;
    totalMktB += sr.marketingBudgetM / 1000;
  });
  if (totalMktB > 0) {
    player = { ...player, cash: +(player.cash - totalMktB).toFixed(3) };
  }
  let result: GameState = {
    ...state,
    tvSeries,
    franchises,
    streamingServices,
    player,
    talents,
    newsLog: [...newsLog, ...(state.newsLog || [])].slice(0, 400),
  };
  if (totalMktB > 0) result = _bumpL(result, 'marketingCostB', totalMktB);
  return result;
}

// =====================================================================
// CHANNEL PACKS
// =====================================================================
export function createChannelPack(state: GameState, args: { name: string; channelIds: string[]; monthlyFeeUSD: number; pricingByTier?: { budget: number; standard: number; premium: number } }): { state: GameState; error?: string; packId?: string } {
  if (!args.name.trim()) return { state, error: 'Pack name required.' };
  if (args.channelIds.length < 2) return { state, error: 'Pick at least 2 channels.' };
  const owned = (state.tvNetworks || []).filter(n => n.ownerStudioId === state.player.id);
  const ownedIds = new Set(owned.map(n => n.id));
  if (!args.channelIds.every(id => ownedIds.has(id))) return { state, error: 'Only your own channels can join the pack.' };
  if (args.monthlyFeeUSD < 0 || args.monthlyFeeUSD > 100) return { state, error: 'Fee must be $0–100.' };
  if (args.pricingByTier) {
    const t = args.pricingByTier;
    if (t.budget < 0 || t.budget > 200 || t.standard < 0 || t.standard > 200 || t.premium < 0 || t.premium > 200) return { state, error: 'Tier prices must be $0–200.' };
  }
  // Initial pack subscribers = average of constituent subs × bundle synergy factor (1 + 0.10 × N)
  const packChannels = owned.filter(n => args.channelIds.includes(n.id));
  const avgSubs = packChannels.reduce((s, n) => s + n.subscribers, 0) / packChannels.length;
  const synergy = 1 + 0.10 * args.channelIds.length;
  const seedSubs = +(avgSubs * 0.30 * synergy).toFixed(2);
  const pack: ChannelPack = {
    id: uid('pack'),
    name: args.name.trim(),
    ownerStudioId: state.player.id,
    channelIds: args.channelIds,
    monthlyFeeUSD: args.monthlyFeeUSD,
    subscribers: seedSubs,
    createdWeek: state.week,
    createdYear: state.year,
    pricingByTier: args.pricingByTier,
  };
  return { state: { ...state, channelPacks: [...(state.channelPacks || []), pack] }, packId: pack.id };
}

// V39 — Update tier-aware pricing on an existing pack (player-only).
export function setChannelPackTierPricing(state: GameState, packId: string, pricing: { budget: number; standard: number; premium: number } | null): { state: GameState; error?: string } {
  const packs = state.channelPacks || [];
  const idx = packs.findIndex(p => p.id === packId);
  if (idx < 0) return { state, error: 'Pack not found.' };
  if (packs[idx].ownerStudioId !== state.player.id) return { state, error: 'Not your pack.' };
  if (pricing) {
    if (pricing.budget < 0 || pricing.budget > 200 || pricing.standard < 0 || pricing.standard > 200 || pricing.premium < 0 || pricing.premium > 200) return { state, error: 'Tier prices must be $0–200.' };
  }
  const next = packs.slice();
  next[idx] = { ...next[idx], pricingByTier: pricing || undefined };
  return { state: { ...state, channelPacks: next } };
}

// V41 — Bulk-add a series to multiple owned channels at once (used by series creator multi-pick)
export function addSeriesToChannels(state: GameState, seriesId: string, channelIds: string[]): { state: GameState; error?: string } {
  const series = (state.tvSeries || []).find(s => s.id === seriesId);
  if (!series) return { state, error: 'Series not found.' };
  if (series.studioId !== state.player.id) return { state, error: 'Not your series.' };
  const validChannels = (state.tvNetworks || []).filter(n => n.ownerStudioId === state.player.id && channelIds.includes(n.id));
  if (validChannels.length === 0) return { state, error: 'No owned channels selected.' };
  const tvNetworks = (state.tvNetworks || []).map(n => {
    if (!channelIds.includes(n.id) || n.ownerStudioId !== state.player.id) return n;
    const existing = n.programmingSeriesIds || [];
    if (existing.includes(seriesId)) return n;
    return { ...n, programmingSeriesIds: [...existing, seriesId] };
  });
  return { state: { ...state, tvNetworks } };
}

// --- V41 — PLAYER CABLE CARRIAGE NETWORK -------------------------------
// Player-run cable distribution business. Player creates their own cable network,
// licenses TV channels (rival or own) at per-sub-per-month, then sells tiered packages
// to subscribers. Competes against AI cable providers (passive — AI providers stay seeded).
export function createPlayerCableNetwork(state: GameState, args: { name: string; region: TVNetworkRegion }): { state: GameState; error?: string; networkId?: string } {
  if (!args.name.trim()) return { state, error: 'Name required.' };
  if (state.player.cash < 0.5) return { state, error: 'Need $0.5B to launch a cable network.' };
  const id = uid('pcn_');
  const newNet: import('./types').PlayerCableNetwork = {
    id, name: args.name.trim(), region: args.region, ownerStudioId: state.player.id,
    subscribers: 0.5, // start with 0.5M founding subs
    reputation: 50,
    createdWeek: state.week, createdYear: state.year,
    carriedChannelLicenses: [],
    tiers: [
      { id: uid('pct_'), name: 'Basic', monthlyFeeUSD: 9.99, channelIds: [], subscribers: 0.3, ppvEnabled: false },
      { id: uid('pct_'), name: 'Standard', monthlyFeeUSD: 19.99, channelIds: [], subscribers: 0.15, ppvEnabled: false },
      { id: uid('pct_'), name: 'Premium', monthlyFeeUSD: 39.99, channelIds: [], subscribers: 0.05, ppvEnabled: true },
    ],
    lifetimeRevenueB: 0,
  };
  const player = { ...state.player, cash: +(state.player.cash - 0.5).toFixed(3) };
  const playerCableNetworks = [...(state.playerCableNetworks || []), newNet];
  const newsLog = [{ week: state.week, year: state.year, text: `📡 ${state.player.name} launches "${newNet.name}" — a new cable carrier in ${newNet.region}.` }, ...state.newsLog].slice(0, 400);
  return { state: { ...state, player, playerCableNetworks, newsLog }, networkId: id };
}

export function deletePlayerCableNetwork(state: GameState, networkId: string): { state: GameState; error?: string } {
  const list = state.playerCableNetworks || [];
  const idx = list.findIndex(n => n.id === networkId);
  if (idx < 0) return { state, error: 'Not found.' };
  const refundB = +(list[idx].subscribers * 0.05).toFixed(2);
  const player = { ...state.player, cash: +(state.player.cash + refundB).toFixed(3) };
  return { state: { ...state, player, playerCableNetworks: list.filter(n => n.id !== networkId) } };
}

export function renamePlayerCableNetwork(state: GameState, networkId: string, newName: string): { state: GameState; error?: string } {
  if (!newName.trim()) return { state, error: 'Name required.' };
  const list = (state.playerCableNetworks || []).map(n => n.id === networkId ? { ...n, name: newName.trim() } : n);
  return { state: { ...state, playerCableNetworks: list } };
}

export function addChannelToPlayerCable(state: GameState, networkId: string, channelId: string, feePerSubPerMonthUSD: number): { state: GameState; error?: string } {
  const net = (state.playerCableNetworks || []).find(n => n.id === networkId);
  if (!net) return { state, error: 'Cable network not found.' };
  const ch = (state.tvNetworks || []).find(c => c.id === channelId);
  if (!ch) return { state, error: 'Channel not found.' };
  if (ch.region !== net.region) return { state, error: `Region mismatch: channel is ${ch.region}, network is ${net.region}.` };
  if (net.carriedChannelLicenses.some(c => c.channelId === channelId)) return { state, error: 'Already carrying this channel.' };
  if (feePerSubPerMonthUSD < 0 || feePerSubPerMonthUSD > 5) return { state, error: 'Fee must be $0–5 per sub per month.' };
  const newLic = { channelId, feePerSubPerMonthUSD, signedWeek: state.week, signedYear: state.year, years: 3 };
  // V42c — Default: when a channel is licensed, add it to ALL tiers automatically.
  // Premium channels get added to all tiers (player can remove from cheaper tiers manually).
  // This matches the user's "default toggled in, tap to remove" UX expectation.
  const playerCableNetworks = (state.playerCableNetworks || []).map(n => n.id === networkId ? {
    ...n,
    carriedChannelLicenses: [...n.carriedChannelLicenses, newLic],
    tiers: n.tiers.map(t => t.channelIds.includes(channelId) ? t : { ...t, channelIds: [...t.channelIds, channelId] }),
  } : n);
  return { state: { ...state, playerCableNetworks } };
}

export function removeChannelFromPlayerCable(state: GameState, networkId: string, channelId: string): { state: GameState; error?: string } {
  const playerCableNetworks = (state.playerCableNetworks || []).map(n => n.id === networkId ? { ...n, carriedChannelLicenses: n.carriedChannelLicenses.filter(c => c.channelId !== channelId), tiers: n.tiers.map(t => ({ ...t, channelIds: t.channelIds.filter(cid => cid !== channelId) })) } : n);
  return { state: { ...state, playerCableNetworks } };
}

export function setPlayerCableTier(state: GameState, networkId: string, tierId: string, patch: { name?: string; monthlyFeeUSD?: number; channelIds?: string[]; includedStreamingServiceIds?: string[]; includedStreamingTiers?: { serviceId: string; tierId: string }[]; includedChannelPackIds?: string[]; ppvEnabled?: boolean }): { state: GameState; error?: string } {
  if (patch.name !== undefined && (!patch.name.trim() || patch.name.length > 32)) return { state, error: 'Tier name 1-32 chars.' };
  if (patch.monthlyFeeUSD !== undefined && (patch.monthlyFeeUSD < 0 || patch.monthlyFeeUSD > 200)) return { state, error: 'Fee must be $0–200.' };
  const cleanPatch = patch.name !== undefined ? { ...patch, name: patch.name.trim() } : patch;
  const playerCableNetworks = (state.playerCableNetworks || []).map(n => {
    if (n.id !== networkId) return n;
    const tiers = n.tiers.map(t => t.id === tierId ? { ...t, ...cleanPatch } : t);
    return { ...n, tiers };
  });
  return { state: { ...state, playerCableNetworks } };
}

export function addPlayerCableTier(state: GameState, networkId: string, name: string, monthlyFeeUSD: number): { state: GameState; error?: string } {
  if (!name.trim()) return { state, error: 'Name required.' };
  if (monthlyFeeUSD < 0 || monthlyFeeUSD > 200) return { state, error: 'Fee must be $0–200.' };
  const playerCableNetworks = (state.playerCableNetworks || []).map(n => n.id === networkId ? { ...n, tiers: [...n.tiers, { id: uid('pct_'), name: name.trim(), monthlyFeeUSD: +monthlyFeeUSD.toFixed(2), channelIds: [], subscribers: 0, ppvEnabled: false }] } : n);
  return { state: { ...state, playerCableNetworks } };
}

export function deletePlayerCableTier(state: GameState, networkId: string, tierId: string): { state: GameState } {
  const playerCableNetworks = (state.playerCableNetworks || []).map(n => n.id === networkId ? { ...n, tiers: n.tiers.filter(t => t.id !== tierId) } : n);
  return { state: { ...state, playerCableNetworks } };
}

// Weekly tick for player cable networks
export function tickPlayerCableNetworks(state: GameState): GameState {
  const list = state.playerCableNetworks || [];
  if (list.length === 0) return state;
  let player = state.player;
  const channelOwners: Record<string, number> = {}; // ownerId → $M owed
  const newNets = list.map(net => {
    // Compute total subs across tiers
    const totalSubs = net.tiers.reduce((s, t) => s + t.subscribers, 0);
    // Subscriber growth/loss: based on # channels carried × reputation × competition
    const chCount = net.carriedChannelLicenses.length;
    const avgTierPrice = net.tiers.length > 0 ? net.tiers.reduce((s, t) => s + t.monthlyFeeUSD, 0) / net.tiers.length : 0;
    const priceFactor = avgTierPrice < 15 ? 1.015 : avgTierPrice < 25 ? 1.005 : avgTierPrice < 40 ? 0.998 : 0.985;
    const contentFactor = 1 + Math.min(0.02, chCount * 0.002);
    const mktBoost = Math.min(0.04, (net.marketingBudgetM || 0) * 0.005);
    const growthRate = priceFactor * contentFactor - 1 + mktBoost;
    const newTiers = net.tiers.map(t => {
      const grow = t.subscribers * growthRate;
      return { ...t, subscribers: +Math.max(0, t.subscribers + grow).toFixed(3) };
    });
    const newTotalSubs = newTiers.reduce((s, t) => s + t.subscribers, 0);
    // Weekly revenue from tiers
    const weeklyRevM = newTiers.reduce((s, t) => s + (t.subscribers * t.monthlyFeeUSD) / 4, 0);
    // Pay channel owners (carriage fees) - per sub per month / 4 weeks
    let weeklyCostM = 0;
    net.carriedChannelLicenses.forEach(lic => {
      const cost = (newTotalSubs * lic.feePerSubPerMonthUSD) / 4;
      weeklyCostM += cost;
      const ch = (state.tvNetworks || []).find(c => c.id === lic.channelId);
      if (ch && ch.ownerStudioId) channelOwners[ch.ownerStudioId] = (channelOwners[ch.ownerStudioId] || 0) + cost;
    });
    const netRevM = weeklyRevM - weeklyCostM;
    player = { ...player, cash: +(player.cash + netRevM / 1000).toFixed(3) };
    return { ...net, subscribers: +newTotalSubs.toFixed(3), tiers: newTiers, lifetimeRevenueB: +(net.lifetimeRevenueB + netRevM / 1000).toFixed(3) };
  });
  // Channel owners receive their carriage payments (rivals get $; player's own channels feed back to player which we already credited net)
  let rivals = state.rivals;
  Object.entries(channelOwners).forEach(([ownerId, amountM]) => {
    if (ownerId === state.player.id) return; // already net
    rivals = rivals.map(r => r.id === ownerId ? { ...r, cash: +(r.cash + amountM / 1000).toFixed(3) } : r);
  });
  // V43 — Aggregate ledger: split gross subs revenue and gross carriage cost outflow.
  let totalRevM = 0; let totalCostM = 0; let totalMktB = 0;
  newNets.forEach((n, idx) => {
    const orig = list[idx];
    void orig;
    const r = n.tiers.reduce((s, t) => s + (t.subscribers * t.monthlyFeeUSD) / 4, 0);
    totalRevM += r;
    n.carriedChannelLicenses.forEach(lic => { totalCostM += (n.subscribers * lic.feePerSubPerMonthUSD) / 4; });
    totalMktB += (n.marketingBudgetM || 0) / 1000;
  });
  if (totalMktB > 0) player = { ...player, cash: +(player.cash - totalMktB).toFixed(3) };
  let s3: GameState = { ...state, player, rivals, playerCableNetworks: newNets };
  s3 = _bumpL(s3, 'playerCableSubsInB', totalRevM / 1000);
  s3 = _bumpL(s3, 'cableCarriageOutB', totalCostM / 1000);
  if (totalMktB > 0) s3 = _bumpL(s3, 'marketingCostB', totalMktB);
  return s3;
}

export function deleteChannelPack(state: GameState, packId: string): { state: GameState } {
  return { state: { ...state, channelPacks: (state.channelPacks || []).filter(p => p.id !== packId) } };
}

// V41 — Rename a channel pack (player-only).
export function renameChannelPack(state: GameState, packId: string, newName: string): { state: GameState; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) return { state, error: 'Name required.' };
  if (trimmed.length > 32) return { state, error: 'Max 32 chars.' };
  const packs = state.channelPacks || [];
  const idx = packs.findIndex(p => p.id === packId);
  if (idx < 0) return { state, error: 'Pack not found.' };
  if (packs[idx].ownerStudioId !== state.player.id) return { state, error: 'Not your pack.' };
  const next = packs.slice();
  next[idx] = { ...next[idx], name: trimmed };
  return { state: { ...state, channelPacks: next } };
}

// V41 — Set the flat monthly fee for a channel pack (keyboard input).
export function setChannelPackMonthlyFee(state: GameState, packId: string, monthlyFeeUSD: number): { state: GameState; error?: string } {
  if (!isFinite(monthlyFeeUSD) || monthlyFeeUSD < 0 || monthlyFeeUSD > 200) return { state, error: 'Fee must be $0–200.' };
  const packs = state.channelPacks || [];
  const idx = packs.findIndex(p => p.id === packId);
  if (idx < 0) return { state, error: 'Pack not found.' };
  if (packs[idx].ownerStudioId !== state.player.id) return { state, error: 'Not your pack.' };
  const next = packs.slice();
  next[idx] = { ...next[idx], monthlyFeeUSD: +monthlyFeeUSD.toFixed(2) };
  return { state: { ...state, channelPacks: next } };
}

// V42 — Add a player-owned channel to an existing pack.
export function addChannelToPack(state: GameState, packId: string, channelId: string): { state: GameState; error?: string } {
  const packs = state.channelPacks || [];
  const idx = packs.findIndex(p => p.id === packId);
  if (idx < 0) return { state, error: 'Pack not found.' };
  if (packs[idx].ownerStudioId !== state.player.id) return { state, error: 'Not your pack.' };
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel must be owned by you.' };
  if (packs[idx].channelIds.includes(channelId)) return { state, error: 'Already in pack.' };
  const next = packs.slice();
  next[idx] = { ...next[idx], channelIds: [...next[idx].channelIds, channelId] };
  return { state: { ...state, channelPacks: next } };
}

// V42 — Remove a channel from a pack (keeps at least 2 channels).
export function removeChannelFromPack(state: GameState, packId: string, channelId: string): { state: GameState; error?: string } {
  const packs = state.channelPacks || [];
  const idx = packs.findIndex(p => p.id === packId);
  if (idx < 0) return { state, error: 'Pack not found.' };
  if (packs[idx].ownerStudioId !== state.player.id) return { state, error: 'Not your pack.' };
  if (packs[idx].channelIds.length <= 2) return { state, error: 'Pack needs at least 2 channels.' };
  const next = packs.slice();
  next[idx] = { ...next[idx], channelIds: next[idx].channelIds.filter(id => id !== channelId) };
  return { state: { ...state, channelPacks: next } };
}

export function tickChannelPacks(state: GameState): GameState {
  if (!state.channelPacks || state.channelPacks.length === 0) return state;
  let player = state.player;
  let totalPacksInB = 0;
  // V39 — Compute global cable-provider tier share (used when a pack has pricingByTier set).
  // Budget/standard/premium shares of total subscriber base across the player's active carriage deals.
  const activeCarriage = (state.cableCarriageDeals || []).filter(d => d.status === 'active');
  const carriedProviders = new Set(activeCarriage.map(d => d.providerId));
  const providers = (state.cableProviders || []).filter(p => carriedProviders.has(p.id));
  const subsByTier: { budget: number; standard: number; premium: number } = { budget: 0, standard: 0, premium: 0 };
  providers.forEach(p => { subsByTier[p.tier] = (subsByTier[p.tier] || 0) + p.subscribers; });
  const totalSubs = subsByTier.budget + subsByTier.standard + subsByTier.premium;
  // Fallback distribution if player has no carriage deals yet: assume 50/35/15 (typical real-world cable mix)
  const tierShare = totalSubs > 0
    ? { budget: subsByTier.budget / totalSubs, standard: subsByTier.standard / totalSubs, premium: subsByTier.premium / totalSubs }
    : { budget: 0.50, standard: 0.35, premium: 0.15 };
  const channelPacks = state.channelPacks.map(p => {
    // Subscriber dynamics based on programming richness across pack
    const packChannels = (state.tvNetworks || []).filter(n => p.channelIds.includes(n.id));
    const totalProg = packChannels.reduce((s, n) => s + (n.programmingMovieIds?.length || 0), 0);
    const synergy = 1 + 0.10 * p.channelIds.length;
    let growth = totalProg >= 10 ? 0.015 : totalProg >= 3 ? 0.005 : -0.005;
    growth *= synergy / 2; // diminishing
    const newSubs = Math.max(0.1, +(p.subscribers * (1 + growth)).toFixed(2));
    // V39 — Weekly revenue: tier-aware if pricingByTier set, else flat.
    let monthlyTotalUSD = 0;
    if (p.pricingByTier) {
      monthlyTotalUSD = p.subscribers * (
        tierShare.budget   * p.pricingByTier.budget +
        tierShare.standard * p.pricingByTier.standard +
        tierShare.premium  * p.pricingByTier.premium
      );
    } else {
      monthlyTotalUSD = p.subscribers * p.monthlyFeeUSD;
    }
    const weeklyRevM = +(monthlyTotalUSD / 4).toFixed(3);
    if (weeklyRevM > 0) player = { ...player, cash: +(player.cash + weeklyRevM / 1000).toFixed(3) };
    totalPacksInB += weeklyRevM / 1000;
    return { ...p, subscribers: newSubs };
  });
  let next: GameState = { ...state, channelPacks, player };
  next = _bumpL(next, 'channelPacksInB', totalPacksInB);
  return next;
}

// =====================================================================
// INBOUND CHANNEL CONTENT LICENSING (player channel buys rival movies)
// =====================================================================
export function quoteChannelContentLicense(state: GameState, args: { rivalStudioId: string; movieIds: string[]; years: number }): { feeB: number; error?: string } {
  const movies = state.movies.filter(m => args.movieIds.includes(m.id) && m.studioId === args.rivalStudioId && m.status === 'released');
  if (movies.length === 0) return { feeB: 0, error: 'No eligible released movies selected.' };
  const boSum = movies.reduce((s, m) => s + Math.max(0.02, m.boxOffice), 0);
  // Channel inbound licensing = ~12% of BO × years (similar to streaming catalog)
  const yrsMult = 0.7 + Math.min(0.3, args.years * 0.05);
  const feeB = +(boSum * 0.12 * yrsMult).toFixed(3);
  return { feeB };
}

export function proposeChannelContentLicense(state: GameState, args: { channelId: string; rivalStudioId: string; movieIds: string[]; askingFeeB: number; years: number }): { state: GameState; error?: string; licenseId?: string; counterFeeB?: number; accepted?: boolean } {
  const ch = (state.tvNetworks || []).find(n => n.id === args.channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel not found or not yours.' };
  const rival = state.rivals.find(r => r.id === args.rivalStudioId);
  if (!rival) return { state, error: 'Rival studio not found.' };
  if (args.movieIds.length === 0) return { state, error: 'Pick at least one movie.' };
  if (args.years < 1 || args.years > 10) return { state, error: 'Years 1–10.' };
  if (state.player.cash < args.askingFeeB) return { state, error: `Need $${args.askingFeeB.toFixed(2)}B cash for upfront payment.` };

  // Reject if any selected movie is already in an active or pending channelContentLicense
  for (const mid of args.movieIds) {
    const activeLic = (state.channelContentLicenses || []).find(l => (l.status === 'active' || l.status === 'pending') && l.movieIds.includes(mid));
    if (activeLic) {
      const movie = state.movies.find(m => m.id === mid);
      return { state, error: `📺 "${movie?.title || mid}" is already licensed or pending in active channel content license.` };
    }
  }

  const fair = quoteChannelContentLicense(state, { rivalStudioId: args.rivalStudioId, movieIds: args.movieIds, years: args.years }).feeB;
  if (fair <= 0) return { state, error: 'No fair value.' };
  const tolerance = 0.20;
  const minAccept = +(fair * (1 - tolerance)).toFixed(3);
  // Rival accepts if asking ≥ minAccept (they are seller, prefer higher)
  if (args.askingFeeB >= minAccept) {
    // Accept
    const licenseId = uid('ccl');
    const license: ChannelContentLicense = {
      id: licenseId, channelId: ch.id, rivalStudioId: args.rivalStudioId, movieIds: args.movieIds,
      feeB: args.askingFeeB, years: args.years, startWeek: state.week, startYear: state.year, status: 'active',
    };
    // Pay rival upfront
    const player = { ...state.player, cash: +(state.player.cash - args.askingFeeB).toFixed(3) };
    // Add movie ids to channel's programming
    const tvNetworks = (state.tvNetworks || []).map(n => n.id === ch.id ? { ...n, programmingMovieIds: [...(n.programmingMovieIds || []), ...args.movieIds.filter(mid => !(n.programmingMovieIds || []).includes(mid))] } : n);
    // Credit rival studio (cash on Studio model)
    const rivals = state.rivals.map(r => r.id === args.rivalStudioId ? { ...r, cash: +(r.cash + args.askingFeeB).toFixed(3) } : r);
    const newsLog = [{ id: uid('news'), week: state.week, year: state.year, kind: 'license' as const, title: `${ch.name} licensed ${args.movieIds.length} film${args.movieIds.length !== 1 ? 's' : ''} from ${rival.name}`, detail: `$${args.askingFeeB.toFixed(2)}B × ${args.years}yr`, text: `${ch.name} licensed ${args.movieIds.length} film${args.movieIds.length !== 1 ? 's' : ''} from ${rival.name}: $${args.askingFeeB.toFixed(2)}B × ${args.years}yr`, color: 'cyan' as const }, ...(state.newsLog || [])].slice(0, 400);
    return { state: { ...state, player, rivals, tvNetworks, channelContentLicenses: [...(state.channelContentLicenses || []), license], newsLog }, licenseId, accepted: true };
  } else {
    // Counter higher
    const counterFeeB = +((minAccept + fair) / 2).toFixed(3);
    const licenseId = uid('ccl');
    const license: ChannelContentLicense = {
      id: licenseId, channelId: ch.id, rivalStudioId: args.rivalStudioId, movieIds: args.movieIds,
      feeB: args.askingFeeB, years: args.years, startWeek: state.week, startYear: state.year, status: 'pending', counterFeeB,
    };
    return { state: { ...state, channelContentLicenses: [...(state.channelContentLicenses || []), license] }, licenseId, counterFeeB, accepted: false };
  }
}

export function acceptChannelContentCounter(state: GameState, licenseId: string): { state: GameState; error?: string } {
  const lic = (state.channelContentLicenses || []).find(l => l.id === licenseId);
  if (!lic) return { state, error: 'License not found.' };
  if (lic.status !== 'pending') return { state, error: 'Not pending.' };
  if (state.player.cash < (lic.counterFeeB || 0)) return { state, error: 'Need cash for counter price.' };
  const player = { ...state.player, cash: +(state.player.cash - (lic.counterFeeB || 0)).toFixed(3) };
  const rivals = state.rivals.map(r => r.id === lic.rivalStudioId ? { ...r, cash: +(r.cash + (lic.counterFeeB || 0)).toFixed(3) } : r);
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === lic.channelId ? { ...n, programmingMovieIds: [...(n.programmingMovieIds || []), ...lic.movieIds.filter(mid => !(n.programmingMovieIds || []).includes(mid))] } : n);
  const channelContentLicenses = (state.channelContentLicenses || []).map(l => l.id === licenseId ? { ...l, status: 'active' as const, feeB: l.counterFeeB || l.feeB, startWeek: state.week, startYear: state.year } : l);
  return { state: { ...state, player, rivals, tvNetworks, channelContentLicenses } };
}

export function rejectChannelContentCounter(state: GameState, licenseId: string): { state: GameState } {
  const channelContentLicenses = (state.channelContentLicenses || []).filter(l => l.id !== licenseId);
  return { state: { ...state, channelContentLicenses } };
}

// =====================================================================
// V36 — TV CHANNEL RENAME / DELETE
// =====================================================================
export function renameTVChannel(state: GameState, channelId: string, newName: string): { state: GameState; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) return { state, error: 'Name required.' };
  if (trimmed.length > 32) return { state, error: 'Max 32 chars.' };
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel not owned by you.' };
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === channelId ? { ...n, displayName: trimmed, name: trimmed } : n);
  return { state: { ...state, tvNetworks } };
}

export function deleteTVChannel(state: GameState, channelId: string): { state: GameState; error?: string } {
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Channel not owned by you.' };
  // Refund 30% of last reasonable build cost (premium 0.30B, cable 0.18B, public 0.10B)
  const baseCost = ch.kind === 'premium' ? 0.30 : ch.kind === 'cable' ? 0.18 : 0.10;
  const refundB = +(baseCost * 0.30).toFixed(3);
  const player = { ...state.player, cash: +(state.player.cash + refundB).toFixed(3) };
  // Remove channel from networks list (full purge)
  const tvNetworks = (state.tvNetworks || []).filter(n => n.id !== channelId);
  // Remove from any packs
  const channelPacks = (state.channelPacks || []).map(p => ({ ...p, channelIds: p.channelIds.filter(id => id !== channelId) })).filter(p => p.channelIds.length >= 2);
  // Expire any cable carriage deals tied to this channel
  const cableCarriageDeals = (state.cableCarriageDeals || []).map(d => d.channelId === channelId ? { ...d, status: 'expired' as const } : d);
  // Drop any pending channelContentLicenses tied to this channel
  const channelContentLicenses = (state.channelContentLicenses || []).filter(l => l.channelId !== channelId);
  const newsLog = [{ id: uid('news'), week: state.week, year: state.year, kind: 'studio' as const, title: `${ch.name} shut down`, detail: `Channel closed. +$${refundB.toFixed(3)}B salvage.`, text: `${ch.name} shut down. Channel closed. +$${refundB.toFixed(3)}B salvage.`, color: 'red' as const }, ...(state.newsLog || [])].slice(0, 400);
  return { state: { ...state, player, tvNetworks, channelPacks, cableCarriageDeals, channelContentLicenses, newsLog } };
}

// =====================================================================
// V36 — CABLE PROVIDERS (recurring carriage revenue)
// =====================================================================
export function ensureCableProviders(state: GameState): GameState {
  const existing = state.cableProviders || [];
  const missing = CABLE_PROVIDERS_SEED.filter(seed => !existing.some(p => p.id === seed.id));
  if (missing.length === 0 && existing.length > 0) return state;
  return { ...state, cableProviders: [...existing, ...missing.map(p => ({ ...p }))] };
}

export function quoteCableCarriageDeal(state: GameState, args: { providerId: string; channelId: string; years: number }): { fairUSD: number; minUSD: number; maxUSD: number; estWeeklyRevM: number; signingBonusM: number; error?: string } {
  const s = ensureCableProviders(state);
  const prov = (s.cableProviders || []).find(p => p.id === args.providerId);
  if (!prov) return { fairUSD: 0, minUSD: 0, maxUSD: 0, estWeeklyRevM: 0, signingBonusM: 0, error: 'Cable provider not found.' };
  const ch = (s.tvNetworks || []).find(n => n.id === args.channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { fairUSD: 0, minUSD: 0, maxUSD: 0, estWeeklyRevM: 0, signingBonusM: 0, error: 'Channel not yours.' };
  // V41 — Public providers carry ONLY public channels; commercial providers (budget/standard/premium) carry cable/premium only
  if (prov.tier === 'public' && ch.kind !== 'public') return { fairUSD: 0, minUSD: 0, maxUSD: 0, estWeeklyRevM: 0, signingBonusM: 0, error: `${prov.name} is a public carrier — only public channels qualify.` };
  if (prov.tier !== 'public' && ch.kind === 'public') return { fairUSD: 0, minUSD: 0, maxUSD: 0, estWeeklyRevM: 0, signingBonusM: 0, error: `Public channels distribute through public carriers only.` };
  // V41 — Region must match: a cable provider only carries channels broadcast in its own region.
  if (ch.region !== prov.region) return { fairUSD: 0, minUSD: 0, maxUSD: 0, estWeeklyRevM: 0, signingBonusM: 0, error: `Region mismatch: ${prov.name} (${prov.region}) cannot carry channels from ${ch.region}.` };
  const range = cableCarriageFeeRange(prov.reputation, prov.tier);
  // Channel reputation boosts fair fee linearly
  const repBoost = Math.max(0.7, Math.min(1.4, ch.reputation / 70));
  const fairUSD = +(range.fairUSD * repBoost).toFixed(2);
  // Estimated weekly revenue: providerSubs (M) × fairUSD per month / 4 weeks
  const estWeeklyRevM = +((prov.subscribers * fairUSD) / 4).toFixed(2);
  // Signing bonus (player pays small upfront, larger for premium providers)
  const signingBonusM = +(prov.subscribers * (prov.tier === 'premium' ? 0.4 : prov.tier === 'standard' ? 0.22 : 0.1) * (args.years / 5)).toFixed(2);
  return { fairUSD, minUSD: +(range.minUSD * repBoost).toFixed(2), maxUSD: +(range.maxUSD * repBoost).toFixed(2), estWeeklyRevM, signingBonusM };
}

export function signCableCarriageDeal(state: GameState, args: { providerId: string; channelId: string; askingFeeUSD: number; years: number }): { state: GameState; error?: string; accepted?: boolean; counterFeeUSD?: number; dealId?: string } {
  const s = ensureCableProviders(state);
  const q = quoteCableCarriageDeal(s, { providerId: args.providerId, channelId: args.channelId, years: args.years });
  if (q.error) return { state, error: q.error };
  if (args.years < 1 || args.years > 10) return { state, error: 'Years must be 1–10.' };
  if (args.askingFeeUSD <= 0) return { state, error: 'Set an asking fee.' };
  if (state.player.cash < q.signingBonusM / 1000) return { state, error: `Need $${(q.signingBonusM / 1000).toFixed(3)}B for signing bonus.` };
  // Provider accepts if asking <= maxUSD (player is asking provider to pay fee per sub — higher = bolder)
  const dealId = uid('cdl');
  let expW = state.week + args.years * WEEKS_PER_YEAR; let expY = state.year;
  while (expW > WEEKS_PER_YEAR) { expW -= WEEKS_PER_YEAR; expY += 1; }
  if (args.askingFeeUSD <= q.maxUSD) {
    // Accepted
    const deal: CableCarriageDeal = {
      id: dealId, providerId: args.providerId, channelId: args.channelId,
      feePerSubPerMonthUSD: args.askingFeeUSD, signedWeek: state.week, signedYear: state.year,
      expiresWeek: expW, expiresYear: expY, years: args.years, status: 'active',
      signingBonusM: q.signingBonusM, lifetimeRevenueB: 0,
    };
    const player = { ...state.player, cash: +(state.player.cash - q.signingBonusM / 1000).toFixed(3) };
    const prov = (s.cableProviders || []).find(p => p.id === args.providerId)!;
    const ch = (s.tvNetworks || []).find(n => n.id === args.channelId)!;
    // V36 — Subscriber boost from carriage deal: +25% of provider subscribers (capped at +30% of channel base)
    const boost = Math.min(ch.subscribers * 0.3, prov.subscribers * 0.25);
    const tvNetworks = (s.tvNetworks || []).map(n => n.id === args.channelId ? { ...n, subscribers: +(n.subscribers + boost).toFixed(2) } : n);
    const newsLog = [{ id: uid('news'), week: state.week, year: state.year, kind: 'license' as const, title: `Carriage deal signed: ${prov.name} → ${ch.name}`, detail: `$${args.askingFeeUSD.toFixed(2)}/sub/mo × ${args.years}yr · est ~$${q.estWeeklyRevM.toFixed(2)}M/wk · +${boost.toFixed(1)}M subs`, text: `Carriage deal signed: ${prov.name} → ${ch.name}. $${args.askingFeeUSD.toFixed(2)}/sub/mo × ${args.years}yr`, color: 'green' as const }, ...(state.newsLog || [])].slice(0, 400);
    return { state: { ...s, player, tvNetworks, cableCarriageDeals: [...(s.cableCarriageDeals || []), deal], newsLog }, accepted: true, dealId };
  } else {
    // Counter at a lower fee
    const counterFeeUSD = +((q.fairUSD + q.maxUSD) / 2).toFixed(2);
    const deal: CableCarriageDeal = {
      id: dealId, providerId: args.providerId, channelId: args.channelId,
      feePerSubPerMonthUSD: args.askingFeeUSD, signedWeek: state.week, signedYear: state.year,
      expiresWeek: expW, expiresYear: expY, years: args.years, status: 'pending',
      signingBonusM: q.signingBonusM, lifetimeRevenueB: 0,
    };
    return { state: { ...s, cableCarriageDeals: [...(s.cableCarriageDeals || []), deal] }, accepted: false, counterFeeUSD, dealId };
  }
}

export function acceptCableCarriageCounter(state: GameState, dealId: string, counterFeeUSD: number): { state: GameState; error?: string } {
  const deal = (state.cableCarriageDeals || []).find(d => d.id === dealId);
  if (!deal || deal.status !== 'pending') return { state, error: 'Deal not found or not pending.' };
  if (state.player.cash < deal.signingBonusM / 1000) return { state, error: `Need $${(deal.signingBonusM / 1000).toFixed(3)}B for signing bonus.` };
  const player = { ...state.player, cash: +(state.player.cash - deal.signingBonusM / 1000).toFixed(3) };
  const prov = (state.cableProviders || []).find(p => p.id === deal.providerId);
  const ch = (state.tvNetworks || []).find(n => n.id === deal.channelId);
  const boost = (prov && ch) ? Math.min(ch.subscribers * 0.3, prov.subscribers * 0.25) : 0;
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === deal.channelId ? { ...n, subscribers: +(n.subscribers + boost).toFixed(2) } : n);
  const cableCarriageDeals = (state.cableCarriageDeals || []).map(d => d.id === dealId ? { ...d, feePerSubPerMonthUSD: counterFeeUSD, status: 'active' as const } : d);
  return { state: { ...state, player, tvNetworks, cableCarriageDeals } };
}

export function rejectCableCarriageDeal(state: GameState, dealId: string): { state: GameState } {
  const cableCarriageDeals = (state.cableCarriageDeals || []).filter(d => d.id !== dealId);
  return { state: { ...state, cableCarriageDeals } };
}

export function cancelCableCarriageDeal(state: GameState, dealId: string): { state: GameState; error?: string } {
  const deal = (state.cableCarriageDeals || []).find(d => d.id === dealId);
  if (!deal) return { state, error: 'Deal not found.' };
  // Early termination penalty: 10% of estimated remaining revenue
  const prov = (state.cableProviders || []).find(p => p.id === deal.providerId);
  let weeksLeft = (deal.expiresYear - state.year) * WEEKS_PER_YEAR + (deal.expiresWeek - state.week);
  weeksLeft = Math.max(0, weeksLeft);
  const remainingRevB = prov ? (prov.subscribers * deal.feePerSubPerMonthUSD * weeksLeft / 4) / 1000 : 0;
  const penaltyB = +(remainingRevB * 0.1).toFixed(3);
  if (state.player.cash < penaltyB) return { state, error: `Early termination penalty $${penaltyB.toFixed(3)}B exceeds your cash.` };
  const player = { ...state.player, cash: +(state.player.cash - penaltyB).toFixed(3) };
  const cableCarriageDeals = (state.cableCarriageDeals || []).map(d => d.id === dealId ? { ...d, status: 'expired' as const } : d);
  return { state: { ...state, player, cableCarriageDeals } };
}

// Weekly tick: recurring carriage revenue from active cable deals + expiry handling.
export function tickCableCarriage(state: GameState): GameState {
  if (!state.cableCarriageDeals || state.cableCarriageDeals.length === 0) return state;
  let player = state.player;
  let totalCarriageB = 0;
  const nowKey = state.year * WEEKS_PER_YEAR + state.week;
  const cableCarriageDeals = state.cableCarriageDeals.map(d => {
    if (d.status !== 'active') return d;
    const expKey = d.expiresYear * WEEKS_PER_YEAR + d.expiresWeek;
    if (nowKey >= expKey) return { ...d, status: 'expired' as const };
    const prov = (state.cableProviders || []).find(p => p.id === d.providerId);
    const ch = (state.tvNetworks || []).find(n => n.id === d.channelId);
    if (!prov || !ch || ch.closed) return d;
    // Weekly revenue = providerSubs (M) × fee USD / 4 weeks → $M; /1000 to $B
    const weeklyRevB = +((prov.subscribers * d.feePerSubPerMonthUSD) / 4 / 1000).toFixed(4);
    player = { ...player, cash: +(player.cash + weeklyRevB).toFixed(3) };
    totalCarriageB += weeklyRevB;
    return { ...d, lifetimeRevenueB: +(d.lifetimeRevenueB + weeklyRevB).toFixed(3) };
  });
  let next: GameState = { ...state, player, cableCarriageDeals };
  next = _bumpL(next, 'cableCarriageInB', totalCarriageB);
  return next;
}



// =====================================================================
// V37 — Cancel TV Series (releases talents, salvages remaining unspent budget)
// =====================================================================
export function cancelTVSeries(state: GameState, seriesId: string): { state: GameState; error?: string } {
  const series = (state.tvSeries || []).find(s => s.id === seriesId);
  if (!series) return { state, error: 'Series not found.' };
  if (series.studioId !== state.player.id) return { state, error: 'Not your series.' };
  if (series.status === 'cancelled') return { state, error: 'Already cancelled.' };
  // Salvage: refund 30% of any season(s) still in production (the rest is sunk into pre-production, talent fees, etc).
  let salvageB = 0;
  if (series.productionSeason !== undefined && series.productionWeeksLeft !== undefined && series.productionTotalWeeks) {
    const currentSeason = series.seasons.find(sn => sn.number === series.productionSeason);
    if (currentSeason) {
      const fractionLeft = Math.max(0, Math.min(1, series.productionWeeksLeft / series.productionTotalWeeks));
      salvageB = +((currentSeason.budgetM / 1000) * fractionLeft * 0.3).toFixed(3);
    }
  }
  // Unlock cast & crew (treat as released — set cooldown like a wrap)
  const involvedIds = [series.writerId, series.directorId, ...((series.cast || []).map(c => c.talentId))].filter(Boolean) as string[];
  const talents = state.talents.map(t => {
    if (involvedIds.includes(t.id) && t.inProductionMovieId === seriesId) {
      return { ...t, inProductionMovieId: undefined, availableFromWeek: state.week + 2, availableFromYear: state.year };
    }
    return t;
  });
  const tvSeries = (state.tvSeries || []).map(s => s.id === seriesId
    ? { ...s, status: 'cancelled' as const, productionSeason: undefined, productionWeeksLeft: undefined, productionTotalWeeks: undefined }
    : s);
  const player = { ...state.player, cash: +(state.player.cash + salvageB).toFixed(3) };
  const newsLog = [{
    id: uid('news'), week: state.week, year: state.year, kind: 'studio' as const,
    title: `Series cancelled: ${series.title}`,
    detail: salvageB > 0 ? `Production halted. Salvaged $${(salvageB * 1000).toFixed(1)}M.` : 'Production halted.',
    text: `Series cancelled: ${series.title}. Production halted.`,
    color: 'red' as const,
  }, ...(state.newsLog || [])].slice(0, 400);
  return { state: { ...state, player, talents, tvSeries, newsLog } };
}


// V38 — Broadcast a bulk-license offer to MANY rival studios in a single state transaction.
// Fixes the silent-killer race condition where a UI loop calling proposeBulkCatalogLicense
// multiple times in one event handler reads a stale stateRef and only persists the last call.
// Also writes a visible news headline so the player sees their offer was published.
export function broadcastBulkCatalogLicense(
  state: GameState,
  args: {
    targetStudioIds: string[];
    priceB: number;
    years: number;
    dealKind: 'catalog' | 'future_releases' | 'franchise_bulk';
    franchiseId?: string;
    movieIds?: string[];
    futureMovieCount?: number;
    exclusivity?: boolean;
    tierIds?: string[];
  }
): { state: GameState; created: number; accepted: number; counters: number; rejected: number; error?: string } {
  const playerId = state.player.id;
  if (args.years < 1 || args.years > 10) {
    return { state, created: 0, accepted: 0, counters: 0, rejected: 0, error: 'Years must be 1–10.' };
  }
  if (!args.targetStudioIds || args.targetStudioIds.length === 0) {
    return { state, created: 0, accepted: 0, counters: 0, rejected: 0, error: 'No targets.' };
  }
  if (args.priceB <= 0) {
    return { state, created: 0, accepted: 0, counters: 0, rejected: 0, error: 'Set a price.' };
  }

  let s: GameState = state;
  let created = 0, accepted = 0, counters = 0, rejected = 0;
  const accNames: string[] = [];
  const rejNames: string[] = [];
  const ctrNames: string[] = [];

  for (const targetId of args.targetStudioIds) {
    if (targetId === playerId) continue;
    const rival = s.rivals.find(r => r.id === targetId);
    if (!rival) continue;
    // Attach the offer to the rival's primary streaming service (catalog/franchise_bulk).
    const svc = (s.streamingServices || []).find(x => x.studioId === targetId);
    if (!svc) continue;
    const offer: BulkCatalogOffer = {
      id: uid('bco_'),
      fromStudioId: playerId,
      toStudioId: targetId,
      movieIds: (args.movieIds || []).slice(),
      priceB: +args.priceB.toFixed(3),
      years: args.years,
      serviceId: svc.id,
      exclusivity: !!args.exclusivity,
      round: 0, maxRounds: 3,
      lastActor: 'from',
      status: 'pending',
      createdWeek: s.week, createdYear: s.year,
      history: [{ actor: 'from', priceB: +args.priceB.toFixed(3), week: s.week, year: s.year }],
      dealKind: args.dealKind,
      franchiseId: args.franchiseId,
      futureMovieCount: args.futureMovieCount,
      tierIds: args.tierIds && args.tierIds.length ? [...args.tierIds] : undefined,
      message: 'Player published license offer',
    };
    s = { ...s, bulkCatalogOffers: [...(s.bulkCatalogOffers || []), offer] };
    created++;
    const r = resolveBulkCatalogAi(s, offer.id);
    s = r.state;
    const post = (s.bulkCatalogOffers || []).find(o => o.id === offer.id);
    if (post) {
      if (post.status === 'accepted') { accepted++; accNames.push(rival.name); }
      else if (post.status === 'rejected') { rejected++; rejNames.push(rival.name); }
      else { counters++; ctrNames.push(rival.name); }
    }
  }

  // Compose news entries describing the broadcast outcome.
  const subject = args.dealKind === 'franchise_bulk' && args.franchiseId
    ? (s.franchises.find(f => f.id === args.franchiseId)?.name || 'franchise')
    : args.dealKind === 'future_releases'
      ? `${args.futureMovieCount || 0} future releases`
      : `${(args.movieIds || []).length}-title catalog`;
  const headTxt = `📢 ${state.player.name} published a ${args.years}-yr license offer for "${subject}" at $${args.priceB.toFixed(2)}B to ${created} rival${created === 1 ? '' : 's'}.`;
  const news: { week: number; year: number; text: string }[] = [{ week: s.week, year: s.year, text: headTxt }];
  if (accNames.length) news.push({ week: s.week, year: s.year, text: `✅ Accepted by: ${accNames.join(', ')}.` });
  if (ctrNames.length) news.push({ week: s.week, year: s.year, text: `↔️ Countered by: ${ctrNames.join(', ')}. Check Deals & Offers.` });
  if (rejNames.length) news.push({ week: s.week, year: s.year, text: `❌ Passed: ${rejNames.join(', ')}.` });
  s = { ...s, newsLog: [...news, ...s.newsLog].slice(0, 400) };

  return { state: s, created, accepted, counters, rejected };
}


// =====================================================================
// V38 — AI WORLD DYNAMICS
// "Make the world alive" — rivals trade with each other, launch streaming
// services, produce TV series, license AI content to TV networks, all
// without player involvement. Player keeps exclusivity on:
//   1) Building cinemas  2) Launching new TV channels.
// All functions APPEND-ONLY. Wired into tickWeek below.
// =====================================================================

// --- AI <-> AI movie licensing (rivals license catalog from each other) ---
export function tickAIInterStudioLicensing(state: GameState): GameState {
  const rivals = state.rivals;
  if (rivals.length < 2) return state;
  let s = state;
  let movies = s.movies.slice();
  let services = (s.streamingServices || []).slice();
  let relationships = { ...(s.relationships || {}) };
  const news: { week: number; year: number; text: string }[] = [];

  for (const buyer of rivals) {
    // 6% per buyer per week. Buyer needs a service + cash; seller needs released films.
    if (Math.random() > 0.06) continue;
    const buyerSvc = services.find(sv => sv.studioId === buyer.id);
    if (!buyerSvc) continue;
    if (buyer.cash < 0.2) continue;
    const candidates = rivals.filter(r => r.id !== buyer.id);
    if (candidates.length === 0) continue;
    const seller = candidates[Math.floor(Math.random() * candidates.length)];
    const sellerReleased = movies.filter(m => m.studioId === seller.id && m.status === 'released' && !buyerSvc.catalogMovieIds.includes(m.id));
    if (sellerReleased.length < 3) continue;
    // Pack of 1–3 random titles
    const packSize = Math.min(sellerReleased.length, 1 + Math.floor(Math.random() * 3));
    const shuffled = sellerReleased.sort(() => Math.random() - 0.5).slice(0, packSize);
    const years = 2 + Math.floor(Math.random() * 4); // 2..5
    const fair = quoteBulkCatalogValue(s, shuffled.map(m => m.id), years);
    if (fair <= 0) continue;
    // AI bargains within ±10% of fair
    const priceB = +(fair * (0.92 + Math.random() * 0.16)).toFixed(3);
    if (buyer.cash < priceB) continue;
    // Settle: transfer cash, add to catalog
    const buyerIdx = rivals.findIndex(r => r.id === buyer.id);
    const sellerIdx = rivals.findIndex(r => r.id === seller.id);
    const newRivals = s.rivals.slice();
    newRivals[buyerIdx] = { ...newRivals[buyerIdx], cash: +(newRivals[buyerIdx].cash - priceB).toFixed(3) };
    newRivals[sellerIdx] = { ...newRivals[sellerIdx], cash: +(newRivals[sellerIdx].cash + priceB).toFixed(3) };
    const svcIdx = services.findIndex(sv => sv.id === buyerSvc.id);
    const expYear = s.year + years;
    const newCatalogIds = [...buyerSvc.catalogMovieIds, ...shuffled.map(m => m.id)];
    const newLicensed = [...(buyerSvc.licensedMovies || []), ...shuffled.map(m => ({
      movieId: m.id, tierIds: [], feePaid: (priceB * 1000) / shuffled.length, yearsLicensed: years, expiresWeek: s.week, expiresYear: expYear,
    }))];
    services[svcIdx] = { ...buyerSvc, catalogMovieIds: newCatalogIds, licensedMovies: newLicensed };
    movies = movies.map(m => shuffled.find(x => x.id === m.id)
      ? { ...m, inStreamingServiceIds: Array.from(new Set([...(m.inStreamingServiceIds || []), buyerSvc.id])) }
      : m);
    nudgeRelInPlace(relationships, buyer.id, seller.id, 2);
    s = { ...s, rivals: newRivals };
    if (Math.random() < 0.55) {
      news.push({ week: s.week, year: s.year, text: `📦 ${buyer.name} licenses ${packSize} title${packSize === 1 ? '' : 's'} from ${seller.name} for $${priceB.toFixed(2)}B / ${years}yr.` });
    }
  }

  return { ...s, movies, streamingServices: services, relationships, newsLog: [...news, ...s.newsLog].slice(0, 400) };
}

// --- AI <-> AI franchise trades (cash-rich rivals try to buy hot franchises) ---
export function tickAIInterStudioFranchiseTrades(state: GameState): GameState {
  if (state.rivals.length < 2) return state;
  let s = state;
  const news: { week: number; year: number; text: string }[] = [];
  let rivals = s.rivals.slice();
  let franchises = s.franchises.slice();
  let movies = s.movies.slice();
  let relationships = { ...(s.relationships || {}) };

  for (const buyer of state.rivals) {
    if (Math.random() > 0.025) continue; // 2.5% per buyer per week
    if (buyer.cash < 1.5) continue; // need real money
    const candidates = franchises.filter(f => f.studioId !== buyer.id && f.studioId !== state.player.id);
    if (candidates.length === 0) continue;
    // Prefer popular franchises
    const target = candidates.sort((a, b) => b.popularity - a.popularity)[Math.floor(Math.random() * Math.min(5, candidates.length))];
    if (!target) continue;
    const fair = quoteFranchiseValue(s, target.id);
    if (fair <= 0) continue;
    // Buyer offers 90–105% of fair; seller accepts if >= 95%.
    const offerB = +(fair * (0.9 + Math.random() * 0.15)).toFixed(3);
    if (offerB < fair * 0.95) continue; // seller would walk
    if (buyer.cash < offerB) continue;
    // Settle
    const buyerIdx = rivals.findIndex(r => r.id === buyer.id);
    const sellerIdx = rivals.findIndex(r => r.id === target.studioId);
    if (buyerIdx < 0 || sellerIdx < 0) continue;
    rivals[buyerIdx] = { ...rivals[buyerIdx], cash: +(rivals[buyerIdx].cash - offerB).toFixed(3) };
    rivals[sellerIdx] = { ...rivals[sellerIdx], cash: +(rivals[sellerIdx].cash + offerB).toFixed(3) };
    franchises = franchises.map(f => f.id === target.id ? { ...f, studioId: buyer.id } : f);
    movies = movies.map(m => m.franchiseId === target.id ? { ...m, studioId: buyer.id } : m);
    nudgeRelInPlace(relationships, buyer.id, target.studioId, 3);
    news.push({ week: s.week, year: s.year, text: `🏆 ${buyer.name} acquires the ${target.name} franchise from ${rivals[sellerIdx].name} for $${offerB.toFixed(2)}B.` });
  }

  return { ...s, rivals, franchises, movies, relationships, newsLog: [...news, ...s.newsLog].slice(0, 400) };
}

// --- AI launches & shuts down streaming services ---
export function tickAIStreamingLifecycle(state: GameState): GameState {
  let s = state;
  const news: { week: number; year: number; text: string }[] = [];
  let services = (s.streamingServices || []).slice();
  let movies = s.movies.slice();

  for (const r of s.rivals) {
    const myServices = services.filter(sv => sv.studioId === r.id);
    const myReleased = movies.filter(m => m.studioId === r.id && m.status === 'released');
    // LAUNCH: rival has 3+ released films and no service yet (V38 — loosened from 6+ for more visible activity)
    if (myServices.length === 0 && myReleased.length >= 3 && r.cash >= 0.25 && Math.random() < 0.025) {
      const baseTiers: any[] = [
        { id: uid('t_'), name: 'Basic', period: 'monthly', price: 7.99, screens: 1, users: 1, isExclusive: false },
        { id: uid('t_'), name: 'Standard', period: 'monthly', price: 12.99, screens: 2, users: 4, isExclusive: false },
        { id: uid('t_'), name: 'Premium', period: 'monthly', price: 17.99, screens: 4, users: 6, isExclusive: false },
      ];
      const namePool = [`${r.name}+`, `${r.name} Now`, `${r.name} Plus`, `${r.name} Stream`];
      const name = namePool[Math.floor(Math.random() * namePool.length)];
      const newSvc: StreamingService = {
        id: uid('ss_'), studioId: r.id, name,
        tiers: baseTiers,
        subscribers: 0,
        tierSubscribers: Object.fromEntries(baseTiers.map(t => [t.id, 0])),
        monthlyRevenue: 0, reputation: 25,
        catalogMovieIds: myReleased.map(m => m.id),
        launchedYear: s.year, launchedWeek: s.week, history: [],
      };
      services = [...services, newSvc];
      movies = movies.map(m => m.studioId === r.id && m.status === 'released'
        ? { ...m, inStreamingServiceIds: Array.from(new Set([...(m.inStreamingServiceIds || []), newSvc.id])) }
        : m);
      const rivalsUpd = s.rivals.map(rv => rv.id === r.id ? { ...rv, cash: +(rv.cash - 0.2).toFixed(3) } : rv);
      s = { ...s, rivals: rivalsUpd };
      news.push({ week: s.week, year: s.year, text: `🚀 ${r.name} launches "${name}" — the streaming wars heat up.` });
    }
    // SHUT DOWN: service running >100 weeks AND <5k subscribers
    for (const svc of myServices) {
      const ageWeeks = (s.year - svc.launchedYear) * WEEKS_PER_YEAR + (s.week - svc.launchedWeek);
      if (ageWeeks > 100 && (svc.subscribers || 0) < 5 && Math.random() < 0.05) {
        services = services.filter(x => x.id !== svc.id);
        movies = movies.map(m => m.inStreamingServiceIds?.includes(svc.id)
          ? { ...m, inStreamingServiceIds: m.inStreamingServiceIds.filter(id => id !== svc.id) }
          : m);
        news.push({ week: s.week, year: s.year, text: `📉 ${r.name} shuts down ${svc.name} — unable to find an audience.` });
      }
    }
  }

  return { ...s, streamingServices: services, movies, newsLog: [...news, ...s.newsLog].slice(0, 400) };
}

// --- AI rivals produce TV series (uses same talent pool — competes with player) ---
export function tickAIRivalTVSeries(state: GameState): GameState {
  let s = state;
  const news: { week: number; year: number; text: string }[] = [];
  let talents = s.talents.slice();
  let tvSeries = (s.tvSeries || []).slice();
  let rivals = s.rivals.slice();

  for (const r of state.rivals) {
    if (Math.random() > 0.05) continue; // V38 — bumped from 2.2% to 5% so series do appear
    if (r.cash < 0.05) continue;
    // Pick available talent (writer + director + ≥1 cast) — competes with player & other AI
    const availWriter = talents.find(t => t.role === 'writer' && !t.retired && talentAvailability(t, s.week, s.year).available);
    const availDirector = talents.find(t => t.role === 'director' && !t.retired && talentAvailability(t, s.week, s.year).available);
    const availActors = talents.filter(t => (t.role === 'actor' || t.role === 'actress') && !t.retired && talentAvailability(t, s.week, s.year).available).slice(0, 2);
    // V38 — loosened: 1 cast member is enough (was 2)
    if (!availWriter || !availDirector || availActors.length < 1) continue;

    const rivalSvc = (s.streamingServices || []).find(sv => sv.studioId === r.id);
    const seasonsN = 1 + Math.floor(Math.random() * 3); // 1..3
    const episodes = [8, 10, 13][Math.floor(Math.random() * 3)];
    const budgetM = [30, 50, 80][Math.floor(Math.random() * 3)];
    const totalBudgetB = (budgetM * seasonsN) / 1000;
    if (r.cash < totalBudgetB) continue;

    const seriesId = uid('tvs');
    const totalWeeks = seasonProductionWeeks(episodes);
    // AI picks strategy: streaming if it has a service, else look for a public/cable network
    let strategy: TVReleaseStrategy = rivalSvc ? 'streaming' : 'tv';
    let tvNetworkId: string | undefined;
    if (strategy === 'tv') {
      const externalNets = (s.tvNetworks || []).filter(n => !(n as any).ownerStudioId);
      if (externalNets.length === 0) continue;
      tvNetworkId = externalNets[Math.floor(Math.random() * externalNets.length)].id;
    }
    const cast = availActors.map((t, i) => ({
      talentId: t.id,
      role: (i === 0 ? (t.role === 'actor' ? 'lead_actor' : 'lead_actress') : (t.role === 'actor' ? 'support_actor' : 'support_actress')) as 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress',
      salary: +(t.salary * 0.6).toFixed(2),
    }));
    const series: TVSeries = {
      id: seriesId, title: aiSeriesTitleFor(r.name, s),
      studioId: r.id, brand: 'original', status: 'in_production',
      releaseYear: s.year, releaseWeek: s.week,
      releaseStrategy: strategy,
      streamingTargetServiceId: rivalSvc?.id,
      tvNetworkId,
      seasons: Array.from({ length: seasonsN }, (_, i) => ({ number: i + 1, episodes, budgetM })),
      productionSeason: 1, productionWeeksLeft: totalWeeks, productionTotalWeeks: totalWeeks,
      writerId: availWriter.id, directorId: availDirector.id, cast,
    };
    tvSeries = [...tvSeries, series];
    // Lock talents
    const lockIds = new Set([availWriter.id, availDirector.id, ...cast.map(c => c.talentId)]);
    talents = talents.map(t => lockIds.has(t.id) ? { ...t, inProductionMovieId: seriesId } : t);
    // Charge rival
    rivals = rivals.map(rv => rv.id === r.id ? { ...rv, cash: +(rv.cash - totalBudgetB).toFixed(3) } : rv);
    news.push({ week: s.week, year: s.year, text: `📺 ${r.name} greenlights "${series.title}" — ${seasonsN} season${seasonsN === 1 ? '' : 's'} (${strategy === 'streaming' ? 'streaming' : 'TV'}).` });
    s = { ...s, rivals };
  }

  return { ...s, talents, tvSeries, newsLog: [...news, ...s.newsLog].slice(0, 400) };
}

// Helper: generate a TV series title for an AI rival (avoids player movie/franchise collisions).
function aiSeriesTitleFor(studioName: string, state: GameState): string {
  const used = new Set([...state.movies.map(m => m.title), ...state.franchises.map(f => f.name), ...((state.tvSeries || []).map(t => t.title))]);
  const adj = ['Midnight', 'Hidden', 'Crimson', 'Northern', 'Silver', 'Last', 'Broken', 'Wild', 'Silent', 'Iron'];
  const noun = ['Code', 'Pact', 'Tide', 'Hour', 'Chapter', 'Trial', 'Empire', 'Echo', 'Throne', 'Cipher'];
  for (let i = 0; i < 20; i++) {
    const candidate = `${adj[Math.floor(Math.random() * adj.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${studioName} Originals: Vol ${Math.floor(Math.random() * 100)}`;
}

// --- TV networks license AI rival content too (internal cash transfer, news) ---
export function tickTVNetworksLicenseAI(state: GameState): GameState {
  const networks = (state.tvNetworks || []).filter(n => !(n as any).ownerStudioId);
  if (networks.length === 0) return state;
  let s = state;
  const news: { week: number; year: number; text: string }[] = [];
  let rivals = s.rivals.slice();

  for (const net of networks) {
    if (Math.random() > 0.08) continue; // V38 — bumped from 5% to 8% per network/week
    // Pick a random AI-owned released movie from the last 5 years (any critic score)
    const recentAI = s.movies.filter(m => m.studioId !== s.player.id && m.status === 'released' && (s.year - m.releaseYear) <= 5);
    if (recentAI.length === 0) continue;
    const movie = recentAI[Math.floor(Math.random() * recentAI.length)];
    // Fee: 3–8% of BO (or $2–8M flat if BO=0), scaled by network kind
    const baseFee = movie.boxOffice > 0 ? movie.boxOffice * (0.03 + Math.random() * 0.05) : (2 + Math.random() * 6);
    const kindMult = net.kind === 'premium' ? 1.5 : net.kind === 'cable' ? 1.0 : 0.7;
    const feeM = +(baseFee * kindMult / 1000).toFixed(2);
    if (feeM < 0.5) continue;
    const sellerIdx = rivals.findIndex(rv => rv.id === movie.studioId);
    if (sellerIdx < 0) continue;
    rivals[sellerIdx] = { ...rivals[sellerIdx], cash: +(rivals[sellerIdx].cash + feeM / 1000).toFixed(3) };
    if (Math.random() < 0.4) {
      news.push({ week: s.week, year: s.year, text: `📡 ${net.name} licenses "${movie.title}" (${rivals[sellerIdx].name}) for $${feeM.toFixed(1)}M.` });
    }
  }

  return { ...s, rivals, newsLog: [...news, ...s.newsLog].slice(0, 400) };
}

// --- AI strategic exclusivity (rivals lock their streaming hits as service exclusives) ---
export function tickAIExclusivity(state: GameState): GameState {
  let services = (state.streamingServices || []).slice();
  let changed = false;
  for (let i = 0; i < services.length; i++) {
    const sv = services[i];
    if (sv.studioId === state.player.id) continue;
    if (Math.random() > 0.02) continue;
    // Find an owned, high-grossing movie in their catalog not yet exclusive
    const ownedHits = state.movies.filter(m => m.studioId === sv.studioId && m.status === 'released' && m.boxOffice > 0.4 && sv.catalogMovieIds.includes(m.id));
    if (ownedHits.length === 0) continue;
    const target = ownedHits[Math.floor(Math.random() * ownedHits.length)];
    const exclusiveIds = sv.exclusiveMovieIds || [];
    if (exclusiveIds.includes(target.id)) continue;
    services[i] = { ...sv, exclusiveMovieIds: [...exclusiveIds, target.id], isExclusive: true };
    changed = true;
  }
  return changed ? { ...state, streamingServices: services } : state;
}

// --- Master wrapper to call all V38 AI dynamics in one shot ---
export function tickAIWorldDynamics(state: GameState): GameState {
  let s = state;
  s = tickAIInterStudioLicensing(s);
  s = tickAIInterStudioFranchiseTrades(s);
  s = tickAIStreamingLifecycle(s);
  s = tickAIRivalTVSeries(s);
  s = tickTVNetworksLicenseAI(s);
  s = tickAIExclusivity(s);
  // V39 — Additional world-alive dynamics
  s = tickAIExternalIPAttaching(s);
  s = tickAIRivalCrossovers(s);
  // V39 — Player-side managers: scan for new deal opportunities and queue proposals.
  s = tickTVNetworkManager(s);
  s = tickCinemaOwnedManager(s);
  // V43 — Extended manager auto-deals (P0 carry-over from V42d handoff).
  s = tickCinemaOwnedManagerExtended(s);
  s = tickTVManagerOwnContent(s);
  // V41 — Player cable carriage network economy
  s = tickPlayerCableNetworks(s);
  return s;
}

// V39 — AI rivals occasionally license a hot external IP from an external licensor.
// Adds an OwnedIPLicense entry tagged to the rival, deducts cash from rival, posts news 📚.
export function tickAIExternalIPAttaching(state: GameState): GameState {
  const ips = state.externalIPs || [];
  const licensors = state.externalLicensors || [];
  if (ips.length === 0 || licensors.length === 0) return state;
  let s = state;
  let news = [...s.newsLog];
  let owned = [...(s.ownedIPLicenses || [])];
  let rivals = s.rivals.slice();

  s.rivals.forEach((rival, ri) => {
    // Each rival has ~2.5% weekly chance to attach a new IP. Capped at 4 IP licenses active.
    if (Math.random() > 0.025) return;
    const activeForRival = owned.filter(o => o.studioId === rival.id && (o.expiresYear * WEEKS_PER_YEAR + o.expiresWeek) > (s.year * WEEKS_PER_YEAR + s.week));
    if (activeForRival.length >= 4) return;
    // Pick a popular IP not currently exclusively-licensed to someone else
    const candidates = ips.filter(ip => {
      if (ip.exclusiveLicenseeStudioId && ip.exclusiveLicenseeStudioId !== rival.id) return false;
      // Don't re-license what rival already has
      if (activeForRival.some(o => o.ipId === ip.id)) return false;
      return ip.popularity >= 50;
    });
    if (candidates.length === 0) return;
    const ip = pick(candidates);
    const lic = licensors.find(l => l.id === ip.licensorId);
    if (!lic) return;
    // Quote a rough license deal (IP popularity-weighted)
    const feeM = +(8 + ip.popularity * 0.35 + Math.random() * 10).toFixed(1);
    const feeB = feeM / 1000;
    if (rival.cash < feeB) return;
    const years = randInt(3, 6);
    const packs = randInt(1, 3);
    const exclusivity = Math.random() < 0.18;
    const license: any = {
      id: uid('oip_'), ipId: ip.id, studioId: rival.id,
      feePaidM: feeM, boPercent: randInt(3, 8), merchPercent: randInt(5, 12),
      signedWeek: s.week, signedYear: s.year,
      expiresWeek: s.week, expiresYear: s.year + years,
      packs, packsUsed: 0, exclusivity, sublicensable: false,
    };
    owned.push(license);
    rivals = rivals.map(rv => rv.id === rival.id ? { ...rv, cash: +(rv.cash - feeB).toFixed(3) } : rv);
    // If exclusive, lock the IP
    const updIps = (s.externalIPs || []).map(x => x.id === ip.id ? { ...x, exclusiveLicenseeStudioId: exclusivity ? rival.id : x.exclusiveLicenseeStudioId } : x);
    s = { ...s, externalIPs: updIps };
    news = [{ week: s.week, year: s.year, text: `📚 ${rival.name} licenses "${ip.name}" from ${lic.name} ($${feeM.toFixed(1)}M / ${years}y${exclusivity ? ' EXCLUSIVE' : ''}).` }, ...news];
    void ri;
  });
  return { ...s, rivals, ownedIPLicenses: owned, newsLog: news.slice(0, 400) };
}

// V39 — AI rivals occasionally do CROSSOVERS with another studio's franchise.
// They pay a licensing fee to the franchise owner, create the crossover movie next time
// rival decides to greenlight (we just credit the owner here; news log shows the deal).
export function tickAIRivalCrossovers(state: GameState): GameState {
  const franchises = state.franchises || [];
  if (franchises.length < 2) return state;
  let s = state;
  let news = [...s.newsLog];
  let rivals = s.rivals.slice();
  let player = s.player;

  s.rivals.forEach(rival => {
    // ~1.2% weekly chance per rival
    if (Math.random() > 0.012) return;
    if (rival.cash < 0.05) return;
    // Cash-rich rivals (>$2B) crossover with hot franchises owned by other studios.
    const ownFranchises = franchises.filter(f => f.studioId === rival.id);
    const otherFranchises = franchises.filter(f => f.studioId !== rival.id && f.popularity >= 55);
    if (ownFranchises.length === 0 || otherFranchises.length === 0) return;
    const myFr = pick(ownFranchises);
    const theirFr = pick(otherFranchises);
    // Crossover license fee: scaled by other franchise's popularity
    const feeM = +(15 + theirFr.popularity * 0.4 + Math.random() * 12).toFixed(1);
    const feeB = feeM / 1000;
    if (rival.cash < feeB) return;
    // Credit the owner of theirFr
    if (theirFr.studioId === player.id) {
      player = { ...player, cash: +(player.cash + feeB).toFixed(3) };
    } else {
      rivals = rivals.map(rv => rv.id === theirFr.studioId ? { ...rv, cash: +(rv.cash + feeB).toFixed(3) } : rv);
    }
    rivals = rivals.map(rv => rv.id === rival.id ? { ...rv, cash: +(rv.cash - feeB).toFixed(3) } : rv);
    const ownerName = theirFr.studioId === player.id ? player.name : (rivals.find(rv => rv.id === theirFr.studioId)?.name || '?');
    news = [{ week: s.week, year: s.year, text: `🎬 ${rival.name} licenses ${theirFr.name} from ${ownerName} for a ${myFr.name} crossover ($${feeM.toFixed(1)}M).` }, ...news];
    nudgeRelInPlace(s.relationships || {}, rival.id, theirFr.studioId, +3);
  });
  return { ...s, player, rivals, newsLog: news.slice(0, 400) };
}

// =====================================================================
// V39 — PLAYER-SIDE "MANAGERS": auto-suggest deals for the player to approve.
// Mirrors the V30 generateCinemaProposals pattern but for TV networks/cable
// carriages and player-owned cinemas (inbound + outbound).
// =====================================================================

// --- TV NETWORK MANAGER -----------------------------------------------
// Scans the world for three kinds of opportunities and queues proposals:
//   1. cable_carriage  — provider with no active deal would carry our channel.
//   2. channel_content_license — buy 2–4 hot rival movies for our weakest channel.
//   3. license_movies_to_rival — package our top hits for a rival's TV network.
// Maximum queue size: 6 (auto-trim oldest). Generates ~0–2 new proposals per tick.
export function tickTVNetworkManager(state: GameState, force = false): GameState {
  const playerChannels = (state.tvNetworks || []).filter(n => n.ownerStudioId === state.player.id);
  if (playerChannels.length === 0) return state;
  let proposals = (state.tvManagerProposals || []).slice();
  // Trim old proposals >8 weeks
  const ageLimit = 8;
  proposals = proposals.filter(p => ((state.year - p.createdYear) * WEEKS_PER_YEAR + (state.week - p.createdWeek)) <= ageLimit);
  if (proposals.length >= 6) return { ...state, tvManagerProposals: proposals };
  const created: TVManagerProposal[] = [];

  // (1) Cable carriage — provider has no active deal with any of our channels
  if (force || Math.random() < 0.30) {
    const providers = state.cableProviders || [];
    const activeDeals = (state.cableCarriageDeals || []).filter(d => d.status === 'active' || d.status === 'pending');
    const eligibleProviders = providers.filter(p => {
      // Pending proposal already exists?
      if (proposals.some(pp => pp.kind === 'cable_carriage' && pp.providerId === p.id)) return false;
      // Active deal with ANY of our channels?
      if (activeDeals.some(d => d.providerId === p.id && playerChannels.some(ch => ch.id === d.channelId))) return false;
      return true;
    });
    if (eligibleProviders.length > 0) {
      const provider = pick(eligibleProviders);
      const ch = pick(playerChannels);
      const range = cableCarriageFeeRange(provider.reputation, provider.tier);
      // Optimal ask: 65% of range (likely-accept)
      const fee = +(range.minUSD + (range.maxUSD - range.minUSD) * 0.65).toFixed(3);
      created.push({
        id: uid('tvmp_'), kind: 'cable_carriage', direction: 'outbound',
        channelId: ch.id, providerId: provider.id,
        feePerSubPerMonthUSD: fee, years: provider.tier === 'premium' ? 5 : 4,
        rationale: `${provider.name} (${provider.tier}-tier, ${provider.subscribers.toFixed(1)}M subs) would likely accept $${fee.toFixed(2)}/sub/mo for "${ch.name}". Est. monthly: $${(fee * provider.subscribers).toFixed(2)}M.`,
        createdWeek: state.week, createdYear: state.year,
      });
    }
  }

  // (2) Channel content license inbound — buy rival's hot recent movies for our channels
  if ((force || Math.random() < 0.22) && state.rivals.length > 0) {
    // Find a rival with a strong recent catalog
    const candidates = state.rivals.map(r => {
      const recent = state.movies.filter(m => m.studioId === r.id && m.status === 'released' && (state.year - m.releaseYear) <= 4);
      const hits = recent.filter(m => (m.criticScore || 0) >= 70);
      return { rival: r, hits };
    }).filter(c => c.hits.length >= 2);
    if (candidates.length > 0) {
      const target = pick(candidates);
      // Pick a player channel that's light on programming
      const weakest = [...playerChannels].sort((a, b) => (a.programmingMovieIds?.length || 0) - (b.programmingMovieIds?.length || 0))[0];
      // Avoid duplicate proposal
      const dup = proposals.some(pp => pp.kind === 'channel_content_license' && pp.channelId === weakest.id && pp.rivalStudioId === target.rival.id);
      if (!dup) {
        const moviesPick = target.hits.slice(0, Math.min(3, target.hits.length));
        const fairFeeB = quoteChannelContentLicense(state, { rivalStudioId: target.rival.id, movieIds: moviesPick.map(m => m.id), years: 3 }).feeB;
        if (fairFeeB > 0 && fairFeeB <= state.player.cash * 0.5) {
          created.push({
            id: uid('tvmp_'), kind: 'channel_content_license', direction: 'inbound',
            channelId: weakest.id, rivalStudioId: target.rival.id, movieIds: moviesPick.map(m => m.id),
            feeB: +(fairFeeB * 1.05).toFixed(3), years: 3,
            rationale: `"${weakest.name}" needs more content. ${target.rival.name} has ${target.hits.length} hot recent films; package of ${moviesPick.length} for ~$${(fairFeeB * 1.05).toFixed(2)}B × 3y.`,
            createdWeek: state.week, createdYear: state.year,
          });
        }
      }
    }
  }

  if (created.length === 0) return state;
  const next = [...proposals, ...created];
  const newsLog = [
    { week: state.week, year: state.year, text: `💡 TV Manager: ${created.length} new deal suggestion${created.length > 1 ? 's' : ''} — review in TV Networks.` },
    ...state.newsLog,
  ].slice(0, 400);
  return { ...state, tvManagerProposals: next, newsLog };
}

// Approve a TV Manager proposal — applies via existing sim actions.
export function approveTVManagerProposal(state: GameState, proposalId: string): { state: GameState; error?: string } {
  const proposals = state.tvManagerProposals || [];
  const idx = proposals.findIndex(p => p.id === proposalId);
  if (idx < 0) return { state, error: 'Proposal not found.' };
  const p = proposals[idx];
  let s: GameState = { ...state, tvManagerProposals: proposals.filter(pp => pp.id !== proposalId) };
  if (p.kind === 'cable_carriage' && p.channelId && p.providerId && p.feePerSubPerMonthUSD) {
    const r = signCableCarriageDeal(s, { providerId: p.providerId, channelId: p.channelId, askingFeeUSD: p.feePerSubPerMonthUSD, years: p.years });
    if (r.error) return { state, error: r.error };
    return { state: r.state };
  }
  if (p.kind === 'channel_content_license' && p.channelId && p.rivalStudioId && p.movieIds && p.feeB !== undefined) {
    const r = proposeChannelContentLicense(s, { channelId: p.channelId, rivalStudioId: p.rivalStudioId, movieIds: p.movieIds, askingFeeB: p.feeB, years: p.years });
    if (r.error) return { state, error: r.error };
    return { state: r.state };
  }
  return { state: s };
}

export function rejectTVManagerProposal(state: GameState, proposalId: string): { state: GameState } {
  return { state: { ...state, tvManagerProposals: (state.tvManagerProposals || []).filter(p => p.id !== proposalId) } };
}

// --- CINEMA OWNER MANAGER ---------------------------------------------
// Scans player-owned cinemas and queues supplier-deal proposals (inbound + outbound).
//   inbound: a rival routes ALL their traditional/hybrid releases into our cinemas — they pay us a share.
//   outbound: we offer slots to a rival in exchange for an upfront fee.
// Maximum queue size: 4. ~0–1 new proposals per tick.
export function tickCinemaOwnedManager(state: GameState, force = false): GameState {
  if (!state.ownedCinemas || state.ownedCinemas.length === 0) return state;
  if (state.rivals.length === 0) return state;
  let proposals = (state.cinemaOwnedManagerProposals || []).slice();
  // Trim old proposals >8 weeks
  proposals = proposals.filter(p => ((state.year - p.createdYear) * WEEKS_PER_YEAR + (state.week - p.createdWeek)) <= 8);
  if (proposals.length >= 4) return { ...state, cinemaOwnedManagerProposals: proposals };
  if (!force && Math.random() > 0.45) return { ...state, cinemaOwnedManagerProposals: proposals };

  // Pick a rival without an active supplier deal yet (avoid dup proposals & dup deals)
  const activeSupplier = new Set((state.cinemaSupplierDeals || []).map(d => d.rivalStudioId));
  const pendingProposalRivals = new Set(proposals.map(p => p.rivalStudioId));
  const eligibleRivals = state.rivals.filter(r => !activeSupplier.has(r.id) && !pendingProposalRivals.has(r.id) && r.rating >= 2);
  if (eligibleRivals.length === 0) return { ...state, cinemaOwnedManagerProposals: proposals };
  const rival = pick(eligibleRivals);

  // Inbound proposal: rival routes their traditional+hybrid releases into our cinemas
  const years = randInt(4, 6);
  const q = quoteCinemaSupplierDeal(state, { rivalStudioId: rival.id, years, includeTraditional: true, includeHybrid: true });
  if (q.error || q.feeM <= 0) return { ...state, cinemaOwnedManagerProposals: proposals };
  // Sit at 85% of quote — likely-accept territory
  const fee = +(q.feeM * 0.85).toFixed(1);
  const newProposal: CinemaOwnedManagerProposal = {
    id: uid('comp_'), kind: 'supplier_deal_inbound', direction: 'inbound',
    rivalStudioId: rival.id, years, feeM: fee,
    includeTraditional: true, includeHybrid: true,
    revShareToPlayer: 0.85,
    rationale: `${rival.name} (rating ${rival.rating}/5) would route their traditional+hybrid releases into your ${state.ownedCinemas.length} cinemas for $${fee.toFixed(0)}M × ${years}y. You keep 85% of the cinema-side gross.`,
    createdWeek: state.week, createdYear: state.year,
  };
  const next = [...proposals, newProposal];
  const newsLog = [
    { week: state.week, year: state.year, text: `💡 Cinema Manager: ${rival.name} would supply your cinemas — review proposal in Cinemas.` },
    ...state.newsLog,
  ].slice(0, 400);
  return { ...state, cinemaOwnedManagerProposals: next, newsLog };
}

export function approveCinemaOwnedManagerProposal(state: GameState, proposalId: string): { state: GameState; error?: string } {
  const proposals = state.cinemaOwnedManagerProposals || [];
  const idx = proposals.findIndex(p => p.id === proposalId);
  if (idx < 0) return { state, error: 'Proposal not found.' };
  const p = proposals[idx];
  const s = { ...state, cinemaOwnedManagerProposals: proposals.filter(pp => pp.id !== proposalId) };
  // Apply as a real supplier deal
  const r = signCinemaSupplierDeal(s, { rivalStudioId: p.rivalStudioId, years: p.years, upfrontFeeM: p.feeM, includeTraditional: p.includeTraditional, includeHybrid: p.includeHybrid });
  if (r.error) return { state, error: r.error };
  return { state: r.state };
}

export function rejectCinemaOwnedManagerProposal(state: GameState, proposalId: string): { state: GameState } {
  return { state: { ...state, cinemaOwnedManagerProposals: (state.cinemaOwnedManagerProposals || []).filter(p => p.id !== proposalId) } };
}



// =====================================================================
// V43 — WHOLE-NETWORK SINGLE-DEAL LICENSING (P0)
// Sign ONE deal that licenses chosen content to ALL channels owned by the same studio
// (rival group). Bulk discount applied.
// =====================================================================
export function quoteWholeNetworkLicense(state: GameState, args: { rivalStudioId: string; movieIds: string[]; years: number }): { feeB: number; channelCount: number; error?: string } {
  const channels = (state.tvNetworks || []).filter(n => n.ownerStudioId === args.rivalStudioId && !n.closed);
  if (channels.length === 0) return { feeB: 0, channelCount: 0, error: 'Rival owns no channels.' };
  const single = quoteChannelContentLicense(state, { rivalStudioId: state.player.id, movieIds: args.movieIds, years: args.years }).feeB;
  // Bulk pricing: per-channel rate scales but with diminishing returns. 1 ch = 1x, 5 ch = ~3.2x, 10 ch = ~5.0x.
  const networkMult = Math.pow(channels.length, 0.7);
  const grossFeeB = +(single * networkMult).toFixed(3);
  return { feeB: grossFeeB, channelCount: channels.length };
}

// Player AS SELLER offers their movie pack to ALL channels in a rival's network (one bulk deal).
// On accept: rival pays player upfront; all rival channels add player's movies to their programming.
export function signWholeNetworkLicenseOutbound(state: GameState, args: { rivalStudioId: string; movieIds: string[]; years: number; askingFeeB: number }): { state: GameState; error?: string; accepted?: boolean; counterFeeB?: number } {
  const rival = state.rivals.find(r => r.id === args.rivalStudioId);
  if (!rival) return { state, error: 'Rival not found.' };
  const channels = (state.tvNetworks || []).filter(n => n.ownerStudioId === args.rivalStudioId && !n.closed);
  if (channels.length === 0) return { state, error: 'Rival owns no broadcasting channels.' };
  if (args.movieIds.length === 0) return { state, error: 'Pick at least one movie.' };
  if (args.years < 1 || args.years > 10) return { state, error: 'Years 1–10.' };
  // Validate ownership
  const yourMovies = state.movies.filter(m => args.movieIds.includes(m.id) && m.studioId === state.player.id && m.status === 'released');
  if (yourMovies.length === 0) return { state, error: 'You must own and have released at least one selected movie.' };
  const q = quoteWholeNetworkLicense(state, { rivalStudioId: args.rivalStudioId, movieIds: yourMovies.map(m => m.id), years: args.years });
  if (q.error) return { state, error: q.error };
  const fair = q.feeB;
  const tolerance = 0.20;
  // Rival ACCEPTS if asking ≤ 1.2× fair value
  const maxAccept = +(fair * (1 + tolerance)).toFixed(3);
  if (rival.cash < args.askingFeeB) {
    return { state, error: `${rival.name} can't afford $${args.askingFeeB.toFixed(2)}B (has $${rival.cash.toFixed(2)}B).` };
  }
  if (args.askingFeeB <= maxAccept) {
    // Accept — rival pays upfront, channels programmed
    const rivals = state.rivals.map(r => r.id === args.rivalStudioId ? { ...r, cash: +(r.cash - args.askingFeeB).toFixed(3) } : r);
    const player = { ...state.player, cash: +(state.player.cash + args.askingFeeB).toFixed(3) };
    const tvNetworks = (state.tvNetworks || []).map(n => {
      if (n.ownerStudioId !== args.rivalStudioId || n.closed) return n;
      const adds = yourMovies.map(m => m.id).filter(mid => !(n.programmingMovieIds || []).includes(mid));
      return { ...n, programmingMovieIds: [...(n.programmingMovieIds || []), ...adds] };
    });
    const newsLog = [{ week: state.week, year: state.year, text: `📡 ${rival.name} licenses ${yourMovies.length} title${yourMovies.length !== 1 ? 's' : ''} from ${state.player.name} across all ${channels.length} channels (whole-network, $${args.askingFeeB.toFixed(2)}B × ${args.years}y).` }, ...(state.newsLog || [])].slice(0, 400);
    let nextS: GameState = { ...state, player, rivals, tvNetworks, newsLog };
    nextS = _bumpL(nextS, 'licensingInB', args.askingFeeB);
    return { state: nextS, accepted: true };
  }
  // Counter — rival proposes lower price
  const counterFeeB = +((maxAccept + fair) / 2).toFixed(3);
  return { state, accepted: false, counterFeeB };
}

// V43 — Player AS BUYER signs a single deal that licenses rival movies onto ALL their own channels.
// Useful when player has 5+ channels and wants one bulk transaction.
export function signWholeNetworkLicenseInbound(state: GameState, args: { rivalStudioId: string; movieIds: string[]; years: number; askingFeeB: number }): { state: GameState; error?: string; accepted?: boolean; counterFeeB?: number } {
  const rival = state.rivals.find(r => r.id === args.rivalStudioId);
  if (!rival) return { state, error: 'Rival not found.' };
  const playerChannels = (state.tvNetworks || []).filter(n => n.ownerStudioId === state.player.id && !n.closed);
  if (playerChannels.length === 0) return { state, error: 'Build at least one TV channel first.' };
  if (args.movieIds.length === 0) return { state, error: 'Pick at least one movie.' };
  if (args.years < 1 || args.years > 10) return { state, error: 'Years 1–10.' };
  if (state.player.cash < args.askingFeeB) return { state, error: `Need $${args.askingFeeB.toFixed(2)}B cash.` };
  const movies = state.movies.filter(m => args.movieIds.includes(m.id) && m.studioId === args.rivalStudioId && m.status === 'released');
  if (movies.length === 0) return { state, error: 'No eligible rival movies.' };
  const single = quoteChannelContentLicense(state, { rivalStudioId: args.rivalStudioId, movieIds: movies.map(m => m.id), years: args.years }).feeB;
  const networkMult = Math.pow(playerChannels.length, 0.7);
  const fair = +(single * networkMult).toFixed(3);
  const minAccept = +(fair * 0.80).toFixed(3);
  if (args.askingFeeB >= minAccept) {
    const player = { ...state.player, cash: +(state.player.cash - args.askingFeeB).toFixed(3) };
    const rivals = state.rivals.map(r => r.id === args.rivalStudioId ? { ...r, cash: +(r.cash + args.askingFeeB).toFixed(3) } : r);
    const tvNetworks = (state.tvNetworks || []).map(n => {
      if (n.ownerStudioId !== state.player.id || n.closed) return n;
      const adds = movies.map(m => m.id).filter(mid => !(n.programmingMovieIds || []).includes(mid));
      return { ...n, programmingMovieIds: [...(n.programmingMovieIds || []), ...adds] };
    });
    const newsLog = [{ week: state.week, year: state.year, text: `📡 Whole-network deal: ${state.player.name} licenses ${movies.length} title${movies.length !== 1 ? 's' : ''} from ${rival.name} across all ${playerChannels.length} channels ($${args.askingFeeB.toFixed(2)}B × ${args.years}y).` }, ...(state.newsLog || [])].slice(0, 400);
    let nextS: GameState = { ...state, player, rivals, tvNetworks, newsLog };
    nextS = _bumpL(nextS, 'licensingOutB', args.askingFeeB);
    return { state: nextS, accepted: true };
  }
  const counterFeeB = +((minAccept + fair) / 2).toFixed(3);
  return { state, accepted: false, counterFeeB };
}

// =====================================================================
// V43 — ENTITY-LEVEL SETTERS (ads, marketing, ratios)
// =====================================================================

export function setStreamingTierAdSupport(state: GameState, serviceId: string, tierId: string, adSupported: boolean, adArpuUSD?: number): { state: GameState; error?: string } {
  const svc = (state.streamingServices || []).find(s => s.id === serviceId);
  if (!svc || svc.studioId !== state.player.id) return { state, error: 'Not your service.' };
  const tiers = svc.tiers.map(t => t.id === tierId ? { ...t, adSupported, adArpuUSD: adSupported ? (adArpuUSD ?? t.adArpuUSD ?? 5) : t.adArpuUSD } : t);
  if (!tiers.some(t => t.id === tierId)) return { state, error: 'Tier not found.' };
  const streamingServices = (state.streamingServices || []).map(s => s.id === serviceId ? { ...s, tiers } : s);
  return { state: { ...state, streamingServices } };
}

export function setChannelAdProgrammingRatio(state: GameState, channelId: string, ratio: number): { state: GameState; error?: string } {
  if (!isFinite(ratio) || ratio < 0 || ratio > 1) return { state, error: 'Ratio must be 0–1.' };
  const ch = (state.tvNetworks || []).find(n => n.id === channelId);
  if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Not your channel.' };
  const tvNetworks = (state.tvNetworks || []).map(n => n.id === channelId ? { ...n, adProgrammingRatio: +ratio.toFixed(2) } : n);
  return { state: { ...state, tvNetworks } };
}

// Set entity-level marketing ($M/week) for: 'channel' | 'series' | 'streaming' | 'cinema' | 'cable'.
export function setEntityMarketing(state: GameState, kind: 'channel' | 'series' | 'streaming' | 'cinema' | 'cable', id: string, budgetM: number): { state: GameState; error?: string } {
  if (!isFinite(budgetM) || budgetM < 0 || budgetM > 100) return { state, error: 'Budget must be $0–100M/wk.' };
  const b = +budgetM.toFixed(2);
  switch (kind) {
    case 'channel': {
      const ch = (state.tvNetworks || []).find(n => n.id === id);
      if (!ch || ch.ownerStudioId !== state.player.id) return { state, error: 'Not your channel.' };
      return { state: { ...state, tvNetworks: (state.tvNetworks || []).map(n => n.id === id ? { ...n, marketingBudgetM: b } : n) } };
    }
    case 'series': {
      const sr = (state.tvSeries || []).find(s => s.id === id);
      if (!sr || sr.studioId !== state.player.id) return { state, error: 'Not your series.' };
      return { state: { ...state, tvSeries: (state.tvSeries || []).map(s => s.id === id ? { ...s, marketingBudgetM: b } : s) } };
    }
    case 'streaming': {
      const sv = (state.streamingServices || []).find(s => s.id === id);
      if (!sv || sv.studioId !== state.player.id) return { state, error: 'Not your streaming service.' };
      return { state: { ...state, streamingServices: (state.streamingServices || []).map(s => s.id === id ? { ...s, marketingBudgetM: b } : s) } };
    }
    case 'cinema': {
      const c = (state.ownedCinemas || []).find(x => x.id === id);
      if (!c) return { state, error: 'Cinema not found.' };
      return { state: { ...state, ownedCinemas: (state.ownedCinemas || []).map(x => x.id === id ? { ...x, marketingBudgetM: b } : x) } };
    }
    case 'cable': {
      const n = (state.playerCableNetworks || []).find(x => x.id === id);
      if (!n) return { state, error: 'Cable network not found.' };
      return { state: { ...state, playerCableNetworks: (state.playerCableNetworks || []).map(x => x.id === id ? { ...x, marketingBudgetM: b } : x) } };
    }
  }
}

// =====================================================================
// V43 — EXTENDED MANAGER AUTO-DEALS (P0 carry-over)
// Cinema Manager: auto-schedule released player movies into idle owned cinemas + franchise re-runs.
// TV Manager: license own movies to own channels (just adds to programming).
// =====================================================================
// Patched: extend tickCinemaOwnedManager-style logic via a second pass that runs alongside.
export function tickCinemaOwnedManagerExtended(state: GameState, force = false): GameState {
  const owned = state.ownedCinemas || [];
  if (owned.length === 0) return state;
  const player = state.player;
  const proposals = (state.cinemaOwnedManagerProposals || []).slice();
  // Auto-suggest scheduling: find an idle cinema + a recently released movie not currently in that cinema.
  const idleCinemas = owned.filter(c => !c.currentMovieId && (c.scheduledReleases || []).length === 0);
  if (idleCinemas.length === 0 || proposals.length >= 6) return state;
  if (!force && Math.random() > 0.35) return state;
  const recentMovies = state.movies.filter(m => m.status === 'released' && (state.year - m.releaseYear) <= 2 && m.boxOffice > 0.05);
  if (recentMovies.length === 0) return state;
  const cinema = pick(idleCinemas);
  const movie = pick(recentMovies);
  // Avoid duplicate proposal
  const dup = proposals.some(p => (p as any).cinemaId === cinema.id && (p as any).movieId === movie.id);
  if (dup) return state;
  const isPlayer = movie.studioId === player.id;
  const studioName = isPlayer ? 'your' : (state.rivals.find(r => r.id === movie.studioId)?.name || 'Rival');
  const newProposal: any = {
    id: uid('comp_'), kind: 'schedule_movie_owned', direction: 'inbound',
    cinemaId: cinema.id, movieId: movie.id,
    rivalStudioId: '', years: 0, feeM: 0,
    includeTraditional: false, includeHybrid: false, revShareToPlayer: 1.0,
    rationale: `Idle cinema "${cinema.displayName || cinema.name}" could re-run "${movie.title}" by ${studioName} (BO $${(movie.boxOffice * 1000).toFixed(0)}M) for 4 weeks. Estimated +$${(movie.boxOffice * 0.04 * 1000).toFixed(1)}M.`,
    createdWeek: state.week, createdYear: state.year,
  };
  const next = [...proposals, newProposal];
  return { ...state, cinemaOwnedManagerProposals: next };
}

// Approve schedule-movie proposal: schedule the run.
export function approveCinemaOwnedManagerProposalV2(state: GameState, proposalId: string): { state: GameState; error?: string } {
  const proposals = (state.cinemaOwnedManagerProposals || []);
  const p = proposals.find(pp => pp.id === proposalId) as any;
  if (!p) return { state, error: 'Proposal not found.' };
  if (p.kind === 'schedule_movie_owned') {
    const cinema = (state.ownedCinemas || []).find(c => c.id === p.cinemaId);
    const movie = state.movies.find(m => m.id === p.movieId);
    if (!cinema || !movie) return { state, error: 'Cinema or movie missing.' };
    const ownedCinemas = (state.ownedCinemas || []).map(c => c.id === p.cinemaId ? {
      ...c,
      scheduledReleases: [...(c.scheduledReleases || []), {
        id: uid('run_'), movieId: p.movieId,
        fromWeek: state.week, fromYear: state.year, weeksToShow: 4,
      }],
    } : c);
    const cinemaOwnedManagerProposals = proposals.filter(x => x.id !== proposalId);
    return { state: { ...state, ownedCinemas, cinemaOwnedManagerProposals } };
  }
  // Fall back to original handler for supplier_deal_inbound proposals
  return approveCinemaOwnedManagerProposal(state, proposalId);
}

// Extended TV manager: license own movies to own channels (free, just adds to programming).
export function tickTVManagerOwnContent(state: GameState, force = false): GameState {
  const playerChannels = (state.tvNetworks || []).filter(n => n.ownerStudioId === state.player.id);
  if (playerChannels.length === 0) return state;
  const proposals = (state.tvManagerProposals || []).slice();
  if (proposals.length >= 6) return state;
  if (!force && Math.random() > 0.20) return state;
  // Pick a channel that has fewer than 5 programmed and at least 3 released player movies not yet on it
  const playerMovies = state.movies.filter(m => m.studioId === state.player.id && m.status === 'released');
  if (playerMovies.length < 3) return state;
  const candidates = playerChannels.filter(ch => (ch.programmingMovieIds || []).length < 5);
  if (candidates.length === 0) return state;
  const ch = pick(candidates);
  const notOn = playerMovies.filter(m => !((ch.programmingMovieIds || []).includes(m.id))).slice(0, 3);
  if (notOn.length === 0) return state;
  // Avoid duplicate
  const dup = proposals.some(p => (p as any).kind === 'air_own_movie' && p.channelId === ch.id);
  if (dup) return state;
  const newProposal: any = {
    id: uid('tvmp_'), kind: 'air_own_movie', direction: 'inbound',
    channelId: ch.id, rivalStudioId: state.player.id, movieIds: notOn.map(m => m.id),
    feeB: 0, years: 3,
    rationale: `"${ch.name}" has light programming. Schedule ${notOn.length} of your own released titles for free (boosts viewers).`,
    createdWeek: state.week, createdYear: state.year,
  };
  return { ...state, tvManagerProposals: [...proposals, newProposal] };
}

export function approveTVManagerOwnContent(state: GameState, proposalId: string): { state: GameState; error?: string } {
  const proposals = state.tvManagerProposals || [];
  const p = proposals.find(pp => pp.id === proposalId) as any;
  if (!p) return { state, error: 'Proposal not found.' };
  if (p.kind === 'air_own_movie' && p.channelId && p.movieIds) {
    const tvNetworks = (state.tvNetworks || []).map(n => {
      if (n.id !== p.channelId) return n;
      const adds = p.movieIds.filter((mid: string) => !((n.programmingMovieIds || []).includes(mid)));
      return { ...n, programmingMovieIds: [...(n.programmingMovieIds || []), ...adds] };
    });
    const tvManagerProposals = proposals.filter(x => x.id !== proposalId);
    return { state: { ...state, tvNetworks, tvManagerProposals } };
  }
  return approveTVManagerProposal(state, proposalId);
}
