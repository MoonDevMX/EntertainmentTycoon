import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../src/game/state';
import { T } from '../../src/ui/theme';
import { TopBar, IconTile, NeonStat, SectionHeader } from '../../src/ui/components';
import { NegotiationModal } from '../../src/ui/NegotiationModal';
import { uiAlert } from '../../src/ui/ui-alert';

export default function FranchiseDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, proposeFranchiseTrade, acceptFranchiseOffer, counterFranchiseOffer, rejectFranchiseOffer, quoteFranchiseValue, quoteFranchiseBulkLicense, proposeBulkCatalogLicense, acceptBulkCatalogOffer, counterBulkCatalogOffer, rejectBulkCatalogOffer, quoteFranchiseBulkValueB, addMovieToStreaming, broadcastBulkCatalogLicense } = useGame();
  const [tradeOpen, setTradeOpen] = useState(false);
  const [activeTradeId, setActiveTradeId] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSvcId, setBulkSvcId] = useState<string | null>(null);
  const [bulkYears, setBulkYears] = useState('5');
  const [bulkTierIds, setBulkTierIds] = useState<string[]>([]);
  const [activeFranchiseBulkId, setActiveFranchiseBulkId] = useState<string | null>(null);
  // V30 — Add Franchise to MY streaming (for owned franchises)
  const [streamAddOpen, setStreamAddOpen] = useState(false);
  const [streamAddSvcId, setStreamAddSvcId] = useState<string | null>(null);
  const [streamAddTierIds, setStreamAddTierIds] = useState<string[]>([]);
  // V30 (merged) — Offer franchise to a RIVAL's streaming service (not external IP)
  const [offerRivalOpen, setOfferRivalOpen] = useState(false);
  const [offerRivalSvcId, setOfferRivalSvcId] = useState<string | null>(null);
  const [offerRivalYears, setOfferRivalYears] = useState('5');
  const [offerRivalPrice, setOfferRivalPrice] = useState('');
  // V37b — exclusivity option on outbound franchise broadcast
  const [offerRivalExclusive, setOfferRivalExclusive] = useState(false);
  if (!state) return null;
  const franchise = state.franchises.find(f => f.id === id);
  if (!franchise) return <View><Text>Not found</Text></View>;
  const movies = state.movies.filter(m => m.franchiseId === id).sort((a, b) => (a.releaseYear * 100 + a.releaseWeek) - (b.releaseYear * 100 + b.releaseWeek));
  const totalBO = movies.reduce((a, b) => a + b.boxOffice, 0);
  const own = franchise.studioId === state.player.id;
  const owner = own ? state.player : state.rivals.find(r => r.id === franchise.studioId);

  // Aggregate franchise stats (NEW)
  const investedM = movies.reduce((a, b) => a + (b.budget || 0) + (b.marketingBudget || 0), 0);
  const totalAwards = movies.reduce((a, b) => a + (b.awards || 0), 0);
  // Streaming availability — services carrying any movie of this franchise
  const movieIds = new Set(movies.map(m => m.id));
  const carryingServices = (state.streamingServices || []).filter(svc => svc.catalogMovieIds.some(mid => movieIds.has(mid)));
  // Crossover analysis: movies in this franchise that are crossovers; collect involved franchise IDs from those movies
  const crossoverMovies = movies.filter(m => m.brand === 'Crossover' || (m.crossoverFranchiseIds && m.crossoverFranchiseIds.length));
  const involvedFranchiseIds = new Set<string>();
  crossoverMovies.forEach(m => { m.crossoverFranchiseIds?.forEach(fid => involvedFranchiseIds.add(fid)); });
  const involvedFranchises = Array.from(involvedFranchiseIds).map(fid => state.franchises.find(f => f.id === fid)).filter(Boolean) as typeof state.franchises;
  const involvedStudios = new Set<string>([franchise.studioId, ...involvedFranchises.map(f => f.studioId)]);
  const involvedStudioNames = Array.from(involvedStudios).map(sid => sid === state.player.id ? state.player.name : state.rivals.find(r => r.id === sid)?.name || '—');

  const make = (brand: 'Sequel' | 'Prequel' | 'Spinoff' | 'Crossover') => {
    if (!own) return;
    router.push({ pathname: '/create-movie', params: { brand, franchiseId: franchise.id } });
  };

  // === Pull-and-push franchise trade flow ===
  const fairValue = quoteFranchiseValue(franchise.id);
  const activeTrade = activeTradeId ? (state.franchiseOffers || []).find(o => o.id === activeTradeId && o.status === 'pending') : null;
  const startSell = () => {
    const ask = +(fairValue * 1.1).toFixed(2); // start 10% above fair
    const r = proposeFranchiseTrade({ franchiseId: franchise.id, kind: 'sell', priceB: ask });
    if (r.error) { uiAlert('Cannot Sell', r.error); return; }
    if (r.offerId) setActiveTradeId(r.offerId);
    setTradeOpen(true);
  };
  const startBuy = () => {
    const bid = +(fairValue * 0.9).toFixed(2); // start 10% below fair
    const r = proposeFranchiseTrade({ franchiseId: franchise.id, kind: 'buy', priceB: bid });
    if (r.error) { uiAlert('Cannot Buy', r.error); return; }
    if (r.offerId) setActiveTradeId(r.offerId);
    setTradeOpen(true);
  };
  // Re-read live offer after each action — so AI counter shows up.
  const liveOffer = activeTradeId ? (state.franchiseOffers || []).find(o => o.id === activeTradeId) : null;
  const playerSide: 'buyer' | 'seller' = liveOffer ? ((liveOffer.kind === 'buy' && liveOffer.fromStudioId === state.player.id) || (liveOffer.kind === 'sell' && liveOffer.toStudioId === state.player.id) ? 'buyer' : 'seller') : 'buyer';
  const playerActor: 'from' | 'to' = liveOffer && liveOffer.fromStudioId === state.player.id ? 'from' : 'to';
  const playerRoundsUsed = liveOffer ? liveOffer.history.filter(h => h.actor === playerActor).length : 0;
  const roundsLeft = liveOffer ? Math.max(0, liveOffer.maxRounds - playerRoundsUsed) : 0;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Franchise" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.header}>
          <IconTile icon={franchise.iconKey} color={franchise.iconBg} size={120} />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={s.title}>{franchise.name}</Text>
            <Text style={s.sub}>{owner?.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              <NeonStat label="POP" value={franchise.popularity} color={T.cyan} />
              <NeonStat label="FILMS" value={movies.length} color={T.yellow} />
              <NeonStat label="SERIES" value={(state.tvSeries || []).filter(sr => sr.franchiseId === franchise.id).length} color={T.magenta} />
              <NeonStat label="AWARDS" value={totalAwards} color={T.pink} />
              <NeonStat label="CAREER BO" value={`${totalBO.toFixed(2)} B`} color={T.magenta} />
              <NeonStat label="INVESTED" value={`${investedM.toFixed(0)} M`} color={T.green} />
            </ScrollView>
          </View>
        </View>

        <SectionHeader title="Streaming Availability" />
        <View style={s.statsBox}>
          {carryingServices.length === 0 ? (
            <Text style={s.statTxt}>None of this franchise's films are currently on any streaming service.</Text>
          ) : carryingServices.map(svc => {
            const ownerStudio = svc.studioId === state.player.id ? state.player : state.rivals.find(r => r.id === svc.studioId);
            // V37 — Distinguish owned-catalog vs. licensed-in titles; show earliest expiry for licensed slate.
            const matchingMovieIds = svc.catalogMovieIds.filter(mid => movieIds.has(mid));
            const matchingLicenses = (svc.licensedMovies || []).filter(lm => movieIds.has(lm.movieId));
            const earliestExpiry = matchingLicenses.length > 0
              ? matchingLicenses.reduce((min, lm) => {
                  const score = lm.expiresYear * 48 + lm.expiresWeek;
                  return score < (min.expiresYear * 48 + min.expiresWeek) ? lm : min;
                }, matchingLicenses[0])
              : null;
            const isOwnedByPlayer = svc.studioId === state.player.id;
            return (
              <View key={svc.id} style={[s.streamRow, { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 6, gap: 2 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="play-circle" size={18} color={T.magenta} />
                  <Text style={s.statTxt} numberOfLines={1}>
                    <Text style={{ color: T.text, fontWeight: '900' }}>{svc.name}</Text> ({ownerStudio?.name}) · {matchingMovieIds.length} title{matchingMovieIds.length === 1 ? '' : 's'}
                  </Text>
                </View>
                {earliestExpiry ? (
                  <Text style={[s.statTxt, { color: T.yellow, fontSize: 11, marginLeft: 24 }]}>
                    Licensed-in · expires W{earliestExpiry.expiresWeek}/Y{earliestExpiry.expiresYear}{matchingLicenses.length > 1 ? ` (earliest of ${matchingLicenses.length})` : ''}{earliestExpiry.exclusivity ? ' · EXCLUSIVE' : ''}
                  </Text>
                ) : (
                  <Text style={[s.statTxt, { color: T.green, fontSize: 11, marginLeft: 24 }]}>
                    {isOwnedByPlayer ? 'Owned catalog (no expiry)' : 'Rival\'s owned catalog (not licensed — wait for unwind or buy IP)'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* V30 — Owned franchise: Add to my streaming + Offer to license to other streamers */}
        {own && (
          <>
            <SectionHeader title="Streaming Plays" />
            <View style={s.actionsRow}>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: T.cyan }]}
                onPress={() => {
                  const myServices = (state.streamingServices || []).filter(sv => sv.studioId === state.player.id);
                  if (myServices.length === 0) { uiAlert('No service', 'Launch your own streaming service first.'); return; }
                  setStreamAddSvcId(myServices[0].id);
                  setStreamAddTierIds(myServices[0].tiers.map(t => t.id));
                  setStreamAddOpen(true);
                }}
                testID="franchise-add-streaming-btn"
              >
                <MaterialCommunityIcons name="play-circle" size={18} color={T.cardDark} />
                <Text style={s.actionTxt}>Add Franchise to My Streaming</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: T.magenta }]}
                onPress={() => {
                  // V37 — Direct franchise broadcast to rival streamers (replaces old External IP "streaming series" flow).
                  const rivalSvcs = (state.streamingServices || []).filter(sv => sv.studioId !== state.player.id);
                  if (rivalSvcs.length === 0) { uiAlert('No rivals', 'No rival streaming services available right now.'); return; }
                  const fair = quoteFranchiseBulkValueB(franchise.id, 5);
                  setOfferRivalYears('5');
                  setOfferRivalPrice(fair.toFixed(2));
                  setOfferRivalOpen(true);
                }}
                testID="franchise-offer-rivals-btn"
              >
                <MaterialCommunityIcons name="bullhorn" size={18} color={T.cardDark} />
                <Text style={s.actionTxt}>Publish Offer · License to Streaming Services</Text>
              </TouchableOpacity>
              {/* V41 — Quick link to license franchise content to TV networks */}
              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: T.cyan, marginTop: 6 }]}
                onPress={() => router.push('/tv-networks')}
                testID="franchise-license-tv-btn"
              >
                <MaterialCommunityIcons name="television-classic" size={18} color={T.cardDark} />
                <Text style={s.actionTxt}>License to TV Network</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {(crossoverMovies.length > 0 || involvedFranchises.length > 0) ? (
          <>
            <SectionHeader title="Crossover Universe" />
            <View style={s.statsBox}>
              {involvedStudioNames.length > 1 ? (
                <Text style={s.statTxt}>Studios involved: <Text style={{ color: T.cyan, fontWeight: '900' }}>{involvedStudioNames.join(' · ')}</Text></Text>
              ) : null}
              {involvedFranchises.length > 0 ? (
                <View style={{ marginTop: 6 }}>
                  <Text style={[s.statTxt, { fontWeight: '900', color: T.text }]}>Tied Franchises:</Text>
                  {involvedFranchises.map(f => {
                    const ownerName = f.studioId === state.player.id ? state.player.name : state.rivals.find(r => r.id === f.studioId)?.name || '—';
                    return (
                      <TouchableOpacity key={f.id} style={s.crossRow} onPress={() => router.push(`/franchise/${f.id}`)} testID={`crossover-fr-${f.id}`}>
                        <IconTile icon={f.iconKey} color={f.iconBg} size={32} />
                        <View style={{ flex: 1, paddingHorizontal: 8 }}>
                          <Text style={s.crossTitle}>{f.name}</Text>
                          <Text style={s.crossSub}>{ownerName}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={20} color={T.textDim} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {own ? (
          <>
            <SectionHeader title="Expand Franchise" />
            <View style={s.btns}>
              {(['Sequel', 'Prequel', 'Spinoff', 'Crossover'] as const).map(b => (
                <TouchableOpacity key={b} style={s.btn} onPress={() => make(b)} testID={`make-${b}`}>
                  <MaterialCommunityIcons
                    name={b === 'Sequel' ? 'plus-circle' : b === 'Prequel' ? 'history' : b === 'Spinoff' ? 'source-branch' : 'link-variant'}
                    size={24} color={T.cyan}
                  />
                  <Text style={s.btnT}>{b}</Text>
                </TouchableOpacity>
              ))}
              {/* V37 — Create TV Series for this franchise */}
              <TouchableOpacity style={[s.btn, { borderColor: T.magenta }]} onPress={() => router.push('/create-series')} testID="make-tv-series">
                <MaterialCommunityIcons name="television-classic" size={24} color={T.magenta} />
                <Text style={[s.btnT, { color: T.magenta }]}>TV Series</Text>
                <Text style={s.btnSub}>Greenlight a series tied to this IP.</Text>
              </TouchableOpacity>
            </View>
            <SectionHeader title="Trade" />
            <View style={[s.btns, { padding: 12, gap: 8 }]}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: T.cardDark, borderColor: T.green, flex: 1 }]}
                onPress={startSell}
                testID="franchise-sell-btn"
              >
                <MaterialCommunityIcons name="cash-multiple" size={24} color={T.green} />
                <Text style={[s.btnT, { color: T.green }]}>Sell to AI</Text>
                <Text style={s.btnSub}>Est. value ~${fairValue.toFixed(2)}B</Text>
              </TouchableOpacity>
              {/* V30 — License IP outbound (book/game/toy/streaming series spin-offs) */}
              <TouchableOpacity
                style={[s.btn, { backgroundColor: T.cardDark, borderColor: T.yellow, flex: 1 }]}
                onPress={() => router.push({ pathname: '/external-ip', params: { tab: 'mine', listFranchiseId: franchise.id } })}
                testID="franchise-license-ip-btn"
              >
                <MaterialCommunityIcons name="lock-open-variant" size={24} color={T.yellow} />
                <Text style={[s.btnT, { color: T.yellow }]}>License IP (Spin-offs)</Text>
                <Text style={s.btnSub}>Book / Game / Toy / Comic / Music. Choose exclusive or open.</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <SectionHeader title="Trade" />
            <View style={[s.btns, { padding: 12, gap: 8 }]}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: T.cardDark, borderColor: T.magenta, flex: 1 }]}
                onPress={() => router.push({ pathname: '/create-movie', params: { brand: 'Crossover', crossover: franchise.id } })}
                testID="license-crossover-btn"
              >
                <MaterialCommunityIcons name="handshake" size={24} color={T.magenta} />
                <Text style={[s.btnT, { color: T.text }]}>License Crossover</Text>
                <Text style={s.btnSub}>Use this franchise in a crossover with one of yours.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: T.cardDark, borderColor: T.cyan, flex: 1 }]}
                onPress={() => {
                  const playerSvcs = (state.streamingServices || []).filter(svc => svc.studioId === state.player.id);
                  if (playerSvcs.length === 0) { uiAlert('No Streaming Service', 'Launch your own streaming service before licensing a rival franchise to it.'); return; }
                  setBulkSvcId(playerSvcs[0].id);
                  setBulkYears('5');
                  setBulkOpen(true);
                }}
                testID="franchise-bulk-license-btn"
              >
                <MaterialCommunityIcons name="package-variant-closed" size={24} color={T.cyan} />
                <Text style={[s.btnT, { color: T.cyan }]}>Bulk-License to My Streaming</Text>
                <Text style={s.btnSub}>License every current + future film of this franchise.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: T.cardDark, borderColor: T.yellow, flex: 1 }]}
                onPress={startBuy}
                testID="franchise-buy-btn"
              >
                <MaterialCommunityIcons name="cash-fast" size={24} color={T.yellow} />
                <Text style={[s.btnT, { color: T.yellow }]}>Make Buy Offer</Text>
                <Text style={s.btnSub}>Acquire this franchise. Est. ${fairValue.toFixed(2)}B</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <SectionHeader title="Films" />
        {movies.map(m => (
          <TouchableOpacity key={m.id} style={s.movieRow} onPress={() => router.push(`/movie/${m.id}`)} testID={`f-movie-${m.id}`}>
            <IconTile icon={m.iconKey} color={m.iconBg} size={56} />
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={s.movieTitle}>{m.title}</Text>
              <Text style={s.sub}>{m.brand} · Y{m.releaseYear || '-'} · {m.criticScore || '-'}/100</Text>
            </View>
            <Text style={[s.sub, { color: T.green }]}>{m.boxOffice.toFixed(2)}B</Text>
          </TouchableOpacity>
        ))}

        {/* V37 — TV Series linked to this franchise */}
        {(() => {
          const linkedSeries = (state.tvSeries || []).filter(sr => sr.franchiseId === franchise.id);
          if (linkedSeries.length === 0) return null;
          return (
            <>
              <SectionHeader title={`TV Series · ${linkedSeries.length}`} />
              {linkedSeries.map(sr => {
                const inProd = sr.productionWeeksLeft !== undefined;
                const releasedSeasons = sr.seasons.filter(sn => sn.releaseWeek !== undefined).length;
                const totalScore = sr.seasons.reduce((a, sn) => a + (sn.avgScore || 0), 0);
                const scoredSeasons = sr.seasons.filter(sn => sn.avgScore).length;
                const avgScore = scoredSeasons > 0 ? Math.round(totalScore / scoredSeasons) : null;
                const statusLabel = sr.status === 'cancelled' ? 'CANCELLED' : inProd ? `S${sr.productionSeason} · ${sr.productionWeeksLeft}w` : 'AIRED';
                const statusColor = sr.status === 'cancelled' ? T.red : inProd ? T.yellow : T.green;
                return (
                  <TouchableOpacity key={sr.id} style={s.movieRow} onPress={() => router.push(`/series/${sr.id}`)} testID={`f-series-${sr.id}`}>
                    <View style={[s.seriesIcon, { backgroundColor: sr.releaseStrategy === 'tv' ? T.cyan + '33' : sr.releaseStrategy === 'streaming' ? T.magenta + '33' : T.yellow + '33' }]}>
                      <MaterialCommunityIcons name={sr.releaseStrategy === 'tv' ? 'television-classic' : sr.releaseStrategy === 'streaming' ? 'play-circle' : 'compare-horizontal'} size={28} color={sr.releaseStrategy === 'tv' ? T.cyan : sr.releaseStrategy === 'streaming' ? T.magenta : T.yellow} />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={s.movieTitle}>{sr.title}</Text>
                      <Text style={s.sub}>{sr.brand?.toUpperCase() || 'ORIGINAL'} · {releasedSeasons}/{sr.seasons.length} season{sr.seasons.length !== 1 ? 's' : ''}{avgScore !== null ? ` · ${avgScore}/100` : ''}</Text>
                    </View>
                    <View style={[s.seriesPill, { backgroundColor: statusColor }]}>
                      <Text style={s.seriesPillTxt}>{statusLabel}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          );
        })()}

        {/* IP LICENSING HISTORY — persistent record of all spin-off deals (book/game/toy/etc), even after expiry */}
        {own ? (() => {
          const myListings = (state.outboundIPListings || []).filter(l => l.sourceFranchiseId === franchise.id);
          const allBids = (state.outboundIPBids || []).filter(b => myListings.some(l => l.id === b.listingId));
          const acceptedBids = allBids.filter(b => b.status === 'accepted');
          const CAT_LABEL: Record<string, string> = { book: 'Book', video_game: 'Video Game', toy: 'Toy', sports: 'Sports', comic: 'Comic', music: 'Music', streaming: 'Streaming Series' };
          const CAT_ICON: Record<string, string> = { book: 'book-open-page-variant', video_game: 'gamepad-variant', toy: 'teddy-bear', sports: 'basketball', comic: 'star-shooting', music: 'music', streaming: 'play-network' };
          if (myListings.length === 0) return null;
          const openListings = myListings.filter(l => l.status === 'open');
          return (
            <>
              <SectionHeader title={`IP Licensing History · ${acceptedBids.length} closed · ${openListings.length} open`} />
              {/* Open listings — show pending bids count */}
              {openListings.map(l => {
                const bidsForListing = (state.outboundIPBids || []).filter(b => b.listingId === l.id && b.status === 'pending');
                return (
                  <View key={l.id} style={[s.ipHistRow, { borderColor: T.yellow }]}>
                    <View style={[s.ipHistIcon, { backgroundColor: T.yellow }]}>
                      <MaterialCommunityIcons name={CAT_ICON[l.category] as any} size={18} color={T.cardDark} />
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 8 }}>
                      <Text style={s.ipHistTitle}>{CAT_LABEL[l.category]} {l.exclusivity ? '· EXCLUSIVE' : ''} {l.sublicensable ? '· Sublic' : ''}</Text>
                      <Text style={s.ipHistSub}>Listed W{l.createdWeek}/Y{l.createdYear} · {bidsForListing.length} pending bid{bidsForListing.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/external-ip')} style={[s.ipHistTag, { backgroundColor: T.yellow }]} testID={`view-listing-${l.id}`}>
                      <Text style={s.ipHistTagTxt}>VIEW</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
              {acceptedBids.length === 0 ? (
                openListings.length === 0 ? <Text style={[s.sub, { padding: 12, fontStyle: 'italic' }]}>No spin-off deals closed yet.</Text> : null
              ) : (
                acceptedBids.map(b => {
                  const list = myListings.find(l => l.id === b.listingId);
                  const lic = state.externalLicensors?.find(l => l.id === b.licensorId);
                  if (!list) return null;
                  const expiresAt = b.createdYear + b.years;
                  const isExpired = state.year > expiresAt || (state.year === expiresAt && state.week > b.createdWeek);
                  return (
                    <View key={b.id} style={[s.ipHistRow, isExpired && { opacity: 0.7 }]}>
                      <View style={[s.ipHistIcon, { backgroundColor: isExpired ? T.textMute : T.yellow }]}>
                        <MaterialCommunityIcons name={CAT_ICON[list.category] as any} size={18} color={T.cardDark} />
                      </View>
                      <View style={{ flex: 1, paddingHorizontal: 8 }}>
                        <Text style={s.ipHistTitle}>{CAT_LABEL[list.category]} — {lic?.name || 'Agency'}</Text>
                        <Text style={s.ipHistSub}>${b.feeM.toFixed(1)}M upfront · {b.royaltyPercent}% royalty · {b.years}y</Text>
                        <Text style={s.ipHistSub}>Signed W{b.createdWeek}/Y{b.createdYear} · {isExpired ? `Expired Y${expiresAt}` : `Expires Y${expiresAt}`}</Text>
                      </View>
                      <View style={[s.ipHistTag, { backgroundColor: isExpired ? T.textMute : T.green }]}>
                        <Text style={s.ipHistTagTxt}>{isExpired ? 'EXPIRED' : 'ACTIVE'}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </>
          );
        })() : null}
      </ScrollView>

      {/* Franchise Bulk License modal */}
      <Modal visible={bulkOpen} transparent animationType="slide" onRequestClose={() => setBulkOpen(false)}>
        {(() => {
          const playerSvcs = (state.streamingServices || []).filter(svc => svc.studioId === state.player.id);
          const yrs = parseInt(bulkYears, 10) || 0;
          const quote = bulkSvcId && yrs > 0 ? quoteFranchiseBulkLicense({ franchiseId: franchise.id, serviceId: bulkSvcId, years: yrs }) : null;
          const fbSvc = playerSvcs.find(sv => sv.id === bulkSvcId);
          const fbTiersByPrice = fbSvc ? [...fbSvc.tiers].sort((a, b) => a.price - b.price) : [];
          const fbAllTiers = !fbSvc || bulkTierIds.length === 0 || bulkTierIds.length >= fbSvc.tiers.length;
          return (
            <View style={fs.modalBg}>
              <SafeAreaView edges={['top']} style={{ width: '100%' }}>
                <View style={[fs.modalCard, { maxHeight: '90%' }]}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                    <Text style={fs.modalTitle}>License {franchise.name}</Text>
                    <Text style={fs.modalSub}>Adds every released film of this franchise to your service immediately, plus rights to future releases for the term (each film windows in 8–12w post-theatrical, 16–32w hybrid, 26–52w streaming-only).</Text>

                    <Text style={fs.fieldLbl}>YOUR SERVICE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {playerSvcs.map(svc => (
                        <TouchableOpacity key={svc.id} style={[fs.chip, bulkSvcId === svc.id && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                          onPress={() => { setBulkSvcId(svc.id); setBulkTierIds(svc.tiers.map(t => t.id)); }}
                          testID={`fb-svc-${svc.id}`}>
                          <Text style={[fs.chipTxt, bulkSvcId === svc.id && { color: T.cardDark }]}>{svc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {fbSvc ? (
                      <>
                        <Text style={fs.fieldLbl}>TIER HIERARCHY</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          <TouchableOpacity style={[fs.chip, fbAllTiers && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                            onPress={() => setBulkTierIds(fbSvc.tiers.map(t => t.id))} testID="fb-tier-all">
                            <Text style={[fs.chipTxt, fbAllTiers && { color: T.cardDark }]}>All Tiers</Text>
                          </TouchableOpacity>
                          {fbTiersByPrice.map((t, idx) => {
                            if (idx === 0) return null;
                            const ladder = fbTiersByPrice.slice(idx).map(x => x.id);
                            const isLadder = !fbAllTiers && ladder.length === bulkTierIds.length && ladder.every(tid => bulkTierIds.includes(tid));
                            return (
                              <TouchableOpacity key={`fb-ladder-${t.id}`}
                                style={[fs.chip, isLadder && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                                onPress={() => setBulkTierIds(ladder)} testID={`fb-tier-ladder-${t.id}`}>
                                <Text style={[fs.chipTxt, isLadder && { color: T.cardDark }]}>{t.name}+</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {fbSvc.tiers.map(t => {
                            const active = bulkTierIds.includes(t.id);
                            return (
                              <TouchableOpacity key={t.id}
                                style={[fs.chip, active && { backgroundColor: T.green, borderColor: T.green }]}
                                onPress={() => setBulkTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                                testID={`fb-tier-${t.id}`}>
                                <Text style={[fs.chipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : null}

                    <Text style={fs.fieldLbl}>YEARS (1–10)</Text>
                    <TextInput value={bulkYears} onChangeText={(v) => setBulkYears(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" maxLength={2} style={fs.inp} testID="fb-years-input" />

                    {quote && !quote.error ? (
                      <View style={fs.quoteBox}>
                        <Text style={fs.quoteLbl}>OPENING OFFER (negotiable)</Text>
                        <Text style={fs.quoteVal}>${(quote.feeM / 1000 * 0.85).toFixed(2)}B</Text>
                        <Text style={fs.quoteSub}>Fair value: ${(quote.feeM / 1000).toFixed(2)}B · {quote.movieCount} current films + future for {yrs}y · Cash: ${state.player.cash.toFixed(2)}B</Text>
                      </View>
                    ) : quote?.error ? (
                      <Text style={[fs.modalSub, { color: T.red, marginTop: 10 }]}>{quote.error}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={fs.signBtn}
                      onPress={() => {
                        if (!bulkSvcId) return;
                        const fairB = quoteFranchiseBulkValueB(franchise.id, yrs);
                        const opening = +(fairB * 0.85).toFixed(3);
                        const r = proposeBulkCatalogLicense({
                          toRivalStudioId: franchise.studioId,
                          movieIds: [],
                          priceB: opening,
                          years: yrs,
                          serviceId: bulkSvcId,
                          dealKind: 'franchise_bulk',
                          franchiseId: franchise.id,
                          tierIds: fbAllTiers ? undefined : bulkTierIds,
                        });
                        if (r.error) { uiAlert('Cannot open', r.error); return; }
                        setBulkOpen(false);
                        if (r.offerId) setActiveFranchiseBulkId(r.offerId);
                      }}
                      testID="fb-sign-btn"
                    >
                      <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                      <Text style={fs.signTxt}>OPEN NEGOTIATION</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={fs.cancelBtn} onPress={() => setBulkOpen(false)}>
                      <Text style={fs.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </SafeAreaView>
            </View>
          );
        })()}
      </Modal>

      {/* V30 — Add Franchise to My Streaming modal (owned franchise only) */}
      <Modal visible={streamAddOpen} transparent animationType="slide" onRequestClose={() => setStreamAddOpen(false)}>
        {(() => {
          const myServices = (state.streamingServices || []).filter(sv => sv.studioId === state.player.id);
          const svc = myServices.find(sv => sv.id === streamAddSvcId);
          const tiersByPrice = svc ? [...svc.tiers].sort((a, b) => a.price - b.price) : [];
          const allTiers = !svc || streamAddTierIds.length === 0 || streamAddTierIds.length >= svc.tiers.length;
          const releasedFranchiseFilms = movies.filter(m => m.status === 'released');
          const alreadyOnSvc = svc ? releasedFranchiseFilms.filter(m => svc.catalogMovieIds.includes(m.id)).length : 0;
          const willAdd = svc ? releasedFranchiseFilms.filter(m => !svc.catalogMovieIds.includes(m.id)).length : 0;
          return (
            <View style={fs.modalBg}>
              <SafeAreaView edges={['top']} style={{ width: '100%' }}>
                <View style={[fs.modalCard, { maxHeight: '88%' }]}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                    <Text style={fs.modalTitle}>Add {franchise.name} to my streaming</Text>
                    <Text style={fs.modalSub}>Adds every released film of this franchise to the chosen service in the picked tiers.</Text>

                    <Text style={fs.fieldLbl}>SERVICE</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {myServices.map(sv => (
                        <TouchableOpacity key={sv.id} style={[fs.chip, streamAddSvcId === sv.id && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                          onPress={() => { setStreamAddSvcId(sv.id); setStreamAddTierIds(sv.tiers.map(t => t.id)); }}
                          testID={`stream-add-svc-${sv.id}`}>
                          <Text style={[fs.chipTxt, streamAddSvcId === sv.id && { color: T.cardDark }]}>{sv.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    {svc ? (
                      <>
                        <Text style={fs.fieldLbl}>TIER HIERARCHY</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          <TouchableOpacity style={[fs.chip, allTiers && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                            onPress={() => setStreamAddTierIds(svc.tiers.map(t => t.id))} testID="stream-add-tier-all">
                            <Text style={[fs.chipTxt, allTiers && { color: T.cardDark }]}>All Tiers</Text>
                          </TouchableOpacity>
                          {tiersByPrice.map((t, idx) => {
                            if (idx === 0) return null;
                            const ladder = tiersByPrice.slice(idx).map(x => x.id);
                            const isLadder = !allTiers && ladder.length === streamAddTierIds.length && ladder.every(tid => streamAddTierIds.includes(tid));
                            return (
                              <TouchableOpacity key={`stream-add-ladder-${t.id}`}
                                style={[fs.chip, isLadder && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                                onPress={() => setStreamAddTierIds(ladder)} testID={`stream-add-ladder-${t.id}`}>
                                <Text style={[fs.chipTxt, isLadder && { color: T.cardDark }]}>{t.name}+</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {svc.tiers.map(t => {
                            const active = streamAddTierIds.includes(t.id);
                            return (
                              <TouchableOpacity key={t.id}
                                style={[fs.chip, active && { backgroundColor: T.green, borderColor: T.green }]}
                                onPress={() => setStreamAddTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                                testID={`stream-add-tier-${t.id}`}>
                                <Text style={[fs.chipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : null}

                    <View style={[fs.quoteBox, { marginTop: 12 }]}>
                      <Text style={fs.quoteLbl}>WILL ADD</Text>
                      <Text style={fs.quoteVal}>{willAdd} film{willAdd === 1 ? '' : 's'}</Text>
                      <Text style={fs.quoteSub}>{alreadyOnSvc} already on this service · {releasedFranchiseFilms.length} total released</Text>
                    </View>

                    <TouchableOpacity
                      style={fs.signBtn}
                      onPress={() => {
                        if (!svc) return;
                        const effective = allTiers ? svc.tiers.map(t => t.id) : streamAddTierIds;
                        let added = 0;
                        for (const m of releasedFranchiseFilms) {
                          const r = addMovieToStreaming(svc.id, m.id, effective);
                          if (!r.error) added++;
                        }
                        setStreamAddOpen(false);
                        uiAlert('Added ✓', `Added ${added} ${franchise.name} film${added === 1 ? '' : 's'} to ${svc.name}.`);
                      }}
                      testID="stream-add-confirm"
                    >
                      <MaterialCommunityIcons name="play-circle" size={18} color={T.cardDark} />
                      <Text style={fs.signTxt}>ADD TO MY STREAMING</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={fs.cancelBtn} onPress={() => setStreamAddOpen(false)}>
                      <Text style={fs.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </SafeAreaView>
            </View>
          );
        })()}
      </Modal>

      {/* V35 — Open Market: broadcast franchise license offer to ALL rival streamers */}
      <Modal visible={offerRivalOpen} transparent animationType="slide" onRequestClose={() => setOfferRivalOpen(false)}>
        {(() => {
          const rivalSvcs = (state.streamingServices || []).filter(sv => sv.studioId !== state.player.id);
          const yrs = parseInt(offerRivalYears, 10) || 0;
          const priceB = parseFloat(offerRivalPrice) || 0;
          const fair = yrs > 0 ? quoteFranchiseBulkValueB(franchise.id, yrs) : 0;
          const releasedCount = movies.filter(m => m.status === 'released').length;
          return (
            <View style={fs.modalBg}>
              <SafeAreaView edges={['top']} style={{ width: '100%' }}>
                <View style={[fs.modalCard, { maxHeight: '88%' }]}>
                  <ScrollView contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                    <Text style={fs.modalTitle}>License to Streaming Services · {franchise.name}</Text>
                    <Text style={fs.modalSub}>Publish a license offer to ALL {rivalSvcs.length} rival streaming services ({releasedCount} released films + future releases for the term). They'll see it in Deals & Offers and either accept, counter, or pass.</Text>

                    <Text style={fs.fieldLbl}>YEARS (1–10)</Text>
                    <TextInput value={offerRivalYears} onChangeText={(v) => { const nv = v.replace(/[^0-9]/g, ''); setOfferRivalYears(nv); const f = quoteFranchiseBulkValueB(franchise.id, parseInt(nv || '0', 10) || 0); setOfferRivalPrice(f.toFixed(2)); }} keyboardType="numeric" maxLength={2} style={fs.inp} testID="offer-rival-years" />

                    <Text style={fs.fieldLbl}>YOUR ASKING PRICE (B)</Text>
                    <TextInput value={offerRivalPrice} onChangeText={(v) => setOfferRivalPrice(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={8} style={fs.inp} testID="offer-rival-price" />

                    <View style={fs.quoteBox}>
                      <Text style={fs.quoteLbl}>FAIR VALUE</Text>
                      <Text style={fs.quoteVal}>${fair.toFixed(2)}B</Text>
                      <Text style={fs.quoteSub}>Asking ${priceB.toFixed(2)}B · {rivalSvcs.length} rival services will see this{offerRivalExclusive ? ' · EXCLUSIVE (+25% premium expected)' : ''}</Text>
                    </View>

                    {/* V37b — Exclusivity toggle */}
                    <TouchableOpacity
                      style={[fs.exclChip, offerRivalExclusive && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                      onPress={() => {
                        const next = !offerRivalExclusive;
                        setOfferRivalExclusive(next);
                        const f = quoteFranchiseBulkValueB(franchise.id, yrs);
                        setOfferRivalPrice((next ? f * 1.25 : f).toFixed(2));
                      }}
                      testID="offer-rival-exclusive"
                    >
                      <MaterialCommunityIcons name={offerRivalExclusive ? 'lock' : 'lock-open-variant'} size={18} color={offerRivalExclusive ? T.cardDark : T.yellow} />
                      <Text style={[fs.exclTxt, offerRivalExclusive && { color: T.cardDark }]}>{offerRivalExclusive ? 'EXCLUSIVE — only one rival can win this catalog' : 'OPEN — any/all rivals can license'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[fs.signBtn, { backgroundColor: T.magenta }]}
                      onPress={() => {
                        if (rivalSvcs.length === 0) { uiAlert('No rivals', 'No rival streaming services available.'); return; }
                        if (yrs < 1 || yrs > 10) { uiAlert('Invalid', 'Years must be 1–10.'); return; }
                        if (priceB <= 0) { uiAlert('Invalid', 'Set a price.'); return; }
                        // V38 — single-transaction broadcast: avoids stateRef race that ate offers in V37c.
                        const targetIds = Array.from(new Set(rivalSvcs.map(sv => sv.studioId)));
                        const r = broadcastBulkCatalogLicense({
                          targetStudioIds: targetIds,
                          priceB,
                          years: yrs,
                          dealKind: 'franchise_bulk',
                          franchiseId: franchise.id,
                          exclusivity: offerRivalExclusive,
                        });
                        setOfferRivalOpen(false);
                        if (r.error) { uiAlert('Publish Failed', r.error); return; }
                        const lines: string[] = [];
                        if (r.accepted) lines.push(`${r.accepted} accepted ✓`);
                        if (r.counters) lines.push(`${r.counters} countered — see Deals & Offers`);
                        if (r.rejected) lines.push(`${r.rejected} passed`);
                        uiAlert('Offer Published ✓', `Sent to ${r.created} rival${r.created === 1 ? '' : 's'}.\n${lines.join(' · ')}`);
                      }}
                      testID="offer-rival-send"
                    >
                      <MaterialCommunityIcons name="bullhorn" size={18} color={T.cardDark} />
                      <Text style={fs.signTxt}>PUBLISH OFFER · ALL STREAMERS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={fs.cancelBtn} onPress={() => setOfferRivalOpen(false)}>
                      <Text style={fs.cancelTxt}>Cancel</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </SafeAreaView>
            </View>
          );
        })()}
      </Modal>

      <NegotiationModal
        visible={tradeOpen && !!liveOffer}
        subjectTitle={franchise.name}
        subtitle={liveOffer?.kind === 'buy' ? `Buying from ${owner?.name || '—'}` : `Selling to a top bidder`}
        currentPriceB={liveOffer?.priceB || 0}
        fairValueB={fairValue}
        playerSide={playerSide}
        roundsLeft={roundsLeft}
        message={liveOffer?.message}
        history={liveOffer?.history}
        onAccept={() => {
          if (!liveOffer) return;
          const r = acceptFranchiseOffer(liveOffer.id);
          if (r.error) { uiAlert('Failed', r.error); return; }
          uiAlert('Trade Closed ✓', `Settled at $${liveOffer.priceB.toFixed(2)}B.`);
          setTradeOpen(false); setActiveTradeId(null);
        }}
        onCounter={(v: number) => {
          if (!liveOffer) return;
          const r = counterFranchiseOffer(liveOffer.id, v);
          if (r.error) { uiAlert('Counter Failed', r.error); return; }
          // Modal stays open for next AI counter — just refresh
        }}
        onReject={() => {
          if (!liveOffer) return;
          rejectFranchiseOffer(liveOffer.id);
          uiAlert('Walked Away', 'You rejected the offer.');
          setTradeOpen(false); setActiveTradeId(null);
        }}
        onClose={() => { setTradeOpen(false); setActiveTradeId(null); }}
      />

      {/* Franchise Bulk License negotiation */}
      {(() => {
        const live = activeFranchiseBulkId ? (state.bulkCatalogOffers || []).find(o => o.id === activeFranchiseBulkId && o.status === 'pending') : null;
        if (!live) return null;
        const playerActor: 'from' | 'to' = live.fromStudioId === state.player.id ? 'from' : 'to';
        const used = live.history.filter(h => h.actor === playerActor).length;
        const playerSide2: 'buyer' | 'seller' = live.fromStudioId === state.player.id ? 'buyer' : 'seller';
        return (
          <NegotiationModal
            visible={!!live}
            subjectTitle={`License whole ${franchise.name}`}
            subtitle={`${live.years}-year bulk license · current + future films`}
            currentPriceB={live.priceB}
            fairValueB={quoteFranchiseBulkValueB(franchise.id, live.years)}
            playerSide={playerSide2}
            roundsLeft={Math.max(0, live.maxRounds - used)}
            message={live.message}
            history={live.history}
            onAccept={() => {
              const r = acceptBulkCatalogOffer(live.id);
              if (r.error) { uiAlert('Failed', r.error); return; }
              uiAlert('Franchise Licensed ✓', `Settled at $${live.priceB.toFixed(2)}B for ${live.years}y.`);
              setActiveFranchiseBulkId(null);
            }}
            onCounter={(v: number) => {
              const r = counterBulkCatalogOffer(live.id, v);
              if (r.error) { uiAlert('Counter Failed', r.error); }
            }}
            onReject={() => { rejectBulkCatalogOffer(live.id); setActiveFranchiseBulkId(null); }}
            onClose={() => setActiveFranchiseBulkId(null)}
          />
        );
      })()}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', backgroundColor: T.cardDark, padding: 12 },
  title: { color: T.text, fontSize: 22, fontWeight: '900' },
  sub: { color: T.textDim, fontSize: 13, marginTop: 2 },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  btn: { flexBasis: '47%', backgroundColor: T.card, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: T.border, gap: 4 },
  btnT: { color: T.text, fontWeight: '900', fontSize: 14 },
  btnSub: { color: T.textDim, fontSize: 11, textAlign: 'center' },
  movieRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  movieTitle: { color: T.text, fontWeight: '800', fontSize: 15 },
  statsBox: { backgroundColor: T.cardDark, marginHorizontal: 12, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: T.border, gap: 4 },
  statTxt: { color: T.textDim, fontSize: 13 },
  streamRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  crossRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 8, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: T.border },
  crossTitle: { color: T.text, fontWeight: '800', fontSize: 13 },
  crossSub: { color: T.textDim, fontSize: 11 },
  ipHistRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, marginHorizontal: 12, marginVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  ipHistIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ipHistTitle: { color: T.text, fontWeight: '900', fontSize: 13 },
  ipHistSub: { color: T.textDim, fontSize: 10 },
  ipHistTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ipHistTagTxt: { color: T.cardDark, fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  actionBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
  actionTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  // V37 — TV Series row
  seriesIcon: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  seriesPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  seriesPillTxt: { color: T.cardDark, fontWeight: '900', fontSize: 9, letterSpacing: 0.4 },
});

const fs = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#4d5058', padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 3, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  modalSub: { color: T.textDim, fontSize: 12, marginTop: 4 },
  fieldLbl: { color: T.yellow, marginTop: 14, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  inp: { backgroundColor: T.cardDark, color: T.text, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginTop: 6, fontSize: 18, fontWeight: '900' },
  chip: { backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginRight: 6 },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 12 },
  quoteBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 2, borderColor: T.green, alignItems: 'center' },
  quoteLbl: { color: T.green, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  quoteVal: { color: T.green, fontSize: 28, fontWeight: '900' },
  quoteSub: { color: T.textDim, fontSize: 11, marginTop: 2, textAlign: 'center' },
  signBtn: { flexDirection: 'row', backgroundColor: T.green, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 6, borderWidth: 2, borderColor: T.border },
  signTxt: { color: T.cardDark, fontWeight: '900' },
  // V37b — exclusivity toggle
  exclChip: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: T.yellow, backgroundColor: 'rgba(244, 208, 63, 0.08)' },
  exclTxt: { color: T.yellow, fontWeight: '800', fontSize: 11, flex: 1 },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: T.textDim, fontWeight: '700' },
});
