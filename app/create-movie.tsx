import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { useMovieDraft } from '../src/game/draft';
import { T } from '../src/ui/theme';
import { TopBar, Avatar, IconTile } from '../src/ui/components';
import { GENRES, PLOT_ARCS, RATINGS, COLOR_HEX, dealTerms, holidayFor, computeChemistryBonus, contractTerms, monthOf, WEEKS_PER_YEAR, TV_NETWORKS_SEED, GENRE_ICON } from '../src/game/data';
import { calculateAcceptance, talentAvailability } from '../src/game/sim';
import { Brand, Genre, MovieType, PlotArc, Rating, ColorTrait, ReleaseStrategy, TVReleaseStrategy, HybridPriority, Franchise } from '../src/game/types';
import { uiAlert } from '../src/ui/ui-alert';

// In-place helper
function seasonProductionWeeks(episodes: number): number {
  return Math.max(18, Math.round(12 + episodes * 1.5));
}

export default function CreateMovie() {
  const router = useRouter();
  const rawPath = usePathname();
  const params = useLocalSearchParams<{ brand?: string; franchiseId?: string; parentId?: string; crossover?: string; reset?: string }>();
  
  const { state, createMovie, createTVSeries, addSeriesToChannels } = useGame();
  const { draft, setDraft, resetDraft, initFromParams } = useMovieDraft();

  const [crossoverDiscountFactor, setCrossoverDiscountFactor] = useState(1.0);
  const [negotiatingCrossover, setNegotiatingCrossover] = useState(false);
  const [crossoverPitch, setCrossoverPitch] = useState<'lowball' | 'fair' | 'generous'>('fair');
  const [negFeedback, setNegFeedback] = useState<string | null>(null);
  const [negSuccess, setNegSuccess] = useState<boolean | null>(null);

  useEffect(() => {
    setCrossoverDiscountFactor(1.0);
    setNegFeedback(null);
    setNegSuccess(null);
  }, [draft.crossoverIds]);

  const projectType = draft.projectType || 'movie';
  const setProjectType = (type: 'movie' | 'series') => setDraft({ projectType: type });

  // TV Series specific getters and setters bound directly to MovieDraft Context
  const seriesTitle = draft.customTitle;
  const setSeriesTitle = (v: string) => setDraft({ customTitle: v });

  const seriesBrand = (draft.brand.toLowerCase() === 'crossover' ? 'original' : draft.brand.toLowerCase()) as 'original' | 'sequel' | 'prequel' | 'spinoff';
  const setSeriesBrand = (v: 'original' | 'sequel' | 'prequel' | 'spinoff') => {
    const map: Record<typeof v, Brand> = {
      original: 'Original',
      sequel: 'Sequel',
      prequel: 'Prequel',
      spinoff: 'Spinoff',
    };
    setDraft({ brand: map[v] });
  };

  const seriesFranchiseId = draft.franchiseId || null;
  const setSeriesFranchiseId = (v: string | null) => setDraft({ franchiseId: v || undefined });

  const seriesSeasons = String(draft.seriesSeasons);
  const setSeriesSeasons = (v: string) => setDraft({ seriesSeasons: parseInt(v, 10) || 1 });

  const seriesEpisodes = String(draft.seriesEpisodes);
  const setSeriesEpisodes = (v: string) => setDraft({ seriesEpisodes: parseInt(v, 10) || 10 });

  const seriesBudgetM = String(draft.seriesBudgetM);
  const setSeriesBudgetM = (v: string) => setDraft({ seriesBudgetM: parseFloat(v) || 0 });

  const seriesStrategy = draft.seriesStrategy;
  const setSeriesStrategy = (v: TVReleaseStrategy) => setDraft({ seriesStrategy: v });

  const seriesStreamSvcIds = draft.seriesStreamSvcIds || [];
  const setSeriesStreamSvcIds = (v: string[] | ((prev: string[]) => string[])) => {
    const next = typeof v === 'function' ? v(draft.seriesStreamSvcIds || []) : v;
    setDraft({ seriesStreamSvcIds: next });
  };

  const seriesStreamTiers = draft.seriesStreamTiers || [];
  const setSeriesStreamTiers = (v: string[] | ((prev: string[]) => string[])) => {
    const next = typeof v === 'function' ? v(draft.seriesStreamTiers || []) : v;
    setDraft({ seriesStreamTiers: next });
  };

  const seriesHybridWindow = draft.seriesHybridWindow || 4;
  const setSeriesWindow = (v: number) => setDraft({ seriesHybridWindow: v });

  const seriesHybridPriority = draft.seriesHybridPriority || 'tv_first';
  const setSeriesPriority = (v: HybridPriority) => setDraft({ seriesHybridPriority: v });

  const seriesNetworkIds = draft.seriesNetworkIds || [];
  const setSeriesNetworkIds = (v: string[] | ((prev: string[]) => string[])) => {
    const next = typeof v === 'function' ? v(draft.seriesNetworkIds || []) : v;
    setDraft({ seriesNetworkIds: next });
  };

  const seriesPackIds = draft.seriesPackIds || [];
  const setSeriesPackIds = (v: string[] | ((prev: string[]) => string[])) => {
    const next = typeof v === 'function' ? v(draft.seriesPackIds || []) : v;
    setDraft({ seriesPackIds: next });
  };

  const seriesWriterId = draft.writerId || null;
  const setSeriesWriterId = (v: string | null) => setDraft({ writerId: v || undefined });

  const seriesDirectorId = draft.directorId || null;
  const setSeriesDirectorId = (v: string | null) => setDraft({ directorId: v || undefined });

  const seriesCastIds = draft.cast.filter(c => c.talentId).map(c => ({
    talentId: c.talentId!,
    role: c.role as 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress'
  }));

  // Initialize draft ONCE when entering the screen
  const [paramsLoaded, setParamsLoaded] = useState(false);

  useEffect(() => {
    if (paramsLoaded) return;
    
    // If the draft is already active and we don't have explicit reset/brand params,
    // do not re-initialize (we are returning from talent selection)
    const isReset = params.reset === '1' || !!params.brand || !!params.franchiseId || !draft.active;
    if (!isReset) {
      setParamsLoaded(true);
      return;
    }
    
    // Consume the params just once
    const pBrand = params.brand || '';
    const bOption = pBrand.toUpperCase() === 'ORIGINAL' ? 'Original' :
                   pBrand.toUpperCase() === 'SEQUEL' ? 'Sequel' :
                   pBrand.toUpperCase() === 'PREQUEL' ? 'Prequel' :
                   pBrand.toUpperCase() === 'SPINOFF' ? 'Spinoff' :
                   pBrand.toUpperCase() === 'CROSSOVER' ? 'Crossover' : 'Original';

    initFromParams({
      brand: bOption as Brand,
      franchiseId: params.franchiseId || undefined,
      parentMovieId: params.parentId || undefined,
      crossoverIds: params.crossover ? [params.crossover as string] : [],
      projectType: rawPath && rawPath.includes('create-series') ? 'series' : 'movie',
    });
    setParamsLoaded(true);
  }, [params, rawPath, paramsLoaded, draft.active, initFromParams]);

  const updateCastSlot = (idx: number, fields: Partial<(typeof draft.cast)[0]>) => {
    const nextCast = [...draft.cast];
    nextCast[idx] = { ...nextCast[idx], ...fields };
    setDraft({ cast: nextCast });
  };

  if (!state) return null;

  // TV calculations
  const playerFranchises = state.franchises.filter(f => f.studioId === state.player.id);
  const playerSvcs = (state.streamingServices || []).filter(sv => sv.studioId === state.player.id);
  const allNetworks = state.tvNetworks && state.tvNetworks.length > 0 ? state.tvNetworks : TV_NETWORKS_SEED;
  const playerChannels = allNetworks.filter(n => (n as any).ownerStudioId === state.player.id);
  const playerPacks = (state.channelPacks || []).filter(p => p.ownerStudioId === state.player.id);
  const targetSvc = playerSvcs.find(sv => sv.id === seriesStreamSvcIds[0]);

  const seasonsNum = parseInt(seriesSeasons, 10) || 1;
  const episodesNum = parseInt(seriesEpisodes, 10) || 10;
  const budgetNum = parseFloat(seriesBudgetM) || 50;
  const seriesTotalCostB = (budgetNum * seasonsNum) / 1000;
  const seriesCastSalaryM = seriesCastIds.reduce((sum, c) => {
    const t = state.talents.find(tt => tt.id === c.talentId);
    return sum + (t ? t.salary * 0.6 : 0);
  }, 0);

  const pickedSeriesWriter = state.talents.find(t => t.id === seriesWriterId);
  const pickedSeriesDirector = state.talents.find(t => t.id === seriesDirectorId);

  const availableTalentsList = (kind: 'writer' | 'director' | 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress') => {
    const wanted = kind === 'writer' ? 'writer' : kind === 'director' ? 'director' : kind.endsWith('actress') ? 'actress' : 'actor';
    return state.talents.filter(t => {
      if (t.role !== wanted) return false;
      if (t.retired) return false;
      const av = talentAvailability(t, state.week, state.year);
      if (!av.available) return false;
      if (seriesWriterId === t.id || seriesDirectorId === t.id) return false;
      if (seriesCastIds.some(c => c.talentId === t.id)) return false;
      return true;
    }).sort((a, b) => (b.fame + b.skill) - (a.fame + a.skill));
  };

  // Movie calculations
  const writer = state.talents.find(t => t.id === draft.writerId);
  const director = state.talents.find(t => t.id === draft.directorId);
  const castFilled = draft.cast.filter(c => c.talentId);
  const allCastTalents = castFilled.map(c => state.talents.find(t => t.id === c.talentId)!).filter(Boolean);

  const castDealSums = castFilled.reduce((acc, c) => {
    const t = state.talents.find(tt => tt.id === c.talentId);
    if (!t) return acc;
    const dt = dealTerms(t.salary, c.dealType);
    return acc + dt.salary * contractTerms(c.contractKind).multiplier;
  }, 0);
  const totalSalaries = (writer?.salary || 0) + (director?.salary || 0) + castDealSums;
  const productionCost = +(totalSalaries * (draft.runtime / 120) + 8).toFixed(2);

  let crossoverFee = 0;
  const crossoverBreakdown: { name: string; ownerName: string; fee: number }[] = [];
  if (draft.brand === 'Crossover' && draft.crossoverIds.length) {
    for (const fid of draft.crossoverIds) {
      const fr = state.franchises.find(f => f.id === fid);
      if (!fr) continue;
      if (fr.studioId === state.player.id) continue;
      const owner = state.rivals.find(r => r.id === fr.studioId);
      const rating = owner?.rating || 3;
      const popMult = 0.5 + (fr.popularity / 100) * 1.8;
      const ratingMult = 0.7 + (rating - 1) * 0.18;
      const depthMult = 1 + Math.min(0.6, (fr.movieIds.length || 1) * 0.05);
      const fee = +(25 * popMult * ratingMult * depthMult).toFixed(1);
      crossoverFee += fee;
      crossoverBreakdown.push({ name: fr.name, ownerName: owner?.name || '?', fee });
    }
  }
  const totalCost = +(productionCost + draft.marketing + crossoverFee).toFixed(2);

  const chemColors = [writer?.colorTrait, director?.colorTrait, ...allCastTalents.map(t => t.colorTrait)].filter(Boolean) as ColorTrait[];
  const chemBonus = computeChemistryBonus(chemColors);
  const chemPct = Math.round(chemBonus * 100);

  const filmingWeeks = Math.max(2, Math.round(draft.runtime / 30) + 2);
  let effW = state.week + filmingWeeks; let effY = state.year;
  while (effW > WEEKS_PER_YEAR) { effW -= WEEKS_PER_YEAR; effY += 1; }
  if (draft.targetWeek && draft.targetYear) {
    const tgtTotalWeeks = (draft.targetYear - state.year) * WEEKS_PER_YEAR + draft.targetWeek;
    const earliestTotal = state.week + filmingWeeks;
    if (tgtTotalWeeks >= earliestTotal) { effW = draft.targetWeek; effY = draft.targetYear; }
  }
  const releaseHol = holidayFor(effW);

  const franchise = state.franchises.find(f => f.id === draft.franchiseId);
  const playerServices = (state.streamingServices || []).filter(s => s.studioId === state.player.id);
  const targetService = playerServices.find(s => s.id === draft.streamingTargetServiceId);

  // Submissions
  const submitMovie = () => {
    if (!draft.writerId || !draft.directorId) { uiAlert('Missing crew', 'Pick a writer and director.'); return; }
    if (castFilled.length < 2) { uiAlert('Missing cast', 'Pick at least 2 cast members.'); return; }
    if (draft.brand !== 'Original' && !draft.franchiseId) { uiAlert('Missing franchise', 'Choose a franchise for sequels/spinoffs.'); return; }
    if (draft.releaseStrategy === 'streaming' && !draft.streamingTargetServiceId) {
      uiAlert('Streaming target required', 'Pick which streaming service hosts the exclusive release.'); return;
    }
    if (draft.releaseStrategy === 'hybrid' && !draft.streamingTargetServiceId) {
      uiAlert('Streaming target required', 'Pick which streaming service receives the hybrid release after the window.'); return;
    }
    if (draft.releaseStrategy === 'tv' && !draft.tvNetworkId) {
      uiAlert('TV Network required', 'Pick which TV network broadcasts the exclusive premiere.'); return;
    }

    // Validate cast acceptance
    for (const slot of draft.cast) {
      if (slot.talentId) {
        const tal = state.talents.find(t => t.id === slot.talentId);
        if (tal) {
          const isMine = tal.underContract?.studioId === state.player.id;
          if (isMine) continue; // Signed directly to us, they won't reject!
          const isLead = slot.role.startsWith('lead_');
          const expectationMultiplier = isLead ? 1.0 : 0.5;
          const dt = dealTerms(tal.salary, slot.dealType);
          const numM = slot.contractKind === 'pack3' ? 3 : slot.contractKind === 'hold5y' ? 3 : 1;
          const expect = calculateAcceptance(tal, numM, dt.salary, dt.boPercent, expectationMultiplier);
          if (expect.verdict === 'will_reject') {
            uiAlert('Talent Rejection', `${tal.name} refuses to sign for this movie. Please negotiate or replace them.`);
            return;
          }
        }
      }
    }

    const result = createMovie(state, {
      title: draft.customTitle || undefined,
      franchiseName: draft.customFranchiseName || undefined,
      type: draft.type, genre: draft.genre, plotArc: draft.arc, rating: draft.rating, runtime: draft.runtime, brand: draft.brand,
      franchiseId: draft.franchiseId, parentMovieId: draft.parentMovieId,
      crossoverFranchiseIds: draft.crossoverIds.length ? draft.crossoverIds : undefined,
      externalIPLicenseId: draft.externalIPLicenseId,
      crossoverDiscountFactor: draft.brand === 'Crossover' ? crossoverDiscountFactor : undefined,
      writerId: draft.writerId, directorId: draft.directorId,
      cast: castFilled.map((c, idx) => {
        const slotIdx = draft.cast.findIndex(cc => cc.talentId === c.talentId && cc.role === c.role);
        return {
          talentId: c.talentId!,
          role: c.role,
          dealType: c.dealType,
          contractKind: c.contractKind,
          roleName: draft.castRoleNames[slotIdx >= 0 ? slotIdx : idx],
          roleDescription: draft.castDescriptions[slotIdx >= 0 ? slotIdx : idx],
        };
      }),
      marketingBudget: draft.marketing,
      releaseStrategy: draft.releaseStrategy,
      streamingTargetServiceId: (draft.releaseStrategy === 'streaming' || draft.releaseStrategy === 'hybrid') ? draft.streamingTargetServiceId : undefined,
      streamingTargetTierIds: (draft.releaseStrategy === 'streaming' || draft.releaseStrategy === 'hybrid') ? draft.streamingTargetTierIds : undefined,
      streamingWindowWeeks: draft.releaseStrategy === 'hybrid' ? (draft.streamingWindowWeeks ?? 12) : undefined,
      tvNetworkId: draft.releaseStrategy === 'tv' ? draft.tvNetworkId : undefined,
      targetReleaseWeek: draft.targetWeek || undefined,
      targetReleaseYear: draft.targetYear || undefined,
    });
    if (result.error) { uiAlert('Cannot start', result.error); return; }
    uiAlert('Production started', `${result.movie?.title} is in production.`);
    resetDraft();
    router.replace('/dashboard');
  };

  const submitTV = () => {
    if (!seriesTitle.trim()) { uiAlert('Title required', 'Pick a title for your series.'); return; }
    if ((seriesBrand === 'sequel' || seriesBrand === 'prequel' || seriesBrand === 'spinoff') && !seriesFranchiseId) { uiAlert('Franchise required', 'Pick the parent franchise for this sequel/prequel/spinoff.'); return; }
    if (seriesStrategy === 'streaming' || seriesStrategy === 'hybrid') {
      if (seriesStreamSvcIds.length === 0) { uiAlert('Streaming target required', 'Pick at least one streaming service.'); return; }
    }
    const expandedFromPacks = playerPacks.filter(p => seriesPackIds.includes(p.id)).flatMap(p => p.channelIds);
    const allChannelIds = Array.from(new Set([...seriesNetworkIds, ...expandedFromPacks]));
    if (seriesStrategy === 'tv' || seriesStrategy === 'hybrid') {
      if (allChannelIds.length === 0) { uiAlert('TV channel required', 'Pick at least one TV channel or channel pack to air this series.'); return; }
    }

    if (!draft.writerId || !draft.directorId) { uiAlert('Missing crew', 'Pick a writer and director in the slots below.'); return; }
    if (castFilled.length < 2) { uiAlert('Missing cast', 'Pick at least 2 cast members in the slots below.'); return; }

    // Validate cast acceptance for TV Series production using selected contract/split and 60% TV discounted rate
    for (const slot of draft.cast) {
      if (slot.talentId) {
        const tal = state.talents.find(t => t.id === slot.talentId);
        if (tal) {
          const isMine = tal.underContract?.studioId === state.player.id;
          if (isMine) continue; // Signed directly to us, they won't reject!
          const isLead = slot.role.startsWith('lead_');
          const expectationMultiplier = (isLead ? 1.0 : 0.5) * 0.6;
          const dt = dealTerms(tal.salary, slot.dealType);
          const numM = slot.contractKind === 'pack3' ? 3 : slot.contractKind === 'hold5y' ? 3 : 1;
          const tvSalary = +(dt.salary * (isLead ? 1.0 : 0.5) * 0.6).toFixed(2);
          const expect = calculateAcceptance(tal, numM, tvSalary, dt.boPercent, expectationMultiplier);
          if (expect.verdict === 'will_reject') {
            uiAlert('Talent Rejection', `${tal.name} refuses to sign for this series at the proposed terms ($${tvSalary.toFixed(1)}M salary, ${dt.boPercent}% backend). Please adjust contract terms or negotiate roster deal.`);
            return;
          }
        }
      }
    }

    const r = createTVSeries({
      title: seriesTitle.trim(),
      brand: seriesBrand,
      franchiseId: seriesFranchiseId || undefined,
      seasons: seasonsNum,
      episodesPerSeason: episodesNum,
      budgetMPerSeason: budgetNum,
      releaseStrategy: seriesStrategy,
      streamingTargetServiceId: (seriesStrategy === 'streaming' || seriesStrategy === 'hybrid') ? seriesStreamSvcIds[0] || undefined : undefined,
      streamingTargetTierIds: (seriesStrategy === 'streaming' || seriesStrategy === 'hybrid') ? seriesStreamTiers : undefined,
      streamingWindowWeeks: seriesStrategy === 'hybrid' ? seriesHybridWindow : undefined,
      hybridPriority: seriesStrategy === 'hybrid' ? seriesHybridPriority : undefined,
      tvNetworkId: (seriesStrategy === 'tv' || seriesStrategy === 'hybrid') ? allChannelIds[0] || undefined : undefined,
      writerId: draft.writerId || undefined,
      directorId: draft.directorId || undefined,
      cast: castFilled.map(c => ({
        talentId: c.talentId!,
        role: c.role as 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress',
        dealType: c.dealType,
        contractKind: c.contractKind
      })),
    });
    if (r.error) { uiAlert('Cannot greenlight', r.error); return; }
    if ((seriesStrategy === 'tv' || seriesStrategy === 'hybrid') && r.seriesId && allChannelIds.length > 0) {
      addSeriesToChannels(r.seriesId, allChannelIds);
    }
    const extraSvc = seriesStreamSvcIds.length > 1 ? ` · simulcast across ${seriesStreamSvcIds.length} services` : '';
    const extraCh = allChannelIds.length > 1 ? ` · airing on ${allChannelIds.length} channels` : '';
    uiAlert('Series greenlit ✓', `${seriesTitle} is now in production. ${seasonsNum} season${seasonsNum !== 1 ? 's' : ''}${extraSvc}${extraCh}.`);
    resetDraft();
    router.replace('/series');
  };

  const pickWriter = () => router.push({ pathname: '/talent', params: { selectMode: 'writer', genre: draft.genre } });
  const pickDirector = () => router.push({ pathname: '/talent', params: { selectMode: 'director', genre: draft.genre } });
  const pickCast = (idx: number) => router.push({ pathname: '/talent', params: { selectMode: 'cast', castIdx: String(idx), genre: draft.genre } });

  const toggleStreamingTier = (tierId: string) => {
    const cur = draft.streamingTargetTierIds || [];
    const next = cur.includes(tierId) ? cur.filter(x => x !== tierId) : [...cur, tierId];
    setDraft({ streamingTargetTierIds: next });
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Production Studio" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Unified Project Type Selector */}
        <View style={s.projectTypeContainer}>
          <TouchableOpacity
            style={[s.projectTypeBtn, projectType === 'movie' && s.projectTypeBtnActive]}
            onPress={() => setProjectType('movie')}
            testID="toggle-project-movie"
          >
            <MaterialCommunityIcons name="movie-roll" size={18} color={projectType === 'movie' ? T.cardDark : T.text} />
            <Text style={[s.projectTypeBtnT, projectType === 'movie' && s.projectTypeBtnTActive]}>🎥 Feature Film</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.projectTypeBtn, projectType === 'series' && s.projectTypeBtnActive]}
            onPress={() => setProjectType('series')}
            testID="toggle-project-series"
          >
            <MaterialCommunityIcons name="television-classic" size={18} color={projectType === 'series' ? T.cardDark : T.text} />
            <Text style={[s.projectTypeBtnT, projectType === 'series' && s.projectTypeBtnTActive]}>📺 TV Series</Text>
          </TouchableOpacity>
        </View>

        {projectType === 'movie' ? (
          // ================= MOVIE CREATOR UI =================
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
            <View style={s.brandPill}>
              <MaterialCommunityIcons name={draft.brand === 'Original' ? 'lightbulb-on' : 'star-circle'} color={T.green} size={18} />
              <Text style={s.brandTxt}>{draft.brand}{franchise ? ` · ${franchise.name}` : ''}</Text>
            </View>

            <Text style={s.section}>Movie Brand</Text>
            <View style={s.brandRow}>
              {(['Original', 'Sequel', 'Prequel', 'Spinoff', 'Crossover'] as Brand[]).map(b => (
                <TouchableOpacity key={b} onPress={() => {
                  setDraft({ brand: b });
                  if (b === 'Original') {
                    setDraft({ franchiseId: undefined, parentMovieId: undefined, crossoverIds: [] });
                  }
                }}
                  style={[s.brandChip, draft.brand === b && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                  testID={`brand-${b}`}>
                  <Text style={[s.brandChipT, draft.brand === b && { color: T.cardDark }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Parent Franchise selection for Sequels, Prequels, Spinoffs */}
            {['Sequel', 'Prequel', 'Spinoff'].includes(draft.brand) ? (() => {
              const myFranchises = state.franchises.filter(f => f.studioId === state.player.id);
              return (
                <View style={[s.summary, { borderColor: T.cyan, marginTop: 10, marginBottom: 10 }]}>
                  <Text style={[s.section, { color: T.cyan, paddingHorizontal: 0, marginTop: 0 }]}>
                    Select Parent Franchise
                  </Text>
                  {myFranchises.length === 0 ? (
                    <Text style={[s.sumLabel, { color: T.orange, fontSize: 12 }]}>
                      You don't own any franchises yet. Create an "Original" movie first.
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                      {myFranchises.map(fr => {
                        const isSel = draft.franchiseId === fr.id;
                        return (
                          <TouchableOpacity key={fr.id}
                            style={[s.chip, isSel && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                            onPress={() => {
                              const frMovies = state.movies.filter(m => m.franchiseId === fr.id && m.studioId === state.player.id && m.status === 'released');
                              const parentId = frMovies.length ? frMovies[frMovies.length - 1].id : undefined;
                              setDraft({ franchiseId: fr.id, parentMovieId: parentId });
                            }}
                            testID={`pick-movie-fr-${fr.id}`}
                          >
                            <Text style={[s.chipT, isSel && { color: T.cardDark }]}>{fr.name} · pop {fr.popularity}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })() : null}

            {/* Base Franchise selection for Crossovers */}
            {draft.brand === 'Crossover' ? (() => {
              const myFranchises = state.franchises.filter(f => f.studioId === state.player.id);
              const incomingCrossoverFr = (draft.crossoverIds || []).map(cid => state.franchises.find(f => f.id === cid)).filter(Boolean);
              return (
                <View style={[s.summary, { borderColor: T.magenta, marginTop: 10, marginBottom: 10 }]}>
                  <Text style={[s.section, { color: T.magenta, paddingHorizontal: 0, marginTop: 0 }]}>
                    Step 1: Pick YOUR Base Franchise
                  </Text>
                  {incomingCrossoverFr.length > 0 ? (
                    <Text style={[s.sumLabel, { color: T.textDim, fontSize: 11, marginBottom: 8 }]}>
                      Crossing over WITH: {incomingCrossoverFr.map(f => f!.name).join(', ')}
                    </Text>
                  ) : null}
                  {myFranchises.length === 0 ? (
                    <Text style={[s.sumLabel, { color: T.orange, fontSize: 12 }]}>You have no franchises yet. Create an Original first, then revisit Crossover.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                      {myFranchises.map(fr => {
                        const isSel = draft.franchiseId === fr.id;
                        return (
                          <TouchableOpacity key={fr.id} style={[s.chip, isSel && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                            onPress={() => setDraft({ franchiseId: fr.id })}
                            testID={`pick-own-fr-${fr.id}`}>
                            <Text style={[s.chipT, isSel && { color: T.cardDark }]}>{fr.name} · pop {fr.popularity}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })() : null}

            <Text style={s.section}>Movie Title (optional)</Text>
            <TextInput
              value={draft.customTitle} onChangeText={(v) => setDraft({ customTitle: v })}
              placeholder={draft.brand === 'Original' ? 'Auto-generate from franchise' : `Auto: ${franchise?.name || ''} continuation`}
              placeholderTextColor={T.textMute} style={s.input} maxLength={48} testID="movie-title-input" />

            {draft.brand === 'Original' ? (
              <>
                <Text style={s.section}>New Franchise Name (optional)</Text>
                <TextInput
                  value={draft.customFranchiseName} onChangeText={(v) => setDraft({ customFranchiseName: v })}
                  placeholder="Auto-generate" placeholderTextColor={T.textMute} style={s.input} maxLength={36}
                  testID="franchise-name-input" />
              </>
            ) : null}

            <Text style={s.section}>Type</Text>
            <ChipRow items={GENRES} value={draft.type} onChange={(v) => setDraft({ type: v as MovieType })} testIDPrefix="type" />

            <Text style={s.section}>Genre</Text>
            <ChipRow items={GENRES} value={draft.genre} onChange={(v) => setDraft({ genre: v as Genre })} testIDPrefix="genre" />

            <Text style={s.section}>Plot Arc</Text>
            <ChipRow items={PLOT_ARCS as any} value={draft.arc} onChange={(v) => setDraft({ arc: v as PlotArc })} testIDPrefix="arc" />

            <Text style={s.section}>Rating</Text>
            <ChipRow items={RATINGS as any} value={draft.rating} onChange={(v) => setDraft({ rating: v as Rating })} testIDPrefix="rating" />

            <Text style={s.section}>Runtime: {draft.runtime} min</Text>
            <View style={s.btnRow}>
              {[90, 105, 120, 140, 160, 180].map(r => (
                <TouchableOpacity key={r} onPress={() => setDraft({ runtime: r })} style={[s.miniBtn, draft.runtime === r && { backgroundColor: T.cyan }]} testID={`runtime-${r}`}>
                  <Text style={[s.miniBtnT, draft.runtime === r && { color: T.cardDark }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.section}>Marketing Budget: {draft.marketing}M</Text>
            <View style={s.btnRow}>
              {[5, 15, 25, 40, 60, 100].map(r => (
                <TouchableOpacity key={r} onPress={() => setDraft({ marketing: r })} style={[s.miniBtn, draft.marketing === r && { backgroundColor: T.green }]} testID={`marketing-${r}`}>
                  <Text style={[s.miniBtnT, draft.marketing === r && { color: T.cardDark }]}>{r}M</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(() => {
              const myActiveIPs = (state.ownedIPLicenses || []).filter(l => l.studioId === state.player.id && l.packsUsed < l.packs && (l.expiresYear * 100 + l.expiresWeek) >= (state.year * 100 + state.week));
              if (myActiveIPs.length === 0) return null;
              const selected = draft.externalIPLicenseId ? myActiveIPs.find(l => l.id === draft.externalIPLicenseId) : null;
              const selectedIP = selected ? state.externalIPs?.find(i => i.id === selected.ipId) : null;
              return (
                <>
                  <Text style={s.section}>External IP Attach (boost popularity & BO)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                    <TouchableOpacity
                      onPress={() => setDraft({ externalIPLicenseId: undefined })}
                      style={[s.chip, !draft.externalIPLicenseId && { backgroundColor: T.card, borderColor: T.cyan }]}
                      testID="ip-none"
                    >
                      <Text style={[s.chipT, !draft.externalIPLicenseId && { color: T.cyan }]}>No IP</Text>
                    </TouchableOpacity>
                    {myActiveIPs.map(lic => {
                      const ip = state.externalIPs?.find(i => i.id === lic.ipId);
                      if (!ip) return null;
                      const active = draft.externalIPLicenseId === lic.id;
                      const remainingPacks = lic.packs - lic.packsUsed;
                      return (
                        <TouchableOpacity
                          key={lic.id}
                          onPress={() => setDraft({ externalIPLicenseId: lic.id })}
                          style={[s.chip, active && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                          testID={`ip-${lic.id}`}
                        >
                          <Text style={[s.chipT, active && { color: T.cardDark }]}>{ip.name} · pop {ip.popularity} · {remainingPacks} pack{remainingPacks !== 1 ? 's' : ''}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {selectedIP && selected ? (
                    <View style={[s.summary, { marginTop: 6, marginBottom: 0, borderColor: T.magenta }]}>
                      <Text style={[s.sumLabel, { color: T.magenta, fontWeight: '900' }]}>📚 {selectedIP.name} attached</Text>
                      <Text style={[s.sumLabel, { fontSize: 11, color: T.textDim }]}>BO Royalty {selected.boPercent}% · Merch {selected.merchPercent}% · Expires W{selected.expiresWeek}/Y{selected.expiresYear}</Text>
                      <Text style={[s.sumLabel, { fontSize: 11, color: T.textDim }]}>Will consume 1 of {selected.packs - selected.packsUsed} remaining packs.</Text>
                    </View>
                  ) : null}
                </>
              );
            })()}

            {draft.brand === 'Crossover' ? (() => {
              if (!draft.franchiseId) {
                return (
                  <View style={[s.summary, { borderColor: T.magenta, marginTop: 10, marginBottom: 10, borderStyle: 'dashed' }]}>
                    <Text style={{ color: T.magenta, fontWeight: '900', fontSize: 13, marginBottom: 4 }}>
                      🤝 Crossover Franchise Integration
                    </Text>
                    <Text style={{ color: T.text, fontSize: 12 }}>
                      ⚠️ Pick <Text style={{ color: T.cyan, fontWeight: '700' }}>YOUR Base Franchise</Text> first (see Step 1 above) so we can negotiate a matching crossover contract!
                    </Text>
                  </View>
                );
              }
              const otherRivalFranchises = state.franchises.filter(f =>
                f.id !== draft.franchiseId &&
                f.studioId !== state.player.id &&
                f.movieIds.length >= 2
              ).sort((a, b) => b.popularity - a.popularity).slice(0, 30);
              if (otherRivalFranchises.length === 0) {
                return (
                  <>
                    <Text style={s.section}>Crossover Partners</Text>
                    <Text style={s.subLabel}>No suitable rival franchises with 2+ movies found for crossover.</Text>
                  </>
                );
              }
              return (
                <>
                  <Text style={s.section}>Crossover Partners (multi-select)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                    {otherRivalFranchises.map(rf => {
                      const active = draft.crossoverIds.includes(rf.id);
                      return (
                        <TouchableOpacity key={rf.id}
                          onPress={() => {
                            const next = active ? draft.crossoverIds.filter(id => id !== rf.id) : [...draft.crossoverIds, rf.id];
                            setDraft({ crossoverIds: next });
                          }}
                          style={[s.chip, active && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                          testID={`crossover-${rf.id}`}
                        >
                          <Text style={[s.chipT, active && { color: T.cardDark }]}>{rf.name} (Rival)</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* CROSSOVER NEGOTIATION WIDGET */}
                  {draft.crossoverIds.length > 0 ? (() => {
                    let grossFee = 0;
                    draft.crossoverIds.forEach(cid => {
                      const fr = state.franchises.find(f => f.id === cid);
                      if (!fr) return;
                      const owner = state.rivals.find(r => r.id === fr.studioId);
                      const rating = owner?.rating || 3;
                      const popMult = 0.5 + (fr.popularity / 100) * 1.8;
                      const ratingMult = 0.7 + (rating - 1) * 0.18;
                      const depthMult = 1 + Math.min(0.6, (fr.movieIds.length || 1) * 0.05);
                      const fee = +(25 * popMult * ratingMult * depthMult).toFixed(1);
                      grossFee += fee;
                    });

                    const discountedFee = +(grossFee * crossoverDiscountFactor).toFixed(1);

                    return (
                      <View style={[s.summary, { borderColor: T.magenta, marginTop: 10, marginBottom: 10 }]}>
                        <Text style={[s.sumLabel, { color: T.magenta, fontWeight: '900', fontSize: 13, marginBottom: 4 }]}>
                          🤝 Crossover Licensing Fee Negotiation
                        </Text>
                        <Text style={[s.sumLabel, { color: T.text, fontSize: 12 }]}>
                          Ask Price: <Text style={{ textDecorationLine: crossoverDiscountFactor !== 1.0 ? 'line-through' : 'none', color: crossoverDiscountFactor !== 1.0 ? T.textDim : T.text }}>${grossFee.toFixed(1)}M</Text>
                          {crossoverDiscountFactor !== 1.0 ? ` (New Deal: $${discountedFee.toFixed(1)}M)` : ''}
                        </Text>

                        {negFeedback ? (
                          <View style={{ backgroundColor: T.cardDark, padding: 8, borderRadius: 6, marginVertical: 6, borderWidth: 1, borderColor: negSuccess ? T.green : T.orange }}>
                            <Text style={{ color: T.text, fontSize: 11, fontStyle: 'italic' }}>{negFeedback}</Text>
                          </View>
                        ) : null}

                        {negSuccess === null ? (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[s.sumLabel, { fontSize: 10, color: T.textMute, marginBottom: 4 }]}>
                              Choose your negotiation strategy:
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                              {(['lowball', 'fair', 'generous'] as const).map(p => (
                                <TouchableOpacity key={p}
                                  onPress={() => setCrossoverPitch(p)}
                                  style={[{ flex: 1, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, alignItems: 'center' }, crossoverPitch === p ? { backgroundColor: T.magenta + '22', borderColor: T.magenta } : { backgroundColor: T.cardDark, borderColor: T.border }]}>
                                  <Text style={{ color: crossoverPitch === p ? T.magenta : T.text, fontSize: 11, fontWeight: '800' }}>
                                    {p === 'lowball' ? 'Lowball (-30%)' : p === 'fair' ? 'Fair (-15%)' : 'Generous (+10%)'}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                let success = false;
                                let msg = "";
                                let factor = 1.0;
                                if (crossoverPitch === 'lowball') {
                                  const r = Math.random();
                                  if (r < 0.3) {
                                    success = true;
                                    factor = 0.70;
                                    msg = "Unbelievable! They were desperate enough to agree to a 30% discount. 'Under protest, we accept.'";
                                  } else if (r < 0.7) {
                                    success = true;
                                    factor = 0.90;
                                    msg = "Rivals scoffed: 'No way at 30%! At most we can settle for a 10% discount ($90% of price).'";
                                  } else {
                                    success = false;
                                    factor = 1.0;
                                    msg = "Rivals refused: 'That lowball offer is an insult. We are sticking to full ask price!'";
                                  }
                                } else if (crossoverPitch === 'fair') {
                                  const r = Math.random();
                                  if (r < 0.75) {
                                    success = true;
                                    factor = 0.85;
                                    msg = "Success! They accepted the 15% discount. 'A fair price for mutual promotion, let's make a blockbuster!'";
                                  } else {
                                    success = false;
                                    factor = 1.0;
                                    msg = "Refused! 'Our IP is hot right now. We cannot discount our core franchises.'";
                                  }
                                } else {
                                  success = true;
                                  factor = 1.10;
                                  msg = "Amazing! They are overjoyed with the generous premium (+10%). They promise maximum cooperation!";
                                }
                                setNegSuccess(success);
                                setNegFeedback(msg);
                                setCrossoverDiscountFactor(factor);
                              }}
                              style={{ backgroundColor: T.magenta, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                            >
                              <Text style={{ color: T.cardDark, fontWeight: '900', fontSize: 12 }}>Propose Deal Terms & Haggle</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              setNegSuccess(null);
                              setNegFeedback(null);
                            }}
                            style={{ alignSelf: 'flex-start', marginTop: 4 }}
                          >
                            <Text style={{ color: T.cyan, fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' }}>Haggle again / Reset</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })() : null}
                </>
              );
            })() : null}

            <Text style={s.section}>Crew</Text>
            <TouchableOpacity style={s.crewBtn} onPress={pickWriter} testID="draft-select-writer">
              {writer ? <Avatar skin={writer.avatarColor} hair={writer.hairColor} hairStyle={writer.hairStyle} facialHair={writer.facialHair} size={40} /> : <MaterialCommunityIcons name="feather" size={20} color={T.cyan} />}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.crewLbl}>WRITER</Text>
                <Text style={s.crewName}>{writer ? `${writer.name} · ★${writer.fame}` : 'Tap to select writer'}</Text>
                {writer ? <Text style={s.crewSub}>Skill {writer.skill}/100 · color: {writer.colorTrait}</Text> : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.crewBtn} onPress={pickDirector} testID="draft-select-director">
              {director ? <Avatar skin={director.avatarColor} hair={director.hairColor} hairStyle={director.hairStyle} facialHair={director.facialHair} size={40} /> : <MaterialCommunityIcons name="movie-creation" size={20} color={T.cyan} />}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.crewLbl}>DIRECTOR</Text>
                <Text style={s.crewName}>{director ? `${director.name} · ★${director.fame}` : 'Tap to select director'}</Text>
                {director ? <Text style={s.crewSub}>Skill {director.skill}/100 · color: {director.colorTrait}</Text> : null}
              </View>
            </TouchableOpacity>

            <Text style={s.section}>Cast Slots</Text>
            <View style={s.castWrap}>
              {draft.cast.map((slot, idx) => {
                const tal = state.talents.find(t => t.id === slot.talentId);
                const roleLbl = slot.role.toUpperCase().replace('_', ' ');
                const textVal = draft.castRoleNames[idx] || '';
                const descVal = draft.castDescriptions[idx] || '';
                
                return (
                  <View key={`${slot.role}-${idx}`} style={{ borderBottomWidth: 1, borderBottomColor: T.border, paddingVertical: 8, gap: 4 }}>
                    <TouchableOpacity style={s.crewBtn} onPress={() => pickCast(idx)} testID={`draft-select-cast-${idx}`}>
                      {tal ? <Avatar skin={tal.avatarColor} hair={tal.hairColor} hairStyle={tal.hairStyle} facialHair={tal.facialHair} size={40} /> : <MaterialCommunityIcons name="account-plus" size={20} color={T.magenta} />}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.crewLbl}>{roleLbl}</Text>
                        <Text style={s.crewName}>{tal ? `${tal.name} · ★${tal.fame}` : 'Tap to pick actor'}</Text>
                        {tal ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={s.crewSub}>Skill {tal.skill}/100 · color: </Text>
                            <Text style={[s.colorTag, { backgroundColor: COLOR_HEX[tal.colorTrait] }]}>{tal.colorTrait}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Support vs Lead toggle */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginVertical: 4 }}>
                      <Text style={{ fontSize: 10, color: T.textMute, fontWeight: 'bold' }}>ROLE:</Text>
                      <View style={{ flexDirection: 'row', backgroundColor: T.cardDark, borderRadius: 6, padding: 2 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            const oldRole = slot.role;
                            if (oldRole.startsWith('support_')) {
                              updateCastSlot(idx, { role: oldRole.replace('support_', 'lead_') as any });
                            }
                          }}
                          style={[{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 }, slot.role.startsWith('lead_') ? { backgroundColor: T.cyan } : null]}
                        >
                          <Text style={{ fontSize: 9, color: slot.role.startsWith('lead_') ? T.cardDark : T.textMute, fontWeight: 'bold' }}>LEAD (★ AUDIENCE BOOST)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => {
                            const oldRole = slot.role;
                            if (oldRole.startsWith('lead_')) {
                              updateCastSlot(idx, { role: oldRole.replace('lead_', 'support_') as any });
                            }
                          }}
                          style={[{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 }, slot.role.startsWith('support_') ? { backgroundColor: T.magenta } : null]}
                        >
                          <Text style={{ fontSize: 9, color: slot.role.startsWith('support_') ? T.cardDark : T.textMute, fontWeight: 'bold' }}>SUPPORTING (-50% COST)</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {tal ? (
                      <>
                        <TextInput
                          value={textVal}
                          onChangeText={(v) => {
                            const next = [...draft.castRoleNames]; next[idx] = v;
                            setDraft({ castRoleNames: next });
                          }}
                          placeholder="Char Name (e.g. Neo)" placeholderTextColor={T.textMute}
                          style={s.smallInput}
                          testID={`char-name-${idx}`}
                        />
                        <TextInput
                          value={descVal}
                          onChangeText={(v) => {
                            const next = [...draft.castDescriptions]; next[idx] = v;
                            setDraft({ castDescriptions: next });
                          }}
                          placeholder="Short character description" placeholderTextColor={T.textMute}
                          style={s.smallInput}
                          maxLength={60}
                          testID={`char-desc-${idx}`}
                        />

                        {/* Inline Deal Split */}
                        <Text style={s.subFieldLbl}>Deal Split Option</Text>
                        <View style={s.custChipRow}>
                          {([
                            { k: 'studio_favored' as const, lbl: 'Studio Favured', desc: '70% Pay · 0% BO' },
                            { k: 'middle' as const, lbl: 'Standard', desc: '100% Pay · 2.5% BO' },
                            { k: 'actor_favored' as const, lbl: 'Actor Favured', desc: '140% Pay · 6% BO' }
                          ]).map(deal => {
                            const active = slot.dealType === deal.k;
                            return (
                              <TouchableOpacity key={deal.k} style={[s.custChip, active && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                                onPress={() => updateCastSlot(idx, { dealType: deal.k })}
                                testID={`movie-cast-${idx}-deal-${deal.k}`}
                              >
                                <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{deal.lbl}</Text>
                                <Text style={[s.custChipSub, { color: active ? T.cardDark : T.textMute }]}>{deal.desc}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Inline Contract Terms */}
                        <Text style={s.subFieldLbl}>Contract Term</Text>
                        <View style={s.custChipRow}>
                          {([
                            { k: 'single' as const, lbl: 'Single film', desc: 'No commit' },
                            { k: 'pack3' as const, lbl: '3-Movie Pack', desc: 'Lock + discount' },
                            { k: 'hold5y' as const, lbl: '5y Exclusive', desc: 'Future boost' }
                          ]).map(term => {
                            const active = slot.contractKind === term.k;
                            return (
                              <TouchableOpacity key={term.k} style={[s.custChip, active && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                                onPress={() => updateCastSlot(idx, { contractKind: term.k })}
                                testID={`movie-cast-${idx}-term-${term.k}`}
                              >
                                <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{term.lbl}</Text>
                                <Text style={[s.custChipSub, { color: active ? T.cardDark : T.textMute }]}>{term.desc}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Will-sign warning if normal contract expectation differs */}
                        {(() => {
                          const isLead = slot.role.startsWith('lead_');
                          const expectationMultiplier = isLead ? 1.0 : 0.5;
                          const dt = dealTerms(tal.salary, slot.dealType);
                          const numM = slot.contractKind === 'pack3' ? 3 : slot.contractKind === 'hold5y' ? 3 : 1;
                          const expect = calculateAcceptance(tal, numM, dt.salary, dt.boPercent, expectationMultiplier);
                          const willSign = expect.verdict === 'will_accept' || expect.verdict === 'likely_accept';
                          const dtColor = willSign ? T.green : expect.verdict === 'considering' ? T.yellow : T.orange;
                          const dtText = willSign ? '✓ Contract signed' : expect.verdict === 'considering' ? `🤝 Considering contract · ${expect.reason}` : `✗ Will walk! ${expect.reason}`;
                          return (
                            <View style={[s.acceptChip, { borderColor: dtColor, backgroundColor: dtColor + '22' }]}>
                              <Text style={[s.acceptT, { color: dtColor }]} testID={`movie-cast-${idx}-accept`}>{dtText}</Text>
                              {!willSign ? (
                                <TouchableOpacity style={s.negotiateBtn} onPress={() => router.push({ pathname: '/negotiate/[talentId]', params: { talentId: tal.id } })}>
                                  <Text style={s.negotiateBtnT}>🤝 Open Full Negotiation →</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          );
                        })()}
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {chemColors.length >= 2 ? (
              <View style={s.chemRow}>
                <View style={s.chemDots}>
                  {chemColors.map((cc, ci) => <View key={`mchem-${ci}`} style={[s.chemDot, { backgroundColor: COLOR_HEX[cc] }]} />)}
                </View>
                <Text style={[s.chemTxt, { color: chemPct > 0 ? T.green : T.textDim }]}>Cast Chemistry: +{chemPct}%</Text>
              </View>
            ) : null}

            <Text style={s.section}>Release Strategy</Text>
            <View style={s.strategyRow}>
              {([
                { k: 'theatrical', label: 'THEATERS', desc: 'Sells tickets at cinema chains. Maximizes gross profit.' },
                { k: 'streaming', label: 'STREAMING', desc: 'Direct-to-streaming on your service. Drives subscribers.' },
                { k: 'hybrid', label: 'HYBRID', desc: 'In theaters first, then drops to streaming after 12 weeks.' },
                { k: 'tv', label: 'TV PREMIERE', desc: 'Premiere directly on a TV network. Generates upfront licensing cash.' },
              ] as { k: ReleaseStrategy; label: string; desc: string }[]).map(st => (
                <TouchableOpacity key={st.k} onPress={() => setDraft({ releaseStrategy: st.k })}
                  style={[s.strategyChip, draft.releaseStrategy === st.k && { borderColor: T.cyan, backgroundColor: T.cyan + '15' }]}
                  testID={`strat-${st.k}`}
                >
                  <MaterialCommunityIcons name={st.k === 'theatrical' ? 'theater' : st.k === 'streaming' ? 'video-film' : st.k === 'tv' ? 'television-guide' : 'television-guide'} size={18} color={draft.releaseStrategy === st.k ? T.cyan : T.textMute} />
                  <Text style={[s.strategyLbl, draft.releaseStrategy === st.k && { color: T.cyan }]}>{st.label}</Text>
                  <Text style={s.strategyDesc}>{st.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Streaming setup panel for Movies */}
            {(draft.releaseStrategy === 'streaming' || draft.releaseStrategy === 'hybrid') ? (
              <View style={s.streamingPanel}>
                <Text style={s.sumLabel}>Streaming Target</Text>
                <Text style={s.streamingHint}>Select which of your streaming networks will show this film.</Text>
                {playerServices.length === 0 ? (
                  <View style={s.warningBox}>
                    <MaterialCommunityIcons name="alert" size={16} color={T.orange} />
                    <Text style={s.warningTxt}>You don't own any streaming networks yet.</Text>
                    <TouchableOpacity onPress={() => router.push('/streaming/launch')}><Text style={[s.warningTxt, { color: T.cyan, textDecorationLine: 'underline' }]}>Launch one →</Text></TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 6 }}>
                      {playerServices.map(subService => {
                        const isSvcSel = draft.streamingTargetServiceId === subService.id;
                        return (
                          <TouchableOpacity key={subService.id}
                            onPress={() => setDraft({ streamingTargetServiceId: subService.id, streamingTargetTierIds: subService.tiers.map(t => t.id) })}
                            style={[s.chip, isSvcSel && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                            testID={`svc-picker-${subService.id}`}
                          >
                            <Text style={[s.chipT, isSvcSel && { color: T.cardDark }]}>{subService.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    {targetService ? (
                      <>
                        <Text style={s.subLabel}>Tiers Carrying the Film</Text>
                        <View style={s.btnRow}>
                          {targetService.tiers.map(tr => {
                            const isTierSel = (draft.streamingTargetTierIds || []).includes(tr.id);
                            return (
                              <TouchableOpacity key={tr.id} onPress={() => toggleStreamingTier(tr.id)}
                                style={[s.miniBtn, isTierSel && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                                testID={`tier-picker-${tr.id}`}
                              >
                                <Text style={[s.miniBtnT, isTierSel && { color: T.cardDark }]}>{tr.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}

            {draft.releaseStrategy === 'tv' ? (
              <View style={s.streamingPanel}>
                <Text style={s.sumLabel}>TV Network Broadcast Target</Text>
                <Text style={s.streamingHint}>Select which TV network airs the premiere broadcast of your film.</Text>
                {(() => {
                  const filteredNets = (state.tvNetworks || []).filter(net => 
                    net.ownerStudioId === state.player.id || 
                    (state.tvNetworkDeals || []).some(d => d.networkId === net.id && d.status === 'active')
                  );
                  if (filteredNets.length === 0) {
                    return (
                      <Text style={{ color: T.orange, fontSize: 11, fontStyle: 'italic', paddingVertical: 10 }}>
                        ⚠️ No eligible TV networks found. You must own a channel or sign an active TV carriage deal first. Go to TV Networks to configure!
                      </Text>
                    );
                  }
                  return (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 6 }}>
                      {filteredNets.map(net => {
                        const isNetSel = draft.tvNetworkId === net.id;
                        return (
                          <TouchableOpacity key={net.id}
                            onPress={() => setDraft({ tvNetworkId: net.id })}
                            style={[s.chip, isNetSel && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                            testID={`movie-tv-picker-${net.id}`}
                          >
                            <Text style={[s.chipT, isNetSel && { color: T.cardDark }]}>{net.name} ({net.kind.toUpperCase()})</Text>
                            <Text style={{ color: isNetSel ? T.cardDark : T.textMute, fontSize: 10, marginTop: 2 }}>{net.subscribers}M Subs · Payout rate x1.0</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  );
                })()}
              </View>
            ) : null}

            {/* Target release day calendar (only theatrical or hybrid) */}
            {draft.releaseStrategy !== 'streaming' && draft.releaseStrategy !== 'tv' ? (
              <View style={{ marginTop: 10 }}>
                <Text style={s.section}>Target Release Calendar Week</Text>
                <CalendarPicker draft={draft} state={state} filmingWeeks={filmingWeeks} setDraft={setDraft} />
              </View>
            ) : null}

            <View style={s.summary}>
              <Text style={s.sumLabel}>💰 Greenlight Calculation Detail:</Text>
              <Text style={s.sumLabel}>• Base Production Budget: ${productionCost.toFixed(1)}M</Text>
              <Text style={s.sumLabel}>• Marketing Campaign: ${draft.marketing.toFixed(1)}M</Text>
              {crossoverFee > 0 ? (
                <>
                  <Text style={s.sumLabel}>• Crossover Licensing: ${crossoverFee.toFixed(1)}M</Text>
                  {crossoverBreakdown.map((e, idx) => (
                    <Text key={idx} style={[s.sumLabel, { fontSize: 11, color: T.textMute, marginLeft: 10 }]}>- {e.name}: ${e.fee.toFixed(1)}M to {e.ownerName}</Text>
                  ))}
                </>
              ) : null}
              <View style={s.sep} />
              <Text style={[s.sumLabel, { fontWeight: '900', color: T.green, fontSize: 14 }]}>TOTAL REQUIRED CASH: ${totalCost.toFixed(1)}M</Text>
              <Text style={s.cash}>Available Studio Treasury: ${(state.player.cash * 1000).toFixed(1)}M</Text>
            </View>

            <TouchableOpacity
              onPress={submitMovie}
              disabled={state.player.cash < (totalCost / 1000)}
              style={[s.go, state.player.cash < (totalCost / 1000) && { backgroundColor: T.border, opacity: 0.5 }]}
              testID="movie-submit-btn"
            >
              <Text style={s.goTxt}>✓ GREENLIGHT MOVIE PRODUCTION</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          // ================= TV SERIES CREATOR UI =================
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
            <Text style={s.lbl}>TITLE</Text>
            <TextInput value={seriesTitle} onChangeText={setSeriesTitle} placeholder="e.g. Apex Files" placeholderTextColor={T.textMute} maxLength={42} style={s.inp} testID="series-title" />

            <Text style={s.lbl}>BRAND</Text>
            <View style={s.rowWrap}>
              {(['original', 'sequel', 'prequel', 'spinoff'] as const).map(b => (
                <TouchableOpacity key={b} style={[s.chip, seriesBrand === b && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setSeriesBrand(b)} testID={`series-brand-${b}`}>
                  <Text style={[s.chipTxt, seriesBrand === b && { color: T.cardDark }]}>{b.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(seriesBrand === 'sequel' || seriesBrand === 'prequel' || seriesBrand === 'spinoff') ? (
              <>
                <Text style={s.lbl}>PARENT FRANCHISE</Text>
                {playerFranchises.length === 0 ? (
                  <Text style={s.hint}>You don't own any franchises yet. Choose "Original" instead.</Text>
                ) : (
                  <View style={s.rowWrap}>
                    {playerFranchises.map(f => (
                      <TouchableOpacity key={f.id} style={[s.chip, seriesFranchiseId === f.id && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setSeriesFranchiseId(f.id)} testID={`series-fr-${f.id}`}>
                        <Text style={[s.chipTxt, seriesFranchiseId === f.id && { color: T.cardDark }]}>{f.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : null}

            <Text style={s.lbl}>SEASONS GREENLIT (1–5)</Text>
            <View style={s.rowWrap}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} style={[s.chip, seasonsNum === n && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setSeriesSeasons(String(n))} testID={`series-seasons-${n}`}>
                  <Text style={[s.chipTxt, seasonsNum === n && { color: T.cardDark }]}>{n} season{n !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.lbl}>EPISODES PER SEASON (6–22)</Text>
            <View style={s.rowWrap}>
              {[6, 8, 10, 13, 16, 22].map(n => (
                <TouchableOpacity key={n} style={[s.chip, episodesNum === n && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setSeriesEpisodes(String(n))} testID={`series-eps-${n}`}>
                  <Text style={[s.chipTxt, episodesNum === n && { color: T.cardDark }]}>{n} eps</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.lbl}>BUDGET PER SEASON ($M)</Text>
            <TextInput value={seriesBudgetM} onChangeText={(v) => setSeriesBudgetM(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={5} style={s.inp} testID="series-budget" />
            <View style={s.rowWrap}>
              {[35, 50, 80, 120, 200].map(n => (
                <TouchableOpacity key={n} style={s.chip} onPress={() => setSeriesBudgetM(String(n))}>
                  <Text style={s.chipTxt}>${n}M</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.lbl}>RELEASE STRATEGY</Text>
            <View style={s.rowWrap}>
              {([
                { k: 'tv' as const, label: 'Direct to TV', icon: 'television-classic', desc: 'Air on a TV network. Network pays a license fee.' },
                { k: 'streaming' as const, label: 'Direct to Streaming', icon: 'play-circle', desc: 'Premiere on your streaming network. Boosts app subscribers.' },
                { k: 'hybrid' as const, label: 'Hybrid Format', icon: 'compare-horizontal', desc: 'Airs on TV first then drops to streaming later.' },
              ]).map(st => (
                <TouchableOpacity key={st.k} style={[s.stratCard, seriesStrategy === st.k && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setSeriesStrategy(st.k)} testID={`series-strat-${st.k}`}>
                  <Text style={[s.stratLabel, seriesStrategy === st.k && { color: T.cardDark }]}>{st.label}</Text>
                  <Text style={[s.stratDesc, seriesStrategy === st.k && { color: T.cardDark }]}>{st.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(seriesStrategy === 'streaming' || seriesStrategy === 'hybrid') && (
              <View style={s.subPanel}>
                <Text style={s.subLbl}>YOUR STREAMING NETWORKS ({seriesStreamSvcIds.length} chosen)</Text>
                {playerSvcs.length === 0 ? (
                  <View style={s.warningBox}>
                    <Text style={[s.warningTxt, { color: T.orange }]}>You don't own any streaming services yet.</Text>
                    <TouchableOpacity onPress={() => router.push('/streaming/launch')}><Text style={[s.warningTxt, { color: T.cyan, textDecorationLine: 'underline' }]}>Launch one →</Text></TouchableOpacity>
                  </View>
                ) : (
                  <View style={s.rowWrap}>
                    {playerSvcs.map(sv => {
                      const sel = seriesStreamSvcIds.includes(sv.id);
                      return (
                        <TouchableOpacity key={sv.id} style={[s.chip, sel && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => {
                          setSeriesStreamSvcIds(prev => {
                            const next = prev.includes(sv.id) ? prev.filter(x => x !== sv.id) : [...prev, sv.id];
                            if (next.length > 0) {
                              const primary = playerSvcs.find(x => x.id === next[0]);
                              if (primary) setSeriesStreamTiers(primary.tiers.map(t => t.id));
                            } else {
                              setSeriesStreamTiers([]);
                            }
                            return next;
                          });
                        }} testID={`series-svc-${sv.id}`}>
                          <Text style={[s.chipTxt, sel && { color: T.cardDark }]}>{sv.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {targetSvc ? (
                  <>
                    <Text style={s.subLbl}>SUBSCRIBER TIERS PLAYING THE SERIES (on {targetSvc.name})</Text>
                    <View style={s.rowWrap}>
                      {targetSvc.tiers.map(t => {
                        const active = seriesStreamTiers.includes(t.id);
                        return (
                          <TouchableOpacity key={t.id} style={[s.chip, active && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setSeriesStreamTiers(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} testID={`series-tier-${t.id}`}>
                            <Text style={[s.chipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </View>
            )}

            {(seriesStrategy === 'tv' || seriesStrategy === 'hybrid') && (
              <View style={s.subPanel}>
                <Text style={s.subLbl}>TV CHANNELS · CHOOSE OWNED ({seriesNetworkIds.length} picked)</Text>
                <Text style={{ color: T.textDim, fontSize: 11, marginBottom: 8, fontStyle: 'italic' }}>
                  Series air on TV channels to reach television subscribers.
                </Text>
                {playerChannels.length === 0 ? (
                  <View style={{ backgroundColor: T.cardDark, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: T.orange }}>
                    <Text style={{ color: T.orange, fontWeight: '800' }}>No channels found</Text>
                    <Text style={{ color: T.textDim, fontSize: 11, marginTop: 4 }}>Launch a TV station from the TV Networks page before greenlighting Direct-To-TV projects.</Text>
                  </View>
                ) : (
                  <View style={s.rowWrap}>
                    {playerChannels.map(n => {
                      const sel = seriesNetworkIds.includes(n.id);
                      return (
                        <TouchableOpacity key={n.id} style={[s.chip, sel && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setSeriesNetworkIds(prev => prev.includes(n.id) ? prev.filter(x => x !== n.id) : [...prev, n.id])} testID={`series-net-${n.id}`}>
                          <Text style={[s.chipTxt, sel && { color: T.cardDark }]}>{n.name} · {n.kind.toUpperCase()}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                {playerPacks.length > 0 ? (
                  <>
                    <Text style={[s.subLbl, { marginTop: 12 }]}>CHANNEL PACKS ({seriesPackIds.length} picked)</Text>
                    <View style={s.rowWrap}>
                      {playerPacks.map(p => {
                        const sel = seriesPackIds.includes(p.id);
                        return (
                          <TouchableOpacity key={p.id} style={[s.chip, sel && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setSeriesPackIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} testID={`series-pack-${p.id}`}>
                            <Text style={[s.chipTxt, sel && { color: T.cardDark }]}>{p.name} ({p.channelIds.length}ch)</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </View>
            )}

            {seriesStrategy === 'hybrid' && (
              <View style={s.subPanel}>
                <Text style={s.subLbl}>HYBRID DISTRIBUTION PRIORITY</Text>
                <View style={[s.rowWrap, { gap: 10 }]}>
                  {([
                    { k: 'tv_first' as const, label: 'TV Premier First', desc: 'Airs on TV network first. Streaming subscribers can watch later.' },
                    { k: 'streaming_first' as const, label: 'Streaming Drop First', desc: 'Drops on streaming service, TV channel plays next season.' },
                  ]).map(p => (
                    <TouchableOpacity key={p.k} style={[s.stratCard, seriesHybridPriority === p.k && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setSeriesPriority(p.k)} testID={`series-priority-${p.k}`}>
                      <Text style={[s.stratLabel, seriesHybridPriority === p.k && { color: T.cardDark }]}>{p.label}</Text>
                      <Text style={[s.stratDesc, seriesHybridPriority === p.k && { color: T.cardDark }]}>{p.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.subLbl}>HYBRID DISTRIBUTION WINDOW (WEEKS)</Text>
                <View style={s.rowWrap}>
                  {[0, 4, 8, 12].map(w => (
                    <TouchableOpacity key={w} style={[s.chip, seriesHybridWindow === w && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setSeriesWindow(w)} testID={`series-win-${w}`}>
                      <Text style={[s.chipTxt, seriesHybridWindow === w && { color: T.cardDark }]}>{w === 0 ? 'Day & Date (0w)' : `${w} weeks`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <Text style={s.section}>Crew Required</Text>
            <TouchableOpacity style={s.crewBtn} onPress={pickWriter} testID="draft-select-writer-tv">
              {writer ? <Avatar skin={writer.avatarColor} hair={writer.hairColor} hairStyle={writer.hairStyle} facialHair={writer.facialHair} size={40} /> : <MaterialCommunityIcons name="feather" size={20} color={T.cyan} />}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.crewLbl}>WRITER</Text>
                <Text style={s.crewName}>{writer ? `${writer.name} · ★${writer.fame}` : 'Tap to select series writer'}</Text>
                {writer ? <Text style={s.crewSub}>Skill {writer.skill}/100 · Salary: ${(writer.salary * 0.6).toFixed(1)}M/season</Text> : null}
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.crewBtn} onPress={pickDirector} testID="draft-select-director-tv">
              {director ? <Avatar skin={director.avatarColor} hair={director.hairColor} hairStyle={director.hairStyle} facialHair={director.facialHair} size={40} /> : <MaterialCommunityIcons name="movie-creation" size={20} color={T.cyan} />}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.crewLbl}>DIRECTOR</Text>
                <Text style={s.crewName}>{director ? `${director.name} · ★${director.fame}` : 'Tap to select series director'}</Text>
                {director ? <Text style={s.crewSub}>Skill {director.skill}/100 · Salary: ${(director.salary * 0.6).toFixed(1)}M/season</Text> : null}
              </View>
            </TouchableOpacity>

            <Text style={s.section}>Cast Slots Required</Text>
            <View style={s.castWrap}>
              {draft.cast.map((slot, idx) => {
                const tal = state.talents.find(t => t.id === slot.talentId);
                const roleLbl = slot.role.toUpperCase().replace('_', ' ');
                const textVal = draft.castRoleNames[idx] || '';
                const descVal = draft.castDescriptions[idx] || '';
                
                return (
                  <View key={`${slot.role}-${idx}`} style={{ borderBottomWidth: 1, borderBottomColor: T.border, paddingVertical: 8, gap: 4 }}>
                    <TouchableOpacity style={s.crewBtn} onPress={() => pickCast(idx)} testID={`draft-select-cast-${idx}-tv`}>
                      {tal ? <Avatar skin={tal.avatarColor} hair={tal.hairColor} hairStyle={tal.hairStyle} facialHair={tal.facialHair} size={40} /> : <MaterialCommunityIcons name="account-plus" size={20} color={T.magenta} />}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.crewLbl}>{roleLbl}</Text>
                        <Text style={s.crewName}>{tal ? `${tal.name} · ★${tal.fame}` : 'Tap to pick actor'}</Text>
                        {tal ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={s.crewSub}>Skill {tal.skill}/100 · color: </Text>
                            <Text style={[s.colorTag, { backgroundColor: COLOR_HEX[tal.colorTrait] }]}>{tal.colorTrait}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Support vs Lead toggle for TV */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginVertical: 4 }}>
                      <Text style={{ fontSize: 10, color: T.textMute, fontWeight: 'bold' }}>ROLE:</Text>
                      <View style={{ flexDirection: 'row', backgroundColor: T.cardDark, borderRadius: 6, padding: 2 }}>
                        <TouchableOpacity 
                          onPress={() => {
                            const oldRole = slot.role;
                            if (oldRole.startsWith('support_')) {
                              updateCastSlot(idx, { role: oldRole.replace('support_', 'lead_') as any });
                            }
                          }}
                          style={[{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 }, slot.role.startsWith('lead_') ? { backgroundColor: T.cyan } : null]}
                        >
                          <Text style={{ fontSize: 9, color: slot.role.startsWith('lead_') ? T.cardDark : T.textMute, fontWeight: 'bold' }}>LEAD (★ AUDIENCE BOOST)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => {
                            const oldRole = slot.role;
                            if (oldRole.startsWith('lead_')) {
                              updateCastSlot(idx, { role: oldRole.replace('lead_', 'support_') as any });
                            }
                          }}
                          style={[{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 }, slot.role.startsWith('support_') ? { backgroundColor: T.magenta } : null]}
                        >
                          <Text style={{ fontSize: 9, color: slot.role.startsWith('support_') ? T.cardDark : T.textMute, fontWeight: 'bold' }}>SUPPORTING (-50% COST)</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {tal ? (
                      <>
                        <TextInput
                          value={textVal}
                          onChangeText={(v) => {
                            const next = [...draft.castRoleNames]; next[idx] = v;
                            setDraft({ castRoleNames: next });
                          }}
                          placeholder="Character Name (e.g. Rachel Green)" placeholderTextColor={T.textMute}
                          style={s.smallInput}
                          testID={`char-name-${idx}-tv`}
                        />
                        <TextInput
                          value={descVal}
                          onChangeText={(v) => {
                            const next = [...draft.castDescriptions]; next[idx] = v;
                            setDraft({ castDescriptions: next });
                          }}
                          placeholder="Short description of their role" placeholderTextColor={T.textMute}
                          style={s.smallInput}
                          maxLength={60}
                          testID={`char-desc-${idx}-tv`}
                        />

                        {/* Inline Deal Split for Series */}
                        <Text style={s.subFieldLbl}>Deal Split Option</Text>
                        <View style={s.custChipRow}>
                          {([
                            { k: 'studio_favored' as const, lbl: 'Studio Favured', desc: '70% Pay · 0% BO' },
                            { k: 'middle' as const, lbl: 'Standard', desc: '100% Pay · 2.5% BO' },
                            { k: 'actor_favored' as const, lbl: 'Actor Favured', desc: '140% Pay · 6% BO' }
                          ]).map(deal => {
                            const active = slot.dealType === deal.k;
                            return (
                              <TouchableOpacity key={deal.k} style={[s.custChip, active && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                                onPress={() => updateCastSlot(idx, { dealType: deal.k })}
                                testID={`series-cast-${idx}-deal-${deal.k}`}
                              >
                                <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{deal.lbl}</Text>
                                <Text style={[s.custChipSub, { color: active ? T.cardDark : T.textMute }]}>{deal.desc}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Inline Contract Terms for Series */}
                        <Text style={s.subFieldLbl}>Contract Term</Text>
                        <View style={s.custChipRow}>
                          {([
                            { k: 'single' as const, lbl: 'Single season', desc: 'No commit' },
                            { k: 'pack3' as const, lbl: '3-Season Pack', desc: 'Lock + discount' },
                            { k: 'hold5y' as const, lbl: '5y Exclusive', desc: 'Future boost' }
                          ]).map(term => {
                            const active = slot.contractKind === term.k;
                            return (
                              <TouchableOpacity key={term.k} style={[s.custChip, active && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                                onPress={() => updateCastSlot(idx, { contractKind: term.k })}
                                testID={`series-cast-${idx}-term-${term.k}`}
                              >
                                <Text style={[s.custChipTxt, active && { color: T.cardDark }]}>{term.lbl}</Text>
                                <Text style={[s.custChipSub, { color: active ? T.cardDark : T.textMute }]}>{term.desc}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Will-sign warning if series contract expectation differs (TV pays 60%) */}
                        {(() => {
                          const isLead = slot.role.startsWith('lead_');
                          const expectationMultiplier = (isLead ? 1.0 : 0.5) * 0.6;
                          const dt = dealTerms(tal.salary, slot.dealType);
                          const numM = slot.contractKind === 'pack3' ? 3 : slot.contractKind === 'hold5y' ? 3 : 1;
                          const tvSalary = +(dt.salary * (isLead ? 1.0 : 0.5) * 0.6).toFixed(2);
                          const expect = calculateAcceptance(tal, numM, tvSalary, dt.boPercent, expectationMultiplier);
                          const willSign = expect.verdict === 'will_accept' || expect.verdict === 'likely_accept';
                          const dtColor = willSign ? T.green : expect.verdict === 'considering' ? T.yellow : T.orange;
                          const dtText = willSign ? '✓ Will sign for TV season' : expect.verdict === 'considering' ? `🤝 Considering contract · ${expect.reason}` : `✗ Will walk! ${expect.reason}`;
                          return (
                            <View style={[s.acceptChip, { borderColor: dtColor, backgroundColor: dtColor + '22' }]}>
                              <Text style={[s.acceptT, { color: dtColor }]} testID={`series-cast-${idx}-accept`}>{dtText}</Text>
                              {!willSign ? (
                                <TouchableOpacity style={s.negotiateBtn} onPress={() => router.push({ pathname: '/negotiate/[talentId]', params: { talentId: tal.id } })}>
                                  <Text style={s.negotiateBtnT}>🤝 Open Full Negotiation →</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          );
                        })()}
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>

            {chemColors.length >= 2 ? (
              <View style={s.chemRow}>
                <View style={s.chemDots}>
                  {chemColors.map((cc, ci) => <View key={`tvchem-${ci}`} style={[s.chemDot, { backgroundColor: COLOR_HEX[cc] }]} />)}
                </View>
                <Text style={[s.chemTxt, { color: chemPct > 0 ? T.green : T.textDim }]}>Cast Chemistry: +{chemPct}%</Text>
              </View>
            ) : null}

            <View style={s.quoteBox}>
              <Text style={s.quoteLbl}>TOTAL BUDGET COMMITMENT (Treasury Check)</Text>
              <Text style={s.quoteVal}>${seriesTotalCostB.toFixed(2)}B</Text>
              <Text style={s.quoteSub}>{seasonsNum} × ${budgetNum.toFixed(0)}M · You have ${state.player.cash.toFixed(2)}B cash · {episodesNum} eps/season</Text>
            </View>

            <TouchableOpacity style={[s.go, seriesTotalCostB > state.player.cash && { opacity: 0.5 }]} onPress={submitTV} disabled={seriesTotalCostB > state.player.cash} testID="series-submit">
              <Text style={s.goTxt}>✓ GREENLIGHT TV SHOW PRODUCTION</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChipRow({ items, value, onChange, testIDPrefix }: { items: readonly string[]; value: string; onChange: (v: string) => void; testIDPrefix?: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
      {items.map(item => (
        <TouchableOpacity key={item} onPress={() => onChange(item)}
          style={[s.chip, value === item && { backgroundColor: T.cyan, borderColor: T.cyan }]}
          testID={testIDPrefix ? `${testIDPrefix}-${item.toLowerCase()}` : undefined}>
          <Text style={[s.chipT, value === item && { color: T.cardDark }]}>{item}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function CalendarPicker({ draft, state, filmingWeeks, setDraft }: { draft: any; state: any; filmingWeeks: number; setDraft: any }) {
  const currentTotal = state.year * WEEKS_PER_YEAR + state.week;
  const earliestTotal = currentTotal + filmingWeeks;

  const currentYearOptions = [state.year, state.year + 1];

  return (
    <View style={s.calendarPanel}>
      <Text style={s.calHint}>Select target theatrical release week (Filming takes {filmingWeeks} weeks). Releases on bold golden weeks receive box office multiplier boosts.</Text>
      {currentYearOptions.map(yr => {
        return (
          <View key={yr} style={s.calYear}>
            <Text style={s.calYearLabel}>YEAR {yr}</Text>
            <View style={s.calGrid}>
              {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i + 1).map(wk => {
                const total = yr * WEEKS_PER_YEAR + wk;
                const tooEarly = total < earliestTotal;
                const isPast = total < currentTotal;
                const hol = holidayFor(wk);
                const isSelected = draft.targetWeek === wk && draft.targetYear === yr;
                const isAuto = !draft.targetWeek && !draft.onHold && earliestTotal === total;

                return (
                  <TouchableOpacity
                    key={wk}
                    disabled={tooEarly || isPast}
                    onPress={() => setDraft({ targetWeek: wk, targetYear: yr, onHold: false })}
                    style={[
                      s.calCell,
                      hol && s.calCellHoliday,
                      isSelected && s.calCellSelected,
                      isAuto && !isSelected && s.calCellAuto,
                      (tooEarly || isPast) && s.calCellDisabled,
                    ]}
                    testID={`cal-${yr}-${wk}`}>
                    <Text style={[s.calCellTxt, hol && { color: T.yellow }, isSelected && { color: T.cardDark }]}>{wk}</Text>
                    {hol ? <Text style={s.calCellHol}>×{hol.mult}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
      {(draft.targetWeek || !draft.onHold) && (
        <TouchableOpacity style={s.calClear} onPress={() => setDraft({ targetWeek: null, targetYear: null, onHold: true })} testID="cal-clear">
          <Text style={{ color: T.orange, fontWeight: '800' }}>Clear (deploy ON HOLD for post-production scheduling)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  projectTypeContainer: { flexDirection: 'row', backgroundColor: T.cardDark, margin: 12, padding: 4, borderRadius: 10, borderWidth: 1, borderColor: T.border, gap: 4 },
  projectTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8 },
  projectTypeBtnActive: { backgroundColor: T.cyan },
  projectTypeBtnT: { color: T.text, fontWeight: '900', fontSize: 13 },
  projectTypeBtnTActive: { color: T.cardDark },
  smallInput: { backgroundColor: T.card, color: T.text, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, borderWidth: 1, borderColor: T.border, marginTop: 2 },
  acceptChip: { borderWidth: 2, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginTop: 6, alignSelf: 'flex-start' },
  acceptT: { fontWeight: '800', fontSize: 11 },
  brandRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  brandChip: { backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, flex: 1, alignItems: 'center' },
  brandChipT: { color: T.text, fontWeight: '800', fontSize: 12 },
  chemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, marginTop: 6, backgroundColor: T.cardDark, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  chemDots: { flexDirection: 'row', gap: 4 },
  chemDot: { width: 12, height: 12, borderRadius: 6 },
  chemTxt: { fontWeight: '900', fontSize: 13 },
  brandPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 2, borderColor: T.green, marginTop: 4 },
  brandTxt: { color: T.text, fontWeight: '900' },
  section: { color: T.text, fontWeight: '900', marginTop: 14, marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, color: T.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, fontSize: 14 },
  cbInput: { backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.border, color: T.text, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, fontSize: 12, width: '100%' },
  chip: { backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  chipT: { color: T.text, fontWeight: '800', fontSize: 12 },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  miniBtn: { backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10 },
  miniBtnT: { color: T.text, fontWeight: '800', fontSize: 12 },
  strategyRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  strategyChip: { flex: 1, backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, padding: 8, borderRadius: 10, alignItems: 'center', gap: 4 },
  strategyLbl: { color: T.text, fontWeight: '900', fontSize: 12 },
  strategyDesc: { color: T.textMute, fontSize: 10, textAlign: 'center' },
  streamingPanel: { backgroundColor: T.cardDark, borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: T.magenta },
  streamingHint: { color: T.textDim, fontSize: 12, marginBottom: 6 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: T.orange + '22', borderRadius: 6, width: '100%', marginTop: 4 },
  warningTxt: { color: T.text, fontSize: 12 },
  subLabel: { color: T.textDim, fontSize: 11, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  crewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 10, marginVertical: 4, borderWidth: 2, borderColor: T.border },
  crewLbl: { color: T.cyan, fontWeight: '900', fontSize: 11 },
  crewName: { color: T.text, fontWeight: '800', fontSize: 14 },
  crewSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  castWrap: { backgroundColor: T.bg, padding: 6, borderRadius: 10, marginVertical: 4 },
  colorTag: { color: T.cardDark, fontWeight: '900', fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  summary: { marginTop: 14, padding: 12, backgroundColor: T.cardDark, borderRadius: 10, borderWidth: 2, borderColor: T.border, gap: 4 },
  sumLabel: { color: T.text, fontWeight: '700', fontSize: 13 },
  cash: { color: T.cyan, fontWeight: '700', fontSize: 12, marginTop: 4 },
  go: { backgroundColor: T.green, padding: 14, alignItems: 'center', borderRadius: 12, marginTop: 14, borderWidth: 2, borderColor: T.border },
  goTxt: { color: T.cardDark, fontWeight: '900', fontSize: 16 },
  calendarPanel: { backgroundColor: T.cardDark, borderRadius: 10, padding: 8, marginTop: 4, borderWidth: 1, borderColor: T.border },
  calHint: { color: T.textDim, fontSize: 11, marginBottom: 6, textAlign: 'center' },
  calYear: { marginBottom: 8 },
  calYearLabel: { color: T.cyan, fontWeight: '900', fontSize: 12, marginBottom: 4 },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  calCell: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: T.card, borderRadius: 4, borderWidth: 1, borderColor: T.border },
  calCellHoliday: { borderColor: T.yellow, borderWidth: 1.5 },
  calCellSelected: { backgroundColor: T.green, borderColor: T.green },
  calCellAuto: { backgroundColor: T.cyan + '33', borderColor: T.cyan },
  calCellDisabled: { opacity: 0.3 },
  calCellTxt: { color: T.text, fontSize: 11, fontWeight: '700' },
  calCellHol: { color: T.yellow, fontSize: 8, marginTop: 1 },
  calClear: { padding: 8, alignItems: 'center' },
  sep: { height: 1, backgroundColor: T.border, marginVertical: 4 },
  lbl: { color: T.text, fontWeight: '900', fontSize: 12, marginTop: 16 },
  subLbl: { color: T.text, fontWeight: '900', fontSize: 11, marginTop: 8, marginBottom: 4 },
  hint: { color: T.textDim, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  inp: { backgroundColor: T.cardDark, color: T.text, padding: 10, borderRadius: 8, marginTop: 6, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: T.border },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  stratCard: { width: '100%', backgroundColor: T.cardDark, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, marginTop: 4 },
  stratLabel: { color: T.text, fontWeight: '900', fontSize: 13, marginTop: 4 },
  stratDesc: { color: T.textDim, fontSize: 11, marginTop: 2 },
  subPanel: { backgroundColor: T.card, padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: T.border },
  quoteBox: { backgroundColor: T.cardDark, padding: 14, borderRadius: 10, marginTop: 18, borderWidth: 1, borderColor: T.border },
  quoteLbl: { color: T.textDim, fontSize: 10, fontWeight: '900' },
  quoteVal: { color: T.green, fontSize: 24, fontWeight: '900', marginTop: 2 },
  quoteSub: { color: T.textDim, fontSize: 11, marginTop: 4 },
  crewBox: { backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: T.border, gap: 8 },
  crewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  castRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  castSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  pickerCard: { width: '100%', maxWidth: 420, backgroundColor: T.cardDark, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: T.border },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.border, marginBottom: 8 },
  pickerTitle: { color: T.text, fontSize: 14, fontWeight: '900' },
  talentRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, marginBottom: 6, backgroundColor: T.card },
  talentName: { color: T.text, fontWeight: '900', fontSize: 13 },
  talentSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  colorBadge: { width: 10, height: 10, borderRadius: 5 },
  talentAcc: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  negotiateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5, borderColor: T.magenta, alignSelf: 'flex-start' },
  negotiateBtnT: { color: T.magenta, fontSize: 10, fontWeight: '900' },
  subFieldLbl: { color: T.textMute, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginTop: 6, marginBottom: 2 },
  custChipRow: { flexDirection: 'row', gap: 4, width: '100%', flexWrap: 'wrap', marginVertical: 2 },
  custChip: { flex: 1, minWidth: 90, backgroundColor: T.cardDark, borderWidth: 1.5, borderColor: T.border, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 8, alignItems: 'center' },
  custChipTxt: { color: T.text, fontSize: 11, fontWeight: '900' },
  custChipSub: { fontSize: 8, marginTop: 1, textAlign: 'center' },
});
