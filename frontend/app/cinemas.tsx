import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T } from '../src/ui/theme';
import { TopBar, NeonStat, SectionHeader } from '../src/ui/components';
import { uiAlert } from '../src/ui/ui-alert';
import { CINEMA_CHAINS, CINEMA_REGIONS, cinemaDealRange, WEEKS_PER_YEAR } from '../src/game/data';
import { OWNED_CINEMA_SPECS, AMENITY_SPECS, TICKET_PRICE_SPECS, FOOD_SPECS, MERCH_SPECS, amenityWeeklyOpex } from '../src/game/sim';
import type { CinemaRegion, OwnedCinemaSize } from '../src/game/types';

type Tab = 'deals' | 'manager' | 'mine' | 'calendar';
const SIZES: OwnedCinemaSize[] = ['small', 'medium', 'large', 'mega'];

export default function CinemasScreen() {
  const router = useRouter();
  const {
    state, signCinemaDeal,
    generateCinemaProposals, approveCinemaProposal, rejectCinemaProposal,
    bulkSignCinemaDeals,
    scheduleMovieInCinemas, unscheduleMovieFromCinemas,
    buildOwnedCinemas, scheduleMoviesInOwnedCinemas, unscheduleOwnedCinemaRun, demolishOwnedCinema,
    renameOwnedCinema, toggleOwnedCinemaAmenity, setOwnedCinemaCustomization,
    quoteCinemaSupplierDeal, signCinemaSupplierDeal, cancelCinemaSupplierDeal,
    approveCinemaOwnedManagerProposal, rejectCinemaOwnedManagerProposal,
    setEntityMarketing,
    approveCinemaOwnedManagerProposalV2,
  } = useGame();
  const [tab, setTab] = useState<Tab>('deals');

  // Chain-deal negotiation modal state
  const [chainId, setChainId] = useState<string | null>(null);
  const [years, setYears] = useState(7);
  const [openShare, setOpenShare] = useState('');
  const [lateShare, setLateShare] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ kind: 'ok' | 'err' | 'counter'; text: string } | null>(null);
  const [chainCounter, setChainCounter] = useState<{ openShare: number; lateShare: number; years: number; reason: string } | null>(null);
  const [round, setRound] = useState(1);

  // Bulk chain-deal selector (moved into Deals tab as a sub-mode)
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkYears, setBulkYears] = useState(7);

  // Build owned cinemas form: per-region, per-size counts as text inputs
  const [buildPlan, setBuildPlan] = useState<Record<string, string>>({}); // key: `${region}|${size}` → "3"

  // Schedule movies in owned cinemas
  const [schedOwnedOpen, setSchedOwnedOpen] = useState(false);
  const [schedMovieIds, setSchedMovieIds] = useState<Set<string>>(new Set());
  const [schedCinemaIds, setSchedCinemaIds] = useState<Set<string>>(new Set());
  const [schedWeek, setSchedWeek] = useState<string>('1');
  const [schedYear, setSchedYear] = useState<string>('');
  const [schedWeeksToShow, setSchedWeeksToShow] = useState<string>('6');

  // Schedule movie in CHAIN (existing flow — calendar tab)
  const [scheduleMovieId, setScheduleMovieId] = useState<string | null>(null);
  const [scheduleChains, setScheduleChains] = useState<Set<string>>(new Set());
  const [scheduleWeek, setScheduleWeek] = useState<number>(1);
  const [scheduleYear, setScheduleYear] = useState<number>(0);

  // V30 — Edit owned cinema modal (rename + amenities + P&L)
  const [editCinemaId, setEditCinemaId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // V30 (merged) — MASS OPERATIONS on owned cinemas: select multiple, rename pattern, upgrade amenities
  const [massMode, setMassMode] = useState(false);
  const [massSelected, setMassSelected] = useState<Set<string>>(new Set());
  const [massRenameOpen, setMassRenameOpen] = useState(false);
  const [massRenamePrefix, setMassRenamePrefix] = useState('My Cinema');
  const [massRenameStart, setMassRenameStart] = useState('1');
  const [massUpgradeOpen, setMassUpgradeOpen] = useState(false);
  const [massApplyAmenities, setMassApplyAmenities] = useState<{ imax: boolean; recliners: boolean; premiumConcessions: boolean }>({ imax: false, recliners: false, premiumConcessions: false });

  // NEW — QUICK BULK by quantity (no per-cinema tapping). Works on filtered subset.
  const [quickOpen, setQuickOpen] = useState(false);
  // V44 — Expanded groups in compact "My Cinemas" view (key: `${region}|${size}`)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [quickMode, setQuickMode] = useState<'upgrade' | 'rename' | 'pricing'>('upgrade');
  const [quickQty, setQuickQty] = useState('50');
  const [quickRegion, setQuickRegion] = useState<'all' | 'NA' | 'EU' | 'LATAM' | 'ASIA' | 'OCE' | 'AFR'>('all');
  const [quickSize, setQuickSize] = useState<'all' | 'small' | 'medium' | 'large' | 'mega'>('all');
  const [quickAmenities, setQuickAmenities] = useState<{ imax: boolean; recliners: boolean; premiumConcessions: boolean }>({ imax: false, recliners: false, premiumConcessions: false });
  const [quickRenamePrefix, setQuickRenamePrefix] = useState('MoonPlex');
  const [quickRenameStart, setQuickRenameStart] = useState('1');
  // V37c — Pricing mode bulk presets
  const [quickTicket, setQuickTicket] = useState<'value' | 'standard' | 'premium' | null>(null);
  const [quickFood, setQuickFood] = useState<'none' | 'basic' | 'premium' | 'gourmet' | null>(null);
  const [quickMerch, setQuickMerch] = useState<'none' | 'basic' | 'premium' | null>(null);

  // NEW — Cinema Supplier Deal (blanket distribution: rival studio routes all theatrical releases into our cinemas)
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierRivalId, setSupplierRivalId] = useState<string | null>(null);
  const [supplierYears, setSupplierYears] = useState('5');
  const [supplierTraditional, setSupplierTraditional] = useState(true);
  const [supplierHybrid, setSupplierHybrid] = useState(true);
  const [supplierFee, setSupplierFee] = useState('');

  if (!state) return null;
  const playerDeals = (state.cinemaDeals || []).filter(d => d.studioId === state.player.id);
  const proposals = state.cinemaProposals || [];
  const calendar = state.cinemaCalendar || [];
  const owned = state.ownedCinemas || [];
  const playerMovies = state.movies.filter(m => m.studioId === state.player.id);

  const openModal = (id: string) => {
    const chain = CINEMA_CHAINS.find(c => c.id === id);
    if (!chain) return;
    const range = cinemaDealRange(chain.reputation, state.player.rating);
    setChainId(id);
    setYears(7);
    setOpenShare(((range.minOpen + range.maxOpen) / 2).toFixed(2));
    setLateShare(((range.minLate + range.maxLate) / 2).toFixed(2));
    setStatusMsg(null); setChainCounter(null); setRound(1);
  };

  const submitDeal = () => {
    if (!chainId) return;
    const o = parseFloat(openShare); const l = parseFloat(lateShare);
    if (isNaN(o) || isNaN(l)) { setStatusMsg({ kind: 'err', text: 'Enter both shares as decimals (e.g., 0.65).' }); uiAlert('Invalid', 'Enter both shares as decimals (e.g., 0.65).'); return; }
    const r = signCinemaDeal(chainId, years, o, l);
    if (r.error) { setStatusMsg({ kind: 'err', text: `❌ ${r.error}` }); uiAlert('Negotiation Failed', r.error); return; }
    if (r.counter) {
      setChainCounter(r.counter); setRound(round + 1);
      setStatusMsg({ kind: 'counter', text: `🤝 Round ${round}: counter — opening ${(r.counter.openShare * 100).toFixed(0)}% / late ${(r.counter.lateShare * 100).toFixed(0)}% / ${r.counter.years}y (${r.counter.reason}).` });
      return;
    }
    const chainName = CINEMA_CHAINS.find(c => c.id === chainId)?.name || 'this chain';
    setStatusMsg({ kind: 'ok', text: `✅ Deal signed with ${chainName} for ${years} years.` });
    uiAlert('Cinema Deal Signed ✓', `${chainName} circuit. ${years}-year term locked in.`);
    setTimeout(() => { setChainId(null); setStatusMsg(null); setChainCounter(null); setRound(1); }, 900);
  };

  const acceptCounter = () => {
    if (!chainId || !chainCounter) return;
    const r = signCinemaDeal(chainId, chainCounter.years, chainCounter.openShare, chainCounter.lateShare);
    if (r.error) { setStatusMsg({ kind: 'err', text: `❌ ${r.error}` }); return; }
    if (r.counter) { setChainCounter(r.counter); setStatusMsg({ kind: 'counter', text: `Round ${round + 1}: ${(r.counter.openShare * 100).toFixed(0)}% / ${(r.counter.lateShare * 100).toFixed(0)}% / ${r.counter.years}y` }); setRound(round + 1); return; }
    const chainName = CINEMA_CHAINS.find(c => c.id === chainId)?.name || 'this chain';
    setStatusMsg({ kind: 'ok', text: `✅ Counter accepted — ${chainName} signed.` });
    setTimeout(() => { setChainId(null); setStatusMsg(null); setChainCounter(null); setRound(1); }, 900);
  };

  const toggleBulkChain = (cid: string) => {
    setBulkSelected(prev => { const next = new Set(prev); if (next.has(cid)) next.delete(cid); else next.add(cid); return next; });
  };

  const submitBulkChainDeals = () => {
    if (bulkSelected.size === 0) { uiAlert('Pick chains', 'Select at least one cinema chain to deal with.'); return; }
    const ids = Array.from(bulkSelected);
    const r = bulkSignCinemaDeals(ids, bulkYears);
    uiAlert(r.signed > 0 ? 'Bulk Deals ✓' : 'Bulk Deals', `${r.signed} signed${r.failed.length ? `\n${r.failed.length} failed:\n• ${r.failed.join('\n• ')}` : ''}`);
    setBulkSelected(new Set()); setBulkMode(false);
  };

  // Build owned cinemas
  const buildPlanList = (): { region: CinemaRegion; size: OwnedCinemaSize; count: number }[] => {
    const out: { region: CinemaRegion; size: OwnedCinemaSize; count: number }[] = [];
    for (const region of CINEMA_REGIONS) {
      for (const size of SIZES) {
        const v = parseInt(buildPlan[`${region}|${size}`] || '0') || 0;
        if (v > 0) out.push({ region: region as CinemaRegion, size, count: v });
      }
    }
    return out;
  };
  const buildTotalCost = buildPlanList().reduce((a, p) => a + OWNED_CINEMA_SPECS[p.size].buildCost * p.count, 0);
  const buildTotalCount = buildPlanList().reduce((a, p) => a + p.count, 0);

  const submitBuild = () => {
    const plan = buildPlanList();
    if (plan.length === 0) { uiAlert('Empty', 'Enter how many cinemas you want to build.'); return; }
    const r = buildOwnedCinemas(plan);
    if (r.error) { uiAlert('Cannot Build', r.error); return; }
    uiAlert('Built ✓', `${r.built} cinema${r.built > 1 ? 's' : ''} built (-$${r.totalCostM.toFixed(0)}M).`);
    setBuildPlan({});
  };

  // Schedule owned cinemas modal
  const openSchedOwned = () => {
    setSchedMovieIds(new Set());
    setSchedCinemaIds(new Set());
    setSchedWeek(String(state.week));
    setSchedYear(String(state.year));
    setSchedWeeksToShow('6');
    setSchedOwnedOpen(true);
  };

  const submitSchedOwned = () => {
    if (schedMovieIds.size === 0) { uiAlert('Pick movies', 'Select at least one movie to schedule.'); return; }
    if (schedCinemaIds.size === 0) { uiAlert('Pick cinemas', 'Select at least one owned cinema.'); return; }
    const w = Math.max(1, Math.min(WEEKS_PER_YEAR, parseInt(schedWeek) || 1));
    const y = parseInt(schedYear) || state.year;
    const wts = Math.max(1, Math.min(20, parseInt(schedWeeksToShow) || 6));
    const r = scheduleMoviesInOwnedCinemas(Array.from(schedMovieIds), Array.from(schedCinemaIds), w, y, wts);
    uiAlert(r.scheduled > 0 ? 'Scheduled ✓' : 'Scheduled', `${r.scheduled} movie${r.scheduled !== 1 ? 's' : ''} placed in ${schedCinemaIds.size} cinema${schedCinemaIds.size > 1 ? 's' : ''}${r.failed.length ? `\nFailed:\n• ${r.failed.join('\n• ')}` : ''}`);
    setSchedOwnedOpen(false);
  };

  // Schedule movie in CHAIN (existing flow)
  const openScheduleChain = (mid: string) => {
    const m = state.movies.find(mm => mm.id === mid);
    if (!m) return;
    setScheduleMovieId(mid);
    const tw = m.targetReleaseWeek || (m.status === 'released' ? m.releaseWeek : Math.min(WEEKS_PER_YEAR, state.week + 4));
    const ty = m.targetReleaseYear || (m.status === 'released' ? m.releaseYear : state.year);
    setScheduleWeek(tw); setScheduleYear(ty);
    const ex = calendar.find(c => c.movieId === mid);
    setScheduleChains(new Set(ex ? ex.chainIds : []));
  };

  const submitScheduleChain = () => {
    if (!scheduleMovieId) return;
    if (scheduleChains.size === 0) { uiAlert('Pick chains', 'Select at least one chain.'); return; }
    const r = scheduleMovieInCinemas(scheduleMovieId, Array.from(scheduleChains), scheduleWeek, scheduleYear);
    if (r.error) { uiAlert('Cannot Schedule', r.error); return; }
    setScheduleMovieId(null); setScheduleChains(new Set());
    uiAlert('Scheduled ✓', `Release locked across ${scheduleChains.size} chain${scheduleChains.size > 1 ? 's' : ''}.`);
  };

  // V39 — Cinema Owned Manager proposals modal state
  const [ownedMgrOpen, setOwnedMgrOpen] = useState(false);
  const ownedMgrProposals = state.cinemaOwnedManagerProposals || [];

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Cinemas" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />

      {/* V39 — Cinema Owner Manager suggestion banner (shows when player owns cinemas + has pending proposals) */}
      {ownedMgrProposals.length > 0 && tab !== 'manager' && (
        <TouchableOpacity style={s.ownedMgrBanner} onPress={() => setTab('manager')} testID="open-cinema-owned-manager">
          <MaterialCommunityIcons name="lightbulb-on" size={18} color={T.yellow} />
          <Text style={s.ownedMgrBannerT}>💡 Cinema Manager: {ownedMgrProposals.length} suggestion{ownedMgrProposals.length !== 1 ? 's' : ''} — tap to review</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={T.yellow} />
        </TouchableOpacity>
      )}

      <View style={s.tabbar}>
        {([
          { k: 'deals' as Tab, label: 'Deals', icon: 'handshake' },
          { k: 'manager' as Tab, label: 'Manager', icon: 'robot', badge: proposals.length + ownedMgrProposals.length },
          { k: 'mine' as Tab, label: 'My Cinemas', icon: 'home-city', badge: owned.length },
          { k: 'calendar' as Tab, label: 'Calendar', icon: 'calendar-month' },
        ]).map(t => (
          <TouchableOpacity key={t.k} style={[s.tabBtn, tab === t.k && s.tabBtnActive]} onPress={() => setTab(t.k)} testID={`tab-${t.k}`}>
            <MaterialCommunityIcons name={t.icon as any} size={16} color={tab === t.k ? T.cardDark : T.textDim} />
            <Text style={[s.tabTxt, tab === t.k && { color: T.cardDark }]}>{t.label}</Text>
            {(t as any).badge ? <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{(t as any).badge}</Text></View> : null}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 32 }}>
        {tab === 'deals' && (
          <>
            <View style={s.intro}>
              <MaterialCommunityIcons name="theater" size={28} color={T.cyan} />
              <Text style={s.introTxt}>Cinema deals share box office with chain partners. Opening weeks favour studios; later weeks shift to chains.</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={[s.modeBtn, !bulkMode && { backgroundColor: T.cyan }]} onPress={() => setBulkMode(false)} testID="mode-single">
                <Text style={[s.modeBtnTxt, !bulkMode && { color: T.cardDark }]}>SINGLE NEGOTIATION</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modeBtn, bulkMode && { backgroundColor: T.green }]} onPress={() => setBulkMode(true)} testID="mode-bulk">
                <Text style={[s.modeBtnTxt, bulkMode && { color: T.cardDark }]}>BULK SIGN</Text>
              </TouchableOpacity>
            </View>

            {bulkMode ? (
              <>
                <View style={s.bulkBar}>
                  <Text style={s.bulkBarTxt}>{bulkSelected.size} chain{bulkSelected.size !== 1 ? 's' : ''} selected</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[5, 7, 10].map(y => (
                      <TouchableOpacity key={y} style={[s.yearChip, bulkYears === y && { backgroundColor: T.cyan }]} onPress={() => setBulkYears(y)} testID={`bulk-years-${y}`}>
                        <Text style={[s.yearTxt, bulkYears === y && { color: T.cardDark }]}>{y}y</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity style={[s.signBtn, bulkSelected.size === 0 && { opacity: 0.4 }]} onPress={submitBulkChainDeals} disabled={bulkSelected.size === 0} testID="bulk-sign-btn">
                  <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                  <Text style={s.signTxt}>SIGN {bulkSelected.size} CHAIN{bulkSelected.size !== 1 ? 'S' : ''} ({bulkYears}y EACH)</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {playerDeals.length > 0 && !bulkMode ? (
              <>
                <SectionHeader title="Active Deals" />
                {playerDeals.map(d => {
                  const chain = CINEMA_CHAINS.find(c => c.id === d.chainId);
                  return (
                    <View key={d.id} style={s.dealCard} testID={`active-deal-${d.id}`}>
                      <Text style={s.chainName}>{chain?.name || '—'}</Text>
                      <Text style={s.chainSub}>{d.region} · {d.years}-year term · {d.guaranteedTheaters.toLocaleString()} theaters guaranteed</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                        <NeonStat label="OPENING%" value={`${(d.openingStudioShare * 100).toFixed(0)}%`} color={T.green} />
                        <NeonStat label="LATE%" value={`${(d.lateStudioShare * 100).toFixed(0)}%`} color={T.yellow} />
                        <NeonStat label="EXPIRES" value={`Y${d.expiresYear}`} color={T.orange} />
                      </ScrollView>
                    </View>
                  );
                })}
              </>
            ) : null}

            <SectionHeader title={bulkMode ? 'Pick Chains To Sign' : 'Available Chains'} />
            {CINEMA_REGIONS.map(region => {
              const chains = CINEMA_CHAINS.filter(c => c.region === region && (!bulkMode || !playerDeals.find(d => d.chainId === c.id)));
              if (!chains.length) return null;
              const activeInRegion = chains.filter(c => playerDeals.find(d => d.chainId === c.id)).length;
              return (
                <View key={region} style={{ marginTop: 10 }}>
                  <View style={s.regionBar}>
                    <MaterialCommunityIcons name="map-marker-radius" size={16} color={T.cardDark} />
                    <Text style={s.regionLbl}>{region.toUpperCase()}</Text>
                    {!bulkMode ? <Text style={s.regionMeta}>{activeInRegion}/{chains.length} signed</Text> : null}
                  </View>
                  {chains.map(chain => {
                    const existing = playerDeals.find(d => d.chainId === chain.id);
                    const sel = bulkSelected.has(chain.id);
                    return (
                      <TouchableOpacity
                        key={chain.id}
                        style={[s.chainRow, existing && { borderColor: T.green }, bulkMode && sel && { borderColor: T.green, backgroundColor: '#1a3a25' }]}
                        onPress={() => bulkMode ? toggleBulkChain(chain.id) : (existing ? uiAlert('Already signed', `Active deal with ${chain.name}.`) : openModal(chain.id))}
                        testID={`chain-${chain.id}`}>
                        <MaterialCommunityIcons name={bulkMode ? (sel ? 'checkbox-marked' : 'checkbox-blank-outline') : (existing ? 'check-circle' : 'theater')} size={22} color={bulkMode ? (sel ? T.green : T.textDim) : (existing ? T.green : T.cyan)} />
                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                          <Text style={s.chainName}>{chain.name}</Text>
                          <Text style={s.chainSub}>{chain.theaters.toLocaleString()} theaters · Reputation {chain.reputation}/100{existing ? ' · ACTIVE' : ''}</Text>
                        </View>
                        {!bulkMode ? <MaterialCommunityIcons name={existing ? 'check-circle' : 'chevron-right'} size={22} color={existing ? T.green : T.textDim} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}

        {tab === 'manager' && (
          <>
            <View style={[s.intro, { borderColor: T.yellow }]}>
              <MaterialCommunityIcons name="robot" size={28} color={T.yellow} />
              <Text style={s.introTxt}>Cinema Manager negotiates optimal deals (not perfect — fair) and presents them for your approval. Covers chain partnerships AND owned-cinema operations.</Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={() => { const r = generateCinemaProposals(); uiAlert('Cinema Manager', r.created > 0 ? `${r.created} new deal proposal${r.created > 1 ? 's' : ''}.` : 'No new deals — all chains have active deals or pending proposals.'); }} testID="refresh-proposals-btn">
              <MaterialCommunityIcons name="refresh" size={18} color={T.cardDark} />
              <Text style={s.refreshTxt}>SCAN FOR NEW DEALS</Text>
            </TouchableOpacity>

            {/* V44 — Unified manager view: Owned Cinema proposals (supplier / scheduling) */}
            {ownedMgrProposals.length > 0 && (
              <>
                <SectionHeader title={`OWNED-CINEMA SUGGESTIONS · ${ownedMgrProposals.length}`} />
                {ownedMgrProposals.map(p => {
                  const rival = state.rivals.find(r => r.id === p.rivalStudioId);
                  const isSched = (p as any).kind === 'schedule_movie_owned';
                  return (
                    <View key={p.id} style={s.proposalCard} testID={`cin-mgr-${p.id}`}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <MaterialCommunityIcons name={isSched ? 'calendar-plus' : (p.direction === 'inbound' ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle')} size={22} color={isSched ? T.cyan : (p.direction === 'inbound' ? T.green : T.yellow)} />
                        <Text style={[s.chainName, { flex: 1 }]}>{isSched ? '📅 Schedule Re-Run' : `${rival?.name || '?'} — Supplier Deal`}</Text>
                        <View style={{ backgroundColor: isSched ? T.cyan : (p.direction === 'inbound' ? T.green : T.yellow), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: T.cardDark, fontSize: 9, fontWeight: '900' }}>{isSched ? 'OWNED' : (p.direction === 'inbound' ? 'INBOUND' : 'OUTBOUND')}</Text>
                        </View>
                      </View>
                      <Text style={s.chainSub}>{p.rationale}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green }]} onPress={() => { const r = approveCinemaOwnedManagerProposalV2(p.id); if (r.error) uiAlert('Cannot approve', r.error); else uiAlert('Approved ✓', isSched ? 'Movie scheduled.' : `Supplier deal signed with ${rival?.name}.`); }} testID={`cin-mgr-approve-${p.id}`}>
                          <MaterialCommunityIcons name="check-bold" size={16} color={T.cardDark} /><Text style={s.actionBtnTxt}>APPROVE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.red }]} onPress={() => rejectCinemaOwnedManagerProposal(p.id)} testID={`cin-mgr-reject-${p.id}`}>
                          <MaterialCommunityIcons name="close-thick" size={16} color={T.cardDark} /><Text style={s.actionBtnTxt}>DISMISS</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Chain partnerships — original */}
            <SectionHeader title={`CHAIN PARTNERSHIPS · ${proposals.length}`} />
            {proposals.length === 0 ? (
              <Text style={s.empty}>No chain proposals waiting. Manager auto-scans every 4 weeks, or tap above.</Text>
            ) : proposals.map(p => {
              const chain = CINEMA_CHAINS.find(c => c.id === p.chainId);
              return (
                <View key={p.id} style={s.proposalCard} testID={`proposal-${p.id}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialCommunityIcons name="theater" size={22} color={T.yellow} />
                    <Text style={[s.chainName, { marginLeft: 6, flex: 1 }]}>{chain?.name}</Text>
                    <Text style={s.proposalRegion}>{p.region}</Text>
                  </View>
                  <Text style={s.chainSub}>{p.rationale}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                    <NeonStat label="OPENING%" value={`${(p.openShare * 100).toFixed(0)}%`} color={T.green} />
                    <NeonStat label="LATE%" value={`${(p.lateShare * 100).toFixed(0)}%`} color={T.yellow} />
                    <NeonStat label="YEARS" value={`${p.years}y`} color={T.cyan} />
                    <NeonStat label="THEATERS" value={p.guaranteedTheaters.toLocaleString()} color={T.magenta} />
                  </ScrollView>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green }]} onPress={() => { const r = approveCinemaProposal(p.id); if (r.error) uiAlert('Cannot Approve', r.error); else uiAlert('Approved ✓', `${chain?.name} signed.`); }} testID={`approve-${p.id}`}>
                      <MaterialCommunityIcons name="check-bold" size={16} color={T.cardDark} /><Text style={s.actionBtnTxt}>APPROVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.red }]} onPress={() => rejectCinemaProposal(p.id)} testID={`reject-${p.id}`}>
                      <MaterialCommunityIcons name="close-thick" size={16} color={T.cardDark} /><Text style={s.actionBtnTxt}>REJECT</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {tab === 'mine' && (
          <>
            <View style={[s.intro, { borderColor: T.green }]}>
              <MaterialCommunityIcons name="home-city" size={28} color={T.green} />
              <Text style={s.introTxt}>Build & operate your own cinemas. Keep 100% of cinema-side revenue, schedule your movies directly, no chain shares.</Text>
            </View>

            {/* Build form */}
            <SectionHeader title="Bulk-Build Cinemas" />
            <View style={s.buildBox}>
              <Text style={s.buildHeader}>Enter how many of each size per region. Press BUILD to construct.</Text>
              <View style={s.specRow}>
                {SIZES.map(sz => (
                  <View key={sz} style={s.specCol}>
                    <Text style={s.specLbl}>{sz.toUpperCase()}</Text>
                    <Text style={s.specVal}>${OWNED_CINEMA_SPECS[sz].buildCost}M</Text>
                    <Text style={s.specOpex}>{OWNED_CINEMA_SPECS[sz].screens} scr · ${OWNED_CINEMA_SPECS[sz].weeklyOpex}M/wk</Text>
                  </View>
                ))}
              </View>
              {CINEMA_REGIONS.map(region => (
                <View key={region} style={s.buildRegionRow}>
                  <Text style={s.buildRegionLbl}>{region}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {SIZES.map(sz => (
                      <TextInput
                        key={sz}
                        value={buildPlan[`${region}|${sz}`] || ''}
                        onChangeText={(t) => setBuildPlan(prev => ({ ...prev, [`${region}|${sz}`]: t.replace(/[^0-9]/g, '') }))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={T.textMute}
                        style={s.buildInp}
                        testID={`build-${region.replace(/\s+/g, '-').toLowerCase()}-${sz}`}
                      />
                    ))}
                  </View>
                </View>
              ))}
              <View style={s.buildSummary}>
                <Text style={s.buildSummaryTxt}>{buildTotalCount} cinema{buildTotalCount !== 1 ? 's' : ''}</Text>
                <Text style={[s.buildSummaryTxt, { color: state.player.cash * 1000 >= buildTotalCost ? T.green : T.red }]}>${buildTotalCost.toFixed(0)}M total</Text>
              </View>
              <TouchableOpacity style={[s.signBtn, (buildTotalCount === 0 || state.player.cash * 1000 < buildTotalCost) && { opacity: 0.4 }]} onPress={submitBuild} disabled={buildTotalCount === 0 || state.player.cash * 1000 < buildTotalCost} testID="build-cinemas-btn">
                <MaterialCommunityIcons name="hammer-wrench" size={20} color={T.cardDark} />
                <Text style={s.signTxt}>BUILD {buildTotalCount} CINEMA{buildTotalCount !== 1 ? 'S' : ''}</Text>
              </TouchableOpacity>
            </View>

            {/* Owned cinemas list */}
            <SectionHeader title={`My Cinemas · ${owned.length}`} />
            {owned.length === 0 ? (
              <Text style={s.empty}>No cinemas built yet. Use the form above to bulk-build.</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6, flexWrap: 'wrap' }}>
                  {/* V39 — BULK SCHEDULE button removed. Movies in player-owned cinemas now auto-sync
                      with chain release dates (see tickAutoSyncOwnedCinemaRuns in sim.ts). */}
                  <TouchableOpacity
                    style={[s.licenseBtn, { flex: 1, minWidth: 140, backgroundColor: T.magenta }]}
                    onPress={() => {
                      if (state.rivals.length === 0) return;
                      setSupplierRivalId(state.rivals[0].id);
                      setSupplierYears('5');
                      setSupplierTraditional(true);
                      setSupplierHybrid(true);
                      const q = quoteCinemaSupplierDeal({ rivalStudioId: state.rivals[0].id, years: 5, includeTraditional: true, includeHybrid: true });
                      setSupplierFee(q.feeM.toFixed(1));
                      setSupplierOpen(true);
                    }}
                    testID="open-supplier-deal-btn"
                  >
                    <MaterialCommunityIcons name="handshake" size={16} color={T.cardDark} />
                    <Text style={s.licenseBtnTxt}>SUPPLIER DEAL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.licenseBtn, { flex: 1, minWidth: 140, backgroundColor: T.green }]}
                    onPress={() => { setQuickMode('upgrade'); setQuickOpen(true); }}
                    testID="quick-bulk-btn"
                  >
                    <MaterialCommunityIcons name="lightning-bolt" size={16} color={T.cardDark} />
                    <Text style={s.licenseBtnTxt}>QUICK BULK (by quantity)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.licenseBtn, { flex: 1, minWidth: 140, backgroundColor: massMode ? T.magenta : T.yellow }]}
                    onPress={() => { setMassMode(v => !v); setMassSelected(new Set()); }}
                    testID="toggle-mass-mode"
                  >
                    <MaterialCommunityIcons name={massMode ? 'close' : 'checkbox-multiple-marked-outline'} size={16} color={T.cardDark} />
                    <Text style={s.licenseBtnTxt}>{massMode ? `PICK · ${massSelected.size} SEL` : 'PICK MODE'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Active supplier deals summary */}
                {(state.cinemaSupplierDeals || []).length > 0 && (
                  <View style={s.supplierBar} testID="supplier-bar">
                    <Text style={s.supplierLbl}>SUPPLIER DEALS</Text>
                    {(state.cinemaSupplierDeals || []).map(d => {
                      const rv = state.rivals.find(r => r.id === d.rivalStudioId);
                      const wksLeft = (d.expiresYear - state.year) * 48 + (d.expiresWeek - state.week);
                      return (
                        <View key={d.id} style={s.supplierRow}>
                          <MaterialCommunityIcons name="filmstrip-box-multiple" size={20} color={T.magenta} />
                          <View style={{ flex: 1, paddingHorizontal: 8 }}>
                            <Text style={s.supplierName}>{rv?.name || 'Rival'} — supplier</Text>
                            <Text style={s.supplierSub}>{wksLeft}w left · {d.routedReleasesCount} films routed · +${(d.lifetimeRevenueToPlayerB * 1000).toFixed(1)}M earned · share {Math.round(d.revShareToPlayer * 100)}%</Text>
                          </View>
                          <TouchableOpacity onPress={() => { if (confirm(`Cancel supplier deal with ${rv?.name}?`)) cancelCinemaSupplierDeal(d.id); }} testID={`cancel-supplier-${d.id}`} style={{ padding: 4 }}>
                            <MaterialCommunityIcons name="close-circle" size={20} color={T.red} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
                {massMode && (
                  <View style={s.massBar} testID="mass-bar">
                    <TouchableOpacity
                      style={s.massQuickBtn}
                      onPress={() => {
                        if (massSelected.size === owned.length) setMassSelected(new Set());
                        else setMassSelected(new Set(owned.map(c => c.id)));
                      }}
                      testID="mass-select-all"
                    >
                      <MaterialCommunityIcons name={massSelected.size === owned.length ? 'select-off' : 'select-all'} size={14} color={T.cyan} />
                      <Text style={s.massQuickTxt}>{massSelected.size === owned.length ? 'Clear' : 'All'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.massActionBtn, massSelected.size === 0 && { opacity: 0.4 }]}
                      onPress={() => { if (massSelected.size === 0) return; setMassRenameOpen(true); }}
                      disabled={massSelected.size === 0}
                      testID="mass-rename-open"
                    >
                      <MaterialCommunityIcons name="rename-box" size={14} color={T.cardDark} />
                      <Text style={s.massActionTxt}>Mass Rename ({massSelected.size})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.massActionBtn, { backgroundColor: T.green }, massSelected.size === 0 && { opacity: 0.4 }]}
                      onPress={() => { if (massSelected.size === 0) return; setMassUpgradeOpen(true); }}
                      disabled={massSelected.size === 0}
                      testID="mass-upgrade-open"
                    >
                      <MaterialCommunityIcons name="rocket-launch" size={14} color={T.cardDark} />
                      <Text style={s.massActionTxt}>Mass Upgrade ({massSelected.size})</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {CINEMA_REGIONS.map(region => {
                  const list = owned.filter(c => c.region === region);
                  if (!list.length) return null;
                  // V44 — Group by size for compact view
                  const bySize: Record<string, typeof list> = {};
                  for (const c of list) {
                    if (!bySize[c.size]) bySize[c.size] = [] as any;
                    (bySize[c.size] as any).push(c);
                  }
                  const sizesPresent = SIZES.filter(sz => bySize[sz]?.length);
                  return (
                    <View key={region} style={{ marginTop: 8 }}>
                      <View style={s.regionBar}>
                        <MaterialCommunityIcons name="map-marker-radius" size={16} color={T.cardDark} />
                        <Text style={s.regionLbl}>{region.toUpperCase()}</Text>
                        <Text style={s.regionMeta}>{list.length} cinema{list.length > 1 ? 's' : ''} · {list.reduce((a, c) => a + c.screens, 0)} screens</Text>
                      </View>
                      {/* V44 — Compact grouped view: one card per size, with detail expand (mass mode reveals individual rows) */}
                      {!massMode && sizesPresent.map(sz => {
                        const group = bySize[sz] as typeof list;
                        const totalScreens = group.reduce((a, c) => a + c.screens, 0);
                        const totalOpex = group.reduce((a, c) => a + (OWNED_CINEMA_SPECS[c.size]?.weeklyOpex ?? c.weeklyOpex) + amenityWeeklyOpex(c), 0);
                        const totalRev = group.reduce((a, c) => a + (c.lifetimeRevenueB || 0), 0);
                        const totalOpexLife = group.reduce((a, c) => a + (c.lifetimeOpexB || 0), 0);
                        const nowPlaying = group.filter(c => c.currentMovieId).length;
                        const expanded = expandedGroups.has(`${region}|${sz}`);
                        return (
                          <View key={`${region}-${sz}`} style={s.groupCard} testID={`group-${region}-${sz}`}>
                            <TouchableOpacity
                              style={s.groupHeader}
                              onPress={() => setExpandedGroups(prev => {
                                const next = new Set(prev);
                                const k = `${region}|${sz}`;
                                if (next.has(k)) next.delete(k); else next.add(k);
                                return next;
                              })}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="home-city" size={22} color={T.green} />
                              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                                <Text style={s.chainName}>{sz.toUpperCase()} CINEMAS × {group.length}</Text>
                                <Text style={s.chainSub}>{totalScreens} screens · ${totalOpex.toFixed(2)}M/wk opex · {nowPlaying} now playing</Text>
                                {totalRev > 0 ? <Text style={s.lifeTxt}>💰 Lifetime: +${(totalRev * 1000).toFixed(1)}M / -${(totalOpexLife * 1000).toFixed(1)}M</Text> : null}
                              </View>
                              <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={T.textDim} />
                            </TouchableOpacity>
                            {expanded && (
                              <View style={s.groupBody}>
                                {group.map(c => {
                                  const playing = c.currentMovieId ? state.movies.find(m => m.id === c.currentMovieId) : null;
                                  const ams = c.amenities || {};
                                  return (
                                    <View key={c.id} style={s.ownedRowCompact} testID={`owned-${c.id}`}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={s.compactName}>{c.displayName || c.name}</Text>
                                        <Text style={s.chainSub}>{c.screens} screens · ${(OWNED_CINEMA_SPECS[c.size]?.weeklyOpex ?? c.weeklyOpex).toFixed(2)}M/wk</Text>
                                        {(ams.imax || ams.recliners || ams.premiumConcessions) ? (
                                          <View style={s.amRow}>
                                            {ams.imax ? <View style={s.amChip}><Text style={s.amTxt}>IMAX</Text></View> : null}
                                            {ams.recliners ? <View style={s.amChip}><Text style={s.amTxt}>RECLINER</Text></View> : null}
                                            {ams.premiumConcessions ? <View style={s.amChip}><Text style={s.amTxt}>PREM</Text></View> : null}
                                          </View>
                                        ) : null}
                                        {playing ? <Text style={s.nowPlayingTxt}>▶ {playing.title} (wk {c.currentRunWeeks})</Text> : null}
                                      </View>
                                      <TouchableOpacity onPress={() => { setEditCinemaId(c.id); setEditName(c.displayName || c.name); }} testID={`edit-${c.id}`} style={{ padding: 4 }}>
                                        <MaterialCommunityIcons name="cog" size={20} color={T.cyan} />
                                      </TouchableOpacity>
                                      <TouchableOpacity onPress={() => { if (confirm(`Demolish ${c.displayName || c.name}? You'll get $${(c.buildCost * 0.3).toFixed(0)}M salvage.`)) demolishOwnedCinema(c.id); }} testID={`demolish-${c.id}`} style={{ padding: 4 }}>
                                        <MaterialCommunityIcons name="bulldozer" size={20} color={T.red} />
                                      </TouchableOpacity>
                                    </View>
                                  );
                                })}
                              </View>
                            )}
                          </View>
                        );
                      })}
                      {/* Mass mode: still show every cinema individually for selection */}
                      {massMode && list.map(c => {
                        const playing = c.currentMovieId ? state.movies.find(m => m.id === c.currentMovieId) : null;
                        const ams = c.amenities || {};
                        const isMassSelected = massSelected.has(c.id);
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[s.ownedRow, isMassSelected && { borderLeftWidth: 4, borderLeftColor: T.magenta }]}
                            testID={`owned-${c.id}`}
                            onPress={() => {
                              setMassSelected(prev => {
                                const next = new Set(prev);
                                if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                                return next;
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[s.massCheck, isMassSelected && { backgroundColor: T.magenta, borderColor: T.magenta }]} testID={`mass-check-${c.id}`}>
                              {isMassSelected ? <MaterialCommunityIcons name="check" size={14} color={T.cardDark} /> : null}
                            </View>
                            <MaterialCommunityIcons name="movie-roll" size={22} color={T.green} />
                            <View style={{ flex: 1, paddingHorizontal: 8 }}>
                              <Text style={s.chainName}>{c.displayName || c.name}</Text>
                              <Text style={s.chainSub}>{c.size.toUpperCase()} · {c.screens} screens · ${(OWNED_CINEMA_SPECS[c.size]?.weeklyOpex ?? c.weeklyOpex).toFixed(2)}M/wk base opex</Text>
                              {(ams.imax || ams.recliners || ams.premiumConcessions) ? (
                                <View style={s.amRow}>
                                  {ams.imax ? <View style={s.amChip}><MaterialCommunityIcons name="movie-open-star" size={12} color={T.yellow} /><Text style={s.amTxt}>IMAX</Text></View> : null}
                                  {ams.recliners ? <View style={s.amChip}><MaterialCommunityIcons name="seat-recline-extra" size={12} color={T.cyan} /><Text style={s.amTxt}>RECLINER</Text></View> : null}
                                  {ams.premiumConcessions ? <View style={s.amChip}><MaterialCommunityIcons name="food-variant" size={12} color={T.magenta} /><Text style={s.amTxt}>PREM SNACKS</Text></View> : null}
                                </View>
                              ) : null}
                              {playing ? <Text style={s.nowPlayingTxt}>▶ Now playing: {playing.title} (wk {c.currentRunWeeks})</Text> : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </>
            )}
          </>
        )}

        {tab === 'calendar' && (
          <>
            <View style={[s.intro, { borderColor: T.magenta }]}>
              <MaterialCommunityIcons name="calendar-month" size={28} color={T.magenta} />
              <Text style={s.introTxt}>Map your releases to chain partners (deals) or owned cinemas. Release windows enforced — cannot schedule before production completes.</Text>
            </View>

            {playerMovies.length === 0 ? (
              <Text style={s.empty}>No movies yet. Create one from the dashboard.</Text>
            ) : null}

            {playerMovies.map(m => {
              const sched = calendar.find(c => c.movieId === m.id);
              const ownedRuns = owned.flatMap(c => (c.scheduledReleases || []).filter(r => r.movieId === m.id).map(r => ({ cinema: c, run: r })));
              const isReleased = m.status === 'released';
              const isComingSoon = m.status === 'production';
              const earliestWeek = m.targetReleaseWeek || (isReleased ? m.releaseWeek : null);
              const earliestYear = m.targetReleaseYear || (isReleased ? m.releaseYear : null);
              return (
                <View key={m.id} style={s.calMovieCard} testID={`cal-movie-${m.id}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.movieIcon, { backgroundColor: m.iconBg }]}>
                      <MaterialCommunityIcons name={m.iconKey as any} size={18} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.chainName} numberOfLines={1}>{m.title}</Text>
                      <Text style={s.chainSub}>
                        {isReleased ? `Released W${m.releaseWeek} Y${m.releaseYear}` : isComingSoon ? `In production · ${m.weeksToRelease}w left` : 'On hold'}
                        {earliestWeek && earliestYear ? ` · target W${earliestWeek} Y${earliestYear}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: sched ? T.yellow : T.cyan }]} onPress={() => openScheduleChain(m.id)} disabled={playerDeals.length === 0} testID={`schedule-chain-${m.id}`}>
                      <Text style={[s.smallBtnTxt, { color: T.cardDark }]}>{sched ? 'CHAIN' : 'CHAIN'}</Text>
                    </TouchableOpacity>
                  </View>
                  {sched ? (
                    <View style={s.calSchedRow}>
                      <Text style={s.calSchedTxt}>📅 Chains: W{sched.scheduledWeek} Y{sched.scheduledYear} · {sched.chainIds.length} chain{sched.chainIds.length > 1 ? 's' : ''}</Text>
                      <TouchableOpacity onPress={() => unscheduleMovieFromCinemas(m.id)} testID={`unschedule-chain-${m.id}`}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={T.red} />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {ownedRuns.length > 0 ? (
                    <View style={[s.calSchedRow, { borderTopWidth: 1, borderColor: T.border, paddingTop: 6 }]}>
                      <Text style={[s.calSchedTxt, { color: T.green }]}>🎟 Mine: {ownedRuns.length} run{ownedRuns.length > 1 ? 's' : ''} (W{ownedRuns[0].run.fromWeek} Y{ownedRuns[0].run.fromYear})</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}

            <View style={s.preLicBox}>
              <Text style={s.preLicTitle}>🔒 Release Window Guard</Text>
              <Text style={s.preLicTxt}>Movies can only be scheduled at or after their production release date. Filming/coming-soon titles cannot be scheduled before they finish production.</Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Chain Negotiation Modal */}
      <Modal visible={!!chainId} transparent animationType="slide" onRequestClose={() => setChainId(null)}>
        {chainId ? (() => {
          const chain = CINEMA_CHAINS.find(c => c.id === chainId);
          if (!chain) return <View />;
          const range = cinemaDealRange(chain.reputation, state.player.rating);
          return (
            <View style={s.modalBg}>
              <View style={s.modalCard}>
                <Text style={s.modalTitle}>{chain.name}</Text>
                <Text style={s.modalSub}>{chain.region} · {chain.theaters.toLocaleString()} theaters · Rep {chain.reputation}</Text>
                <Text style={s.fieldLbl}>YEARS (5–10)</Text>
                <View style={s.yearsRow}>
                  {[5, 7, 10].map(y => (
                    <TouchableOpacity key={y} style={[s.yearChip, years === y && { backgroundColor: T.cyan }]} onPress={() => setYears(y)} testID={`years-${y}`}>
                      <Text style={[s.yearTxt, years === y && { color: T.cardDark }]}>{y}y</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.fieldLbl}>OPENING WEEK STUDIO % (range {(range.minOpen * 100).toFixed(0)}–{(range.maxOpen * 100).toFixed(0)}%)</Text>
                <TextInput value={openShare} onChangeText={setOpenShare} keyboardType="decimal-pad" style={s.inp} placeholder="e.g. 0.68" placeholderTextColor={T.textMute} testID="open-share-input" />
                <Text style={s.fieldLbl}>LATE WEEK STUDIO % (range {(range.minLate * 100).toFixed(0)}–{(range.maxLate * 100).toFixed(0)}%)</Text>
                <TextInput value={lateShare} onChangeText={setLateShare} keyboardType="decimal-pad" style={s.inp} placeholder="e.g. 0.42" placeholderTextColor={T.textMute} testID="late-share-input" />
                <Text style={s.modalHint}>Higher % = more revenue but harder to sign. Stay near midpoint to be safe.</Text>
                {statusMsg ? (
                  <View style={[s.statusBox, statusMsg.kind === 'ok' ? { borderColor: T.green, backgroundColor: T.green + '22' } : statusMsg.kind === 'counter' ? { borderColor: T.yellow, backgroundColor: T.yellow + '22' } : { borderColor: '#E84545', backgroundColor: '#E8454522' }]} testID="cinema-status">
                    <Text style={[s.statusTxt, statusMsg.kind === 'ok' ? { color: T.green } : statusMsg.kind === 'counter' ? { color: T.yellow } : { color: '#E84545' }]}>{statusMsg.text}</Text>
                  </View>
                ) : null}
                {chainCounter ? (
                  <View style={s.counterBox}>
                    <Text style={s.counterTitle}>CHAIN COUNTER OFFER</Text>
                    <Text style={s.counterTxt}>Opening: {(chainCounter.openShare * 100).toFixed(0)}%  ·  Late: {(chainCounter.lateShare * 100).toFixed(0)}%  ·  {chainCounter.years}y</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity style={[s.counterBtn, { backgroundColor: T.green }]} onPress={acceptCounter} testID="accept-counter-btn"><Text style={[s.counterBtnTxt, { color: T.cardDark }]}>Accept</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.counterBtn, { backgroundColor: T.cyan }]} onPress={() => { setOpenShare(chainCounter.openShare.toFixed(2)); setLateShare(chainCounter.lateShare.toFixed(2)); setChainCounter(null); }} testID="counter-again-btn"><Text style={[s.counterBtnTxt, { color: T.cardDark }]}>Counter</Text></TouchableOpacity>
                      <TouchableOpacity style={[s.counterBtn, { backgroundColor: T.card }]} onPress={() => setChainId(null)} testID="walk-away-btn"><Text style={[s.counterBtnTxt, { color: T.text }]}>Walk Away</Text></TouchableOpacity>
                    </View>
                  </View>
                ) : null}
                <TouchableOpacity style={s.signBtn} onPress={submitDeal} testID="sign-deal-btn">
                  <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                  <Text style={s.signTxt}>{round === 1 ? 'NEGOTIATE & SIGN' : `RE-SUBMIT (Round ${round})`}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setChainId(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          );
        })() : <View />}
      </Modal>

      {/* Schedule chain modal */}
      <Modal visible={!!scheduleMovieId} transparent animationType="slide" onRequestClose={() => setScheduleMovieId(null)}>
        {scheduleMovieId ? (() => {
          const m = state.movies.find(mm => mm.id === scheduleMovieId);
          if (!m) return <View />;
          return (
            <View style={s.modalBg}>
              <View style={s.modalCard}>
                <Text style={s.modalTitle}>Schedule (chains): {m.title}</Text>
                <Text style={s.fieldLbl}>RELEASE WEEK / YEAR</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput value={String(scheduleWeek)} onChangeText={(t) => setScheduleWeek(Math.max(1, Math.min(WEEKS_PER_YEAR, parseInt(t) || 1)))} keyboardType="numeric" style={[s.inp, { flex: 1 }]} placeholder="Week 1-48" testID="sched-week-input" />
                  <TextInput value={String(scheduleYear)} onChangeText={(t) => setScheduleYear(parseInt(t) || state.year)} keyboardType="numeric" style={[s.inp, { flex: 1 }]} placeholder="Year" testID="sched-year-input" />
                </View>
                <Text style={s.fieldLbl}>CINEMA CHAINS (active deals only)</Text>
                <ScrollView style={{ maxHeight: 220 }}>
                  {playerDeals.map(d => {
                    const chain = CINEMA_CHAINS.find(c => c.id === d.chainId);
                    if (!chain) return null;
                    const sel = scheduleChains.has(chain.id);
                    return (
                      <TouchableOpacity key={chain.id} style={[s.chainRow, sel && { borderColor: T.green, backgroundColor: '#1a3a25' }]} onPress={() => { setScheduleChains(prev => { const next = new Set(prev); if (next.has(chain.id)) next.delete(chain.id); else next.add(chain.id); return next; }); }} testID={`sched-chain-${chain.id}`}>
                        <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={sel ? T.green : T.textDim} />
                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                          <Text style={s.chainName}>{chain.name}</Text>
                          <Text style={s.chainSub}>{chain.region}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={s.signBtn} onPress={submitScheduleChain} testID="confirm-schedule-chain-btn">
                  <MaterialCommunityIcons name="calendar-check" size={20} color={T.cardDark} />
                  <Text style={s.signTxt}>LOCK SCHEDULE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setScheduleMovieId(null)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
              </View>
            </View>
          );
        })() : <View />}
      </Modal>

      {/* Schedule owned cinemas modal */}
      <Modal visible={schedOwnedOpen} transparent animationType="slide" onRequestClose={() => setSchedOwnedOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Bulk-Schedule (My Cinemas)</Text>
            <Text style={s.modalSub}>Multi-select movies → multi-select cinemas → set start week. Window guard enforced.</Text>

            <Text style={s.fieldLbl}>FROM WEEK / YEAR</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={schedWeek} onChangeText={setSchedWeek} keyboardType="numeric" style={[s.inp, { flex: 1 }]} placeholder="Week" testID="sched-owned-week-input" />
              <TextInput value={schedYear} onChangeText={setSchedYear} keyboardType="numeric" style={[s.inp, { flex: 1 }]} placeholder="Year" testID="sched-owned-year-input" />
              <TextInput value={schedWeeksToShow} onChangeText={setSchedWeeksToShow} keyboardType="numeric" style={[s.inp, { flex: 1 }]} placeholder="Show wks" testID="sched-owned-weeks-input" />
            </View>

            <Text style={s.fieldLbl}>MOVIES ({schedMovieIds.size} selected)</Text>
            <ScrollView style={{ maxHeight: 160 }}>
              {playerMovies.map(m => {
                const sel = schedMovieIds.has(m.id);
                return (
                  <TouchableOpacity key={m.id} style={[s.chainRow, sel && { borderColor: T.green, backgroundColor: '#1a3a25' }]} onPress={() => setSchedMovieIds(prev => { const n = new Set(prev); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })} testID={`sched-owned-movie-${m.id}`}>
                    <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={sel ? T.green : T.textDim} />
                    <Text style={[s.chainName, { paddingHorizontal: 6, fontSize: 12 }]} numberOfLines={1}>{m.title}</Text>
                    <Text style={[s.chainSub, { fontSize: 10 }]}>{m.status}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={s.fieldLbl}>OWNED CINEMAS ({schedCinemaIds.size} selected)</Text>
            <ScrollView style={{ maxHeight: 160 }}>
              {owned.map(c => {
                const sel = schedCinemaIds.has(c.id);
                return (
                  <TouchableOpacity key={c.id} style={[s.chainRow, sel && { borderColor: T.green, backgroundColor: '#1a3a25' }]} onPress={() => setSchedCinemaIds(prev => { const n = new Set(prev); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} testID={`sched-owned-cinema-${c.id}`}>
                    <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={sel ? T.green : T.textDim} />
                    <View style={{ flex: 1, paddingHorizontal: 6 }}>
                      <Text style={[s.chainName, { fontSize: 12 }]}>{c.name}</Text>
                      <Text style={[s.chainSub, { fontSize: 10 }]}>{c.region} · {c.size} · {c.screens} scr</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={s.signBtn} onPress={submitSchedOwned} testID="confirm-sched-owned-btn">
              <MaterialCommunityIcons name="calendar-check" size={20} color={T.cardDark} />
              <Text style={s.signTxt}>SCHEDULE {schedMovieIds.size}× {schedCinemaIds.size}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setSchedOwnedOpen(false)}><Text style={s.cancelTxt}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* V30 — Edit owned cinema modal (rename + amenities + P&L) */}
      <Modal visible={!!editCinemaId} transparent animationType="slide" onRequestClose={() => setEditCinemaId(null)}>
        {editCinemaId ? (() => {
          const c = (state.ownedCinemas || []).find(cc => cc.id === editCinemaId);
          if (!c) return <View />;
          const ams = c.amenities || {};
          const lifeRev = (c.lifetimeRevenueB || 0) * 1000;
          const lifeOpex = (c.lifetimeOpexB || 0) * 1000;
          const profit = lifeRev - lifeOpex;
          return (
            <View style={s.modalBg}>
              <ScrollView style={{ maxHeight: '92%' }}>
                <View style={s.modalCard}>
                  <Text style={s.modalTitle}>{c.displayName || c.name}</Text>
                  <Text style={s.modalSub}>{c.region} · {c.size.toUpperCase()} · {c.screens} screens · Built W{c.builtWeek} Y{c.builtYear}</Text>

                  <Text style={s.fieldLbl}>RENAME</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput value={editName} onChangeText={setEditName} style={[s.inp, { flex: 1 }]} placeholder="New name" placeholderTextColor={T.textMute} maxLength={40} testID="rename-cinema-input" />
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.cyan, paddingHorizontal: 14, paddingVertical: 12 }]} onPress={() => {
                      const r = renameOwnedCinema(editCinemaId, editName);
                      if (r.error) uiAlert('Cannot Rename', r.error);
                    }} testID="confirm-rename-btn">
                      <Text style={[s.smallBtnTxt, { color: T.cardDark }]}>SAVE</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={s.fieldLbl}>TICKETS · FOOD · MERCH</Text>
                  <Text style={s.modalHint}>Tune pricing & service levels. Higher tiers add weekly opex but boost revenue.</Text>
                  <Text style={s.subFieldLbl}>Ticket Price</Text>
                  <View style={s.custChipRow}>
                    {(['value', 'standard', 'premium'] as const).map(lv => {
                      const active = (c.ticketPriceLevel || 'standard') === lv;
                      const labels: Record<typeof lv, string> = { value: 'Value $10', standard: 'Standard $15', premium: 'Premium $22' };
                      return (
                        <TouchableOpacity key={lv} style={[s.custChip, active && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                          onPress={() => { setOwnedCinemaCustomization(editCinemaId, { ticketPriceLevel: lv }); }}
                          testID={`ticket-${lv}`}>
                          <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{labels[lv]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={s.subFieldLbl}>Food / Concessions</Text>
                  <View style={s.custChipRow}>
                    {(['none', 'basic', 'premium', 'gourmet'] as const).map(lv => {
                      const active = (c.foodLevel || 'basic') === lv;
                      const labels: Record<typeof lv, string> = { none: 'None', basic: 'Basic', premium: 'Premium', gourmet: 'Gourmet' };
                      return (
                        <TouchableOpacity key={lv} style={[s.custChip, active && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                          onPress={() => { setOwnedCinemaCustomization(editCinemaId, { foodLevel: lv }); }}
                          testID={`food-${lv}`}>
                          <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{labels[lv]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={s.subFieldLbl}>Merchandising</Text>
                  <View style={s.custChipRow}>
                    {(['none', 'basic', 'premium'] as const).map(lv => {
                      const active = (c.merchLevel || 'none') === lv;
                      const labels: Record<typeof lv, string> = { none: 'No Merch', basic: 'Basic', premium: 'Premium' };
                      return (
                        <TouchableOpacity key={lv} style={[s.custChip, active && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                          onPress={() => { setOwnedCinemaCustomization(editCinemaId, { merchLevel: lv }); }}
                          testID={`merch-${lv}`}>
                          <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{labels[lv]}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={s.fieldLbl}>PREMIUM AMENITIES</Text>
                  <Text style={s.modalHint}>Each amenity adds weekly opex but boosts ticket revenue. Removing refunds 30%.</Text>
                  {(['imax', 'recliners', 'premiumConcessions'] as const).map(akey => {
                    const spec = AMENITY_SPECS[akey];
                    const installed = !!ams[akey];
                    return (
                      <View key={akey} style={[s.amenityCard, installed && { borderColor: T.green }]} testID={`amenity-${akey}`}>
                        <MaterialCommunityIcons name={spec.icon as any} size={28} color={installed ? T.green : T.textDim} />
                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                          <Text style={s.chainName}>{spec.label}</Text>
                          <Text style={s.chainSub}>${spec.installCost}M install · ${spec.weeklyOpex}M/wk · +{((spec.revenueMult - 1) * 100).toFixed(0)}% revenue</Text>
                        </View>
                        <TouchableOpacity
                          style={[s.amenityBtn, { backgroundColor: installed ? T.red : T.green }]}
                          onPress={() => {
                            const r = toggleOwnedCinemaAmenity(editCinemaId, akey, !installed);
                            if (r.error) uiAlert('Action Failed', r.error);
                            else uiAlert(installed ? 'Removed' : 'Installed ✓', installed ? `Refund: $${(-r.cost).toFixed(0)}M` : `Cost: $${r.cost.toFixed(0)}M. Revenue boost active.`);
                          }}
                          testID={`amenity-toggle-${akey}`}>
                          <Text style={[s.amenityBtnTxt, { color: T.cardDark }]}>{installed ? 'REMOVE' : 'INSTALL'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <Text style={s.fieldLbl}>LIFETIME P&L</Text>
                  <View style={s.pnlBox}>
                    <View style={s.pnlRow}><Text style={s.pnlLbl}>Revenue</Text><Text style={[s.pnlVal, { color: T.green }]}>+${lifeRev.toFixed(1)}M</Text></View>
                    <View style={s.pnlRow}><Text style={s.pnlLbl}>Opex</Text><Text style={[s.pnlVal, { color: T.red }]}>-${lifeOpex.toFixed(1)}M</Text></View>
                    <View style={[s.pnlRow, { borderTopWidth: 1, borderColor: T.border, paddingTop: 6 }]}>
                      <Text style={[s.pnlLbl, { fontWeight: '900' }]}>Profit</Text>
                      <Text style={[s.pnlVal, { color: profit >= 0 ? T.green : T.red, fontSize: 16 }]}>{profit >= 0 ? '+' : ''}${profit.toFixed(1)}M</Text>
                    </View>
                  </View>

                  {(c.scheduledReleases || []).length > 0 ? (
                    <>
                      <Text style={s.fieldLbl}>SCHEDULED ({(c.scheduledReleases || []).length})</Text>
                      {(c.scheduledReleases || []).map(r => {
                        const m = state.movies.find(mm => mm.id === r.movieId);
                        return (
                          <View key={r.id} style={s.schedRow}>
                            <MaterialCommunityIcons name="calendar-clock" size={16} color={T.magenta} />
                            <Text style={[s.chainSub, { flex: 1, paddingHorizontal: 6 }]}>{m?.title || '?'} · W{r.fromWeek} Y{r.fromYear} · {r.weeksToShow}w run</Text>
                            <TouchableOpacity onPress={() => unscheduleOwnedCinemaRun(c.id, r.id)} testID={`edit-unschedule-${r.id}`}>
                              <MaterialCommunityIcons name="close-circle" size={18} color={T.red} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </>
                  ) : null}

                  <TouchableOpacity style={s.cancelBtn} onPress={() => setEditCinemaId(null)}><Text style={s.cancelTxt}>Close</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          );
        })() : <View />}
      </Modal>

      {/* MASS RENAME modal */}
      <Modal visible={massRenameOpen} transparent animationType="slide" onRequestClose={() => setMassRenameOpen(false)}>
        <View style={s.modalBg}>
          <SafeAreaView edges={['top']} style={{ width: '100%' }}>
            <View style={[s.modalCard, { maxHeight: '88%' }]}>
              <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                <Text style={s.modalTitle}>Mass Rename · {massSelected.size} cinema{massSelected.size > 1 ? 's' : ''}</Text>
                <Text style={s.modalSub}>All selected cinemas will be renamed using prefix + sequential number, e.g. "{massRenamePrefix} #{parseInt(massRenameStart, 10) || 1}", "{massRenamePrefix} #{(parseInt(massRenameStart, 10) || 1) + 1}", …</Text>
                <Text style={s.fieldLbl}>NAME PREFIX</Text>
                <TextInput
                  value={massRenamePrefix}
                  onChangeText={setMassRenamePrefix}
                  style={s.inp}
                  maxLength={32}
                  placeholder="e.g. MoonPlex"
                  placeholderTextColor={T.textMute}
                  testID="mass-rename-prefix"
                />
                <Text style={s.fieldLbl}>START NUMBER</Text>
                <TextInput
                  value={massRenameStart}
                  onChangeText={(v) => setMassRenameStart(v.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  maxLength={4}
                  style={s.inp}
                  testID="mass-rename-start"
                />
                <Text style={[s.modalSub, { marginTop: 8 }]}>Tip: leave the prefix unchanged but use a different start number to extend an existing series.</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setMassRenameOpen(false)} testID="mass-rename-cancel">
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.signBtn, { flex: 1 }]}
                    onPress={() => {
                      const prefix = (massRenamePrefix || 'My Cinema').trim() || 'My Cinema';
                      const startN = parseInt(massRenameStart, 10) || 1;
                      const ids = Array.from(massSelected);
                      // Order by region, then by build order (existing order in array)
                      const ordered = owned.filter(c => ids.includes(c.id));
                      let n = startN;
                      let renamed = 0;
                      for (const c of ordered) {
                        const newName = `${prefix} #${n}`;
                        renameOwnedCinema(c.id, newName);
                        n++; renamed++;
                      }
                      setMassRenameOpen(false);
                      setMassMode(false);
                      setMassSelected(new Set());
                      uiAlert('Mass Rename ✓', `Renamed ${renamed} cinemas (${prefix} #${startN}…#${n - 1}).`);
                    }}
                    testID="mass-rename-apply"
                  >
                    <MaterialCommunityIcons name="rename-box" size={18} color={T.cardDark} />
                    <Text style={s.signTxt}>RENAME {massSelected.size}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* MASS UPGRADE modal */}
      <Modal visible={massUpgradeOpen} transparent animationType="slide" onRequestClose={() => setMassUpgradeOpen(false)}>
        <View style={s.modalBg}>
          <SafeAreaView edges={['top']} style={{ width: '100%' }}>
            <View style={[s.modalCard, { maxHeight: '88%' }]}>
              <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                <Text style={s.modalTitle}>Mass Upgrade · {massSelected.size} cinema{massSelected.size > 1 ? 's' : ''}</Text>
                <Text style={s.modalSub}>Pick which premium amenities to ADD to every selected cinema. Cinemas already equipped with that amenity will be skipped (no double-charge).</Text>
                {(['imax', 'recliners', 'premiumConcessions'] as const).map(am => {
                  const isOn = massApplyAmenities[am];
                  const meta = am === 'imax' ? { label: 'IMAX', sub: '+25% revenue · +$0.4M/wk opex', icon: 'movie-open-star', color: T.yellow }
                    : am === 'recliners' ? { label: 'Recliners', sub: '+12% revenue · +$0.2M/wk opex', icon: 'seat-recline-extra', color: T.cyan }
                    : { label: 'Premium Concessions', sub: '+8% revenue · +$0.1M/wk opex', icon: 'food-variant', color: T.magenta };
                  return (
                    <TouchableOpacity
                      key={am}
                      style={[s.amenityRow, isOn && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                      onPress={() => setMassApplyAmenities(prev => ({ ...prev, [am]: !prev[am] }))}
                      testID={`mass-am-${am}`}
                    >
                      <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
                      <View style={{ flex: 1, paddingHorizontal: 8 }}>
                        <Text style={[s.amenityLbl, { color: meta.color }]}>{meta.label}</Text>
                        <Text style={s.amenitySub}>{meta.sub}</Text>
                      </View>
                      <View style={[s.massCheck, isOn && { backgroundColor: meta.color, borderColor: meta.color }]}>
                        {isOn ? <MaterialCommunityIcons name="check" size={14} color={T.cardDark} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {(() => {
                  const ids = Array.from(massSelected);
                  const sel = owned.filter(c => ids.includes(c.id));
                  const willAdd = (am: 'imax' | 'recliners' | 'premiumConcessions') => sel.filter(c => massApplyAmenities[am] && !(c.amenities || {})[am]).length;
                  const total = (massApplyAmenities.imax ? willAdd('imax') : 0) + (massApplyAmenities.recliners ? willAdd('recliners') : 0) + (massApplyAmenities.premiumConcessions ? willAdd('premiumConcessions') : 0);
                  return (
                    <View style={[s.quoteBox, { marginTop: 8 }]}>
                      <Text style={s.quoteLbl}>UPGRADES TO APPLY</Text>
                      <Text style={s.quoteVal}>{total}</Text>
                      <Text style={s.quoteSub}>
                        {massApplyAmenities.imax ? `IMAX: +${willAdd('imax')}  ` : ''}
                        {massApplyAmenities.recliners ? `Recliners: +${willAdd('recliners')}  ` : ''}
                        {massApplyAmenities.premiumConcessions ? `Snacks: +${willAdd('premiumConcessions')}` : ''}
                      </Text>
                    </View>
                  );
                })()}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setMassUpgradeOpen(false)} testID="mass-upgrade-cancel">
                    <Text style={s.cancelTxt}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.signBtn, { flex: 1, backgroundColor: T.green }]}
                    onPress={() => {
                      const ids = Array.from(massSelected);
                      const sel = owned.filter(c => ids.includes(c.id));
                      let upgrades = 0;
                      for (const c of sel) {
                        const ams = c.amenities || {};
                        if (massApplyAmenities.imax && !ams.imax) { toggleOwnedCinemaAmenity(c.id, 'imax', true); upgrades++; }
                        if (massApplyAmenities.recliners && !ams.recliners) { toggleOwnedCinemaAmenity(c.id, 'recliners', true); upgrades++; }
                        if (massApplyAmenities.premiumConcessions && !ams.premiumConcessions) { toggleOwnedCinemaAmenity(c.id, 'premiumConcessions', true); upgrades++; }
                      }
                      setMassUpgradeOpen(false);
                      setMassApplyAmenities({ imax: false, recliners: false, premiumConcessions: false });
                      setMassMode(false);
                      setMassSelected(new Set());
                      uiAlert('Mass Upgrade ✓', `Applied ${upgrades} amenity upgrade${upgrades === 1 ? '' : 's'} across ${sel.length} cinemas.`);
                    }}
                    testID="mass-upgrade-apply"
                  >
                    <MaterialCommunityIcons name="rocket-launch" size={18} color={T.cardDark} />
                    <Text style={s.signTxt}>APPLY</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* QUICK BULK modal — quantity input, no per-cinema tapping. Filters by region/size, applies amenities or rename to first N matching. */}
      <Modal visible={quickOpen} transparent animationType="slide" onRequestClose={() => setQuickOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)' }} edges={['top', 'bottom']}>
          <View style={{ flex: 1, padding: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#4d5058', borderRadius: 18, borderWidth: 3, borderColor: T.border, overflow: 'hidden' }}>
              <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                {/* Mode toggle */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[s.modeChip, quickMode === 'upgrade' && { backgroundColor: T.green, borderColor: T.green }]}
                    onPress={() => setQuickMode('upgrade')}
                    testID="quick-mode-upgrade"
                  >
                    <MaterialCommunityIcons name="rocket-launch" size={14} color={quickMode === 'upgrade' ? T.cardDark : T.green} />
                    <Text style={[s.modeChipTxt, quickMode === 'upgrade' && { color: T.cardDark }]}>Upgrade</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modeChip, quickMode === 'rename' && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                    onPress={() => setQuickMode('rename')}
                    testID="quick-mode-rename"
                  >
                    <MaterialCommunityIcons name="rename-box" size={14} color={quickMode === 'rename' ? T.cardDark : T.yellow} />
                    <Text style={[s.modeChipTxt, quickMode === 'rename' && { color: T.cardDark }]}>Rename</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.modeChip, quickMode === 'pricing' && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                    onPress={() => setQuickMode('pricing')}
                    testID="quick-mode-pricing"
                  >
                    <MaterialCommunityIcons name="cash-multiple" size={14} color={quickMode === 'pricing' ? T.cardDark : T.magenta} />
                    <Text style={[s.modeChipTxt, quickMode === 'pricing' && { color: T.cardDark }]}>Pricing</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.modalTitle}>Quick Bulk · {quickMode === 'upgrade' ? 'Upgrade' : quickMode === 'rename' ? 'Rename' : 'Pricing'} by Quantity</Text>
                <Text style={s.modalSub}>No tapping required. Choose how many cinemas to apply changes to, optionally filter by region or size, and we apply to the first N matching cinemas (oldest first).</Text>

                {/* Quantity input + presets */}
                <Text style={s.fieldLbl}>HOW MANY CINEMAS</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <TextInput
                    value={quickQty}
                    onChangeText={(v) => setQuickQty(v.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    style={[s.inp, { flex: 1 }]}
                    maxLength={5}
                    testID="quick-qty"
                    placeholder="e.g. 50"
                    placeholderTextColor={T.textMute}
                  />
                  {['10', '25', '50', '100', '500'].map(n => (
                    <TouchableOpacity key={n} style={[s.qtyPreset, quickQty === n && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setQuickQty(n)} testID={`quick-qty-${n}`}>
                      <Text style={[s.qtyPresetTxt, quickQty === n && { color: T.cardDark }]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[s.qtyPreset, quickQty === '99999' && { backgroundColor: T.green, borderColor: T.green }]} onPress={() => setQuickQty('99999')} testID="quick-qty-all">
                    <Text style={[s.qtyPresetTxt, quickQty === '99999' && { color: T.cardDark }]}>ALL</Text>
                  </TouchableOpacity>
                </View>

                {/* Region filter */}
                <Text style={s.fieldLbl}>REGION</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {([
                    { k: 'all', l: 'Any' }, { k: 'NA', l: 'NA' }, { k: 'EU', l: 'EU' }, { k: 'LATAM', l: 'LATAM' }, { k: 'ASIA', l: 'Asia' }, { k: 'OCE', l: 'Oceania' }, { k: 'AFR', l: 'Africa' },
                  ] as const).map(r => (
                    <TouchableOpacity key={r.k} style={[s.modeChip, quickRegion === r.k && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setQuickRegion(r.k)} testID={`quick-region-${r.k}`}>
                      <Text style={[s.modeChipTxt, quickRegion === r.k && { color: T.cardDark }]}>{r.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.fieldLbl}>SIZE</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {([
                    { k: 'all', l: 'Any' }, { k: 'small', l: 'Small' }, { k: 'medium', l: 'Medium' }, { k: 'large', l: 'Large' }, { k: 'mega', l: 'Mega' },
                  ] as const).map(r => (
                    <TouchableOpacity key={r.k} style={[s.modeChip, quickSize === r.k && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setQuickSize(r.k)} testID={`quick-size-${r.k}`}>
                      <Text style={[s.modeChipTxt, quickSize === r.k && { color: T.cardDark }]}>{r.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Compute target set */}
                {(() => {
                  const qty = Math.max(0, Math.min(99999, parseInt(quickQty, 10) || 0));
                  // V38 — fix B1: chip keys are short codes; cinema.region is the full string.
                  const REGION_KEY_MAP: Record<string, string> = {
                    NA: 'North America', EU: 'Europe', LATAM: 'Latin America', ASIA: 'Asia', OCE: 'Oceania', AFR: 'Africa',
                  };
                  const regionMatch = (c: any) => quickRegion === 'all' ? true : c.region === REGION_KEY_MAP[quickRegion];
                  const sizeMatch = (c: any) => quickSize === 'all' ? true : c.size === quickSize;
                  let pool = owned.filter(c => regionMatch(c) && sizeMatch(c));
                  if (quickMode === 'upgrade') {
                    // Only cinemas that DON'T already have at least one of the picked amenities
                    pool = pool.filter(c => {
                      const am = c.amenities || {};
                      return (quickAmenities.imax && !am.imax) || (quickAmenities.recliners && !am.recliners) || (quickAmenities.premiumConcessions && !am.premiumConcessions);
                    });
                  } else if (quickMode === 'pricing') {
                    // Only cinemas that DON'T already have the selected pricing levels (idempotent)
                    pool = pool.filter(c => {
                      return (quickTicket !== null && (c.ticketPriceLevel || 'standard') !== quickTicket)
                        || (quickFood !== null && (c.foodLevel || 'basic') !== quickFood)
                        || (quickMerch !== null && (c.merchLevel || 'none') !== quickMerch);
                    });
                  }
                  const target = pool.slice(0, qty);
                  // Render appropriate body
                  return (
                    <>
                      {quickMode === 'upgrade' ? (
                        <>
                          <Text style={s.fieldLbl}>AMENITIES TO APPLY</Text>
                          {(['imax', 'recliners', 'premiumConcessions'] as const).map(am => {
                            const isOn = quickAmenities[am];
                            const meta = am === 'imax' ? { label: 'IMAX', sub: '+25% rev · +$0.4M/wk opex', icon: 'movie-open-star', color: T.yellow }
                              : am === 'recliners' ? { label: 'Recliners', sub: '+12% rev · +$0.2M/wk opex', icon: 'seat-recline-extra', color: T.cyan }
                              : { label: 'Premium Concessions', sub: '+8% rev · +$0.1M/wk opex', icon: 'food-variant', color: T.magenta };
                            return (
                              <TouchableOpacity
                                key={am}
                                style={[s.amenityRow, isOn && { borderColor: meta.color, backgroundColor: meta.color + '22' }]}
                                onPress={() => setQuickAmenities(prev => ({ ...prev, [am]: !prev[am] }))}
                                testID={`quick-am-${am}`}
                              >
                                <MaterialCommunityIcons name={meta.icon as any} size={22} color={meta.color} />
                                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                                  <Text style={[s.amenityLbl, { color: meta.color }]}>{meta.label}</Text>
                                  <Text style={s.amenitySub}>{meta.sub}</Text>
                                </View>
                                <View style={[s.massCheck, isOn && { backgroundColor: meta.color, borderColor: meta.color }]}>
                                  {isOn ? <MaterialCommunityIcons name="check" size={14} color={T.cardDark} /> : null}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </>
                      ) : quickMode === 'rename' ? (
                        <>
                          <Text style={s.fieldLbl}>NAME PREFIX</Text>
                          <TextInput value={quickRenamePrefix} onChangeText={setQuickRenamePrefix} style={s.inp} maxLength={32} placeholder="MoonPlex" placeholderTextColor={T.textMute} testID="quick-rename-prefix" />
                          <Text style={s.fieldLbl}>START NUMBER</Text>
                          <TextInput value={quickRenameStart} onChangeText={(v) => setQuickRenameStart(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={5} style={s.inp} testID="quick-rename-start" />
                        </>
                      ) : (
                        <>
                          {/* V37c — Pricing presets */}
                          <Text style={s.fieldLbl}>TICKET PRICE (leave blank to skip)</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {(['value', 'standard', 'premium'] as const).map(k => {
                              const spec = TICKET_PRICE_SPECS[k];
                              const on = quickTicket === k;
                              return (
                                <TouchableOpacity key={k} style={[s.modeChip, on && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setQuickTicket(on ? null : k)} testID={`quick-ticket-${k}`}>
                                  <Text style={[s.modeChipTxt, on && { color: T.cardDark }]}>{spec.label} · ×{spec.revenueMult.toFixed(2)}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <Text style={s.fieldLbl}>FOOD (leave blank to skip)</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {(['none', 'basic', 'premium', 'gourmet'] as const).map(k => {
                              const spec = FOOD_SPECS[k];
                              const on = quickFood === k;
                              return (
                                <TouchableOpacity key={k} style={[s.modeChip, on && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setQuickFood(on ? null : k)} testID={`quick-food-${k}`}>
                                  <Text style={[s.modeChipTxt, on && { color: T.cardDark }]}>{spec.label}{spec.weeklyOpex ? ` · +$${spec.weeklyOpex.toFixed(1)}M` : ''}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <Text style={s.fieldLbl}>MERCH (leave blank to skip)</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {(['none', 'basic', 'premium'] as const).map(k => {
                              const spec = MERCH_SPECS[k];
                              const on = quickMerch === k;
                              return (
                                <TouchableOpacity key={k} style={[s.modeChip, on && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setQuickMerch(on ? null : k)} testID={`quick-merch-${k}`}>
                                  <Text style={[s.modeChipTxt, on && { color: T.cardDark }]}>{spec.label}{spec.weeklyOpex ? ` · +$${spec.weeklyOpex.toFixed(1)}M` : ''}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          {(quickTicket === null && quickFood === null && quickMerch === null) ? (
                            <Text style={[s.modalSub, { color: T.yellow, marginTop: 8 }]}>Pick at least one preset above to apply.</Text>
                          ) : null}
                        </>
                      )}
                      <View style={[s.quoteBox, { marginTop: 12 }]}>
                        <Text style={s.quoteLbl}>WILL APPLY TO</Text>
                        <Text style={s.quoteVal}>{target.length} cinema{target.length === 1 ? '' : 's'}</Text>
                        <Text style={s.quoteSub}>
                          {pool.length} eligible {quickRegion !== 'all' ? `· region ${quickRegion} ` : ''}{quickSize !== 'all' ? `· ${quickSize} ` : ''}{quickMode === 'upgrade' ? '(filtered to those missing the chosen amenity)' : quickMode === 'pricing' ? '(filtered to those whose current preset differs)' : '(all matching cinemas)'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                        <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setQuickOpen(false)} testID="quick-cancel">
                          <Text style={s.cancelTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.signBtn, { flex: 1, backgroundColor: quickMode === 'upgrade' ? T.green : quickMode === 'rename' ? T.yellow : T.magenta }]}
                          onPress={() => {
                            if (target.length === 0) { uiAlert('Nothing to apply', 'No cinemas match the current filter.'); return; }
                            if (quickMode === 'upgrade') {
                              let upgrades = 0;
                              for (const c of target) {
                                const am = c.amenities || {};
                                if (quickAmenities.imax && !am.imax) { toggleOwnedCinemaAmenity(c.id, 'imax', true); upgrades++; }
                                if (quickAmenities.recliners && !am.recliners) { toggleOwnedCinemaAmenity(c.id, 'recliners', true); upgrades++; }
                                if (quickAmenities.premiumConcessions && !am.premiumConcessions) { toggleOwnedCinemaAmenity(c.id, 'premiumConcessions', true); upgrades++; }
                              }
                              setQuickOpen(false);
                              uiAlert('Quick Bulk Upgrade ✓', `${upgrades} amenity upgrade${upgrades === 1 ? '' : 's'} applied across ${target.length} cinemas.`);
                            } else if (quickMode === 'rename') {
                              const prefix = (quickRenamePrefix || 'MoonPlex').trim() || 'MoonPlex';
                              let n = parseInt(quickRenameStart, 10) || 1;
                              let renamed = 0;
                              for (const c of target) { renameOwnedCinema(c.id, `${prefix} #${n}`); n++; renamed++; }
                              setQuickOpen(false);
                              uiAlert('Quick Bulk Rename ✓', `Renamed ${renamed} cinemas ${prefix} #${parseInt(quickRenameStart, 10) || 1}…#${n - 1}.`);
                            } else {
                              // V37c — Pricing apply
                              if (quickTicket === null && quickFood === null && quickMerch === null) { uiAlert('Pick a preset', 'Choose at least one ticket/food/merch preset to apply.'); return; }
                              let applied = 0;
                              for (const c of target) {
                                const patch: any = {};
                                if (quickTicket !== null) patch.ticketPriceLevel = quickTicket;
                                if (quickFood !== null) patch.foodLevel = quickFood;
                                if (quickMerch !== null) patch.merchLevel = quickMerch;
                                setOwnedCinemaCustomization(c.id, patch);
                                applied++;
                              }
                              setQuickOpen(false);
                              uiAlert('Quick Bulk Pricing ✓', `Pricing applied across ${applied} cinemas${quickTicket ? ` · ticket: ${quickTicket}` : ''}${quickFood ? ` · food: ${quickFood}` : ''}${quickMerch ? ` · merch: ${quickMerch}` : ''}.`);
                            }
                          }}
                          testID="quick-apply"
                        >
                          <MaterialCommunityIcons name={quickMode === 'upgrade' ? 'rocket-launch' : quickMode === 'rename' ? 'rename-box' : 'cash-multiple'} size={18} color={T.cardDark} />
                          <Text style={s.signTxt}>APPLY TO {target.length}</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* SUPPLIER DEAL modal — sign a blanket distribution agreement with a rival studio */}
      <Modal visible={supplierOpen} transparent animationType="slide" onRequestClose={() => setSupplierOpen(false)}>
        {(() => {
          const rival = state.rivals.find(r => r.id === supplierRivalId);
          const yrs = parseInt(supplierYears, 10) || 0;
          const quote = supplierRivalId && yrs > 0 ? quoteCinemaSupplierDeal({ rivalStudioId: supplierRivalId, years: yrs, includeTraditional: supplierTraditional, includeHybrid: supplierHybrid }) : null;
          const feeM = parseFloat(supplierFee) || 0;
          return (
            <View style={s.modalBg}>
              <SafeAreaView edges={['top']} style={{ width: '100%' }}>
                <View style={[s.modalCard, { maxHeight: '90%' }]}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 14 }} keyboardShouldPersistTaps="handled">
                    <Text style={s.modalTitle}>Cinema Supplier Deal</Text>
                    <Text style={s.modalSub}>A rival studio routes ALL their theatrical releases (traditional and/or hybrid) into your owned cinemas for the term — synced with their existing chain partners. You keep {Math.round((quote?.revShareToPlayer || 0.85) * 100)}% of cinema-side revenue per routed release.</Text>

                    <Text style={s.fieldLbl}>SUPPLIER STUDIO</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {state.rivals.map(r => (
                        <TouchableOpacity key={r.id} style={[s.modeChip, supplierRivalId === r.id && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                          onPress={() => {
                            setSupplierRivalId(r.id);
                            const q = quoteCinemaSupplierDeal({ rivalStudioId: r.id, years: yrs || 5, includeTraditional: supplierTraditional, includeHybrid: supplierHybrid });
                            setSupplierFee(q.feeM.toFixed(1));
                          }}
                          testID={`supplier-rival-${r.id}`}>
                          <Text style={[s.modeChipTxt, supplierRivalId === r.id && { color: T.cardDark }]}>{r.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={s.fieldLbl}>YEARS (1–10)</Text>
                    <TextInput value={supplierYears} onChangeText={(v) => {
                      const nv = v.replace(/[^0-9]/g, ''); setSupplierYears(nv);
                      if (supplierRivalId) { const q = quoteCinemaSupplierDeal({ rivalStudioId: supplierRivalId, years: parseInt(nv || '0', 10) || 0, includeTraditional: supplierTraditional, includeHybrid: supplierHybrid }); setSupplierFee(q.feeM.toFixed(1)); }
                    }} keyboardType="numeric" maxLength={2} style={s.inp} testID="supplier-years" />

                    <Text style={s.fieldLbl}>RELEASE STYLES TO ROUTE</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[s.modeChip, supplierTraditional && { backgroundColor: T.green, borderColor: T.green }]} onPress={() => { setSupplierTraditional(v => !v); if (supplierRivalId) { const q = quoteCinemaSupplierDeal({ rivalStudioId: supplierRivalId, years: yrs, includeTraditional: !supplierTraditional, includeHybrid: supplierHybrid }); setSupplierFee(q.feeM.toFixed(1)); } }} testID="supplier-traditional">
                        <MaterialCommunityIcons name="filmstrip" size={14} color={supplierTraditional ? T.cardDark : T.green} />
                        <Text style={[s.modeChipTxt, supplierTraditional && { color: T.cardDark }]}>Traditional</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.modeChip, supplierHybrid && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => { setSupplierHybrid(v => !v); if (supplierRivalId) { const q = quoteCinemaSupplierDeal({ rivalStudioId: supplierRivalId, years: yrs, includeTraditional: supplierTraditional, includeHybrid: !supplierHybrid }); setSupplierFee(q.feeM.toFixed(1)); } }} testID="supplier-hybrid">
                        <MaterialCommunityIcons name="theater" size={14} color={supplierHybrid ? T.cardDark : T.cyan} />
                        <Text style={[s.modeChipTxt, supplierHybrid && { color: T.cardDark }]}>Hybrid</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={s.fieldLbl}>UPFRONT FEE YOU PAY ($M)</Text>
                    <TextInput value={supplierFee} onChangeText={(v) => setSupplierFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={8} style={s.inp} testID="supplier-fee" />

                    {quote && !quote.error ? (
                      <View style={s.quoteBox}>
                        <Text style={s.quoteLbl}>FAIR ESTIMATE</Text>
                        <Text style={s.quoteVal}>${quote.feeM.toFixed(1)}M</Text>
                        <Text style={s.quoteSub}>~{quote.estReleasesPerYear} releases/yr · +${quote.perReleaseKickbackM}M kickback per routed film · {Math.round(quote.revShareToPlayer * 100)}% rev share · Your cash ${state.player.cash.toFixed(2)}B</Text>
                      </View>
                    ) : quote?.error ? (
                      <Text style={[s.modalSub, { color: T.red, marginTop: 8 }]}>{quote.error}</Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                      <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setSupplierOpen(false)} testID="supplier-cancel">
                        <Text style={s.cancelTxt}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.signBtn, { flex: 1, backgroundColor: T.magenta }]}
                        onPress={() => {
                          if (!supplierRivalId || !rival) return;
                          if (yrs < 1 || yrs > 10) { uiAlert('Invalid', 'Years must be 1–10.'); return; }
                          if (feeM <= 0) { uiAlert('Invalid', 'Set a fee.'); return; }
                          const r = signCinemaSupplierDeal({ rivalStudioId: supplierRivalId, years: yrs, includeTraditional: supplierTraditional, includeHybrid: supplierHybrid, upfrontFeeM: feeM });
                          if (r.error) { uiAlert('Cannot sign', r.error); return; }
                          setSupplierOpen(false);
                          uiAlert('Supplier Deal Signed ✓', `${rival.name} will start routing releases into your cinemas.`);
                        }}
                        testID="supplier-sign"
                      >
                        <MaterialCommunityIcons name="handshake" size={18} color={T.cardDark} />
                        <Text style={s.signTxt}>SIGN DEAL</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </SafeAreaView>
            </View>
          );
        })()}
      </Modal>
      {/* V39 — Cinema Owner Manager proposals modal */}
      <Modal visible={ownedMgrOpen} animationType="slide" onRequestClose={() => setOwnedMgrOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setOwnedMgrOpen(false)}><MaterialCommunityIcons name="close" size={24} color={T.text} /></TouchableOpacity>
            <Text style={s.modalHeaderTitle}>💡 Cinema Manager</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            {ownedMgrProposals.length === 0 ? (
              <Text style={{ color: T.text, fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>No suggestions right now. Manager scans weekly for new opportunities once you own cinemas.</Text>
            ) : ownedMgrProposals.map(p => {
              const rival = state.rivals.find(r => r.id === p.rivalStudioId);
              return (
                <View key={p.id} style={s.ownedMgrCard} testID={`cin-mgr-${p.id}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name={p.direction === 'inbound' ? 'arrow-down-bold-circle' : 'arrow-up-bold-circle'} size={22} color={p.direction === 'inbound' ? T.green : T.yellow} />
                    <Text style={s.ownedMgrCardKind}>{(p as any).kind === 'schedule_movie_owned' ? '📅 Schedule Re-Run' : `${rival?.name || '?'} — Supplier Deal`}</Text>
                    <View style={{ flex: 1 }} />
                    <View style={[s.ownedDirPill, { backgroundColor: p.direction === 'inbound' ? T.green : T.yellow }]}><Text style={s.ownedDirPillT}>{p.direction.toUpperCase()}</Text></View>
                  </View>
                  <Text style={s.ownedMgrRationale}>{p.rationale}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[s.ownedMgrBtn, { backgroundColor: T.green }]} onPress={() => {
                      // V43 — Use V2 handler which delegates to original for supplier_deal_inbound, and handles new schedule_movie_owned kind.
                      const r = approveCinemaOwnedManagerProposalV2(p.id);
                      if (r.error) uiAlert('Cannot approve', r.error);
                      else uiAlert('Approved ✓', (p as any).kind === 'schedule_movie_owned' ? 'Movie scheduled for re-run.' : `Supplier deal signed with ${rival?.name}.`);
                    }} testID={`cin-mgr-approve-${p.id}`}>
                      <MaterialCommunityIcons name="check-bold" size={16} color={T.cardDark} />
                      <Text style={s.ownedMgrBtnT}>APPROVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.ownedMgrBtn, { backgroundColor: '#E84545' }]} onPress={() => rejectCinemaOwnedManagerProposal(p.id)} testID={`cin-mgr-reject-${p.id}`}>
                      <MaterialCommunityIcons name="close-thick" size={16} color={T.text} />
                      <Text style={[s.ownedMgrBtnT, { color: T.text }]}>DISMISS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  tabbar: { flexDirection: 'row', backgroundColor: T.cardDark, borderBottomWidth: 2, borderColor: T.border },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, position: 'relative' },
  tabBtnActive: { backgroundColor: T.cyan },
  tabTxt: { color: T.textDim, fontWeight: '900', fontSize: 11, letterSpacing: 0.3 },
  tabBadge: { position: 'absolute', top: 4, right: 8, backgroundColor: T.red, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  tabBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 12, borderRadius: 10, gap: 10, borderWidth: 2, borderColor: T.cyan },
  introTxt: { color: T.text, fontSize: 12, flex: 1 },
  empty: { color: T.textDim, fontStyle: 'italic', textAlign: 'center', padding: 20 },

  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border },
  modeBtnTxt: { color: T.text, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  dealCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.green },
  chainRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 2, borderColor: T.border },
  chainName: { color: T.text, fontWeight: '800', fontSize: 14 },
  chainSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  regionBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.yellow, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginBottom: 6, borderWidth: 2, borderColor: T.border, gap: 6 },
  regionLbl: { color: T.cardDark, fontWeight: '900', fontSize: 13, letterSpacing: 1.5, flex: 1 },
  regionMeta: { color: T.cardDark, fontWeight: '800', fontSize: 11, opacity: 0.85 },

  refreshBtn: { flexDirection: 'row', backgroundColor: T.yellow, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 12, borderWidth: 2, borderColor: T.border },
  refreshTxt: { color: T.cardDark, fontWeight: '900', letterSpacing: 1 },
  proposalCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.yellow },
  proposalRegion: { color: T.cyan, fontWeight: '700', fontSize: 11 },
  actionBtn: { flex: 1, flexDirection: 'row', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 2, borderColor: T.border },
  actionBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  bulkBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginVertical: 10, borderWidth: 2, borderColor: T.green },
  bulkBarTxt: { color: T.green, fontWeight: '900', fontSize: 13 },

  buildBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: T.green, marginVertical: 8 },
  buildHeader: { color: T.textDim, fontSize: 11, fontStyle: 'italic', marginBottom: 8 },
  specRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  specCol: { alignItems: 'center', flex: 1 },
  specLbl: { color: T.cyan, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
  specVal: { color: T.text, fontWeight: '900', fontSize: 14 },
  specOpex: { color: T.textDim, fontSize: 9, marginTop: 2 },
  buildRegionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderColor: T.border },
  buildRegionLbl: { color: T.text, fontWeight: '700', fontSize: 12, flex: 1 },
  buildInp: { width: 44, height: 36, backgroundColor: T.bg, color: T.text, borderRadius: 6, borderWidth: 1, borderColor: T.border, textAlign: 'center', fontWeight: '900', fontSize: 14 },
  buildSummary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginTop: 6, borderTopWidth: 2, borderColor: T.border },
  buildSummaryTxt: { color: T.text, fontWeight: '900', fontSize: 14 },

  ownedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 2, borderColor: T.green },
  // V44 — Compact grouped view styles
  groupCard: { backgroundColor: T.cardDark, borderRadius: 8, marginBottom: 6, borderWidth: 2, borderColor: T.green, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  groupBody: { borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.card, padding: 8, gap: 4 },
  ownedRowCompact: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: T.border },
  compactName: { color: T.text, fontWeight: '800', fontSize: 12 },
  nowPlayingTxt: { color: T.cyan, fontWeight: '700', fontSize: 11, marginTop: 2 },
  scheduledTxt: { color: T.magenta, fontWeight: '700', fontSize: 11, marginTop: 2 },
  lifeTxt: { color: T.yellow, fontWeight: '700', fontSize: 10, marginTop: 2 },
  mktRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  mktLbl: { color: T.textDim, fontSize: 10, fontWeight: '700', marginRight: 2 },
  mktChip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 10, backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.border },
  mktChipTxt: { color: T.text, fontSize: 10, fontWeight: '700' },
  amRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  amChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 3, borderWidth: 1, borderColor: T.border },
  amTxt: { color: T.text, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  amenityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 2, borderColor: T.border },
  amenityBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6, borderWidth: 2, borderColor: T.border },
  amenityBtnTxt: { fontWeight: '900', fontSize: 11, letterSpacing: 0.3 },
  pnlBox: { backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 2, borderColor: T.border },
  pnlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  pnlLbl: { color: T.textDim, fontSize: 12, fontWeight: '700' },
  pnlVal: { fontWeight: '900', fontSize: 13 },
  schedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 8, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: T.border },

  licenseBtn: { flexDirection: 'row', backgroundColor: T.cyan, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 8, borderWidth: 2, borderColor: T.border },
  licenseBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  calMovieCard: { backgroundColor: T.cardDark, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.border },
  movieIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  smallBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: T.border },
  smallBtnTxt: { fontWeight: '900', fontSize: 11 },
  calSchedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  calSchedTxt: { color: T.magenta, fontWeight: '700', fontSize: 12 },
  preLicBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginTop: 14, borderWidth: 2, borderColor: T.orange },
  preLicTitle: { color: T.orange, fontWeight: '900', fontSize: 13, marginBottom: 4 },
  preLicTxt: { color: T.textDim, fontSize: 11, lineHeight: 16 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#4d5058', padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 3, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  modalSub: { color: T.cyan, fontSize: 13, fontWeight: '700', marginTop: 4 },
  fieldLbl: { color: T.yellow, marginTop: 12, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  yearsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  yearChip: { backgroundColor: T.cardDark, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: T.border },
  yearTxt: { color: T.text, fontWeight: '900' },
  inp: { backgroundColor: T.cardDark, color: T.text, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginTop: 6, fontSize: 16, fontWeight: '800' },
  modalHint: { color: T.textDim, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  subFieldLbl: { color: T.text, fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  custChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  custChip: { backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: T.border },
  custChipTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  statusBox: { padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 2 },
  statusTxt: { fontWeight: '900', fontSize: 13, textAlign: 'center' },
  counterBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginTop: 10, borderWidth: 2, borderColor: T.yellow },
  counterTitle: { color: T.yellow, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  counterTxt: { color: T.text, fontWeight: '700', fontSize: 13, marginTop: 4 },
  counterBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 2, borderColor: T.border },
  counterBtnTxt: { fontWeight: '900', fontSize: 12 },
  signBtn: { flexDirection: 'row', backgroundColor: T.green, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6, borderWidth: 2, borderColor: T.border },
  signTxt: { color: T.cardDark, fontWeight: '900' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: T.textDim, fontWeight: '700' },

  // Mass operations bar & modals
  massBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, backgroundColor: T.cardDark, padding: 8, borderRadius: 8, borderWidth: 2, borderColor: T.magenta, marginBottom: 6 },
  massQuickBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.cyan },
  massQuickTxt: { color: T.cyan, fontWeight: '900', fontSize: 11 },
  massActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: T.yellow },
  massActionTxt: { color: T.cardDark, fontWeight: '900', fontSize: 11 },
  massCheck: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: T.magenta, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  amenityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 10, borderRadius: 8, marginVertical: 4, borderWidth: 2, borderColor: T.border },
  amenityLbl: { fontWeight: '900', fontSize: 13 },
  amenitySub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  quoteBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 2, borderColor: T.green },
  quoteLbl: { color: T.green, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  quoteVal: { color: T.text, fontWeight: '900', fontSize: 22, marginTop: 4 },
  quoteSub: { color: T.textDim, fontSize: 11, marginTop: 4 },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, borderWidth: 2, borderColor: T.border, backgroundColor: T.cardDark },
  modeChipTxt: { color: T.text, fontWeight: '900', fontSize: 12 },
  qtyPreset: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: T.border, backgroundColor: T.cardDark },
  qtyPresetTxt: { color: T.text, fontWeight: '900', fontSize: 11 },

  supplierBar: { backgroundColor: T.cardDark, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: T.magenta, marginBottom: 8 },
  supplierLbl: { color: T.magenta, fontWeight: '900', fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  supplierRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 8, borderRadius: 6, marginBottom: 4, borderWidth: 1, borderColor: T.border },
  supplierName: { color: T.text, fontWeight: '900', fontSize: 13 },
  supplierSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  // V39 — Cinema Owner Manager banner + modal
  ownedMgrBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: T.yellow },
  ownedMgrBannerT: { color: T.yellow, fontWeight: '900', fontSize: 13, flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.cardDark, justifyContent: 'space-between' },
  modalHeaderTitle: { color: T.text, fontWeight: '900', fontSize: 16 },
  ownedMgrCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  ownedMgrCardKind: { color: T.text, fontWeight: '900', fontSize: 14 },
  ownedMgrRationale: { color: T.text, fontSize: 12, marginTop: 8, lineHeight: 17 },
  ownedMgrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 6 },
  ownedMgrBtnT: { color: T.cardDark, fontWeight: '900', fontSize: 12 },
  ownedDirPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  ownedDirPillT: { color: T.cardDark, fontWeight: '900', fontSize: 9, letterSpacing: 0.4 },
  ownedMgrBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: T.yellow },
  ownedMgrBannerT: { color: T.yellow, fontWeight: '900', fontSize: 13, flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.cardDark, justifyContent: 'space-between' },
  modalHeaderTitle: { color: T.text, fontWeight: '900', fontSize: 16 },
});
