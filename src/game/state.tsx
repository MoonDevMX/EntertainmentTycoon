import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { GameState, Talent, Gender, Movie } from './types';
import { newGame, simulateWeek as simWeek, simulateMultiple as simMulti, tickWeek, createMovie as createMov, launchPlayerStreamingService as launchSvc, updatePlayerStreamingService as updateSvc, deletePlayerStreamingService as deleteSvc, addMovieToStreaming as addToStream, setMovieTierAccess as setTierAcc, setLicensedMovieTierAccess as setLicTierAcc, removeMovieFromStreaming as removeFromStream, hireTalent as hireT, fireTalent as fireT, calculateTalentExpectations, calculateAcceptance, licenseMovieToStreaming as licenseStream, negotiateMovieLicense as negLicense, renewLicense as renewLic, setMovieReleaseDate as setRelDate, holdMovie as holdMov, setMarketingAllocation as setMktAlloc, setMarketingAuto as setMktAuto, setMarketingAutoBulk as setMktAutoBulk, computeOptimalMarketingAllocation as computeOptMkt, computeLicenseFee, acceptLicenseOffer as acceptLO, counterLicenseOffer as counterLO, rejectLicenseOffer as rejectLO, signNegotiatedContract as signNeg, placeFestivalBid as bidFest, signCinemaDeal as signCine, generateCinemaProposals as genCineProp, approveCinemaProposal as appCineProp, rejectCinemaProposal as rejCineProp, bulkSignCinemaDeals as bulkSignCine, scheduleMovieInCinemas as schedMovCine, unscheduleMovieFromCinemas as unschedMovCine, bulkLicenseMoviesToService as bulkLicMov, buildOwnedCinemas as buildOwnCin, scheduleMoviesInOwnedCinemas as schedOwnCin, unscheduleOwnedCinemaRun as unschedOwnCinRun, demolishOwnedCinema as demolishOwnCin, renameOwnedCinema as renameOwnCin, toggleOwnedCinemaAmenity as toggleOwnCinAm, setOwnedCinemaCustomization as setOwnCinCust, TICKET_PRICE_SPECS, FOOD_SPECS, MERCH_SPECS, OWNED_CINEMA_SPECS, AMENITY_SPECS, quoteCinemaSupplierDeal as quoteCinSup, signCinemaSupplierDeal as signCinSup, cancelCinemaSupplierDeal as cancelCinSup, setMovieDescription as setMovDesc, signBulkLicenseDeal as signBLD, quoteBulkLicenseDeal as quoteBLD, signFranchiseBulkLicense as signFBL, quoteFranchiseBulkLicense as quoteFBL, proposeFranchiseTrade as propFr, acceptFranchiseOffer as accFr, counterFranchiseOffer as cntFr, rejectFranchiseOffer as rejFr, quoteFranchiseValue as qFr, proposeBulkCatalogLicense as propBC, acceptBulkCatalogOffer as accBC, counterBulkCatalogOffer as cntBC, rejectBulkCatalogOffer as rejBC, quoteBulkCatalogValue as qBC, broadcastBulkCatalogLicense as broadcastBC, quoteFutureReleasesValueB as qFut, quoteFranchiseBulkValueB as qFrBulk, acceptIPOffer as accIP, counterIPOffer as cntIP, rejectIPOffer as rejIP, quoteIPOffer as qIP, createOutboundIPListing as createOL, acceptOutboundBid as accOB, rejectOutboundBid as rejOB, counterOutboundBid as cntOB, sublicenseIPToRival, ensureTVNetworks as ensureTVN, quoteTVNetworkDeal as qTVD, proposeTVNetworkDeal as propTVD, acceptTVNetworkCounter as accTVD, rejectTVNetworkCounter as rejTVD, createPlayerTVChannel as createPTVC, setChannelMonthlyFee as setChFee, setChannelProgramming as setChProg, signCableDistributionDeal as signCD, createTVSeries as createTVS, renewTVSeries as renewTVS, cancelTVSeries, createChannelPack as createChP, deleteChannelPack as delChP, quoteChannelContentLicense as qCCL, proposeChannelContentLicense as propCCL, acceptChannelContentCounter as accCCL, rejectChannelContentCounter as rejCCL, renameTVChannel as renameTVCh, deleteTVChannel as deleteTVCh, ensureCableProviders as ensureCP, quoteCableCarriageDeal as qCCD, signCableCarriageDeal as signCCD, acceptCableCarriageCounter as accCCD, rejectCableCarriageDeal as rejCCD, cancelCableCarriageDeal as cancelCCD, approveTVManagerProposal as appTVMP, rejectTVManagerProposal as rejTVMP, approveCinemaOwnedManagerProposal as appCOMP, rejectCinemaOwnedManagerProposal as rejCOMP, setChannelPackTierPricing as setCPTP, renameChannelPack as renameChP, setChannelPackMonthlyFee as setChPFee, addSeriesToChannels as addSeriesToCh, createPlayerCableNetwork as createPCN, deletePlayerCableNetwork as delPCN, renamePlayerCableNetwork as renPCN, addChannelToPlayerCable as addChToPC, removeChannelFromPlayerCable as remChFromPC, setPlayerCableTier as setPCT, addPlayerCableTier as addPCT, deletePlayerCableTier as delPCT, addChannelToPack as addChToPack, removeChannelFromPack as remChFromPack, quoteWholeNetworkLicense as qWNL, signWholeNetworkLicenseOutbound as signWNLO, signWholeNetworkLicenseInbound as signWNLI, setStreamingTierAdSupport as setStrTierAd, setChannelAdProgrammingRatio as setChAdRatio, setEntityMarketing as setEntMkt, approveCinemaOwnedManagerProposalV2 as appCOMP2, approveTVManagerOwnContent as appTVMOC, tickCinemaOwnedManager, tickCinemaOwnedManagerExtended, tickTVNetworkManager, tickTVManagerOwnContent, LaunchStreamingArgs, HireTalentArgs, LicenseMovieArgs, BulkLicenseDealParams, FranchiseBulkLicenseParams } from './sim';
import type { CinemaRegion, OwnedCinemaSize } from './types';
import { FranchiseOfferKind, GameEngineModule, GamingStudioType } from './types';
import { GENRES } from './data';
import { seedGamingFields, createEngineAction, foundStudioAction, startProjectAction, designConsoleAction, buildHQRoomAction, recruitGamingStaffAction, configurePassAction, createMovieFromGameAction, renameGamingStudioHQAction, deleteGamingStudioHQAction, renameGameEngineAction, deleteGameEngineAction, renameGamingConsoleAction, deleteGamingConsoleAction, researchNextGenAction } from './gaming';

