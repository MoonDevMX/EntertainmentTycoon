// V43 — Weekly ledger: per-week breakdown of inflows/outflows, plus persistent rolling history
// and an accumulating recap that spans multi-week sims.
//
// Design: tick functions in sim.ts mutate `state.weeklyLedger` via `addLedger(state, key, amountB)`.
// At end of tickWeek, the ledger is snapshotted into weekHistory and folded into pendingRecap.
// Dashboard reads `state.pendingRecap` after sim → shows modal → clears via `clearPendingRecap`.

import type { GameState, WeeklyLedger, WeekHistoryRecord, PendingRecap } from './types';

export const MAX_HISTORY = 200;

export function freshLedger(week: number, year: number): WeeklyLedger {
  return {
    week, year,
    cinemaBoxOfficeInB: 0, ownedCinemaRevB: 0,
    streamingSubsInB: 0, streamingAdsInB: 0,
    tvNetworkSubsInB: 0, tvNetworkAdsInB: 0,
    cableCarriageInB: 0, playerCableSubsInB: 0,
    channelPacksInB: 0,
    licensingInB: 0, ipRoyaltiesInB: 0, crossoverInB: 0, miscInB: 0,
    vstoreRevB: 0,
    cinemaOpexB: 0, streamingServerB: 0, tvBroadcastB: 0,
    cableCarriageOutB: 0, productionCostB: 0, marketingCostB: 0,
    licensingOutB: 0, ipRoyaltiesOutB: 0, crossoverOutB: 0, miscOutB: 0,
    vstoreOpexB: 0,
    moviesReleased: 0, seriesReleased: 0,
    nominationsWeek: 0, awardsWeek: 0,
  };
}

export type LedgerKey = keyof Omit<WeeklyLedger, 'week' | 'year'>;

// Mutating add — returns a NEW ledger object (state.weeklyLedger should be re-assigned via spread).
export function addLedger(ledger: WeeklyLedger | undefined, key: LedgerKey, amount: number): WeeklyLedger {
  const base = ledger ?? freshLedger(0, 0);
  const cur = (base[key] as number) || 0;
  return { ...base, [key]: +(cur + amount).toFixed(6) };
}

// Apply a delta to state.weeklyLedger, returning a new state with the bumped ledger.
export function bumpLedger(state: GameState, key: LedgerKey, amountB: number): GameState {
  if (!isFinite(amountB) || amountB === 0) return state;
  return { ...state, weeklyLedger: addLedger(state.weeklyLedger, key, amountB) };
}

// Initialise a fresh recap accumulator before simulating.
export function startRecap(state: GameState): PendingRecap {
  return {
    startWeek: state.week, startYear: state.year,
    endWeek: state.week, endYear: state.year,
    weeks: 0,
    startCashB: state.player.cash, endCashB: state.player.cash,
    inflows: {
      cinemaBoxOfficeInB: 0, ownedCinemaRevB: 0,
      streamingSubsInB: 0, streamingAdsInB: 0,
      tvNetworkSubsInB: 0, tvNetworkAdsInB: 0,
      cableCarriageInB: 0, playerCableSubsInB: 0,
      channelPacksInB: 0,
      licensingInB: 0, ipRoyaltiesInB: 0, crossoverInB: 0, miscInB: 0,
      vstoreRevB: 0,
    },
    outflows: {
      cinemaOpexB: 0, streamingServerB: 0, tvBroadcastB: 0,
      cableCarriageOutB: 0, productionCostB: 0, marketingCostB: 0,
      licensingOutB: 0, ipRoyaltiesOutB: 0, crossoverOutB: 0, miscOutB: 0,
      vstoreOpexB: 0,
    },
    moviesReleased: 0, seriesReleased: 0,
    nominationsWeek: 0, awardsWeek: 0,
  };
}

