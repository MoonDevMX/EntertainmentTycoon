import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T } from '../src/ui/theme';
import { TopBar, SectionHeader } from '../src/ui/components';
import { uiAlert } from '../src/ui/ui-alert';
import { IPCategory } from '../src/game/types';

const CAT_LABEL: Record<IPCategory, string> = {
  book: 'Book', video_game: 'Video Game', toy: 'Toy', sports: 'Sports', comic: 'Comic', music: 'Music', streaming: 'Streaming Rights',
};
const CAT_ICON: Record<IPCategory, string> = {
  book: 'book-open-variant', video_game: 'gamepad-variant', toy: 'teddy-bear', sports: 'basketball', comic: 'book-multiple', music: 'music-circle', streaming: 'play-network',
};

export default function ExternalIPPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; listFranchiseId?: string; listMovieId?: string; category?: string }>();
  const { state, acceptIPOffer, counterIPOffer, rejectIPOffer, createOutboundIPListing, acceptOutboundBid, rejectOutboundBid, counterOutboundBid, sublicenseIPToRival } = useGame();
  const [tab, setTab] = useState<'inbound' | 'outbound' | 'mine'>(params.tab === 'mine' ? 'mine' : params.tab === 'outbound' ? 'outbound' : 'inbound');
  const [counterId, setCounterId] = useState<string | null>(null);
  const [cFee, setCFee] = useState(''); const [cBO, setCBO] = useState(''); const [cMerch, setCMerch] = useState(''); const [cYears, setCYears] = useState(''); const [cPacks, setCPacks] = useState(''); const [cExcl, setCExcl] = useState(false); const [cSub, setCSub] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [listFranchiseId, setListFranchiseId] = useState<string | null>(null);
  const [listMovieId, setListMovieId] = useState<string | null>(null);
  const [listCategory, setListCategory] = useState<IPCategory>('video_game');
  const [listExclusivity, setListExclusivity] = useState(false);
  const [listSublicensable, setListSublicensable] = useState(false);

  // Sublicensing states
  const [subOpenId, setSubOpenId] = useState<string | null>(null);
  const [subRivalId, setSubRivalId] = useState('');
  const [subFee, setSubFee] = useState('5.0');
  const [subCounterOpen, setSubCounterOpen] = useState(false);
  const [subCounterFee, setSubCounterFee] = useState<number | null>(null);
  // V30 — Auto-open list modal when navigated from a franchise/movie page
  useEffect(() => {
    if (params.listFranchiseId) {
      setListFranchiseId(params.listFranchiseId);
      setListMovieId(null);
      setListOpen(true);
    } else if (params.listMovieId) {
      setListMovieId(params.listMovieId);
      setListFranchiseId(null);
      setListOpen(true);
    }
    // V35 — honor ?category=streaming when coming from franchise/movie page Marketplace button
    // V37 — Removed 'streaming' category (scrapped in favor of direct streaming-service licensing).
    if (params.category && ['book', 'video_game', 'toy', 'sports', 'comic', 'music'].includes(params.category)) {
      setListCategory(params.category as IPCategory);
    }
  }, [params.listFranchiseId, params.listMovieId, params.category]);
  // Outbound bid counter modal
  const [bidCounterId, setBidCounterId] = useState<string | null>(null);
  const [bcFee, setBcFee] = useState('');
  const [bcRoy, setBcRoy] = useState('');
  const [bcYears, setBcYears] = useState('');

  if (!state) return null;

  const inbound = (state.externalIPOffers || []).filter(o => o.status === 'pending');
  const myLicenses = (state.ownedIPLicenses || []).filter(l => l.studioId === state.player.id);
  const myListings = (state.outboundIPListings || []).filter(l => l.studioId === state.player.id);
  const myBids = (state.outboundIPBids || []).filter(b => b.status === 'pending' && myListings.some(l => l.id === b.listingId));
  const myFranchises = state.franchises.filter(f => f.studioId === state.player.id);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <TopBar title="External IP Licensing" onBack={() => router.back()} />
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'inbound' && s.tabActive]} onPress={() => setTab('inbound')} testID="tab-inbound">
          <Text style={[s.tabTxt, tab === 'inbound' && s.tabTxtActive]}>Inbound ({inbound.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'mine' && s.tabActive]} onPress={() => setTab('mine')} testID="tab-mine">
          <Text style={[s.tabTxt, tab === 'mine' && s.tabTxtActive]}>My Licenses ({myLicenses.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'outbound' && s.tabActive]} onPress={() => setTab('outbound')} testID="tab-outbound">
          <Text style={[s.tabTxt, tab === 'outbound' && s.tabTxtActive]}>Outbound ({myListings.filter(l => l.status === 'open').length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
        {tab === 'inbound' && (
          inbound.length === 0 ? (
            <Text style={s.empty}>No pending offers. Watch this space — agencies pitch periodically.</Text>
          ) : inbound.map(o => {
            const ip = state.externalIPs?.find(i => i.id === o.ipId);
            const lic = state.externalLicensors?.find(l => l.id === o.fromStudioId);
            if (!ip || !lic) return null;
            return (
              <View key={o.id} style={s.card}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialCommunityIcons name={CAT_ICON[ip.category] as any} size={22} color={T.cyan} />
                  <Text style={s.cardTitle}>  {ip.name}</Text>
                </View>
                <Text style={s.cardSub}>{lic.name} · {CAT_LABEL[ip.category]} · Pop {ip.popularity}/100</Text>
                <View style={s.terms}>
                  <Text style={s.term}>Fee: <Text style={s.termVal}>${o.feeM.toFixed(1)}M</Text></Text>
                  <Text style={s.term}>BO%: <Text style={s.termVal}>{o.boPercent}%</Text></Text>
                  <Text style={s.term}>Merch%: <Text style={s.termVal}>{o.merchPercent}%</Text></Text>
                  <Text style={s.term}>Term: <Text style={s.termVal}>{o.years}y</Text></Text>
                  <Text style={s.term}>Packs: <Text style={s.termVal}>{o.packs}</Text></Text>
                  {o.exclusivity ? <Text style={[s.term, { color: T.yellow }]}>EXCLUSIVE</Text> : null}
                  {o.sublicensable ? <Text style={[s.term, { color: T.magenta }]}>SUBLICENSABLE</Text> : null}
                </View>
                <View style={s.row}>
                  <TouchableOpacity style={[s.btn, { backgroundColor: T.green }]} onPress={() => {
                    const r = acceptIPOffer(o.id);
                    if (r.error) uiAlert('Cannot Accept', r.error);
                  }} testID={`accept-ip-${o.id}`}>
                    <Text style={s.btnTxt}>ACCEPT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { backgroundColor: T.yellow }]} onPress={() => {
                    setCounterId(o.id); setCFee(String(o.feeM)); setCBO(String(o.boPercent)); setCMerch(String(o.merchPercent)); setCYears(String(o.years)); setCPacks(String(o.packs)); setCExcl(o.exclusivity); setCSub(o.sublicensable);
                  }} testID={`counter-ip-${o.id}`}>
                    <Text style={s.btnTxt}>COUNTER</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { backgroundColor: T.red }]} onPress={() => rejectIPOffer(o.id)} testID={`reject-ip-${o.id}`}>
                    <Text style={s.btnTxt}>REJECT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {tab === 'mine' && (
          myLicenses.length === 0 ? <Text style={s.empty}>No active IP licenses. Accept an inbound offer to start building hits.</Text> :
          myLicenses.map(l => {
            const ip = state.externalIPs?.find(i => i.id === l.ipId);
            if (!ip) return null;
            return (
              <View key={l.id} style={s.card}>
                <Text style={s.cardTitle}>{ip.name}</Text>
                <Text style={s.cardSub}>{CAT_LABEL[ip.category]} · Pop {ip.popularity}/100</Text>
                <View style={s.terms}>
                  <Text style={s.term}>Packs: <Text style={s.termVal}>{l.packsUsed}/{l.packs}</Text></Text>
                  <Text style={s.term}>BO Royalty: <Text style={s.termVal}>{l.boPercent}%</Text></Text>
                  <Text style={s.term}>Merch: <Text style={s.termVal}>{l.merchPercent}%</Text></Text>
                  <Text style={s.term}>Expires: <Text style={s.termVal}>W{l.expiresWeek} Y{l.expiresYear}</Text></Text>
                  {l.exclusivity ? <Text style={[s.term, { color: T.yellow }]}>EXCLUSIVE</Text> : null}
                  {l.sublicensable ? <Text style={[s.term, { color: T.magenta }]}>SUBLICENSABLE</Text> : null}
                </View>
                <Text style={s.cardFoot}>Attach this IP when creating a movie for popularity, fame & BO boosts.</Text>
                {l.sublicensable && (l.packs - l.packsUsed > 0) && (
                  <View style={{ marginTop: 12 }}>
                    <TouchableOpacity style={[s.btn, { backgroundColor: T.magenta }]} onPress={() => {
                      setSubOpenId(l.id);
                      setSubRivalId(state.rivals[0]?.id || '');
                      setSubFee('5.0');
                      setSubCounterOpen(false);
                    }} testID={`sublicense-btn-${l.id}`}>
                      <MaterialCommunityIcons name="share-variant" size={16} color={T.cardDark} />
                      <Text style={s.btnTxt}>Sublicense to Rival</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        {tab === 'outbound' && (
          <>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.cyan, marginBottom: 12 }]} onPress={() => setListOpen(true)} testID="create-listing-btn">
              <MaterialCommunityIcons name="plus" size={18} color={T.cardDark} />
              <Text style={[s.btnTxt, { color: T.cardDark }]}>List Franchise for Spin-offs</Text>
            </TouchableOpacity>

            <SectionHeader title="Pending Bids" />
            {myBids.length === 0 ? <Text style={s.empty}>No pending bids yet — agencies bid periodically on open listings.</Text> :
              myBids.map(b => {
                const list = myListings.find(l => l.id === b.listingId);
                const fr = list?.sourceFranchiseId ? state.franchises.find(f => f.id === list.sourceFranchiseId) : null;
                const lic = state.externalLicensors?.find(l => l.id === b.licensorId);
                return (
                  <View key={b.id} style={s.card}>
                    <Text style={s.cardTitle}>{fr?.name || 'Listing'} → {CAT_LABEL[list!.category]}</Text>
                    <Text style={s.cardSub}>{lic?.name}</Text>
                    <View style={s.terms}>
                      <Text style={s.term}>Upfront: <Text style={s.termVal}>${b.feeM.toFixed(1)}M</Text></Text>
                      <Text style={s.term}>Royalty: <Text style={s.termVal}>{b.royaltyPercent}%</Text></Text>
                      <Text style={s.term}>Term: <Text style={s.termVal}>{b.years}y</Text></Text>
                    </View>
                    <View style={s.row}>
                      <TouchableOpacity style={[s.btn, { backgroundColor: T.green }]} onPress={() => {
                        const r = acceptOutboundBid(b.id);
                        if (r.error) uiAlert('Cannot Accept', r.error);
                      }} testID={`accept-bid-${b.id}`}>
                        <Text style={s.btnTxt}>ACCEPT</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btn, { backgroundColor: T.yellow }]} onPress={() => {
                        setBidCounterId(b.id);
                        // Pre-fill with current bid so player can freely push higher OR settle lower
                        setBcFee(String(b.feeM));
                        setBcRoy(String(b.royaltyPercent));
                        setBcYears(String(b.years));
                      }} testID={`counter-bid-${b.id}`}>
                        <Text style={s.btnTxt}>COUNTER</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btn, { backgroundColor: T.red }]} onPress={() => rejectOutboundBid(b.id)} testID={`reject-bid-${b.id}`}>
                        <Text style={s.btnTxt}>REJECT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

            <SectionHeader title="My Listings" />
            {myListings.length === 0 ? <Text style={s.empty}>No listings yet.</Text> :
              myListings.map(l => {
                const fr = l.sourceFranchiseId ? state.franchises.find(f => f.id === l.sourceFranchiseId) : null;
                // Find ALL bids for this listing (any status) so we can show recent activity even when CLOSED
                const allBids = (state.outboundIPBids || []).filter(b => b.listingId === l.id);
                const acceptedBid = allBids.find(b => b.status === 'accepted');
                const lastBid = [...allBids].sort((a, b) => (b.createdYear * 100 + b.createdWeek) - (a.createdYear * 100 + a.createdWeek))[0];
                const statusColor = l.status === 'open' ? T.cyan : l.status === 'closed' ? T.green : T.textMute;
                return (
                  <View key={l.id} style={[s.card, { borderColor: statusColor }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <MaterialCommunityIcons name={CAT_ICON[l.category] as any} size={20} color={statusColor} />
                      <Text style={[s.cardTitle, { marginLeft: 6 }]}>{fr?.name || 'Listing'} — {CAT_LABEL[l.category]}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[s.cardSub, { color: statusColor, fontWeight: '900' }]}>{l.status.toUpperCase()}</Text>
                      <Text style={s.cardSub}>Listed W{l.createdWeek}Y{l.createdYear}</Text>
                    </View>
                    {(l.exclusivity || l.sublicensable) ? (
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                        {l.exclusivity ? (
                          <View style={s.termPill}>
                            <MaterialCommunityIcons name="lock" size={10} color={T.cardDark} />
                            <Text style={s.termPillTxt}>EXCLUSIVE</Text>
                          </View>
                        ) : null}
                        {l.sublicensable ? (
                          <View style={[s.termPill, { backgroundColor: T.cyan }]}>
                            <MaterialCommunityIcons name="share-variant" size={10} color={T.cardDark} />
                            <Text style={s.termPillTxt}>SUBLICENSABLE</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    {acceptedBid ? (
                      <View style={[s.terms, { backgroundColor: T.cardDark, padding: 8, borderRadius: 6, marginTop: 8 }]}>
                        <Text style={[s.term, { width: '100%', color: T.green, fontSize: 11, marginBottom: 4 }]}>✓ DEAL CLOSED</Text>
                        <Text style={s.term}>Buyer: <Text style={s.termVal}>{state.externalLicensors?.find(li => li.id === acceptedBid.licensorId)?.name || '—'}</Text></Text>
                        <Text style={s.term}>Upfront: <Text style={s.termVal}>${acceptedBid.feeM.toFixed(1)}M</Text></Text>
                        <Text style={s.term}>Royalty: <Text style={s.termVal}>{acceptedBid.royaltyPercent}%</Text></Text>
                        <Text style={s.term}>Term: <Text style={s.termVal}>{acceptedBid.years}y</Text></Text>
                      </View>
                    ) : lastBid ? (
                      <View style={[s.terms, { marginTop: 6 }]}>
                        <Text style={[s.term, { width: '100%' }]}>Last bid {lastBid.status === 'rejected' ? 'rejected' : 'pending'} from <Text style={s.termVal}>{state.externalLicensors?.find(li => li.id === lastBid.licensorId)?.name || '—'}</Text></Text>
                        <Text style={s.term}>${lastBid.feeM.toFixed(1)}M · {lastBid.royaltyPercent}% · {lastBid.years}y</Text>
                      </View>
                    ) : l.status === 'open' ? (
                      <Text style={[s.cardFoot, { marginTop: 6 }]}>Awaiting bids — agencies bid every 4–8 weeks based on franchise popularity.</Text>
                    ) : (
                      <Text style={[s.cardFoot, { marginTop: 6 }]}>Listing closed without a deal.</Text>
                    )}
                    {allBids.length > 0 ? (
                      <Text style={[s.cardFoot, { marginTop: 4 }]}>{allBids.length} bid{allBids.length > 1 ? 's' : ''} total · {allBids.filter(b => b.status === 'rejected').length} rejected</Text>
                    ) : null}
                  </View>
                );
              })}
          </>
        )}
      </ScrollView>

      {/* Counter modal */}
      <Modal visible={!!counterId} transparent animationType="slide" onRequestClose={() => setCounterId(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Counter Offer</Text>
            <View style={s.numRow}>
              <NumInput label="Fee ($M)" value={cFee} onChange={setCFee} testID="c-fee" />
              <NumInput label="BO %" value={cBO} onChange={setCBO} testID="c-bo" />
            </View>
            <View style={s.numRow}>
              <NumInput label="Merch %" value={cMerch} onChange={setCMerch} testID="c-merch" />
              <NumInput label="Years" value={cYears} onChange={setCYears} testID="c-years" />
            </View>
            <View style={s.numRow}>
              <NumInput label="Packs" value={cPacks} onChange={setCPacks} testID="c-packs" />
              <View style={{ flex: 1 }} />
            </View>
            <View style={s.row}>
              <TouchableOpacity style={[s.toggle, cExcl && s.toggleOn]} onPress={() => setCExcl(v => !v)} testID="c-excl">
                <Text style={[s.toggleTxt, cExcl && { color: T.cardDark }]}>Exclusive {cExcl ? '✓' : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.toggle, cSub && s.toggleOn]} onPress={() => setCSub(v => !v)} testID="c-sub">
                <Text style={[s.toggleTxt, cSub && { color: T.cardDark }]}>Sublicensable {cSub ? '✓' : ''}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.green, marginTop: 12 }]} onPress={() => {
              if (!counterId) return;
              const r = counterIPOffer(counterId, {
                feeM: parseFloat(cFee) || 0,
                boPercent: parseFloat(cBO) || 0,
                merchPercent: parseFloat(cMerch) || 0,
                years: parseInt(cYears, 10) || 0,
                packs: parseInt(cPacks, 10) || 0,
                exclusivity: cExcl,
                sublicensable: cSub,
              });
              if (r.error) uiAlert('Counter Failed', r.error); else setCounterId(null);
            }} testID="submit-counter">
              <Text style={s.btnTxt}>SUBMIT COUNTER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.card }]} onPress={() => setCounterId(null)}>
              <Text style={s.btnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Outbound bid counter modal */}
      <Modal visible={!!bidCounterId} transparent animationType="slide" onRequestClose={() => setBidCounterId(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Counter Bid</Text>
            <Text style={s.modalSub}>Push the agency for richer terms. Going too high may push them to walk away.</Text>
            <View style={s.numRow}>
              <NumInput label="Upfront Fee ($M)" value={bcFee} onChange={setBcFee} testID="bc-fee" />
              <NumInput label="Royalty %" value={bcRoy} onChange={setBcRoy} testID="bc-roy" />
            </View>
            <View style={s.numRow}>
              <NumInput label="Years" value={bcYears} onChange={setBcYears} testID="bc-years" />
              <View style={{ flex: 1 }} />
            </View>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.green, marginTop: 12 }]} onPress={() => {
              if (!bidCounterId) return;
              const r = counterOutboundBid(bidCounterId, {
                feeM: parseFloat(bcFee) || 0,
                royaltyPercent: parseFloat(bcRoy) || 0,
                years: parseInt(bcYears, 10) || 0,
              });
              if (r.error) uiAlert('Counter Failed', r.error); else setBidCounterId(null);
            }} testID="bc-submit">
              <Text style={s.btnTxt}>SUBMIT COUNTER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.card }]} onPress={() => setBidCounterId(null)}>
              <Text style={s.btnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* List franchise / movie modal */}
      <Modal visible={listOpen} transparent animationType="slide" onRequestClose={() => setListOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{listMovieId ? 'List a Movie IP' : 'List a Franchise'}</Text>
            <Text style={s.modalSub}>{listMovieId ? `Push this single film as IP to external agencies. They'll bid based on box office, popularity, awards.` : 'Pick a franchise + spin-off category. External agencies will bid.'}</Text>
            {listMovieId ? (
              <>
                <Text style={s.fieldLbl}>MOVIE</Text>
                <View style={[s.frRow, { borderColor: T.cyan }]}>
                  <Text style={s.frTxt}>{state.movies.find(m => m.id === listMovieId)?.title || '—'}</Text>
                  <Text style={s.frSub}>BO ${state.movies.find(m => m.id === listMovieId)?.boxOffice.toFixed(2)}B</Text>
                </View>
              </>
            ) : (
              <>
                <Text style={s.fieldLbl}>FRANCHISE</Text>
                <ScrollView style={{ maxHeight: 180 }}>
                  {myFranchises.length === 0 ? <Text style={s.empty}>You don't own any franchises yet.</Text> :
                    myFranchises.map(f => (
                      <TouchableOpacity key={f.id} style={[s.frRow, listFranchiseId === f.id && { borderColor: T.cyan }]} onPress={() => setListFranchiseId(f.id)} testID={`list-fr-${f.id}`}>
                        <Text style={s.frTxt}>{f.name}</Text>
                        <Text style={s.frSub}>Pop {f.popularity}/100</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </>
            )}
            <Text style={s.fieldLbl}>SPIN-OFF CATEGORY</Text>
            <Text style={[s.cardSub, { marginTop: 4, fontStyle: 'italic', fontSize: 10 }]}>
              Note: Streaming-series licensing is handled directly via your franchise / streaming-service pages — not the IP marketplace.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(['book', 'video_game', 'toy', 'sports', 'comic', 'music'] as IPCategory[]).map(c => (
                <TouchableOpacity key={c} style={[s.chip, listCategory === c && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setListCategory(c)} testID={`list-cat-${c}`}>
                  <MaterialCommunityIcons name={CAT_ICON[c] as any} size={12} color={listCategory === c ? T.cardDark : T.text} />
                  <Text style={[s.chipTxt, listCategory === c && { color: T.cardDark }, { marginLeft: 4 }]}>{CAT_LABEL[c]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.fieldLbl}>LICENSE TERMS</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity
                style={[s.termToggle, listExclusivity && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                onPress={() => setListExclusivity(v => !v)}
                testID="list-exclusivity"
              >
                <MaterialCommunityIcons name={listExclusivity ? 'lock' : 'lock-open-variant'} size={14} color={listExclusivity ? T.cardDark : T.text} />
                <Text style={[s.termToggleTxt, listExclusivity && { color: T.cardDark }]}>Exclusive {listExclusivity ? '(+60% fee)' : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.termToggle, listSublicensable && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                onPress={() => setListSublicensable(v => !v)}
                testID="list-sublicensable"
              >
                <MaterialCommunityIcons name={listSublicensable ? 'share-variant' : 'share-off'} size={14} color={listSublicensable ? T.cardDark : T.text} />
                <Text style={[s.termToggleTxt, listSublicensable && { color: T.cardDark }]}>Sublicensable {listSublicensable ? '(−10%, faster bids)' : ''}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.green, marginTop: 16 }]} onPress={() => {
              if (!listMovieId && !listFranchiseId) { uiAlert('Pick something', 'Select a franchise or movie first.'); return; }
              const r = createOutboundIPListing({
                sourceFranchiseId: listFranchiseId || undefined,
                sourceMovieId: listMovieId || undefined,
                category: listCategory,
                exclusivity: listExclusivity,
                sublicensable: listSublicensable,
              });
              if (r.error) uiAlert('Failed', r.error); else { setListOpen(false); setListFranchiseId(null); setListMovieId(null); setListExclusivity(false); setListSublicensable(false); }
            }} testID="confirm-listing">
              <Text style={s.btnTxt}>LIST {listMovieId ? 'MOVIE' : 'FRANCHISE'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: T.card }]} onPress={() => { setListOpen(false); setListMovieId(null); }}>
              <Text style={s.btnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sublicense modal */}
      <Modal visible={!!subOpenId} transparent animationType="slide" onRequestClose={() => setSubOpenId(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Sublicense to Rival</Text>
            <Text style={s.modalSub}>Sublicense this IP to a rival studio. They'll pay you upfront for direct access. Costs 1 film pack.</Text>
            
            <Text style={s.fieldLbl}>SELECT RIVAL STUDIO</Text>
            <View style={{ gap: 6, marginVertical: 6 }}>
              {state.rivals.map(rival => {
                const sel = subRivalId === rival.id;
                return (
                  <TouchableOpacity key={rival.id} style={[s.frRow, sel && { borderColor: T.green, backgroundColor: '#1a3a25' }]} onPress={() => setSubRivalId(rival.id)}>
                    <Text style={[s.frTxt, sel && { color: T.green }]}>{rival.name}</Text>
                    <Text style={s.frSub}>Rating: {rival.rating}/10 · Cash: ${(rival.cash * 1000).toFixed(0)}M</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.fieldLbl}>ASKING SUBLICENSE FEE ($M)</Text>
            <TextInput value={subFee} onChangeText={setSubFee} keyboardType="numeric" style={s.numInp} testID="sub-fee-input" />

            <View style={s.row}>
              <TouchableOpacity style={[s.btn, { backgroundColor: T.green }]} onPress={() => {
                const feeM = parseFloat(subFee);
                if (isNaN(feeM) || feeM <= 0) { uiAlert('Invalid Fee', 'Enter a positive number.'); return; }
                const r = sublicenseIPToRival(subOpenId!, subRivalId, feeM);
                if (r.error) {
                  uiAlert('Sublicense Error', r.error);
                } else if (r.accepted) {
                  uiAlert('Deal Signed!', `Rival accepted terms! Sublicense signed for $${feeM.toFixed(1)}M cash.`);
                  setSubOpenId(null);
                } else if (typeof r.counterFeeM === 'number') {
                  setSubCounterFee(r.counterFeeM);
                  setSubCounterOpen(true);
                  setSubOpenId(null);
                }
              }} testID="confirm-sub-btn">
                <Text style={s.btnTxt}>PROPOSE SUBLICENSE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: T.card }]} onPress={() => setSubOpenId(null)}>
                <Text style={s.btnTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sublicense Counter-offer modal */}
      <Modal visible={subCounterOpen} transparent animationType="slide" onRequestClose={() => setSubCounterOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Counter-Offer</Text>
            <Text style={s.modalSub}>The rival studio declined your initial proposal, but countered with their own valuation.</Text>
            
            <Text style={{ color: T.text, fontSize: 16, marginVertical: 12, fontWeight: '700' }}>
              Counter Fee: <Text style={{ color: T.green }}>${subCounterFee?.toFixed(1)}M</Text>
            </Text>

            <View style={s.row}>
              <TouchableOpacity style={[s.btn, { backgroundColor: T.green }]} onPress={() => {
                const r = sublicenseIPToRival(subOpenId!, subRivalId, subCounterFee!);
                if (r.error) {
                  uiAlert('Sublicense Error', r.error);
                } else if (r.accepted) {
                  uiAlert('Deal Signed!', `Rival accepted terms! Sublicense signed for $${subCounterFee?.toFixed(1)}M cash.`);
                  setSubOpenId(null);
                  setSubCounterOpen(false);
                }
              }} testID="accept-counter-sub-btn">
                <Text style={s.btnTxt}>ACCEPT COUNTER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: T.red }]} onPress={() => {
                setSubCounterOpen(false);
                uiAlert('Deal Rejected', 'You walked away from negotiations.');
              }}>
                <Text style={s.btnTxt}>REJECT COUNTER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NumInput({ label, value, onChange, testID }: { label: string; value: string; onChange: (v: string) => void; testID: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.numLbl}>{label}</Text>
      <TextInput value={value} onChangeText={(v) => onChange(v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" style={s.numInp} testID={testID} />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  tabs: { flexDirection: 'row', backgroundColor: T.cardDark, borderBottomWidth: 2, borderColor: T.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: T.card },
  tabTxt: { color: T.textDim, fontWeight: '700', fontSize: 12 },
  tabTxtActive: { color: T.cyan },
  empty: { color: T.textDim, textAlign: 'center', padding: 24, fontSize: 13 },
  card: { backgroundColor: T.card, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 2, borderColor: T.border },
  cardTitle: { color: T.text, fontWeight: '900', fontSize: 16 },
  cardSub: { color: T.textDim, fontSize: 12, marginTop: 2 },
  cardFoot: { color: T.textDim, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  terms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  term: { color: T.textDim, fontSize: 11, fontWeight: '700' },
  termVal: { color: T.text, fontWeight: '900' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  btnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#4d5058', padding: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 3, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 22, fontWeight: '900' },
  modalSub: { color: T.textDim, fontSize: 12, marginTop: 4, marginBottom: 8 },
  numRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  numLbl: { color: T.yellow, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  numInp: { backgroundColor: T.cardDark, color: T.text, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginTop: 4, fontSize: 16, fontWeight: '900' },
  fieldLbl: { color: T.yellow, marginTop: 14, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  frRow: { backgroundColor: T.cardDark, borderRadius: 8, borderWidth: 2, borderColor: T.border, padding: 10, marginTop: 6 },
  frTxt: { color: T.text, fontWeight: '900', fontSize: 14 },
  frSub: { color: T.textDim, fontSize: 11 },
  chip: { backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 2, borderColor: T.border, marginRight: 6 },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 12 },
  toggle: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: T.border, backgroundColor: T.cardDark, alignItems: 'center' },
  toggleOn: { backgroundColor: T.cyan, borderColor: T.cyan },
  toggleTxt: { color: T.text, fontWeight: '800', fontSize: 12 },
  termToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8, borderWidth: 2, borderColor: T.border, backgroundColor: T.cardDark },
  termToggleTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  termPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: T.yellow, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  termPillTxt: { color: T.cardDark, fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },
});