const STORAGE_KEY = 'mooncinema_save_v8';
const LEGACY_KEYS = ['mooncinema_save_v7', 'mooncinema_save_v6', 'mooncinema_save_v5'];
const SLOT_PREFIX = 'mooncinema_slot_';
const SLOTS_INDEX_KEY = 'mooncinema_slots_index';

// Backfill granular skills for talents that pre-date Sprint 2 (only have flat `skill`).
function ensureGranularSkills(t: any): any {
  if (t.skills && t.genreSkills) return t;
  const skill = typeof t.skill === 'number' ? t.skill : 60;
  const jitter = (b: number, sp = 12) => Math.max(30, Math.min(100, Math.round(b + (Math.random() - 0.5) * 2 * sp)));
  const breakdown: any = { starPower: t.fame ?? 30 };
  if (t.role === 'director') {
    breakdown.directing = jitter(skill, 6);
    breakdown.leadership = jitter(skill);
    breakdown.pacing = jitter(skill);
    breakdown.style = jitter(skill);
  } else if (t.role === 'writer') {
    breakdown.plot = jitter(skill, 6);
    breakdown.dialogue = jitter(skill);
    breakdown.structure = jitter(skill);
    breakdown.originality = jitter(skill);
  } else {
    breakdown.acting = jitter(skill, 6);
    breakdown.range = jitter(skill);
    breakdown.presence = jitter(skill);
    breakdown.accents = jitter(skill);
  }
  // Genre skills: 2 strong + 2 weak (random)
  const list = GENRES.slice();
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  const strong = list.slice(0, 2); const weak = list.slice(2, 4);
  const gs: any = {};
  GENRES.forEach(g => { gs[g] = strong.includes(g) ? jitter(skill + 12, 5) : weak.includes(g) ? jitter(skill - 18, 5) : jitter(skill, 6); });
  return { ...t, skills: t.skills || breakdown, genreSkills: t.genreSkills || gs };
}

// Migrate older saves: rename gold→yellow, add gender/relationships/streamingServices if missing.
function migrate(raw: any): GameState {
  const s = raw as GameState;
  // Talents: gold→yellow + gender backfill + granular skills backfill + role collapse (legacy lead_/support_ → actor/actress)
  if (Array.isArray(s.talents)) {
    s.talents = s.talents.map((t: any) => {
      const ct = t.colorTrait === 'gold' ? 'yellow' : t.colorTrait;
      // Collapse legacy roles
      let role = t.role;
      if (role === 'lead_actor' || role === 'support_actor') role = 'actor';
      else if (role === 'lead_actress' || role === 'support_actress') role = 'actress';
      let gender: Gender = t.gender;
      if (!gender) {
        if (role === 'actor') gender = 'male';
        else if (role === 'actress') gender = 'female';
        else gender = Math.random() < 0.5 ? 'male' : 'female';
      }
      return ensureGranularSkills({ ...t, role, colorTrait: ct, gender });
    }) as Talent[];
  }
  if (Array.isArray((s as any).audience)) {
    (s as any).audience = (s as any).audience.map((a: any) => ({ ...a, preferredColor: a.preferredColor === 'gold' ? 'yellow' : a.preferredColor }));
  }
  if (!s.relationships) s.relationships = {};
  if (!Array.isArray(s.streamingServices)) s.streamingServices = [];
  // Movies: ensure releaseStrategy + inStreamingServiceIds present
  if (Array.isArray(s.movies)) {
    s.movies = s.movies.map((m: Movie) => ({
      ...m,
      releaseStrategy: m.releaseStrategy || 'theatrical',
      inStreamingServiceIds: m.inStreamingServiceIds || [],
    }));
  }
  return seedGamingFields(s);
}