// Snapshot the current weekly ledger into history + fold it into pendingRecap.
// Called at the very end of tickWeek.
export function finalizeWeek(state: GameState): GameState {
  const ledger = state.weeklyLedger;
  if (!ledger) return state;
  const rec: WeekHistoryRecord = {
    ...ledger,
    cashEndB: state.player.cash,
    totalBOEndB: state.player.totalBO,
  };
  const history = [...(state.weekHistory || []), rec].slice(-MAX_HISTORY);

  // Fold into recap
  const recap: PendingRecap = state.pendingRecap ?? startRecap({ ...state, player: state.player });
  const acc: PendingRecap = {
    startWeek: recap.startWeek, startYear: recap.startYear,
    endWeek: ledger.week, endYear: ledger.year,
    weeks: recap.weeks + 1,
    startCashB: recap.startCashB,
    endCashB: state.player.cash,
    inflows: {
      cinemaBoxOfficeInB: +(recap.inflows.cinemaBoxOfficeInB + ledger.cinemaBoxOfficeInB).toFixed(4),
      ownedCinemaRevB: +(recap.inflows.ownedCinemaRevB + ledger.ownedCinemaRevB).toFixed(4),
      streamingSubsInB: +(recap.inflows.streamingSubsInB + ledger.streamingSubsInB).toFixed(4),
      streamingAdsInB: +(recap.inflows.streamingAdsInB + ledger.streamingAdsInB).toFixed(4),
      tvNetworkSubsInB: +(recap.inflows.tvNetworkSubsInB + ledger.tvNetworkSubsInB).toFixed(4),
      tvNetworkAdsInB: +(recap.inflows.tvNetworkAdsInB + ledger.tvNetworkAdsInB).toFixed(4),
      cableCarriageInB: +(recap.inflows.cableCarriageInB + ledger.cableCarriageInB).toFixed(4),
      playerCableSubsInB: +(recap.inflows.playerCableSubsInB + ledger.playerCableSubsInB).toFixed(4),
      channelPacksInB: +(recap.inflows.channelPacksInB + ledger.channelPacksInB).toFixed(4),
      licensingInB: +(recap.inflows.licensingInB + ledger.licensingInB).toFixed(4),
      ipRoyaltiesInB: +(recap.inflows.ipRoyaltiesInB + ledger.ipRoyaltiesInB).toFixed(4),
      crossoverInB: +(recap.inflows.crossoverInB + ledger.crossoverInB).toFixed(4),
      miscInB: +(recap.inflows.miscInB + ledger.miscInB).toFixed(4),
      vstoreRevB: +(((recap.inflows as any).vstoreRevB || 0) + (ledger.vstoreRevB || 0)).toFixed(4),
    },
    outflows: {
      cinemaOpexB: +(recap.outflows.cinemaOpexB + ledger.cinemaOpexB).toFixed(4),
      streamingServerB: +(recap.outflows.streamingServerB + ledger.streamingServerB).toFixed(4),
      tvBroadcastB: +(recap.outflows.tvBroadcastB + ledger.tvBroadcastB).toFixed(4),
      cableCarriageOutB: +(recap.outflows.cableCarriageOutB + ledger.cableCarriageOutB).toFixed(4),
      productionCostB: +(recap.outflows.productionCostB + ledger.productionCostB).toFixed(4),
      marketingCostB: +(recap.outflows.marketingCostB + ledger.marketingCostB).toFixed(4),
      licensingOutB: +(recap.outflows.licensingOutB + ledger.licensingOutB).toFixed(4),
      ipRoyaltiesOutB: +(recap.outflows.ipRoyaltiesOutB + ledger.ipRoyaltiesOutB).toFixed(4),
      crossoverOutB: +(recap.outflows.crossoverOutB + ledger.crossoverOutB).toFixed(4),
      miscOutB: +(recap.outflows.miscOutB + ledger.miscOutB).toFixed(4),
      vstoreOpexB: +(((recap.outflows as any).vstoreOpexB || 0) + (ledger.vstoreOpexB || 0)).toFixed(4),
    },
    moviesReleased: recap.moviesReleased + ledger.moviesReleased,
    seriesReleased: recap.seriesReleased + ledger.seriesReleased,
    nominationsWeek: recap.nominationsWeek + ledger.nominationsWeek,
    awardsWeek: recap.awardsWeek + ledger.awardsWeek,
  };

  return { ...state, weekHistory: history, pendingRecap: acc, weeklyLedger: undefined };
}

// Helper: sum total inflows from a PendingRecap.
export function sumInflowsB(recap: PendingRecap): number {
  const i = recap.inflows as any;
  return i.cinemaBoxOfficeInB + i.ownedCinemaRevB + i.streamingSubsInB + i.streamingAdsInB
    + i.tvNetworkSubsInB + i.tvNetworkAdsInB + i.cableCarriageInB + i.playerCableSubsInB
    + i.channelPacksInB + i.licensingInB + i.ipRoyaltiesInB + i.crossoverInB + i.miscInB
    + (i.vstoreRevB || 0);
}

export function sumOutflowsB(recap: PendingRecap): number {
  const o = recap.outflows as any;
  return o.cinemaOpexB + o.streamingServerB + o.tvBroadcastB + o.cableCarriageOutB
    + o.productionCostB + o.marketingCostB + o.licensingOutB + o.ipRoyaltiesOutB
    + o.crossoverOutB + o.miscOutB + (o.vstoreOpexB || 0);
}

export function clearPendingRecap(state: GameState): GameState {
  return { ...state, pendingRecap: undefined };
}
