import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { useMovieDraft } from '../src/game/draft';
import { T } from '../src/ui/theme';
import { TopBar, Avatar, IconTile } from '../src/ui/components';
import { GENRES, PLOT_ARCS, RATINGS, COLOR_HEX, dealTerms, holidayFor, computeChemistryBonus, contractTerms, monthOf, WEEKS_PER_YEAR } from '../src/game/data';
import { calculateAcceptance } from '../src/game/sim';
import { Brand, Genre, MovieType, PlotArc, Rating, ColorTrait, ReleaseStrategy } from '../src/game/types';

export default function CreateMovie() {
  const router = useRouter();
  const params = useLocalSearchParams<{ brand?: string; franchiseId?: string; parentId?: string; crossover?: string; reset?: string }>();
  const { state, createMovie } = useGame();
  const { draft, setDraft, resetDraft, initFromParams } = useMovieDraft();

  // Initialize draft if it's not active or if params asked for reset OR if brand/franchise params differ from current draft
  useEffect(() => {
    const wantBrand = (params.brand as Brand) || 'Original';
    const wantFranchise = params.franchiseId || undefined;
    const brandMismatch = wantBrand !== draft.brand;
    const franchiseMismatch = wantFranchise !== draft.franchiseId;
    if (!draft.active || params.reset || (params.brand && (brandMismatch || franchiseMismatch))) {
      initFromParams({
        brand: wantBrand,
        franchiseId: wantFranchise,
        parentMovieId: params.parentId || undefined,
        crossoverIds: params.crossover ? [params.crossover as string] : [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.brand, params.franchiseId, params.parentId, params.crossover, params.reset]);

  if (!state) return null;

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

  // Crossover licensing fee preview — same formula as sim.ts createMovie.
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

  const submit = () => {
    if (!draft.writerId || !draft.directorId) { Alert.alert('Missing crew', 'Pick a writer and director.'); return; }
    if (castFilled.length < 2) { Alert.alert('Missing cast', 'Pick at least 2 cast members.'); return; }
    if (draft.brand !== 'Original' && !draft.franchiseId) { Alert.alert('Missing franchise', 'Choose a franchise for sequels/spinoffs.'); return; }
    if (draft.releaseStrategy === 'streaming' && !draft.streamingTargetServiceId) {
      Alert.alert('Streaming target required', 'Pick which streaming service hosts the exclusive release.'); return;
    }
    if (draft.releaseStrategy === 'hybrid' && !draft.streamingTargetServiceId) {
      Alert.alert('Streaming target required', 'Pick which streaming service receives the hybrid release after the window.'); return;
    }
    const result = createMovie(state, {
      title: draft.customTitle || undefined,
      franchiseName: draft.customFranchiseName || undefined,
      type: draft.type, genre: draft.genre, plotArc: draft.arc, rating: draft.rating, runtime: draft.runtime, brand: draft.brand,
      franchiseId: draft.franchiseId, parentMovieId: draft.parentMovieId,
      crossoverFranchiseIds: draft.crossoverIds.length ? draft.crossoverIds : undefined,
      externalIPLicenseId: draft.externalIPLicenseId,
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
      targetReleaseWeek: draft.targetWeek || undefined,
      targetReleaseYear: draft.targetYear || undefined,
    });
    if (result.error) { Alert.alert('Cannot start', result.error); return; }
    Alert.alert('Production started', `${result.movie?.title} is in production.`);
    resetDraft();
    router.replace('/dashboard');
  };

  // Handlers redirect to /talent in selection mode
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
      <TopBar title="Create Movie" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          <View style={s.brandPill}>
            <MaterialCommunityIcons name={draft.brand === 'Original' ? 'lightbulb-on' : 'star-circle'} color={T.green} size={20} />
            <Text style={s.brandTxt}>{draft.brand}{franchise ? ` · ${franchise.name}` : ''}</Text>
          </View>

          {draft.franchiseId ? (
            <View style={s.brandRow}>
              {(['Sequel', 'Prequel', 'Spinoff', 'Crossover'] as Brand[]).map(b => (
                <TouchableOpacity key={b} onPress={() => setDraft({ brand: b })}
                  style={[s.brandChip, draft.brand === b && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                  testID={`brand-${b}`}>
                  <Text style={[s.brandChipT, draft.brand === b && { color: T.cardDark }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {/* When the user landed here via "License Crossover" from a rival franchise (no own franchise selected yet),
              expose a picker of THEIR OWN franchises so they can choose which one stars the crossover. */}
          {!draft.franchiseId && draft.brand === 'Crossover' ? (() => {
            const myFranchises = state.franchises.filter(f => f.studioId === state.player.id);
            const incomingCrossoverFr = (draft.crossoverIds || []).map(cid => state.franchises.find(f => f.id === cid)).filter(Boolean);
            return (
              <View style={[s.summary, { borderColor: T.magenta, marginTop: 6, marginBottom: 6 }]}>
                <Text style={[s.section, { color: T.magenta, paddingHorizontal: 0, marginTop: 0 }]}>
                  Pick YOUR Base Franchise
                </Text>
                {incomingCrossoverFr.length > 0 ? (
                  <Text style={[s.sumLabel, { color: T.textDim, fontSize: 11, marginBottom: 8 }]}>
                    Crossing over WITH: {incomingCrossoverFr.map(f => f!.name).join(', ')}
                  </Text>
                ) : null}
                {myFranchises.length === 0 ? (
                  <Text style={[s.sumLabel, { color: T.orange, fontSize: 12 }]}>You have no franchises yet. Create an Original first, then revisit Crossover.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {myFranchises.map(fr => (
                      <TouchableOpacity key={fr.id} style={s.chip}
                        onPress={() => setDraft({ franchiseId: fr.id })}
                        testID={`pick-own-fr-${fr.id}`}>
                        <Text style={s.chipT}>{fr.name} · pop {fr.popularity}</Text>
                      </TouchableOpacity>
                    ))}
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

          {/* External IP attach (uses an active license you own) */}
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

          {/* Crossover multi-select (only when brand=Crossover and franchise is set) */}
          {draft.brand === 'Crossover' && draft.franchiseId ? (() => {
            const otherRivalFranchises = state.franchises.filter(f =>
              f.id !== draft.franchiseId &&
              f.studioId !== state.player.id &&
              f.movieIds.length >= 2
            ).sort((a, b) => b.popularity - a.popularity).slice(0, 30);
            if (otherRivalFranchises.length === 0) {
              return (
                <>
                  <Text style={s.section}>Crossover Franchises (none available)</Text>
                  <Text style={[s.sumLabel, { fontSize: 12, color: T.textDim, paddingHorizontal: 4 }]}>No rival franchises with ≥2 films found. Wait until rivals build deeper IPs.</Text>
                </>
              );
            }
            return (
              <>
                <Text style={s.section}>Crossover Franchises (tap multiple)</Text>
                <Text style={[s.sumLabel, { fontSize: 11, color: T.textDim, paddingHorizontal: 4, marginBottom: 4 }]}>
                  {draft.crossoverIds.length} selected · License fee scales with each franchise's popularity & studio rating.
                </Text>
                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
                  {otherRivalFranchises.map(fr => {
                    const owner = state.rivals.find(r => r.id === fr.studioId);
                    const active = draft.crossoverIds.includes(fr.id);
                    const popMult = 0.5 + (fr.popularity / 100) * 1.8;
                    const ratingMult = 0.7 + ((owner?.rating || 3) - 1) * 0.18;
                    const depthMult = 1 + Math.min(0.6, (fr.movieIds.length || 1) * 0.05);
                    const fee = +(25 * popMult * ratingMult * depthMult).toFixed(1);
                    return (
                      <TouchableOpacity
                        key={fr.id}
                        onPress={() => {
                          const next = active ? draft.crossoverIds.filter(x => x !== fr.id) : [...draft.crossoverIds, fr.id];
                          setDraft({ crossoverIds: next });
                        }}
                        style={[s.crossRow, active && { borderColor: T.magenta, backgroundColor: T.magenta + '22' }]}
                        testID={`crossover-${fr.id}`}
                      >
                        <MaterialCommunityIcons name={active ? 'checkbox-marked-circle' : 'circle-outline'} size={20} color={active ? T.magenta : T.textDim} />
                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                          <Text style={s.crossName} numberOfLines={1}>{fr.name}</Text>
                          <Text style={s.crossSub}>{owner?.name || '?'} · pop {fr.popularity} · {fr.movieIds.length} films</Text>
                        </View>
                        <Text style={[s.crossFee, { color: active ? T.magenta : T.yellow }]}>${fee.toFixed(0)}M</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            );
          })() : null}

          {/* Release Strategy */}
          <Text style={s.section}>Release Strategy</Text>
          <View style={s.strategyRow}>
            {([
              { k: 'theatrical', label: 'Theatrical', icon: 'cinema-coupon', desc: 'Cinemas first. Manual streaming later.' },
              { k: 'streaming', label: 'Streaming Only', icon: 'play-circle', desc: 'Direct premiere on your service.' },
              { k: 'hybrid', label: 'Hybrid', icon: 'compare-horizontal', desc: 'Cinemas + auto-add to streaming after window.' },
            ] as { k: ReleaseStrategy; label: string; icon: string; desc: string }[]).map(opt => (
              <TouchableOpacity
                key={opt.k}
                style={[s.strategyChip, draft.releaseStrategy === opt.k && { backgroundColor: T.magenta + '22', borderColor: T.magenta }]}
                onPress={() => setDraft({ releaseStrategy: opt.k })}
                testID={`strategy-${opt.k}`}>
                <MaterialCommunityIcons name={opt.icon as any} size={20} color={draft.releaseStrategy === opt.k ? T.magenta : T.textDim} />
                <Text style={[s.strategyLbl, draft.releaseStrategy === opt.k && { color: T.magenta }]}>{opt.label}</Text>
                <Text style={s.strategyDesc} numberOfLines={2}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {draft.releaseStrategy === 'streaming' && (
            <View style={s.streamingPanel}>
              <Text style={s.streamingHint}>Pick which streaming service & tiers carry this exclusive release.</Text>
              {playerServices.length === 0 ? (
                <View style={s.warningBox}>
                  <MaterialCommunityIcons name="alert" size={16} color={T.orange} />
                  <Text style={s.warningTxt}>You need a streaming service first. </Text>
                  <TouchableOpacity onPress={() => router.push('/streaming/launch')}><Text style={[s.warningTxt, { color: T.cyan, textDecorationLine: 'underline' }]}>Launch one →</Text></TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.subLabel}>Service</Text>
                  <View style={s.btnRow}>
                    {playerServices.map(svc => (
                      <TouchableOpacity
                        key={svc.id}
                        style={[s.miniBtn, draft.streamingTargetServiceId === svc.id && { backgroundColor: T.cyan }]}
                        onPress={() => setDraft({ streamingTargetServiceId: svc.id, streamingTargetTierIds: svc.tiers.map(t => t.id) })}
                        testID={`stream-svc-${svc.id}`}>
                        <Text style={[s.miniBtnT, draft.streamingTargetServiceId === svc.id && { color: T.cardDark }]}>{svc.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {targetService && (
                    <>
                      <Text style={s.subLabel}>Tiers carrying this title</Text>
                      <View style={s.btnRow}>
                        {targetService.tiers.map(tier => {
                          const active = (draft.streamingTargetTierIds || []).includes(tier.id);
                          return (
                            <TouchableOpacity key={tier.id}
                              style={[s.miniBtn, active && { backgroundColor: T.yellow }]}
                              onPress={() => toggleStreamingTier(tier.id)}
                              testID={`stream-tier-${tier.id}`}>
                              <Text style={[s.miniBtnT, active && { color: T.cardDark }]}>{tier.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {draft.releaseStrategy === 'hybrid' && (
            <View style={s.streamingPanel}>
              <Text style={s.streamingHint}>Cinema release first. Auto-add to your streaming service after the window.</Text>
              {playerServices.length === 0 ? (
                <View style={s.warningBox}>
                  <MaterialCommunityIcons name="alert" size={16} color={T.orange} />
                  <Text style={s.warningTxt}>You need a streaming service first. </Text>
                  <TouchableOpacity onPress={() => router.push('/streaming/launch')}><Text style={[s.warningTxt, { color: T.cyan, textDecorationLine: 'underline' }]}>Launch one →</Text></TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={s.subLabel}>Service</Text>
                  <View style={s.btnRow}>
                    {playerServices.map(svc => (
                      <TouchableOpacity
                        key={svc.id}
                        style={[s.miniBtn, draft.streamingTargetServiceId === svc.id && { backgroundColor: T.cyan }]}
                        onPress={() => setDraft({ streamingTargetServiceId: svc.id, streamingTargetTierIds: svc.tiers.map(t => t.id) })}
                        testID={`hybrid-svc-${svc.id}`}>
                        <Text style={[s.miniBtnT, draft.streamingTargetServiceId === svc.id && { color: T.cardDark }]}>{svc.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {targetService && (
                    <>
                      <Text style={s.subLabel}>Tiers carrying this title</Text>
                      <View style={s.btnRow}>
                        {targetService.tiers.map(tier => {
                          const active = (draft.streamingTargetTierIds || []).includes(tier.id);
                          return (
                            <TouchableOpacity key={tier.id}
                              style={[s.miniBtn, active && { backgroundColor: T.yellow }]}
                              onPress={() => toggleStreamingTier(tier.id)}
                              testID={`hybrid-tier-${tier.id}`}>
                              <Text style={[s.miniBtnT, active && { color: T.cardDark }]}>{tier.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={s.subLabel}>Release Window (weeks after theatrical)</Text>
                      <View style={s.btnRow}>
                        {[0, 4, 8, 12, 16].map(w => {
                          const active = (draft.streamingWindowWeeks ?? 12) === w;
                          return (
                            <TouchableOpacity key={`win-${w}`}
                              style={[s.miniBtn, active && { backgroundColor: T.magenta }]}
                              onPress={() => setDraft({ streamingWindowWeeks: w })}
                              testID={`hybrid-window-${w}`}>
                              <Text style={[s.miniBtnT, active && { color: T.cardDark }]}>{w === 0 ? '0w (Day & Date)' : `${w}w`}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {/* Release Calendar */}
          <Text style={s.section}>Target Release Date</Text>
          <TouchableOpacity style={s.crewBtn} onPress={() => setDraft({ /* toggle indirectly via state below */ })} testID="open-calendar-toggle">
            <MaterialCommunityIcons name="calendar-month" size={22} color={T.yellow} />
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={[s.crewLbl, { color: T.yellow }]}>RELEASE WEEK</Text>
              <Text style={s.crewName}>
                {draft.targetWeek && draft.targetYear
                  ? `Y${draft.targetYear} · ${monthOf(draft.targetWeek).name} W${monthOf(draft.targetWeek).weekInMonth} (Wk ${draft.targetWeek})`
                  : 'No date — title will start ON HOLD until you schedule from Current Movies.'}
              </Text>
              <Text style={s.crewSub}>
                Filming needs ≥ {filmingWeeks} weeks. {releaseHol ? `🎉 ${releaseHol.name} +${Math.round((releaseHol.mult - 1) * 100)}%` : 'No holiday boost'}
              </Text>
            </View>
          </TouchableOpacity>
          <CalendarInline
            state={state} draft={draft} setDraft={setDraft} filmingWeeks={filmingWeeks}
            effW={effW} effY={effY} />

          <Text style={s.section}>Crew</Text>
          <CrewSlot label="WRITER" person={writer} onPress={pickWriter} testID="pick-writer" />
          <CrewSlot label="DIRECTOR" person={director} onPress={pickDirector} testID="pick-director" />

          <Text style={s.section}>Cast</Text>
          {draft.cast.map((c, i) => {
            const t = c.talentId ? state.talents.find(tt => tt.id === c.talentId) : undefined;
            return (
              <View key={`cast-slot-${i}`} style={s.castWrap}>
                <View style={s.roleTypeRow}>
                  <TouchableOpacity
                    style={[s.miniBtn, (c.role === 'lead_actor' || c.role === 'lead_actress') && { backgroundColor: T.cyan }]}
                    onPress={() => {
                      const isFemale = t?.gender === 'female';
                      const newRole = isFemale ? 'lead_actress' : 'lead_actor';
                      const next = draft.cast.map((cc, idx) => idx === i ? { ...cc, role: newRole as any } : cc);
                      setDraft({ cast: next });
                    }}
                    testID={`cast-${i}-lead`}>
                    <Text style={[s.miniBtnT, (c.role === 'lead_actor' || c.role === 'lead_actress') && { color: T.cardDark }]}>Leading</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.miniBtn, (c.role === 'support_actor' || c.role === 'support_actress') && { backgroundColor: T.cyan }]}
                    onPress={() => {
                      const isFemale = t?.gender === 'female';
                      const newRole = isFemale ? 'support_actress' : 'support_actor';
                      const next = draft.cast.map((cc, idx) => idx === i ? { ...cc, role: newRole as any } : cc);
                      setDraft({ cast: next });
                    }}
                    testID={`cast-${i}-support`}>
                    <Text style={[s.miniBtnT, (c.role === 'support_actor' || c.role === 'support_actress') && { color: T.cardDark }]}>Supporting</Text>
                  </TouchableOpacity>
                  <Text style={[s.crewLbl, { color: T.cyan, paddingHorizontal: 8 }]}>CAST {i + 1}</Text>
                </View>
                <CrewSlot
                  label={prettyCastRole(c.role) + ` SLOT ${i + 1}`}
                  person={t} onPress={() => pickCast(i)}
                  testID={`pick-cast-${i}`}
                  rightExtra={t ? <Text style={[s.colorTag, { backgroundColor: COLOR_HEX[t.colorTrait] }]}>{t.colorTrait[0].toUpperCase()}</Text> : null} />
                {t ? (
                  <>
                    <TextInput
                      placeholder="Character / role name (optional)"
                      placeholderTextColor={T.textMute}
                      value={draft.castRoleNames[i]}
                      onChangeText={(v) => {
                        const next = [...draft.castRoleNames]; next[i] = v;
                        setDraft({ castRoleNames: next });
                      }}
                      style={s.smallInput}
                      maxLength={40} testID={`cast-${i}-role-name`} />
                    <TextInput
                      placeholder="Role description (optional)"
                      placeholderTextColor={T.textMute}
                      value={draft.castDescriptions[i]}
                      onChangeText={(v) => {
                        const next = [...draft.castDescriptions]; next[i] = v;
                        setDraft({ castDescriptions: next });
                      }}
                      style={[s.smallInput, { minHeight: 50 }]}
                      multiline maxLength={200} testID={`cast-${i}-desc`} />
                    {/* Inline negotiation: deal split + contract length — only for talents NOT under player contract */}
                    {(() => {
                      const isContractedToPlayer = t.underContract?.studioId === state.player.id;
                      if (isContractedToPlayer) {
                        const tc = t.underContract!;
                        return (
                          <View style={[s.acceptChip, { borderColor: T.cyan, backgroundColor: T.cyan + '22', marginTop: 8 }]}>
                            <Text style={[s.acceptT, { color: T.cyan }]} testID={`cast-${i}-contracted`}>
                              ⭐ Under Contract — {tc.remainingMovies} film{tc.remainingMovies !== 1 ? 's' : ''} left · ${tc.upfrontPaid.toFixed(1)}M upfront · {tc.boPercent}% BO (already negotiated)
                            </Text>
                          </View>
                        );
                      }
                      return (
                        <>
                          <Text style={[s.crewLbl, { color: T.yellow, marginTop: 8 }]}>DEAL SPLIT</Text>
                          <View style={s.btnRow}>
                            {(['actor_favored', 'middle', 'studio_favored'] as const).map(dt => {
                              const dlt = dealTerms(t.salary, dt);
                              const active = c.dealType === dt;
                              const label = dt === 'actor_favored' ? `Star ${dlt.salary.toFixed(1)}M+${dlt.boPercent}%BO`
                                : dt === 'middle' ? `Mid ${dlt.salary.toFixed(1)}M+${dlt.boPercent}%BO`
                                : `Studio ${dlt.salary.toFixed(1)}M+${dlt.boPercent}%BO`;
                              return (
                                <TouchableOpacity key={dt}
                                  style={[s.miniBtn, active && { backgroundColor: T.yellow }]}
                                  onPress={() => {
                                    const next = draft.cast.map((cc, idx) => idx === i ? { ...cc, dealType: dt } : cc);
                                    setDraft({ cast: next });
                                  }}
                                  testID={`cast-${i}-deal-${dt}`}>
                                  <Text style={[s.miniBtnT, active && { color: T.cardDark, fontSize: 10 }]} numberOfLines={1}>{label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <Text style={[s.crewLbl, { color: T.yellow, marginTop: 6 }]}>CONTRACT</Text>
                          <View style={s.btnRow}>
                            {(['single', 'pack3', 'hold5y'] as const).map(ck => {
                              const ct = contractTerms(ck);
                              const active = c.contractKind === ck;
                              const label = ck === 'single' ? '1 film'
                                : ck === 'pack3' ? `3-pic ×${ct.multiplier.toFixed(2)}`
                                : `5y hold ×${ct.multiplier.toFixed(2)}`;
                              return (
                                <TouchableOpacity key={ck}
                                  style={[s.miniBtn, active && { backgroundColor: T.cyan }]}
                                  onPress={() => {
                                    const next = draft.cast.map((cc, idx) => idx === i ? { ...cc, contractKind: ck } : cc);
                                    setDraft({ cast: next });
                                  }}
                                  testID={`cast-${i}-contract-${ck}`}>
                                  <Text style={[s.miniBtnT, active && { color: T.cardDark, fontSize: 10 }]}>{label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                          <TouchableOpacity
                            style={[s.miniBtn, { borderColor: T.magenta, marginTop: 6, alignSelf: 'flex-start' }]}
                            onPress={() => router.push({ pathname: '/negotiate/[talentId]', params: { talentId: t.id } })}
                            testID={`cast-${i}-go-negotiate`}
                          >
                            <Text style={[s.miniBtnT, { color: T.magenta, fontSize: 10 }]}>🤝 Open Full Negotiation →</Text>
                          </TouchableOpacity>
                          {/* Acceptance chip: shows whether talent will sign at current deal */}
                          {(() => {
                            const dlt = dealTerms(t.salary, c.dealType);
                            const ct = contractTerms(c.contractKind);
                            const upfront = dlt.salary * ct.multiplier;
                            const acc = calculateAcceptance(t, c.contractKind === 'single' ? 1 : c.contractKind === 'pack3' ? 3 : 5, upfront, dlt.boPercent);
                            const willSign = acc.verdict === 'will_accept' || acc.verdict === 'likely_accept';
                            const willCounter = acc.verdict === 'considering';
                            const color = willSign ? T.green : willCounter ? T.yellow : T.orange;
                            const label = willSign ? '✓ Will sign' : willCounter ? `🤝 Will counter — ${acc.reason}` : `✗ Will reject — ${acc.reason}`;
                            return (
                              <View style={[s.acceptChip, { borderColor: color, backgroundColor: color + '22' }]}>
                                <Text style={[s.acceptT, { color }]} testID={`cast-${i}-accept-status`}>{label}</Text>
                              </View>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </>
                ) : null}
              </View>
            );
          })}

          {/* Chemistry */}
          {chemColors.length > 1 && (
            <View style={s.chemRow}>
              <View style={s.chemDots}>
                {chemColors.map((c, i) => <View key={`chem-${c}-${i}`} style={[s.chemDot, { backgroundColor: COLOR_HEX[c] }]} />)}
              </View>
              <Text style={[s.chemTxt, { color: chemPct > 0 ? T.green : T.textDim }]}>
                Cast Chemistry: +{chemPct}%
              </Text>
            </View>
          )}

          <View style={s.summary}>
            <Text style={s.sumLabel}>Production: {productionCost.toFixed(1)}M</Text>
            <Text style={s.sumLabel}>Marketing: {draft.marketing.toFixed(1)}M</Text>
            {crossoverFee > 0 && (
              <>
                <Text style={[s.sumLabel, { color: T.yellow, marginTop: 6 }]}>Crossover Licensing: {crossoverFee.toFixed(1)}M</Text>
                {crossoverBreakdown.map(b => (
                  <Text key={b.name} style={[s.sumLabel, { fontSize: 11, color: T.textMute, marginLeft: 12 }]}>↳ {b.name} → {b.ownerName}: {b.fee.toFixed(0)}M</Text>
                ))}
              </>
            )}
            <Text style={[s.sumLabel, { color: T.green, fontSize: 18 }]}>TOTAL: {totalCost.toFixed(1)}M</Text>
            <Text style={s.cash}>Cash on hand: {(state.player.cash * 1000).toFixed(0)}M</Text>
          </View>

          <TouchableOpacity style={s.go} onPress={submit} testID="confirm-create-btn">
            <Text style={s.goTxt}>{draft.targetWeek ? 'START PRODUCTION' : 'START PRODUCTION (ON HOLD)'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function prettyCastRole(r: string) {
  return r.replace('lead_', 'LEADING ').replace('support_', 'SUPPORT ').replace('actor', 'ACTOR').replace('actress', 'ACTRESS');
}

function ChipRow({ items, value, onChange, testIDPrefix }: { items: string[]; value: string; onChange: (v: string) => void; testIDPrefix: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
      {items.map(it => (
        <TouchableOpacity key={it} onPress={() => onChange(it)} style={[s.chip, value === it && { backgroundColor: T.cyan, borderColor: T.cyan }]} testID={`${testIDPrefix}-${it}`}>
          <Text style={[s.chipT, value === it && { color: T.cardDark }]}>{it}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function CrewSlot({ label, person, onPress, testID, rightExtra }: { label: string; person?: any; onPress: () => void; testID?: string; rightExtra?: any }) {
  return (
    <TouchableOpacity style={s.crewBtn} onPress={onPress} testID={testID}>
      {person ? <Avatar skin={person.avatarColor} hair={person.hairColor} hairStyle={person.hairStyle} facialHair={person.facialHair} size={48} /> : <MaterialCommunityIcons name="account-search" size={32} color={T.cyan} />}
      <View style={{ flex: 1, paddingHorizontal: 10 }}>
        <Text style={[s.crewLbl, { color: T.cyan }]}>{label}</Text>
        <Text style={s.crewName} numberOfLines={1}>
          {person ? `${person.name}${person.underContract?.studioId ? ' ⭐' : ''}` : 'Tap to browse Talent Database →'}
        </Text>
        {person ? <Text style={s.crewSub}>Age {Math.floor(person.age)} · Skill {person.skill} · Fame {person.fame}</Text> : null}
      </View>
      {rightExtra}
      <MaterialCommunityIcons name="chevron-right" size={24} color={T.textMute} />
    </TouchableOpacity>
  );
}

function CalendarInline({ state, draft, setDraft, filmingWeeks, effW, effY }: any) {
  return (
    <View style={s.calendarPanel}>
      <Text style={s.calHint}>Tap a week to schedule. Earliest is week {filmingWeeks} from now. Leave empty to start ON HOLD.</Text>
      {[0, 1].map(yearOffset => {
        const yr = state.year + yearOffset;
        return (
          <View key={yr} style={s.calYear}>
            <Text style={s.calYearLabel}>Year {yr}</Text>
            <View style={s.calGrid}>
              {Array.from({ length: WEEKS_PER_YEAR }, (_, i) => i + 1).map(wk => {
                const totalFromNow = (yr - state.year) * WEEKS_PER_YEAR + (wk - state.week);
                const tooEarly = totalFromNow < filmingWeeks;
                const isPast = totalFromNow < 1;
                const hol = holidayFor(wk);
                const isSelected = draft.targetWeek === wk && draft.targetYear === yr;
                const isAuto = !draft.targetWeek && wk === effW && yr === effY;
                return (
                  <TouchableOpacity
                    key={wk}
                    disabled={tooEarly || isPast}
                    onPress={() => setDraft({ targetWeek: wk, targetYear: yr })}
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
      {draft.targetWeek && (
        <TouchableOpacity style={s.calClear} onPress={() => setDraft({ targetWeek: null, targetYear: null })} testID="cal-clear">
          <Text style={{ color: T.orange, fontWeight: '800' }}>Clear (start ON HOLD)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  smallInput: { backgroundColor: T.card, color: T.text, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, borderWidth: 1, borderColor: T.border, marginTop: 2 },
  acceptChip: { borderWidth: 2, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginTop: 6 },
  acceptT: { fontWeight: '800', fontSize: 11 },
  roleTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  brandRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  brandChip: { backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, flex: 1, alignItems: 'center' },
  brandChipT: { color: T.text, fontWeight: '800', fontSize: 12 },
  chemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, marginTop: 6 },
  chemDots: { flexDirection: 'row', gap: 4 },
  chemDot: { width: 12, height: 12, borderRadius: 6 },
  chemTxt: { fontWeight: '900', fontSize: 13 },
  brandPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 2, borderColor: T.green },
  brandTxt: { color: T.text, fontWeight: '900' },
  section: { color: T.text, fontWeight: '900', marginTop: 14, marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: T.cardDark, borderWidth: 2, borderColor: T.border, color: T.text, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, fontSize: 14 },
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
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: T.orange + '22', borderRadius: 6 },
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
  crossRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, borderRadius: 8, padding: 10, marginBottom: 6, borderWidth: 2, borderColor: T.border },
  crossName: { color: T.text, fontWeight: '900', fontSize: 13 },
  crossSub: { color: T.textDim, fontSize: 11 },
  crossFee: { fontWeight: '900', fontSize: 13 },
});