type Ctx = {
  state: GameState | null;
  loading: boolean;
  startNewGame: (name: string, logoIdx: number) => Promise<void>;
  resetGame: () => Promise<void>;
  save: () => Promise<void>;
  setState: (s: GameState) => void;
  simulateWeek: () => void;
  simulateMultiple: (weeks: number) => void;
  dismissRecap: () => void;
  createMovie: typeof createMov;
  launchStreamingService: (args: LaunchStreamingArgs) => { error?: string };
  updateStreamingService: (id: string, patch: Parameters<typeof updateSvc>[2]) => { error?: string };
  deleteStreamingService: (id: string) => { error?: string };
  addMovieToStreaming: (serviceId: string, movieId: string, tierIds?: string[]) => { error?: string };
  setMovieTierAccess: (serviceId: string, movieId: string, tierIds: string[]) => { error?: string };
  setLicensedMovieTierAccess: (serviceId: string, movieId: string, tierIds: string[]) => { error?: string };
  removeMovieFromStreaming: (serviceId: string, movieId: string) => void;
  hireTalent: (args: HireTalentArgs) => { error?: string; accepted?: boolean };
  fireTalent: (talentId: string) => { error?: string };
  licenseMovieToStreaming: (serviceId: string, args: LicenseMovieArgs) => { error?: string; fee?: number };
  negotiateMovieLicense: (serviceId: string, args: LicenseMovieArgs & { offeredFeeM: number }) => { error?: string; accepted?: boolean; counter?: { feeM: number; reason: string } };
  renewLicense: (serviceId: string, movieId: string, additionalYears: 1 | 3 | 5 | 10) => { error?: string; fee?: number };
  setMovieReleaseDate: (movieId: string, week: number, year: number) => { error?: string };
  holdMovie: (movieId: string) => { error?: string };
  setMarketingAllocation: (movieId: string, allocation: Record<string, number>) => { error?: string };
  // V30 — Marketing Manager
  setMarketingAuto: (movieId: string, enabled: boolean) => { error?: string };
  setMarketingAutoBulk: (enabled: boolean) => { count: number };
  computeOptimalMarketing: (movieId: string) => Record<string, number>;
  // V30 — Cinema Manager
  generateCinemaProposals: () => { created: number };
  generateTVManagerProposals: () => { created: number };
  approveCinemaProposal: (proposalId: string) => { error?: string };
  rejectCinemaProposal: (proposalId: string) => { error?: string };
  bulkSignCinemaDeals: (chainIds: string[], years: number) => { signed: number; failed: string[] };
  scheduleMovieInCinemas: (movieId: string, chainIds: string[], targetWeek: number, targetYear: number) => { error?: string };
  unscheduleMovieFromCinemas: (movieId: string) => void;
  bulkLicenseMoviesToService: (serviceId: string, movieIds: string[], yearsLicensed: 1 | 3 | 5 | 10) => { licensed: number; totalFee: number; failed: string[] };
  // V30 — Player-owned cinemas
  buildOwnedCinemas: (plan: { region: CinemaRegion; size: OwnedCinemaSize; count: number }[]) => { built: number; totalCostM: number; error?: string };
  scheduleMoviesInOwnedCinemas: (movieIds: string[], cinemaIds: string[], fromWeek: number, fromYear: number, weeksToShow?: number) => { scheduled: number; failed: string[] };
  unscheduleOwnedCinemaRun: (cinemaId: string, runId: string) => void;
  demolishOwnedCinema: (cinemaId: string) => { refundM: number };
  renameOwnedCinema: (cinemaId: string, newName: string) => { error?: string };
  toggleOwnedCinemaAmenity: (cinemaId: string, amenity: 'imax' | 'recliners' | 'premiumConcessions', install: boolean) => { error?: string; cost: number };
  setOwnedCinemaCustomization: (cinemaId: string, args: { ticketPriceLevel?: 'value' | 'standard' | 'premium'; foodLevel?: 'none' | 'basic' | 'premium' | 'gourmet'; merchLevel?: 'none' | 'basic' | 'premium' }) => { error?: string };
  quoteCinemaSupplierDeal: (args: { rivalStudioId: string; years: number; includeTraditional: boolean; includeHybrid: boolean }) => { feeM: number; perReleaseKickbackM: number; revShareToPlayer: number; estReleasesPerYear: number; error?: string };
  signCinemaSupplierDeal: (args: { rivalStudioId: string; years: number; includeTraditional: boolean; includeHybrid: boolean; upfrontFeeM: number }) => { error?: string };
  cancelCinemaSupplierDeal: (dealId: string) => { error?: string };
  acceptOffer: (offerId: string) => { error?: string };
  counterOffer: (offerId: string, counterFeeM: number) => { error?: string };
  rejectOffer: (offerId: string) => { error?: string };
  signNegotiated: (talentId: string, numMovies: number, upfront: number, boPercent: number) => { error?: string };
  placeFestivalBid: (festivalId: string, lotId: string, bidM: number) => { error?: string };
  signCinemaDeal: (chainId: string, years: number, openShare: number, lateShare: number) => { error?: string; counter?: { openShare: number; lateShare: number; years: number; reason: string } };
  setMovieDescription: (movieId: string, description: string) => { error?: string };
  signBulkLicenseDeal: (p: BulkLicenseDealParams) => { error?: string; feeM?: number };
  quoteBulkLicenseDeal: (p: BulkLicenseDealParams) => { feeM: number; error?: string };
  signFranchiseBulkLicense: (p: FranchiseBulkLicenseParams) => { error?: string; feeM?: number };
  quoteFranchiseBulkLicense: (p: FranchiseBulkLicenseParams) => { feeM: number; error?: string; movieCount?: number };
  // External IP licensing
  acceptIPOffer: (offerId: string) => { error?: string };
  counterIPOffer: (offerId: string, terms: { feeM?: number; boPercent?: number; merchPercent?: number; years?: number; packs?: number; exclusivity?: boolean; sublicensable?: boolean }) => { error?: string };
  rejectIPOffer: (offerId: string) => void;
  quoteIPOffer: (ipId: string, terms: { feeM: number; boPercent: number; merchPercent: number; years: number; packs: number; exclusivity: boolean; sublicensable: boolean }) => { feeM: number; error?: string };
  createOutboundIPListing: (args: { sourceFranchiseId?: string; sourceMovieId?: string; category: import('./types').IPCategory; exclusivity?: boolean; sublicensable?: boolean }) => { error?: string; listingId?: string };
  sublicenseIPToRival: (ownedIPLicenseId: string, rivalStudioId: string, askingFeeM: number) => { error?: string; accepted?: boolean; counterFeeM?: number };
  acceptOutboundBid: (bidId: string) => { error?: string };
  rejectOutboundBid: (bidId: string) => void;
  proposeFranchiseTrade: (args: { franchiseId: string; kind: FranchiseOfferKind; priceB: number }) => { error?: string; offerId?: string };
  acceptFranchiseOffer: (offerId: string) => { error?: string };
  counterFranchiseOffer: (offerId: string, newPriceB: number) => { error?: string };
  rejectFranchiseOffer: (offerId: string) => void;
  quoteFranchiseValue: (franchiseId: string) => number;
  proposeBulkCatalogLicense: (args: { fromRivalStudioId?: string; toRivalStudioId: string; movieIds: string[]; priceB: number; years: number; serviceId: string; exclusivity?: boolean; dealKind?: 'catalog' | 'future_releases' | 'franchise_bulk'; franchiseId?: string; futureMovieCount?: number; tierIds?: string[] }) => { error?: string; offerId?: string };
  // V38 — multi-target broadcast (one transaction, fixes race condition)
  broadcastBulkCatalogLicense: (args: { targetStudioIds: string[]; priceB: number; years: number; dealKind: 'catalog' | 'future_releases' | 'franchise_bulk'; franchiseId?: string; movieIds?: string[]; futureMovieCount?: number; exclusivity?: boolean; tierIds?: string[] }) => { error?: string; created: number; accepted: number; counters: number; rejected: number };
  acceptBulkCatalogOffer: (offerId: string) => { error?: string };
  counterBulkCatalogOffer: (offerId: string, newPriceB: number) => { error?: string };
  rejectBulkCatalogOffer: (offerId: string) => void;
  quoteBulkCatalogValue: (movieIds: string[], years: number) => number;
  quoteFutureReleasesValueB: (rivalStudioId: string, movieCount: number, years: number) => number;
  quoteFranchiseBulkValueB: (franchiseId: string, years: number) => number;
  counterOutboundBid: (bidId: string, terms: { feeM?: number; royaltyPercent?: number; years?: number }) => { error?: string };
  // V35 — TV Networks
  proposeTVNetworkDeal: (args: { networkId: string; movieIds: string[]; askingFeeB: number; years: number; exclusivity?: boolean }) => { error?: string; dealId?: string; counterFeeB?: number; accepted?: boolean };
  acceptTVNetworkCounter: (dealId: string) => { error?: string };
  rejectTVNetworkCounter: (dealId: string) => void;
  createPlayerTVChannel: (args: { name: string; region: import('./types').TVNetworkRegion; kind: import('./types').TVChannelKind; genreFocus?: string[] }) => { error?: string; networkId?: string };
  setChannelMonthlyFee: (channelId: string, feeUSD: number) => { error?: string };
  setChannelProgramming: (channelId: string, movieIds: string[]) => { error?: string };
  signCableDistributionDeal: (channelId: string) => { error?: string; costB?: number };
  // V35 — TV Series
  createTVSeries: (args: any) => { error?: string; seriesId?: string };
  renewTVSeries: (seriesId: string, args: { episodes: number; budgetM: number }) => { error?: string };
  // V37 — Cancel series
  cancelTVSeries: (seriesId: string) => { error?: string };
  // V35 — Channel Packs
  createChannelPack: (args: { name: string; channelIds: string[]; monthlyFeeUSD: number; pricingByTier?: { budget: number; standard: number; premium: number } }) => { error?: string; packId?: string };
  deleteChannelPack: (packId: string) => void;
  // V35 — Inbound channel content licensing
  quoteChannelContentLicense: (args: { rivalStudioId: string; movieIds: string[]; years: number }) => { feeB: number; error?: string };
  proposeChannelContentLicense: (args: { channelId: string; rivalStudioId: string; movieIds: string[]; askingFeeB: number; years: number }) => { error?: string; licenseId?: string; counterFeeB?: number; accepted?: boolean };
  acceptChannelContentCounter: (licenseId: string) => { error?: string };
  rejectChannelContentCounter: (licenseId: string) => void;
  quoteTVNetworkDeal: (args: { networkId: string; movieIds: string[]; years: number; exclusivity?: boolean }) => { feeB: number; error?: string };
  // V36 — TV Channel rename/delete + Cable Providers
  renameTVChannel: (channelId: string, newName: string) => { error?: string };
  deleteTVChannel: (channelId: string) => { error?: string };
  quoteCableCarriageDeal: (args: { providerId: string; channelId: string; years: number }) => { fairUSD: number; minUSD: number; maxUSD: number; estWeeklyRevM: number; signingBonusM: number; error?: string };
  signCableCarriageDeal: (args: { providerId: string; channelId: string; askingFeeUSD: number; years: number }) => { error?: string; accepted?: boolean; counterFeeUSD?: number; dealId?: string };
  acceptCableCarriageCounter: (dealId: string, counterFeeUSD: number) => { error?: string };
  rejectCableCarriageDeal: (dealId: string) => void;
  cancelCableCarriageDeal: (dealId: string) => { error?: string };
  // V39 — Manager proposals
  approveTVManagerProposal: (proposalId: string) => { error?: string };
  rejectTVManagerProposal: (proposalId: string) => void;
  approveCinemaOwnedManagerProposal: (proposalId: string) => { error?: string };
  rejectCinemaOwnedManagerProposal: (proposalId: string) => void;
  setChannelPackTierPricing: (packId: string, pricing: { budget: number; standard: number; premium: number } | null) => { error?: string };
  // V41 — Channel pack rename + flat fee edit
  renameChannelPack: (packId: string, newName: string) => { error?: string };
  setChannelPackMonthlyFee: (packId: string, monthlyFeeUSD: number) => { error?: string };
  // V41 — Multi-channel series broadcast
  addSeriesToChannels: (seriesId: string, channelIds: string[]) => { error?: string };
  // V41 — Player Cable Carriage Network
  createPlayerCableNetwork: (args: { name: string; region: import('./types').TVNetworkRegion }) => { error?: string; networkId?: string };
  deletePlayerCableNetwork: (networkId: string) => { error?: string };
  renamePlayerCableNetwork: (networkId: string, newName: string) => { error?: string };
  addChannelToPlayerCable: (networkId: string, channelId: string, feePerSubPerMonthUSD: number) => { error?: string };
  removeChannelFromPlayerCable: (networkId: string, channelId: string) => { error?: string };
  setPlayerCableTier: (networkId: string, tierId: string, patch: { name?: string; monthlyFeeUSD?: number; channelIds?: string[]; includedStreamingServiceIds?: string[]; includedStreamingTiers?: { serviceId: string; tierId: string }[]; includedChannelPackIds?: string[]; ppvEnabled?: boolean }) => { error?: string };
  addPlayerCableTier: (networkId: string, name: string, monthlyFeeUSD: number) => { error?: string };
  deletePlayerCableTier: (networkId: string, tierId: string) => void;
  // V42 — Channel pack channel mgmt
  addChannelToPack: (packId: string, channelId: string) => { error?: string };
  removeChannelFromPack: (packId: string, channelId: string) => { error?: string };
  // V42 — Manual save slots
  saveToSlot: (slotName: string) => Promise<{ error?: string }>;
  loadFromSlot: (slotName: string) => Promise<{ error?: string }>;
  listSlots: () => Promise<{ name: string; updatedAt: number; week: number; year: number; studioName: string; cashB: number }[]>;
  deleteSlot: (slotName: string) => Promise<void>;
  // V43 — New sim actions (whole-network licensing, ads, marketing, extended managers)
  quoteWholeNetworkLicense: (args: { rivalStudioId: string; movieIds: string[]; years: number }) => { feeB: number; channelCount: number; error?: string };
  signWholeNetworkLicenseOutbound: (args: { rivalStudioId: string; movieIds: string[]; years: number; askingFeeB: number }) => { error?: string; accepted?: boolean; counterFeeB?: number };
  signWholeNetworkLicenseInbound: (args: { rivalStudioId: string; movieIds: string[]; years: number; askingFeeB: number }) => { error?: string; accepted?: boolean; counterFeeB?: number };
  setStreamingTierAdSupport: (serviceId: string, tierId: string, adSupported: boolean, adArpuUSD?: number) => { error?: string };
  setChannelAdProgrammingRatio: (channelId: string, ratio: number) => { error?: string };
  setEntityMarketing: (kind: 'channel' | 'series' | 'streaming' | 'cinema' | 'cable', id: string, budgetM: number) => { error?: string };
  approveCinemaOwnedManagerProposalV2: (proposalId: string) => { error?: string };
  approveTVManagerOwnContent: (proposalId: string) => { error?: string };
  // Gaming Actions
  createEngine: (args: { name: string; modules: GameEngineModule[]; generation: number }) => { error?: string };
  foundStudio: (args: { name: string; type: GamingStudioType }) => { error?: string };
  startProject: (args: { title: string; genre: 'RPG' | 'Action' | 'Shooter' | 'Strategy' | 'Simulation' | 'Sports' | 'Adventure' | 'MMO'; engineId: string; studioId: string; monetizationModel: 'Premium' | 'GaaS' | 'F2P' | 'Subscription' | 'AdSupported'; featuresFocus: { graphics: number; gameplay: number; story: number; multiplayer: number; ai: number; ui: number; performance: number }; budgetM: number; marketingBudgetM: number; adaptationMovieId?: string; isVRExclusivity?: boolean; subgenre?: string }) => { error?: string };
  designConsole: (args: { title: string; specs: any; price: number; manufacturingCost: number }) => { error?: string };
  buildHQRoom: (studioHQId: string, roomKey: string) => { error?: string };
  recruitGamingStaff: (studioHQId: string, role: string, qtyToAdd: number) => { error?: string };
  configurePass: (price: number, name: string, basicPrice?: number, premiumPrice?: number, adSupported?: boolean, enabledConsoleIds?: string[], catalogProjectIds?: string[]) => { error?: string };
  createMovieFromGame: (gameProjectId: string, movieTitle: string, userPlot: string, type: any) => { error?: string };
  renameGamingStudioHQ: (studioHQId: string, newName: string) => { error?: string };
  deleteGamingStudioHQ: (studioHQId: string) => { error?: string };
  renameGameEngine: (engineId: string, newName: string) => { error?: string };
  deleteGameEngine: (engineId: string) => { error?: string };
  renameGamingConsole: (consoleId: string, newTitle: string) => { error?: string };
  deleteGamingConsole: (consoleId: string) => { error?: string };
  researchNextGen: () => { error?: string };
};

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateInner] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  // stateRef always holds the latest game state. Reading callbacks read from this ref so
  // they don't need `state` in their useCallback deps — eliminates the entire class of
  // stale-closure bugs and lets callbacks keep stable identities across renders.
  const stateRef = useRef<GameState | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    (async () => {
      try {
        let raw = await AsyncStorage.getItem(STORAGE_KEY);
        // If v4 missing, attempt to migrate from a legacy save
        if (!raw) {
          for (const k of LEGACY_KEYS) {
            const legacy = await AsyncStorage.getItem(k);
            if (legacy) {
              try {
                const migrated = migrate(JSON.parse(legacy));
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                raw = JSON.stringify(migrated);
                break;
              } catch (legacyErr) {
                // Legacy save was malformed/unparseable — log and skip; we'll fall through
                // to the next legacy key or start a fresh game.
                console.warn('legacy migration failed for key', k, legacyErr);
              }
            }
          }
        }
        if (raw) {
          let loaded = migrate(JSON.parse(raw));
          // V42 — Backfill new TV channels / cable providers when seed expands.
          loaded = ensureTVN(loaded);
          loaded = ensureCP(loaded);
          setStateInner(loaded);
        }
      } catch (e) {
        console.warn('load failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (s: GameState) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) { console.warn('save failed', e); }
  }, []);

  const setState = useCallback((s: GameState) => {
    setStateInner(s);
    persist(s);
  }, [persist]);

  const startNewGame = useCallback(async (name: string, logoIdx: number) => {
    const fresh = newGame(name, logoIdx);
    setStateInner(fresh);
    await persist(fresh);
  }, [persist]);

  const resetGame = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setStateInner(null);
  }, []);

  const save = useCallback(async () => { const cur = stateRef.current; if (cur) await persist(cur); }, [persist]);

  const simulateWeek = useCallback(() => {
    const state = stateRef.current; if (!state) return;
    // V43 — Start a fresh recap (no existing pending recap accumulator from a previous dismiss).
    const seed = state.pendingRecap ? state : { ...state, pendingRecap: undefined };
    const next = tickWeek(seed);
    setStateInner(next);
    persist(next);
  }, [persist]);

  const simulateMultiple = useCallback((weeks: number) => {
    const state = stateRef.current; if (!state) return;
    // V43 — Reset recap; accumulation happens inside tickWeek via finalizeWeek.
    const seed = state.pendingRecap ? { ...state, pendingRecap: undefined } : state;
    const next = simMulti(seed, weeks);
    setStateInner(next);
    persist(next);
  }, [persist]);

  // V43 — Dismiss the recap modal (clears pendingRecap so next sim starts fresh).
  const dismissRecap = useCallback(() => {
    const state = stateRef.current; if (!state) return;
    const next = { ...state, pendingRecap: undefined };
    setStateInner(next);
    persist(next);
  }, [persist]);

  const createMovie: typeof createMov = useCallback((s, args) => {
    const result = createMov(s, args);
    if (!result.error) {
      setStateInner(result.state);
      persist(result.state);
    }
    return result;
  }, [persist]);

  const launchStreamingService = useCallback((args: LaunchStreamingArgs) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = launchSvc(state, args);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const updateStreamingService = useCallback((id: string, patch: Parameters<typeof updateSvc>[2]) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = updateSvc(state, id, patch);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const deleteStreamingService = useCallback((id: string) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = deleteSvc(state, id);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const addMovieToStreaming = useCallback((serviceId: string, movieId: string, tierIds?: string[]) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = addToStream(state, serviceId, movieId, tierIds);
    if (!r.error) {
      stateRef.current = r.state;
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const setMovieTierAccess = useCallback((serviceId: string, movieId: string, tierIds: string[]) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = setTierAcc(state, serviceId, movieId, tierIds);
    if (!r.error) {
      stateRef.current = r.state;
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const setLicensedMovieTierAccess = useCallback((serviceId: string, movieId: string, tierIds: string[]) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = setLicTierAcc(state, serviceId, movieId, tierIds);
    if (!r.error) {
      stateRef.current = r.state;
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const removeMovieFromStreaming = useCallback((serviceId: string, movieId: string) => {
    const state = stateRef.current; if (!state) return;
    const r = removeFromStream(state, serviceId, movieId);
    setStateInner(r.state);
    persist(r.state);
  }, [persist]);

  const hireTalent = useCallback((args: HireTalentArgs) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = hireT(state, args);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error, accepted: r.accepted };
  }, [persist]);

  const fireTalent = useCallback((talentId: string) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = fireT(state, talentId);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const licenseMovieToStreaming = useCallback((serviceId: string, args: LicenseMovieArgs) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = licenseStream(state, serviceId, args);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error, fee: r.fee };
  }, [persist]);

  const negotiateMovieLicense = useCallback((serviceId: string, args: LicenseMovieArgs & { offeredFeeM: number }) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = negLicense(state, serviceId, args);
    if (r.accepted) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error, accepted: r.accepted, counter: r.counter };
  }, [persist]);

  const renewLicense = useCallback((serviceId: string, movieId: string, additionalYears: 1 | 3 | 5 | 10) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = renewLic(state, serviceId, movieId, additionalYears);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error, fee: r.fee };
  }, [persist]);

  const setMovieReleaseDate = useCallback((movieId: string, week: number, year: number) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = setRelDate(state, movieId, week, year);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const holdMovie = useCallback((movieId: string) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = holdMov(state, movieId);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  const setMarketingAllocation = useCallback((movieId: string, allocation: Record<string, number>) => {
    const state = stateRef.current; if (!state) return { error: 'No game.' };
    const r = setMktAlloc(state, movieId, allocation);
    if (!r.error) {
      setStateInner(r.state);
      persist(r.state);
    }
    return { error: r.error };
  }, [persist]);

  return (
    <GameCtx.Provider value={{
      state, loading, startNewGame, resetGame, save, setState, simulateWeek, simulateMultiple, dismissRecap, createMovie,
      launchStreamingService, updateStreamingService, deleteStreamingService, addMovieToStreaming, setMovieTierAccess, setLicensedMovieTierAccess, removeMovieFromStreaming,
      hireTalent, fireTalent, licenseMovieToStreaming, negotiateMovieLicense, renewLicense, setMovieReleaseDate, holdMovie, setMarketingAllocation,
      // V30 — Marketing Manager
      setMarketingAuto: (movieId, enabled) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setMktAuto(state, movieId, enabled);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      setMarketingAutoBulk: (enabled) => {
        const state = stateRef.current; if (!state) return { count: 0 };
        const r = setMktAutoBulk(state, enabled);
        setStateInner(r.state); persist(r.state);
        return { count: r.count };
      },
      computeOptimalMarketing: (movieId) => {
        const state = stateRef.current; if (!state) return {};
        const m = state.movies.find(mm => mm.id === movieId);
        if (!m) return {};
        return computeOptMkt(m, state.audience);
      },
      // V30 — Cinema Manager
      generateCinemaProposals: () => {
        const state = stateRef.current; if (!state) return { created: 0 };
        const r = genCineProp(state);
        let s = tickCinemaOwnedManager(r.state, true);
        s = tickCinemaOwnedManagerExtended(s, true);
        const preOwned = state.cinemaOwnedManagerProposals?.length || 0;
        const postOwned = s.cinemaOwnedManagerProposals?.length || 0;
        const ownedAdded = Math.max(0, postOwned - preOwned);
        setStateInner(s); persist(s);
        return { created: r.created + ownedAdded };
      },
      generateTVManagerProposals: () => {
        const state = stateRef.current; if (!state) return { created: 0 };
        const pre = (state.tvManagerProposals || []).length;
        let s = tickTVNetworkManager(state, true);
        s = tickTVManagerOwnContent(s, true);
        const post = (s.tvManagerProposals || []).length;
        const created = Math.max(0, post - pre);
        setStateInner(s); persist(s);
        return { created };
      },
      approveCinemaProposal: (proposalId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = appCineProp(state, proposalId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectCinemaProposal: (proposalId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = rejCineProp(state, proposalId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      bulkSignCinemaDeals: (chainIds, years) => {
        const state = stateRef.current; if (!state) return { signed: 0, failed: [] };
        const r = bulkSignCine(state, chainIds, years);
        setStateInner(r.state); persist(r.state);
        return { signed: r.signed, failed: r.failed };
      },
      scheduleMovieInCinemas: (movieId, chainIds, targetWeek, targetYear) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = schedMovCine(state, movieId, chainIds, targetWeek, targetYear);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      unscheduleMovieFromCinemas: (movieId) => {
        const state = stateRef.current; if (!state) return;
        const r = unschedMovCine(state, movieId);
        setStateInner(r.state); persist(r.state);
      },
      bulkLicenseMoviesToService: (serviceId, movieIds, yearsLicensed) => {
        const state = stateRef.current; if (!state) return { licensed: 0, totalFee: 0, failed: [] };
        const r = bulkLicMov(state, serviceId, movieIds, yearsLicensed);
        setStateInner(r.state); persist(r.state);
        return { licensed: r.licensed, totalFee: r.totalFee, failed: r.failed };
      },
      // V30 — Player-owned cinemas
      buildOwnedCinemas: (plan) => {
        const state = stateRef.current; if (!state) return { built: 0, totalCostM: 0, error: 'No game.' };
        const r = buildOwnCin(state, plan);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { built: r.built, totalCostM: r.totalCostM, error: r.error };
      },
      scheduleMoviesInOwnedCinemas: (movieIds, cinemaIds, fromWeek, fromYear, weeksToShow) => {
        const state = stateRef.current; if (!state) return { scheduled: 0, failed: [] };
        const r = schedOwnCin(state, movieIds, cinemaIds, fromWeek, fromYear, weeksToShow);
        setStateInner(r.state); persist(r.state);
        return { scheduled: r.scheduled, failed: r.failed };
      },
      unscheduleOwnedCinemaRun: (cinemaId, runId) => {
        const state = stateRef.current; if (!state) return;
        const r = unschedOwnCinRun(state, cinemaId, runId);
        setStateInner(r.state); persist(r.state);
      },
      demolishOwnedCinema: (cinemaId) => {
        const state = stateRef.current; if (!state) return { refundM: 0 };
        const r = demolishOwnCin(state, cinemaId);
        setStateInner(r.state); persist(r.state);
        return { refundM: r.refundM };
      },
      renameOwnedCinema: (cinemaId, newName) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = renameOwnCin(state, cinemaId, newName);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      toggleOwnedCinemaAmenity: (cinemaId, amenity, install) => {
        const state = stateRef.current; if (!state) return { error: 'No game.', cost: 0 };
        const r = toggleOwnCinAm(state, cinemaId, amenity, install);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, cost: r.cost };
      },
      setOwnedCinemaCustomization: (cinemaId, args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setOwnCinCust(state, cinemaId, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      quoteCinemaSupplierDeal: (args) => {
        const state = stateRef.current; if (!state) return { feeM: 0, perReleaseKickbackM: 0, revShareToPlayer: 0, estReleasesPerYear: 0, error: 'No game.' };
        return quoteCinSup(state, args);
      },
      signCinemaSupplierDeal: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signCinSup(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      cancelCinemaSupplierDeal: (dealId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cancelCinSup(state, dealId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      acceptOffer: (offerId: string) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = acceptLO(state, offerId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      counterOffer: (offerId: string, fee: number) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = counterLO(state, offerId, fee);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectOffer: (offerId: string) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = rejectLO(state, offerId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      signNegotiated: (talentId: string, numMovies: number, upfront: number, boPercent: number) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signNeg(state, talentId, numMovies, upfront, boPercent);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      placeFestivalBid: (festivalId: string, lotId: string, bidM: number) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = bidFest(state, festivalId, lotId, bidM);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      signCinemaDeal: (chainId: string, years: number, openShare: number, lateShare: number) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signCine(state, chainId, years, openShare, lateShare);
        if (!r.error && !r.counter) { setStateInner(r.state); persist(r.state); }
        else if (r.counter) { setStateInner(r.state); persist(r.state); } // newsLog updated even on counter
        return { error: r.error, counter: r.counter };
      },
      setMovieDescription: (movieId: string, description: string) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setMovDesc(state, movieId, description);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      signBulkLicenseDeal: (p: BulkLicenseDealParams) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signBLD(state, p);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, feeM: r.feeM };
      },
      quoteBulkLicenseDeal: (p: BulkLicenseDealParams) => {
        const state = stateRef.current; if (!state) return { feeM: 0, error: 'No game.' };
        return quoteBLD(state, p);
      },
      signFranchiseBulkLicense: (p: FranchiseBulkLicenseParams) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signFBL(state, p);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, feeM: r.feeM };
      },
      quoteFranchiseBulkLicense: (p: FranchiseBulkLicenseParams) => {
        const state = stateRef.current; if (!state) return { feeM: 0, error: 'No game.' };
        return quoteFBL(state, p);
      },
      acceptIPOffer: (offerId: string) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accIP(state, offerId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      counterIPOffer: (offerId, terms) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cntIP(state, offerId, terms);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectIPOffer: (offerId: string) => {
        const state = stateRef.current; if (!state) return;
        const r = rejIP(state, offerId);
        setStateInner(r.state); persist(r.state);
      },
      quoteIPOffer: (ipId, terms) => {
        const state = stateRef.current; if (!state) return { feeM: 0, error: 'No game.' };
        return qIP(state, ipId, terms);
      },
      createOutboundIPListing: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = createOL(state, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, listingId: r.listingId };
      },
      sublicenseIPToRival: (ownedIPLicenseId, rivalStudioId, askingFeeM) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = sublicenseIPToRival(state, ownedIPLicenseId, rivalStudioId, askingFeeM);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, accepted: r.accepted, counterFeeM: r.counterFeeM };
      },
      acceptOutboundBid: (bidId: string) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accOB(state, bidId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectOutboundBid: (bidId: string) => {
        const state = stateRef.current; if (!state) return;
        const r = rejOB(state, bidId);
        setStateInner(r.state); persist(r.state);
      },
      proposeFranchiseTrade: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = propFr(state, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, offerId: r.offer?.id };
      },
      acceptFranchiseOffer: (offerId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accFr(state, offerId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      counterFranchiseOffer: (offerId, newPriceB) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cntFr(state, offerId, newPriceB);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectFranchiseOffer: (offerId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejFr(state, offerId);
        setStateInner(r.state); persist(r.state);
      },
      quoteFranchiseValue: (franchiseId) => state ? qFr(state, franchiseId) : 0,
      proposeBulkCatalogLicense: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = propBC(state, { ...args });
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, offerId: r.offer?.id };
      },
      broadcastBulkCatalogLicense: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.', created: 0, accepted: 0, counters: 0, rejected: 0 };
        const r = broadcastBC(state, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, created: r.created, accepted: r.accepted, counters: r.counters, rejected: r.rejected };
      },
      acceptBulkCatalogOffer: (offerId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accBC(state, offerId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      counterBulkCatalogOffer: (offerId, newPriceB) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cntBC(state, offerId, newPriceB);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectBulkCatalogOffer: (offerId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejBC(state, offerId);
        setStateInner(r.state); persist(r.state);
      },
      quoteBulkCatalogValue: (movieIds, years) => state ? qBC(state, movieIds, years) : 0,
      quoteFutureReleasesValueB: (rivalStudioId, movieCount, years) => state ? qFut(state, rivalStudioId, movieCount, years) : 0,
      quoteFranchiseBulkValueB: (franchiseId, years) => state ? qFrBulk(state, franchiseId, years) : 0,
      counterOutboundBid: (bidId, terms) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cntOB(state, bidId, terms);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      // V35 — TV Networks
      proposeTVNetworkDeal: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = propTVD(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, dealId: r.dealId, counterFeeB: r.counterFeeB, accepted: r.accepted };
      },
      acceptTVNetworkCounter: (dealId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accTVD(state, dealId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectTVNetworkCounter: (dealId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejTVD(state, dealId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      createPlayerTVChannel: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = createPTVC(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, networkId: r.networkId };
      },
      setChannelMonthlyFee: (channelId, feeUSD) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setChFee(state, channelId, feeUSD);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      setChannelProgramming: (channelId, movieIds) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setChProg(state, channelId, movieIds);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      signCableDistributionDeal: (channelId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signCD(state, channelId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, costB: r.costB };
      },
      createTVSeries: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = createTVS(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, seriesId: r.seriesId };
      },
      renewTVSeries: (seriesId, args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = renewTVS(state, seriesId, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      cancelTVSeries: (seriesId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cancelTVSeries(state, seriesId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      createChannelPack: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = createChP(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, packId: r.packId };
      },
      deleteChannelPack: (packId) => {
        const state = stateRef.current; if (!state) return;
        const r = delChP(state, packId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      quoteChannelContentLicense: (args) => {
        const state = stateRef.current; if (!state) return { feeB: 0, error: 'No game.' };
        return qCCL(state, args);
      },
      proposeChannelContentLicense: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = propCCL(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, licenseId: r.licenseId, counterFeeB: r.counterFeeB, accepted: r.accepted };
      },
      acceptChannelContentCounter: (licenseId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accCCL(state, licenseId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectChannelContentCounter: (licenseId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejCCL(state, licenseId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      quoteTVNetworkDeal: (args) => {
        const state = stateRef.current; if (!state) return { feeB: 0, error: 'No game.' };
        const st = ensureTVN(state);
        const q = qTVD(st, args);
        return { feeB: q.feeB, error: q.error };
      },
      renameTVChannel: (channelId, newName) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = renameTVCh(state, channelId, newName);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      deleteTVChannel: (channelId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = deleteTVCh(state, channelId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      quoteCableCarriageDeal: (args) => {
        const state = stateRef.current; if (!state) return { fairUSD: 0, minUSD: 0, maxUSD: 0, estWeeklyRevM: 0, signingBonusM: 0, error: 'No game.' };
        const st = ensureCP(state);
        return qCCD(st, args);
      },
      signCableCarriageDeal: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = signCCD(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, accepted: r.accepted, counterFeeUSD: r.counterFeeUSD, dealId: r.dealId };
      },
      acceptCableCarriageCounter: (dealId, counterFeeUSD) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = accCCD(state, dealId, counterFeeUSD);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectCableCarriageDeal: (dealId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejCCD(state, dealId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      cancelCableCarriageDeal: (dealId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = cancelCCD(state, dealId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      // V39 — Manager proposals
      approveTVManagerProposal: (proposalId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = appTVMP(state, proposalId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectTVManagerProposal: (proposalId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejTVMP(state, proposalId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      approveCinemaOwnedManagerProposal: (proposalId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = appCOMP(state, proposalId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      rejectCinemaOwnedManagerProposal: (proposalId) => {
        const state = stateRef.current; if (!state) return;
        const r = rejCOMP(state, proposalId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      setChannelPackTierPricing: (packId, pricing) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setCPTP(state, packId, pricing);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      renameChannelPack: (packId, newName) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = renameChP(state, packId, newName);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      setChannelPackMonthlyFee: (packId, monthlyFeeUSD) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setChPFee(state, packId, monthlyFeeUSD);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      addSeriesToChannels: (seriesId, channelIds) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = addSeriesToCh(state, seriesId, channelIds);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      createPlayerCableNetwork: (args) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = createPCN(state, args);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error, networkId: r.networkId };
      },
      deletePlayerCableNetwork: (networkId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = delPCN(state, networkId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      renamePlayerCableNetwork: (networkId, newName) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = renPCN(state, networkId, newName);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      addChannelToPlayerCable: (networkId, channelId, fee) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = addChToPC(state, networkId, channelId, fee);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      removeChannelFromPlayerCable: (networkId, channelId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = remChFromPC(state, networkId, channelId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      setPlayerCableTier: (networkId, tierId, patch) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = setPCT(state, networkId, tierId, patch);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      addPlayerCableTier: (networkId, name, monthlyFeeUSD) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = addPCT(state, networkId, name, monthlyFeeUSD);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      deletePlayerCableTier: (networkId, tierId) => {
        const state = stateRef.current; if (!state) return;
        const r = delPCT(state, networkId, tierId);
        stateRef.current = r.state; setStateInner(r.state); persist(r.state);
      },
      addChannelToPack: (packId, channelId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = addChToPack(state, packId, channelId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      removeChannelFromPack: (packId, channelId) => {
        const state = stateRef.current; if (!state) return { error: 'No game.' };
        const r = remChFromPack(state, packId, channelId);
        if (!r.error) { stateRef.current = r.state; setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      // V42 — Manual save slots
      saveToSlot: async (slotName: string) => {
        const cur = stateRef.current;
        if (!cur) return { error: 'No game.' };
        const trimmed = slotName.trim();
        if (!trimmed) return { error: 'Name required.' };
        if (trimmed.length > 28) return { error: 'Max 28 chars.' };
        try {
          await AsyncStorage.setItem(SLOT_PREFIX + trimmed, JSON.stringify(cur));
          const idxRaw = await AsyncStorage.getItem(SLOTS_INDEX_KEY);
          const idx: { name: string; updatedAt: number }[] = idxRaw ? JSON.parse(idxRaw) : [];
          const without = idx.filter(s => s.name !== trimmed);
          without.unshift({ name: trimmed, updatedAt: Date.now() });
          await AsyncStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify(without.slice(0, 30)));
          return {};
        } catch (e: any) {
          return { error: String(e?.message || 'Save failed') };
        }
      },
      loadFromSlot: async (slotName: string) => {
        try {
          const raw = await AsyncStorage.getItem(SLOT_PREFIX + slotName);
          if (!raw) return { error: 'Slot not found.' };
          let loaded = migrate(JSON.parse(raw));
          loaded = ensureTVN(loaded);
          loaded = ensureCP(loaded);
          stateRef.current = loaded;
          setStateInner(loaded);
          await persist(loaded);
          return {};
        } catch (e: any) {
          return { error: String(e?.message || 'Load failed') };
        }
      },
      listSlots: async () => {
        try {
          const idxRaw = await AsyncStorage.getItem(SLOTS_INDEX_KEY);
          const idx: { name: string; updatedAt: number }[] = idxRaw ? JSON.parse(idxRaw) : [];
          const out: { name: string; updatedAt: number; week: number; year: number; studioName: string; cashB: number }[] = [];
          for (const meta of idx) {
            const raw = await AsyncStorage.getItem(SLOT_PREFIX + meta.name);
            if (!raw) continue;
            try {
              const data = JSON.parse(raw);
              out.push({
                name: meta.name,
                updatedAt: meta.updatedAt,
                week: data.week || 1,
                year: data.year || 1,
                studioName: data.player?.name || 'Unknown',
                cashB: data.player?.cash || 0,
              });
            } catch { /* skip malformed */ }
          }
          return out;
        } catch {
          return [];
        }
      },
      deleteSlot: async (slotName: string) => {
        try {
          await AsyncStorage.removeItem(SLOT_PREFIX + slotName);
          const idxRaw = await AsyncStorage.getItem(SLOTS_INDEX_KEY);
          const idx: { name: string; updatedAt: number }[] = idxRaw ? JSON.parse(idxRaw) : [];
          await AsyncStorage.setItem(SLOTS_INDEX_KEY, JSON.stringify(idx.filter(s => s.name !== slotName)));
        } catch { /* silent */ }
      },
      // V43 — Whole-network licensing, ads, marketing, extended managers
      quoteWholeNetworkLicense: (args) => {
        const state = stateRef.current;
        return state ? qWNL(state, args) : { feeB: 0, channelCount: 0, error: 'No game.' };
      },
      signWholeNetworkLicenseOutbound: (args) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = signWNLO(cur, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, accepted: r.accepted, counterFeeB: r.counterFeeB };
      },
      signWholeNetworkLicenseInbound: (args) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = signWNLI(cur, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error, accepted: r.accepted, counterFeeB: r.counterFeeB };
      },
      setStreamingTierAdSupport: (serviceId, tierId, adSupported, adArpuUSD) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = setStrTierAd(cur, serviceId, tierId, adSupported, adArpuUSD);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      setChannelAdProgrammingRatio: (channelId, ratio) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = setChAdRatio(cur, channelId, ratio);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      setEntityMarketing: (kind, id, budgetM) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = setEntMkt(cur, kind, id, budgetM);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      approveCinemaOwnedManagerProposalV2: (proposalId) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = appCOMP2(cur, proposalId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      approveTVManagerOwnContent: (proposalId) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = appTVMOC(cur, proposalId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      createEngine: (args) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = createEngineAction(cur, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      foundStudio: (args) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = foundStudioAction(cur, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      startProject: (args) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = startProjectAction(cur, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      designConsole: (args) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = designConsoleAction(cur, args);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      buildHQRoom: (studioHQId, roomKey) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = buildHQRoomAction(cur, studioHQId, roomKey);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      recruitGamingStaff: (studioHQId, role, qtyToAdd) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = recruitGamingStaffAction(cur, studioHQId, role, qtyToAdd);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      configurePass: (price, name, basicPrice, premiumPrice, adSupported, enabledConsoleIds, catalogProjectIds) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = configurePassAction(cur, price, name, basicPrice, premiumPrice, adSupported, enabledConsoleIds, catalogProjectIds);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      createMovieFromGame: (gameProjectId, movieTitle, userPlot, type) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = createMovieFromGameAction(cur, gameProjectId, movieTitle, userPlot, type);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      renameGamingStudioHQ: (studioHQId, newName) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = renameGamingStudioHQAction(cur, studioHQId, newName);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      deleteGamingStudioHQ: (studioHQId) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = deleteGamingStudioHQAction(cur, studioHQId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      renameGameEngine: (engineId, newName) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = renameGameEngineAction(cur, engineId, newName);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      deleteGameEngine: (engineId) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = deleteGameEngineAction(cur, engineId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      renameGamingConsole: (consoleId, newTitle) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = renameGamingConsoleAction(cur, consoleId, newTitle);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      deleteGamingConsole: (consoleId) => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = deleteGamingConsoleAction(cur, consoleId);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
      researchNextGen: () => {
        const cur = stateRef.current; if (!cur) return { error: 'No game.' };
        const r = researchNextGenAction(cur);
        if (!r.error) { setStateInner(r.state); persist(r.state); }
        return { error: r.error };
      },
    }}>
      {children}
    </GameCtx.Provider>
  );
}

export function useGame(): Ctx {
  const ctx = useContext(GameCtx);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
