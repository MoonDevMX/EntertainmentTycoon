import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T } from '../src/ui/theme';
import { TopBar } from '../src/ui/components';
import { NegotiationModal } from '../src/ui/NegotiationModal';
import { uiAlert } from '../src/ui/ui-alert';
import { getRel, relLabel } from '../src/game/data';

export default function Rivals() {
  const router = useRouter();
  const { state, quoteBulkLicenseDeal, proposeBulkCatalogLicense, acceptBulkCatalogOffer, counterBulkCatalogOffer, rejectBulkCatalogOffer, quoteBulkCatalogValue, quoteFutureReleasesValueB } = useGame();
  const [bulkRivalId, setBulkRivalId] = useState<string | null>(null);
  const [bulkSvcId, setBulkSvcId] = useState<string | null>(null);
  const [bulkMovies, setBulkMovies] = useState('5');
  const [bulkYears, setBulkYears] = useState('2');
  const [bulkTierIds, setBulkTierIds] = useState<string[]>([]);
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [activeFutureId, setActiveFutureId] = useState<string | null>(null);
  // Bulk Catalog Pack picker (existing rival films, must be ≥2 years old)
  const [pickRivalId, setPickRivalId] = useState<string | null>(null);
  const [pickSvcId, setPickSvcId] = useState<string | null>(null);
  const [pickYears, setPickYears] = useState('3');
  const [pickQuickN, setPickQuickN] = useState('');
  const [pickedMovieIds, setPickedMovieIds] = useState<string[]>([]);
  const [pickExclusive, setPickExclusive] = useState(false);
  const [pickTierIds, setPickTierIds] = useState<string[]>([]);
  if (!state) return null;

  const playerSvcs = (state.streamingServices || []).filter(svc => svc.studioId === state.player.id);
  const sortedRivals = [...state.rivals].sort((a, b) => {
    const sa = getRel(state.relationships, state.player.id, a.id);
    const sb = getRel(state.relationships, state.player.id, b.id);
    return sb - sa;
  });

  const openBulk = (rivalId: string) => {
    if (playerSvcs.length === 0) {
      uiAlert('No Streaming Service', 'Launch your own streaming service first to sign bulk licensing deals.');
      return;
    }
    setBulkRivalId(rivalId);
    setBulkSvcId(playerSvcs[0].id);
    setBulkMovies('5');
    setBulkYears('2');
    setBulkTierIds(playerSvcs[0].tiers.map(t => t.id));
  };

  const submitBulk = () => {
    if (!bulkRivalId || !bulkSvcId) return;
    const m = parseInt(bulkMovies, 10) || 0;
    const y = parseInt(bulkYears, 10) || 0;
    if (m < 1 || m > 50) { uiAlert('Invalid', 'Movies must be 1–50.'); return; }
    if (y < 1 || y > 10) { uiAlert('Invalid', 'Years must be 1–10.'); return; }
    const svc = playerSvcs.find(sv => sv.id === bulkSvcId);
    const allTiers = !svc || bulkTierIds.length === 0 || bulkTierIds.length >= svc.tiers.length;
    const fair = quoteFutureReleasesValueB(bulkRivalId, m, y);
    const opening = +(fair * 0.85).toFixed(3);
    const r = proposeBulkCatalogLicense({
      toRivalStudioId: bulkRivalId,
      movieIds: [],
      priceB: opening,
      years: y,
      serviceId: bulkSvcId,
      dealKind: 'future_releases',
      futureMovieCount: m,
      tierIds: allTiers ? undefined : bulkTierIds,
    });
    if (r.error) { uiAlert('Cannot open', r.error); return; }
    setBulkRivalId(null);
    if (r.offerId) setActiveFutureId(r.offerId);
  };

  const liveQuote = bulkRivalId && bulkSvcId ? quoteBulkLicenseDeal({
    rivalStudioId: bulkRivalId, serviceId: bulkSvcId,
    movieCount: parseInt(bulkMovies, 10) || 0,
    years: parseInt(bulkYears, 10) || 0,
  }) : null;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title={`Studios · ${state.rivals.length}`} onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <FlatList
        data={sortedRivals}
        keyExtractor={r => r.id}
        contentContainerStyle={{ padding: 12 }}
        initialNumToRender={8}
        renderItem={({ item: r }) => {
          const fr = state.franchises.filter(f => f.studioId === r.id);
          const score = getRel(state.relationships, state.player.id, r.id);
          const lbl = relLabel(score);
          // Active bulk deals between player and this rival
          const activeBulks = playerSvcs.flatMap(svc => (svc.bulkLicenseDeals || []).filter(d => d.rivalStudioId === r.id && (d.expiresYear * 48 + d.expiresWeek) >= (state.year * 48 + state.week)).map(d => ({ d, svcName: svc.name })));
          return (
            <View style={s.card}>
              <TouchableOpacity style={s.row} onPress={() => router.push(`/studio/${r.id}`)} testID={`rival-${r.id}`}>
                <View style={[s.logo, { backgroundColor: r.logoBg }]}>
                  <MaterialCommunityIcons name={r.logoIcon as any} size={32} color={T.yellow} />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.title} numberOfLines={1}>{r.name}</Text>
                    <View style={[s.relPill, { backgroundColor: lbl.color + '22', borderColor: lbl.color }]}>
                      <View style={[s.relDot, { backgroundColor: lbl.color }]} />
                      <Text style={[s.relTxt, { color: lbl.color }]}>{lbl.descriptor}</Text>
                    </View>
                  </View>
                  <Text style={s.sub}>★ {r.rating} · {r.releases} releases · {r.totalBO.toFixed(0)}B career</Text>
                  <Text style={s.subDim}>{score >= 0 ? '+' : ''}{score} relationship · {fr.length} franchises</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={T.textMute} />
              </TouchableOpacity>

              {/* Bulk License action */}
              <TouchableOpacity
                style={[s.bulkBtn, playerSvcs.length === 0 && { opacity: 0.55, borderStyle: 'dashed' }]}
                onPress={() => openBulk(r.id)}
                testID={`bulk-license-${r.id}`}
              >
                <MaterialCommunityIcons name="cash-multiple" size={16} color={T.yellow} />
                <Text style={s.bulkTxt}>Bulk-License Future Releases{playerSvcs.length === 0 ? ' (need streaming svc)' : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.bulkBtn, { borderColor: T.magenta, marginTop: 6 }, playerSvcs.length === 0 && { opacity: 0.55, borderStyle: 'dashed' }]}
                onPress={() => {
                  if (playerSvcs.length === 0) { uiAlert('No Streaming Service', 'Launch your own streaming service first to license rival catalogs.'); return; }
                  const eligible = state.movies.filter(m => m.studioId === r.id && m.status === 'released' && (state.year - m.releaseYear) >= 2);
                  if (eligible.length < 1) { uiAlert('Not Enough Catalog', `${r.name} has no films released ≥2 years ago. Catalog packs require older titles.`); return; }
                  // Pre-select up to 5 most recent eligible titles
                  const seed = [...eligible].sort((a, b) => (b.releaseYear * 100 + b.releaseWeek) - (a.releaseYear * 100 + a.releaseWeek)).slice(0, Math.min(5, eligible.length)).map(m => m.id);
                  setPickRivalId(r.id);
                  setPickSvcId(playerSvcs[0].id);
                  setPickYears('3');
                  setPickedMovieIds(seed);
                }}
                testID={`bulk-catalog-${r.id}`}
              >
                <MaterialCommunityIcons name="package-variant" size={16} color={T.magenta} />
                <Text style={[s.bulkTxt, { color: T.magenta }]}>Bulk Catalog Pack (Existing Films, ≥2y)</Text>
              </TouchableOpacity>
              {activeBulks.length > 0 && activeBulks.map((ab) => (
                <View key={ab.d.id} style={s.activeBulkRow}>
                  <Text style={s.activeBulkTxt}>📋 {ab.svcName}: {ab.d.movieCountTotal - ab.d.moviesUsed} films left · expires Y{ab.d.expiresYear}</Text>
                </View>
              ))}

              {fr.length > 0 && (
                <View style={s.fr}>
                  <Text style={s.frHeader}>Franchises (tap to license a crossover)</Text>
                  {fr.map(f => (
                    <TouchableOpacity
                      key={f.id}
                      style={s.frRow}
                      onPress={() => router.push(`/franchise/${f.id}`)}
                      testID={`rival-fr-${f.id}`}
                    >
                      <View style={[s.miniIcon, { backgroundColor: f.iconBg }]}>
                        <MaterialCommunityIcons name={f.iconKey as any} size={18} color="#fff" />
                      </View>
                      <Text style={s.frName} numberOfLines={1}>{f.name}</Text>
                      <Text style={s.frPop}>pop {f.popularity}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={T.textMute} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal visible={!!bulkRivalId} transparent animationType="slide" onRequestClose={() => setBulkRivalId(null)}>
        {bulkRivalId ? (() => {
          const rival = state.rivals.find(r => r.id === bulkRivalId);
          if (!rival) return <View />;
          const svc = playerSvcs.find(sv => sv.id === bulkSvcId);
          const tiersByPrice = svc ? [...svc.tiers].sort((a, b) => a.price - b.price) : [];
          const allTiers = !svc || bulkTierIds.length === 0 || bulkTierIds.length >= svc.tiers.length;
          return (
            <View style={s.modalBg}>
              <SafeAreaView edges={['top']} style={{ width: '100%' }}>
                <View style={[s.modalCard, { maxHeight: '88%' }]}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                    <Text style={s.modalTitle}>Bulk License — {rival.name}</Text>
                    <Text style={s.modalSub}>Pay upfront. Future releases auto-stream on YOUR service until quota or term expires.</Text>

                    <Text style={s.fieldLbl}>YOUR SERVICE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {playerSvcs.map(sv => (
                        <TouchableOpacity key={sv.id} style={[s.chip, bulkSvcId === sv.id && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                          onPress={() => { setBulkSvcId(sv.id); setBulkTierIds(sv.tiers.map(t => t.id)); }}
                          testID={`bulk-svc-${sv.id}`}>
                          <Text style={[s.chipTxt, bulkSvcId === sv.id && { color: T.cardDark }]}>{sv.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {svc ? (
                      <>
                        <Text style={s.fieldLbl}>TIER HIERARCHY (which tiers stream these films)</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          <TouchableOpacity style={[s.chip, allTiers && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                            onPress={() => setBulkTierIds(svc.tiers.map(t => t.id))} testID="bulk-tier-all">
                            <Text style={[s.chipTxt, allTiers && { color: T.cardDark }]}>All Tiers</Text>
                          </TouchableOpacity>
                          {tiersByPrice.map((t, idx) => {
                            if (idx === 0) return null;
                            const ladder = tiersByPrice.slice(idx).map(x => x.id);
                            const isLadder = !allTiers && ladder.length === bulkTierIds.length && ladder.every(tid => bulkTierIds.includes(tid));
                            return (
                              <TouchableOpacity key={`bulk-ladder-${t.id}`}
                                style={[s.chip, isLadder && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                                onPress={() => setBulkTierIds(ladder)} testID={`bulk-tier-ladder-${t.id}`}>
                                <Text style={[s.chipTxt, isLadder && { color: T.cardDark }]}>{t.name}+</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {svc.tiers.map(t => {
                            const active = bulkTierIds.includes(t.id);
                            return (
                              <TouchableOpacity key={t.id}
                                style={[s.chip, active && { backgroundColor: T.green, borderColor: T.green }]}
                                onPress={() => setBulkTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                                testID={`bulk-tier-${t.id}`}>
                                <Text style={[s.chipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : null}

                    <Text style={s.fieldLbl}>NUMBER OF MOVIES (1–50)</Text>
                    <TextInput value={bulkMovies} onChangeText={(v) => setBulkMovies(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={2} style={s.inp} testID="bulk-movies-input" />

                    <Text style={s.fieldLbl}>YEARS (1–10)</Text>
                    <TextInput value={bulkYears} onChangeText={(v) => setBulkYears(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={2} style={s.inp} testID="bulk-years-input" />

                    {liveQuote && !liveQuote.error ? (
                      <View style={s.quoteBox}>
                        <Text style={s.quoteLbl}>OPENING OFFER (negotiable)</Text>
                        <Text style={s.quoteVal}>${(liveQuote.feeM / 1000 * 0.85).toFixed(2)}B</Text>
                        <Text style={s.quoteSub}>Fair value: ${(liveQuote.feeM / 1000).toFixed(2)}B · Cash: ${state.player.cash.toFixed(2)}B</Text>
                      </View>
                    ) : null}

                    <TouchableOpacity style={s.signBtn} onPress={submitBulk} testID="bulk-sign-btn">
                      <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                      <Text style={s.signTxt}>OPEN NEGOTIATION</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.cancelBtn} onPress={() => setBulkRivalId(null)}>
                      <Text style={s.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </SafeAreaView>
            </View>
          );
        })() : <View />}
      </Modal>

      {/* Bulk Catalog Pack — pick movies modal (player chooses which rival catalog films to license) */}
      <Modal visible={!!pickRivalId} transparent={false} animationType="slide" onRequestClose={() => setPickRivalId(null)}>
        {pickRivalId ? (() => {
          const rival = state.rivals.find(r => r.id === pickRivalId);
          if (!rival) return <View />;
          const eligible = state.movies.filter(m => m.studioId === rival.id && m.status === 'released' && (state.year - m.releaseYear) >= 2)
            .sort((a, b) => (b.releaseYear * 100 + b.releaseWeek) - (a.releaseYear * 100 + a.releaseWeek));
          const yrs = parseInt(pickYears, 10) || 0;
          const fair = pickedMovieIds.length > 0 && yrs > 0 ? quoteBulkCatalogValue(pickedMovieIds, yrs) : 0;
          const opening = +(fair * 0.85).toFixed(3);
          const cashB = state.player.cash;
          const pickSvc = playerSvcs.find(sv => sv.id === pickSvcId);
          const pickTiersByPrice = pickSvc ? [...pickSvc.tiers].sort((a, b) => a.price - b.price) : [];
          const pickAllTiers = !pickSvc || pickTierIds.length === 0 || pickTierIds.length >= pickSvc.tiers.length;
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              {/* Sticky header */}
              <View style={s.fsHeader}>
                <TouchableOpacity onPress={() => setPickRivalId(null)} style={s.fsHeaderBtn} testID="pick-close-btn">
                  <MaterialCommunityIcons name="close" size={22} color={T.text} />
                </TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>Catalog Pack — {rival.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <Text style={s.modalSub}>Pick films at least 2 years post-release. Price scales with selection size and term.</Text>

                <Text style={s.fieldLbl}>YOUR STREAMING SERVICE</Text>
                {playerSvcs.length === 0 ? (
                  <Text style={[s.modalSub, { color: T.orange, marginTop: 6 }]}>⚠ Launch a streaming service first to license catalog.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {playerSvcs.map(svc => {
                      const active = pickSvcId === svc.id;
                      return (
                        <TouchableOpacity key={svc.id}
                          style={[s.svcPickChip, active && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                          onPress={() => { setPickSvcId(svc.id); setPickTierIds(svc.tiers.map(t => t.id)); }}
                          testID={`pick-svc-${svc.id}`}
                        >
                          <MaterialCommunityIcons name="play-circle" size={16} color={active ? T.cardDark : T.cyan} />
                          <Text style={[s.svcPickTxt, active && { color: T.cardDark }]}>{svc.name}</Text>
                          <Text style={[s.svcPickSub, active && { color: T.cardDark }]}>{svc.tiers.length} tiers · {svc.subscribers >= 1_000_000 ? (svc.subscribers / 1_000_000).toFixed(1) + 'M' : (svc.subscribers / 1000).toFixed(0) + 'K'} subs</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {pickSvc ? (
                  <>
                    <Text style={s.fieldLbl}>TIER HIERARCHY (which tiers stream these films)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      <TouchableOpacity style={[s.chip, pickAllTiers && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                        onPress={() => setPickTierIds(pickSvc.tiers.map(t => t.id))} testID="pick-tier-all">
                        <Text style={[s.chipTxt, pickAllTiers && { color: T.cardDark }]}>All Tiers</Text>
                      </TouchableOpacity>
                      {pickTiersByPrice.map((t, idx) => {
                        if (idx === 0) return null;
                        const ladder = pickTiersByPrice.slice(idx).map(x => x.id);
                        const isLadder = !pickAllTiers && ladder.length === pickTierIds.length && ladder.every(tid => pickTierIds.includes(tid));
                        return (
                          <TouchableOpacity key={`pick-ladder-${t.id}`}
                            style={[s.chip, isLadder && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                            onPress={() => setPickTierIds(ladder)} testID={`pick-tier-ladder-${t.id}`}>
                            <Text style={[s.chipTxt, isLadder && { color: T.cardDark }]}>{t.name}+</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                      {pickSvc.tiers.map(t => {
                        const active = pickTierIds.includes(t.id);
                        return (
                          <TouchableOpacity key={t.id}
                            style={[s.chip, active && { backgroundColor: T.green, borderColor: T.green }]}
                            onPress={() => setPickTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                            testID={`pick-tier-${t.id}`}>
                            <Text style={[s.chipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
                  <Text style={s.fieldLbl}>YEARS (1–10)</Text>
                  <TouchableOpacity onPress={() => setPickedMovieIds(eligible.map(m => m.id))} testID="pick-all-btn">
                    <Text style={[s.bulkTxt, { color: T.cyan }]}>Select All ({eligible.length})</Text>
                  </TouchableOpacity>
                </View>
                <TextInput value={pickYears} onChangeText={(v) => setPickYears(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={2} style={s.inp} testID="pick-years-input" />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 8 }}>
                  <Text style={s.fieldLbl}>SELECT FILMS ({pickedMovieIds.length} picked)</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={s.quickBtn} onPress={() => setPickedMovieIds([])} testID="pick-clear">
                      <Text style={s.quickBtnTxt}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {/* V35 — quick-select N latest films via keyboard input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <Text style={{ color: T.textDim, fontSize: 11, fontWeight: '700' }}>Quick-select latest</Text>
                  <TextInput
                    value={pickQuickN}
                    onChangeText={(v) => setPickQuickN(v.replace(/[^0-9]/g, '').slice(0, 3))}
                    keyboardType="numeric"
                    placeholder="N"
                    placeholderTextColor={T.textMute}
                    style={[s.inp, { flex: 0, width: 60, marginTop: 0, padding: 8, textAlign: 'center' }]}
                    testID="pick-quick-n"
                  />
                  <TouchableOpacity style={s.quickBtn} onPress={() => {
                    const n = parseInt(pickQuickN, 10) || 0;
                    if (n <= 0) return;
                    setPickedMovieIds(eligible.slice(0, n).map(m => m.id));
                  }} testID="pick-quick-apply"><Text style={s.quickBtnTxt}>Pick latest N</Text></TouchableOpacity>
                  <TouchableOpacity style={s.quickBtn} onPress={() => {
                    const n = parseInt(pickQuickN, 10) || 0;
                    if (n <= 0) return;
                    const topByBO = [...eligible].sort((a, b) => b.boxOffice - a.boxOffice).slice(0, n);
                    setPickedMovieIds(topByBO.map(m => m.id));
                  }} testID="pick-quick-top"><Text style={s.quickBtnTxt}>Top N by BO</Text></TouchableOpacity>
                </View>
                <View style={{ marginTop: 6 }}>
                  {eligible.length === 0 ? (
                    <Text style={s.modalSub}>No catalog films are at least 2 years old yet.</Text>
                  ) : eligible.map(m => {
                    const selected = pickedMovieIds.includes(m.id);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[s.movieCheckRow, selected && { borderColor: T.green, backgroundColor: 'rgba(166,226,46,0.18)' }]}
                        onPress={() => setPickedMovieIds(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                        testID={`pick-movie-${m.id}`}
                      >
                        <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={selected ? T.green : T.textMute} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={s.movieRowTitle} numberOfLines={1}>{m.title}</Text>
                          <Text style={s.movieRowSub}>Y{m.releaseYear} · {m.criticScore}/100 · ${m.boxOffice.toFixed(2)}B BO</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {fair > 0 ? (
                  <View style={s.quoteBox}>
                    <Text style={s.quoteLbl}>OPENING OFFER {pickExclusive ? '· EXCLUSIVE' : ''}</Text>
                    <Text style={s.quoteVal}>${(opening * (pickExclusive ? 1.6 : 1)).toFixed(2)}B</Text>
                    <Text style={s.quoteSub}>Fair value: ${(fair * (pickExclusive ? 1.6 : 1)).toFixed(2)}B · Cash: ${cashB.toFixed(2)}B</Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                  <TouchableOpacity
                    style={[s.bulkBtn, { flex: 1 }, pickExclusive && { backgroundColor: T.yellow + '33', borderColor: T.yellow }]}
                    onPress={() => setPickExclusive(v => !v)}
                    testID="pick-exclusive-toggle"
                  >
                    <MaterialCommunityIcons name={pickExclusive ? 'lock' : 'lock-open-variant-outline'} size={16} color={pickExclusive ? T.yellow : T.textDim} />
                    <Text style={[s.bulkTxt, pickExclusive && { color: T.yellow }]}>{pickExclusive ? 'EXCLUSIVE (×1.6 fee, strips other svcs)' : 'Non-exclusive'}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[s.signBtn, (pickedMovieIds.length === 0 || yrs < 1) && { opacity: 0.5 }]}
                  disabled={pickedMovieIds.length === 0 || yrs < 1 || !pickSvcId}
                  onPress={() => {
                    if (!pickRivalId || !pickSvcId) return;
                    if (pickedMovieIds.length === 0) { uiAlert('Pick films', 'Select at least one film.'); return; }
                    if (yrs < 1 || yrs > 10) { uiAlert('Invalid Years', 'Years must be 1–10.'); return; }
                    const finalPrice = +(opening * (pickExclusive ? 1.6 : 1)).toFixed(3);
                    const result = proposeBulkCatalogLicense({ toRivalStudioId: pickRivalId, movieIds: pickedMovieIds, priceB: finalPrice, years: yrs, serviceId: pickSvcId, exclusivity: pickExclusive, tierIds: pickAllTiers ? undefined : pickTierIds });
                    if (result.error) { uiAlert('Failed', result.error); return; }
                    setPickRivalId(null);
                    setPickExclusive(false);
                    if (result.offerId) setActiveCatalogId(result.offerId);
                  }}
                  testID="pick-propose-btn"
                >
                  <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                  <Text style={s.signTxt}>OPEN NEGOTIATION</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setPickRivalId(null)}>
                  <Text style={s.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })() : <View />}
      </Modal>

      {/* Bulk catalog negotiation (player → rival, existing films) */}
      {(() => {
        const liveCatalog = activeCatalogId ? (state.bulkCatalogOffers || []).find(o => o.id === activeCatalogId && o.status === 'pending') : null;
        if (!liveCatalog) return null;
        const playerActor: 'from' | 'to' = liveCatalog.fromStudioId === state.player.id ? 'from' : 'to';
        const used = liveCatalog.history.filter(h => h.actor === playerActor).length;
        const playerSide: 'buyer' | 'seller' = liveCatalog.fromStudioId === state.player.id ? 'buyer' : 'seller';
        return (
          <NegotiationModal
            visible={!!liveCatalog}
            subjectTitle={`${liveCatalog.movieIds.length}-title catalog pack`}
            subtitle={`${liveCatalog.years}-year license`}
            currentPriceB={liveCatalog.priceB}
            fairValueB={quoteBulkCatalogValue(liveCatalog.movieIds, liveCatalog.years)}
            playerSide={playerSide}
            roundsLeft={Math.max(0, liveCatalog.maxRounds - used)}
            message={liveCatalog.message}
            history={liveCatalog.history}
            onAccept={() => {
              const r = acceptBulkCatalogOffer(liveCatalog.id);
              if (r.error) { uiAlert('Failed', r.error); return; }
              uiAlert('Pack Closed ✓', `Settled at $${liveCatalog.priceB.toFixed(2)}B for ${liveCatalog.movieIds.length} titles.`);
              setActiveCatalogId(null);
            }}
            onCounter={(v: number) => {
              const r = counterBulkCatalogOffer(liveCatalog.id, v);
              if (r.error) { uiAlert('Counter Failed', r.error); }
            }}
            onReject={() => { rejectBulkCatalogOffer(liveCatalog.id); setActiveCatalogId(null); }}
            onClose={() => setActiveCatalogId(null)}
          />
        );
      })()}

      {/* Future releases bulk-license negotiation (player → rival, next N films) */}
      {(() => {
        const liveFut = activeFutureId ? (state.bulkCatalogOffers || []).find(o => o.id === activeFutureId && o.status === 'pending') : null;
        if (!liveFut) return null;
        const playerActor: 'from' | 'to' = liveFut.fromStudioId === state.player.id ? 'from' : 'to';
        const used = liveFut.history.filter(h => h.actor === playerActor).length;
        const playerSide: 'buyer' | 'seller' = liveFut.fromStudioId === state.player.id ? 'buyer' : 'seller';
        const rival = state.rivals.find(r => r.id === liveFut.toStudioId);
        return (
          <NegotiationModal
            visible={!!liveFut}
            subjectTitle={`${liveFut.futureMovieCount} future ${rival?.name || ''} films`}
            subtitle={`${liveFut.years}-year bulk license`}
            currentPriceB={liveFut.priceB}
            fairValueB={quoteFutureReleasesValueB(liveFut.toStudioId, liveFut.futureMovieCount || 1, liveFut.years)}
            playerSide={playerSide}
            roundsLeft={Math.max(0, liveFut.maxRounds - used)}
            message={liveFut.message}
            history={liveFut.history}
            onAccept={() => {
              const r = acceptBulkCatalogOffer(liveFut.id);
              if (r.error) { uiAlert('Failed', r.error); return; }
              uiAlert('Deal Closed ✓', `Settled at $${liveFut.priceB.toFixed(2)}B for ${liveFut.futureMovieCount} future films / ${liveFut.years}y.`);
              setActiveFutureId(null);
            }}
            onCounter={(v: number) => {
              const r = counterBulkCatalogOffer(liveFut.id, v);
              if (r.error) { uiAlert('Counter Failed', r.error); }
            }}
            onReject={() => { rejectBulkCatalogOffer(liveFut.id); setActiveFutureId(null); }}
            onClose={() => setActiveFutureId(null)}
          />
        );
      })()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  card: { backgroundColor: T.cardDark, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 2, borderColor: T.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.border },
  title: { color: T.text, fontSize: 17, fontWeight: '900', flexShrink: 1 },
  sub: { color: T.textDim, fontSize: 12, marginTop: 4 },
  subDim: { color: T.textMute, fontSize: 11, marginTop: 2, fontWeight: '700' },
  relPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, gap: 4 },
  relDot: { width: 6, height: 6, borderRadius: 3 },
  relTxt: { fontWeight: '900', fontSize: 10 },
  fr: { marginTop: 10, borderTopWidth: 1, borderTopColor: T.border, paddingTop: 8 },
  frHeader: { color: T.textMute, fontSize: 11, fontWeight: '800', marginBottom: 6 },
  frRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 8, borderRadius: 8, marginBottom: 4, gap: 8 },
  miniIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  frName: { color: T.text, fontWeight: '800', flex: 1 },
  frPop: { color: T.cyan, fontWeight: '700', fontSize: 12 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.card, padding: 10, borderRadius: 8, marginTop: 10, borderWidth: 1.5, borderColor: T.yellow, justifyContent: 'center' },
  bulkTxt: { color: T.yellow, fontWeight: '900', fontSize: 12 },
  activeBulkRow: { backgroundColor: T.green + '22', padding: 6, borderRadius: 6, marginTop: 4, borderLeftWidth: 3, borderLeftColor: T.green },
  activeBulkTxt: { color: T.text, fontSize: 11, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 6 },
  fsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.cardDark },
  fsHeaderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fsHeaderTitle: { flex: 1, color: T.text, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  quickBtn: { backgroundColor: T.cardDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: T.cyan },
  quickBtnTxt: { color: T.cyan, fontWeight: '900', fontSize: 11 },
  modalCard: { backgroundColor: '#4d5058', padding: 18, borderRadius: 18, borderWidth: 3, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  modalSub: { color: T.textDim, fontSize: 12, marginTop: 4 },
  fieldLbl: { color: T.yellow, marginTop: 14, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  inp: { backgroundColor: T.cardDark, color: T.text, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginTop: 6, fontSize: 18, fontWeight: '900' },
  chip: { backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginRight: 6 },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 12 },
  quoteBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 2, borderColor: T.green, alignItems: 'center' },
  quoteLbl: { color: T.green, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  quoteVal: { color: T.green, fontSize: 28, fontWeight: '900' },
  quoteSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  signBtn: { flexDirection: 'row', backgroundColor: T.green, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6, borderWidth: 2, borderColor: T.border },
  signTxt: { color: T.cardDark, fontWeight: '900' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: T.textDim, fontWeight: '700' },
  movieCheckRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 8, marginVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: T.border },
  movieRowTitle: { color: T.text, fontSize: 13, fontWeight: '800' },
  movieRowSub: { color: T.textDim, fontSize: 11 },
  svcPickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.cardDark, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 2, borderColor: T.cyan },
  svcPickTxt: { color: T.text, fontWeight: '900', fontSize: 13 },
  svcPickSub: { color: T.textDim, fontSize: 11, fontWeight: '700' },
});
