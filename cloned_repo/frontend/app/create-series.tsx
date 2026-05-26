import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { TV_NETWORKS_SEED, COLOR_HEX, computeChemistryBonus } from '../src/game/data';
import { T } from '../src/ui/theme';
import { TopBar, Avatar } from '../src/ui/components';
import { uiAlert } from '../src/ui/ui-alert';
import { talentAvailability, calculateAcceptance } from '../src/game/sim';
import type { TVChannelKind, TVReleaseStrategy, HybridPriority, ColorTrait } from '../src/game/types';

const BRAND_OPTIONS: { k: 'original' | 'sequel' | 'prequel' | 'spinoff'; label: string; icon: string }[] = [
  { k: 'original', label: 'Original', icon: 'star-shooting' },
  { k: 'sequel', label: 'Sequel', icon: 'arrow-right-bold' },
  { k: 'prequel', label: 'Prequel', icon: 'arrow-left-bold' },
  { k: 'spinoff', label: 'Spinoff', icon: 'source-branch' },
];

const STRAT: { k: TVReleaseStrategy; label: string; icon: string; desc: string }[] = [
  { k: 'tv', label: 'Direct to TV', icon: 'television-classic', desc: 'Air on a TV network. Network pays you a license fee per season.' },
  { k: 'streaming', label: 'Direct to Streaming', icon: 'play-circle', desc: 'Premiere on your streaming service. Boosts subscribers & popularity.' },
  { k: 'hybrid', label: 'Hybrid', icon: 'compare-horizontal', desc: 'TV first then streaming (or vice versa) with a release window.' },
];

export default function CreateSeriesScreen() {
  const { state, createTVSeries, addSeriesToChannels } = useGame();
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState<'original' | 'sequel' | 'prequel' | 'spinoff'>('original');
  const [franchiseId, setFranchiseId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState('1');
  const [episodes, setEpisodes] = useState('10');
  const [budgetM, setBudgetM] = useState('50');
  const [strategy, setStrategy] = useState<TVReleaseStrategy>('streaming');
  // V41 — Multi-select streaming services + tiers; first svc is primary, rest get added on production via addMovieToStreaming-style routing (handled in submit)
  const [streamSvcIds, setStreamSvcIds] = useState<string[]>([]);
  const [streamTiers, setStreamTiers] = useState<string[]>([]);
  const [hybridWindow, setHybridWindow] = useState(4);
  const [hybridPriority, setHybridPriority] = useState<HybridPriority>('tv_first');
  // V41 — Multi-select channels + channel packs (packs expand to their channels)
  const [networkIds, setNetworkIds] = useState<string[]>([]);
  const [packIds, setPackIds] = useState<string[]>([]);
  // V36 — Cast & Crew
  const [writerId, setWriterId] = useState<string | null>(null);
  const [directorId, setDirectorId] = useState<string | null>(null);
  const [castIds, setCastIds] = useState<{ talentId: string; role: 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress' }[]>([]);
  const [showTalentPicker, setShowTalentPicker] = useState<null | 'writer' | 'director' | 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress'>(null);

  if (!state) return null;
  const playerFranchises = state.franchises.filter(f => f.studioId === state.player.id);
  const playerSvcs = (state.streamingServices || []).filter(sv => sv.studioId === state.player.id);
  // V38 — fix B4: Direct-to-TV can only air on YOUR OWN TV channels (must launch one first).
  // To license a series to external networks, use the series detail page after creation.
  const allNetworks = state.tvNetworks && state.tvNetworks.length > 0 ? state.tvNetworks : TV_NETWORKS_SEED;
  const playerChannels = allNetworks.filter(n => (n as any).ownerStudioId === state.player.id);
  // V41 — Player-owned channel packs (each pack expands to its underlying channels)
  const playerPacks = (state.channelPacks || []).filter(p => p.ownerStudioId === state.player.id);
  // Primary streaming service = first selected (sim only supports single target id)
  const targetSvc = playerSvcs.find(sv => sv.id === streamSvcIds[0]);

  // V36 — Available talents filter (must own them or have no contract, and be available)
  const availableTalents = (kind: 'writer' | 'director' | 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress') => {
    const wanted = kind === 'writer' ? 'writer' : kind === 'director' ? 'director' : kind.endsWith('actress') ? 'actress' : 'actor';
    return state.talents.filter(t => {
      if (t.role !== wanted) return false;
      if (t.retired) return false;
      const av = talentAvailability(t, state.week, state.year);
      if (!av.available) return false;
      // Already picked elsewhere on this form?
      if (writerId === t.id || directorId === t.id) return false;
      if (castIds.some(c => c.talentId === t.id)) return false;
      return true;
    }).sort((a, b) => (b.fame + b.skill) - (a.fame + a.skill));
  };

  const seasonsNum = parseInt(seasons, 10) || 0;
  const episodesNum = parseInt(episodes, 10) || 0;
  const budgetNum = parseFloat(budgetM) || 0;
  const totalCostB = (budgetNum * seasonsNum) / 1000;
  const castSalaryM = castIds.reduce((sum, c) => {
    const t = state.talents.find(tt => tt.id === c.talentId);
    return sum + (t ? t.salary * 0.6 : 0);
  }, 0);

  const pickedWriter = state.talents.find(t => t.id === writerId);
  const pickedDirector = state.talents.find(t => t.id === directorId);

  const submit = () => {
    if (!title.trim()) { uiAlert('Title required', 'Pick a title for your series.'); return; }
    if ((brand === 'sequel' || brand === 'prequel' || brand === 'spinoff') && !franchiseId) { uiAlert('Franchise required', 'Pick the parent franchise for this sequel/prequel/spinoff.'); return; }
    if (strategy === 'streaming' || strategy === 'hybrid') {
      if (streamSvcIds.length === 0) { uiAlert('Streaming target required', 'Pick at least one streaming service.'); return; }
    }
    // V41 — Expand selected packs to their channel IDs, dedupe with networkIds
    const expandedFromPacks = playerPacks.filter(p => packIds.includes(p.id)).flatMap(p => p.channelIds);
    const allChannelIds = Array.from(new Set([...networkIds, ...expandedFromPacks]));
    if (strategy === 'tv' || strategy === 'hybrid') {
      if (allChannelIds.length === 0) { uiAlert('TV channel required', 'Pick at least one TV channel or channel pack to air this series.'); return; }
    }
    const r = createTVSeries({
      title: title.trim(),
      brand,
      franchiseId: franchiseId || undefined,
      seasons: seasonsNum,
      episodesPerSeason: episodesNum,
      budgetMPerSeason: budgetNum,
      releaseStrategy: strategy,
      streamingTargetServiceId: (strategy === 'streaming' || strategy === 'hybrid') ? streamSvcIds[0] || undefined : undefined,
      streamingTargetTierIds: (strategy === 'streaming' || strategy === 'hybrid') ? streamTiers : undefined,
      streamingWindowWeeks: strategy === 'hybrid' ? hybridWindow : undefined,
      hybridPriority: strategy === 'hybrid' ? hybridPriority : undefined,
      tvNetworkId: (strategy === 'tv' || strategy === 'hybrid') ? allChannelIds[0] || undefined : undefined,
      writerId: writerId || undefined,
      directorId: directorId || undefined,
      cast: castIds.length > 0 ? castIds : undefined,
    });
    if (r.error) { uiAlert('Cannot greenlight', r.error); return; }
    // V41 — Broadcast on ALL picked channels (and packs' channels), plus secondary streaming services receive a follow-up note
    if ((strategy === 'tv' || strategy === 'hybrid') && r.seriesId && allChannelIds.length > 0) {
      addSeriesToChannels(r.seriesId, allChannelIds);
    }
    const extraSvc = streamSvcIds.length > 1 ? ` · simulcast across ${streamSvcIds.length} services` : '';
    const extraCh = allChannelIds.length > 1 ? ` · airing on ${allChannelIds.length} channels` : '';
    uiAlert('Series greenlit ✓', `${title} is now in production. ${seasonsNum} season${seasonsNum !== 1 ? 's' : ''}${extraSvc}${extraCh}.`);
    router.replace('/series');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
      <TopBar title="Create TV Series" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <Text style={s.lbl}>TITLE</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="e.g. The Apex Files" placeholderTextColor={T.textMute} maxLength={42} style={s.inp} testID="series-title" />

        <Text style={s.lbl}>BRAND</Text>
        <View style={s.rowWrap}>
          {BRAND_OPTIONS.map(b => (
            <TouchableOpacity key={b.k} style={[s.chip, brand === b.k && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setBrand(b.k)} testID={`series-brand-${b.k}`}>
              <MaterialCommunityIcons name={b.icon as any} size={12} color={brand === b.k ? T.cardDark : T.text} />
              <Text style={[s.chipTxt, brand === b.k && { color: T.cardDark }, { marginLeft: 4 }]}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(brand === 'sequel' || brand === 'prequel' || brand === 'spinoff') ? (
          <>
            <Text style={s.lbl}>PARENT FRANCHISE</Text>
            {playerFranchises.length === 0 ? (
              <Text style={s.hint}>You don't own any franchises yet. Pick "Original" instead.</Text>
            ) : (
              <View style={s.rowWrap}>
                {playerFranchises.map(f => (
                  <TouchableOpacity key={f.id} style={[s.chip, franchiseId === f.id && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setFranchiseId(f.id)} testID={`series-fr-${f.id}`}>
                    <Text style={[s.chipTxt, franchiseId === f.id && { color: T.cardDark }]}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : null}

        <Text style={s.lbl}>SEASONS GREENLIT (1–5)</Text>
        <View style={s.rowWrap}>
          {[1, 2, 3, 4, 5].map(n => (
            <TouchableOpacity key={n} style={[s.chip, seasonsNum === n && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setSeasons(String(n))} testID={`series-seasons-${n}`}>
              <Text style={[s.chipTxt, seasonsNum === n && { color: T.cardDark }]}>{n} season{n !== 1 ? 's' : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.lbl}>EPISODES PER SEASON (6–22)</Text>
        <View style={s.rowWrap}>
          {[6, 8, 10, 13, 16, 22].map(n => (
            <TouchableOpacity key={n} style={[s.chip, episodesNum === n && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setEpisodes(String(n))} testID={`series-eps-${n}`}>
              <Text style={[s.chipTxt, episodesNum === n && { color: T.cardDark }]}>{n} eps</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.lbl}>BUDGET PER SEASON ($M)</Text>
        <TextInput value={budgetM} onChangeText={(v) => setBudgetM(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={5} style={s.inp} testID="series-budget" />
        <View style={s.rowWrap}>
          {[30, 50, 80, 120, 200].map(n => (
            <TouchableOpacity key={n} style={[s.chip]} onPress={() => setBudgetM(String(n))}>
              <Text style={s.chipTxt}>${n}M</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.lbl}>RELEASE STRATEGY</Text>
        <View style={s.rowWrap}>
          {STRAT.map(st => (
            <TouchableOpacity key={st.k} style={[s.stratCard, strategy === st.k && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setStrategy(st.k)} testID={`series-strat-${st.k}`}>
              <MaterialCommunityIcons name={st.icon as any} size={18} color={strategy === st.k ? T.cardDark : T.text} />
              <Text style={[s.stratLabel, strategy === st.k && { color: T.cardDark }]}>{st.label}</Text>
              <Text style={[s.stratDesc, strategy === st.k && { color: T.cardDark }]}>{st.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {(strategy === 'streaming' || strategy === 'hybrid') && (
          <View style={s.subPanel}>
            <Text style={s.subLbl}>STREAMING SERVICES ({streamSvcIds.length} selected — multi-select)</Text>
            {playerSvcs.length === 0 ? (
              <Text style={s.hint}>Launch a streaming service first.</Text>
            ) : (
              <View style={s.rowWrap}>
                {playerSvcs.map(sv => {
                  const sel = streamSvcIds.includes(sv.id);
                  return (
                    <TouchableOpacity key={sv.id} style={[s.chip, sel && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => {
                      // V41 — Toggle multi-select. Tiers default to FIRST selected service's tiers.
                      setStreamSvcIds(prev => {
                        const next = prev.includes(sv.id) ? prev.filter(x => x !== sv.id) : [...prev, sv.id];
                        if (next.length > 0) {
                          const primary = playerSvcs.find(x => x.id === next[0]);
                          if (primary) setStreamTiers(primary.tiers.map(t => t.id));
                        } else {
                          setStreamTiers([]);
                        }
                        return next;
                      });
                    }} testID={`series-svc-${sv.id}`}>
                      <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={12} color={sel ? T.cardDark : T.text} />
                      <Text style={[s.chipTxt, sel && { color: T.cardDark }, { marginLeft: 4 }]}>{sv.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {targetSvc ? (
              <>
                <Text style={s.subLbl}>TIERS CARRYING THE SERIES (on {targetSvc.name})</Text>
                <View style={s.rowWrap}>
                  {targetSvc.tiers.map(t => {
                    const active = streamTiers.includes(t.id);
                    return (
                      <TouchableOpacity key={t.id} style={[s.chip, active && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setStreamTiers(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])} testID={`series-tier-${t.id}`}>
                        <Text style={[s.chipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        )}

        {(strategy === 'tv' || strategy === 'hybrid') && (
          <View style={s.subPanel}>
            <Text style={s.subLbl}>TV CHANNELS · YOUR OWNED ({networkIds.length} picked — multi-select)</Text>
            <Text style={{ color: T.textDim, fontSize: 12, marginBottom: 8, fontStyle: 'italic' }}>
              Pick one or more channels and/or channel packs to simulcast this series. Cable carriage deals determine reach.
            </Text>
            {playerChannels.length === 0 ? (
              <View style={{ backgroundColor: T.cardDark, padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: T.orange }}>
                <Text style={{ color: T.orange, fontWeight: '800', marginBottom: 4 }}>No channels yet</Text>
                <Text style={{ color: T.textDim, fontSize: 12 }}>Launch a TV channel from the TV Networks page before creating a Direct-to-TV series.</Text>
              </View>
            ) : (
              <View style={s.rowWrap}>
                {playerChannels.map(n => {
                  const sel = networkIds.includes(n.id);
                  return (
                    <TouchableOpacity key={n.id} style={[s.chip, sel && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setNetworkIds(prev => prev.includes(n.id) ? prev.filter(x => x !== n.id) : [...prev, n.id])} testID={`series-net-${n.id}`}>
                      <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={12} color={sel ? T.cardDark : T.text} />
                      <Text style={[s.chipTxt, sel && { color: T.cardDark }, { marginLeft: 4 }]}>{n.name} · {n.kind === 'premium' ? 'Prem' : n.kind === 'cable' ? 'Cable' : 'Pub'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {playerPacks.length > 0 ? (
              <>
                <Text style={[s.subLbl, { marginTop: 12 }]}>CHANNEL PACKS ({packIds.length} picked)</Text>
                <View style={s.rowWrap}>
                  {playerPacks.map(p => {
                    const sel = packIds.includes(p.id);
                    return (
                      <TouchableOpacity key={p.id} style={[s.chip, sel && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setPackIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])} testID={`series-pack-${p.id}`}>
                        <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'package-variant'} size={12} color={sel ? T.cardDark : T.text} />
                        <Text style={[s.chipTxt, sel && { color: T.cardDark }, { marginLeft: 4 }]}>{p.name} ({p.channelIds.length}ch)</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}
          </View>
        )}

        {strategy === 'hybrid' && (
          <View style={s.subPanel}>
            <Text style={s.subLbl}>HYBRID PRIORITY (which launches first?)</Text>
            <View style={s.rowWrap}>
              {([
                { k: 'tv_first' as const, label: 'TV First', icon: 'television-classic', desc: 'TV premiere first, streaming joins later.' },
                { k: 'streaming_first' as const, label: 'Streaming First', icon: 'play-circle', desc: 'Streaming drop first, TV airs after.' },
              ]).map(p => (
                <TouchableOpacity key={p.k} style={[s.stratCard, hybridPriority === p.k && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setHybridPriority(p.k)} testID={`series-priority-${p.k}`}>
                  <MaterialCommunityIcons name={p.icon as any} size={18} color={hybridPriority === p.k ? T.cardDark : T.text} />
                  <Text style={[s.stratLabel, hybridPriority === p.k && { color: T.cardDark }]}>{p.label}</Text>
                  <Text style={[s.stratDesc, hybridPriority === p.k && { color: T.cardDark }]}>{p.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.subLbl}>HYBRID RELEASE WINDOW (weeks between launches)</Text>
            <View style={s.rowWrap}>
              {[0, 4, 8, 12].map(w => (
                <TouchableOpacity key={w} style={[s.chip, hybridWindow === w && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setHybridWindow(w)} testID={`series-win-${w}`}>
                  <Text style={[s.chipTxt, hybridWindow === w && { color: T.cardDark }]}>{w === 0 ? '0w (Day & Date)' : `${w}w`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* V36 — Cast & Crew (optional, but boosts series score) */}
        <Text style={s.lbl}>CAST & CREW (optional — boosts series score)</Text>
        <TouchableOpacity
          style={s.browseTalentBtn}
          onPress={() => router.push('/talent')}
          testID="browse-talent-pool"
        >
          <MaterialCommunityIcons name="account-search" size={16} color={T.cardDark} />
          <Text style={s.browseTalentBtnT}>BROWSE TALENT DATABASE → (hire / view all)</Text>
        </TouchableOpacity>
        <View style={s.crewBox}>
          {/* Writer */}
          <TouchableOpacity style={s.crewRow} onPress={() => setShowTalentPicker('writer')} testID="pick-writer">
            {pickedWriter ? <Avatar skin={pickedWriter.avatarColor} hair={pickedWriter.hairColor} hairStyle={pickedWriter.hairStyle} facialHair={pickedWriter.facialHair} size={36} /> : <MaterialCommunityIcons name="pen" size={16} color={T.cyan} />}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.crewLbl}>WRITER</Text>
              <Text style={s.crewName}>{pickedWriter ? `${pickedWriter.name} · ★${pickedWriter.fame} · Skill ${pickedWriter.skill}` : 'Tap to choose a writer'}</Text>
              {pickedWriter ? <Text style={s.castSub}>${(pickedWriter.salary * 0.6).toFixed(1)}M (TV) · color: <Text style={{ color: COLOR_HEX[pickedWriter.colorTrait], fontWeight: '900' }}>{pickedWriter.colorTrait}</Text></Text> : null}
            </View>
            {pickedWriter ? <TouchableOpacity onPress={() => setWriterId(null)}><MaterialCommunityIcons name="close-circle" size={18} color={T.red} /></TouchableOpacity> : null}
          </TouchableOpacity>

          {/* Director */}
          <TouchableOpacity style={s.crewRow} onPress={() => setShowTalentPicker('director')} testID="pick-director">
            {pickedDirector ? <Avatar skin={pickedDirector.avatarColor} hair={pickedDirector.hairColor} hairStyle={pickedDirector.hairStyle} facialHair={pickedDirector.facialHair} size={36} /> : <MaterialCommunityIcons name="movie-open" size={16} color={T.magenta} />}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={s.crewLbl}>DIRECTOR</Text>
              <Text style={s.crewName}>{pickedDirector ? `${pickedDirector.name} · ★${pickedDirector.fame} · Skill ${pickedDirector.skill}` : 'Tap to choose a director'}</Text>
              {pickedDirector ? <Text style={s.castSub}>${(pickedDirector.salary * 0.6).toFixed(1)}M (TV) · color: <Text style={{ color: COLOR_HEX[pickedDirector.colorTrait], fontWeight: '900' }}>{pickedDirector.colorTrait}</Text></Text> : null}
            </View>
            {pickedDirector ? <TouchableOpacity onPress={() => setDirectorId(null)}><MaterialCommunityIcons name="close-circle" size={18} color={T.red} /></TouchableOpacity> : null}
          </TouchableOpacity>

          {/* Cast list */}
          {castIds.map((c, idx) => {
            const t = state.talents.find(tt => tt.id === c.talentId);
            if (!t) return null;
            const lbl = c.role.startsWith('lead') ? 'LEAD' : 'SUPPORT';
            const genderLbl = c.role.endsWith('actress') ? 'Actress' : 'Actor';
            const tvSalary = +(t.salary * 0.6).toFixed(2);
            // V37 — Will-sign predictor against TV-rate expectations (60% of movie expectations)
            const acc = calculateAcceptance(t, 1, tvSalary, 0, 0.6);
            const willSign = acc.verdict === 'will_accept' || acc.verdict === 'likely_accept';
            const accColor = willSign ? T.green : acc.verdict === 'considering' ? T.yellow : T.orange;
            const accLabel = willSign ? '✓ Will sign' : acc.verdict === 'considering' ? `🤝 Considering — ${acc.reason}` : `✗ Will reject — ${acc.reason}`;
            return (
              <View key={`${c.talentId}-${idx}`} style={s.castRow}>
                <Avatar skin={t.avatarColor} hair={t.hairColor} hairStyle={t.hairStyle} facialHair={t.facialHair} size={42} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.crewLbl}>{lbl} · {genderLbl}</Text>
                  <Text style={s.crewName}>{t.name} · ★{t.fame} · Skill {t.skill}/100</Text>
                  <Text style={s.castSub}>${tvSalary.toFixed(1)}M (TV) · color: <Text style={{ color: COLOR_HEX[t.colorTrait], fontWeight: '900' }}>{t.colorTrait}</Text></Text>
                  <View style={[s.acceptChip, { borderColor: accColor, backgroundColor: accColor + '22' }]}>
                    <Text style={[s.acceptT, { color: accColor }]} testID={`series-cast-${idx}-accept`}>{accLabel}</Text>
                  </View>
                  {/* V44 — Open full negotiation (parity with create-movie) */}
                  {!willSign && (
                    <TouchableOpacity
                      style={[s.negotiateBtn]}
                      onPress={() => router.push({ pathname: '/negotiate/[talentId]', params: { talentId: t.id } })}
                      testID={`series-cast-${idx}-negotiate`}
                    >
                      <MaterialCommunityIcons name="handshake" size={12} color={T.magenta} />
                      <Text style={s.negotiateBtnT}>🤝 Open Full Negotiation →</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => setCastIds(prev => prev.filter((_, i) => i !== idx))} testID={`series-cast-${idx}-remove`}>
                  <MaterialCommunityIcons name="close-circle" size={22} color={T.red} />
                </TouchableOpacity>
              </View>
            );
          })}

          {/* V37 — Chemistry preview */}
          {(() => {
            const chemColors: ColorTrait[] = [];
            if (pickedWriter) chemColors.push(pickedWriter.colorTrait);
            if (pickedDirector) chemColors.push(pickedDirector.colorTrait);
            castIds.forEach(c => {
              const tal = state.talents.find(tt => tt.id === c.talentId);
              if (tal) chemColors.push(tal.colorTrait);
            });
            if (chemColors.length < 2) return null;
            const chemBonus = computeChemistryBonus(chemColors);
            const chemPct = Math.round(chemBonus * 100);
            return (
              <View style={s.chemRow}>
                <View style={s.chemDots}>
                  {chemColors.map((cc, ci) => <View key={`chem-${cc}-${ci}`} style={[s.chemDot, { backgroundColor: COLOR_HEX[cc] }]} />)}
                </View>
                <Text style={[s.chemTxt, { color: chemPct > 0 ? T.green : T.textDim }]}>Cast Chemistry: +{chemPct}%</Text>
              </View>
            );
          })()}

          <View style={s.rowWrap}>
            {([
              { k: 'lead_actor', label: '+ Lead Actor', icon: 'account-plus' },
              { k: 'lead_actress', label: '+ Lead Actress', icon: 'account-plus' },
              { k: 'support_actor', label: '+ Support Actor', icon: 'account-multiple-plus' },
              { k: 'support_actress', label: '+ Support Actress', icon: 'account-multiple-plus' },
            ] as const).map(r => (
              <TouchableOpacity key={r.k} style={s.chip} onPress={() => setShowTalentPicker(r.k)} testID={`add-${r.k}`}>
                <MaterialCommunityIcons name={r.icon as any} size={12} color={T.text} />
                <Text style={[s.chipTxt, { marginLeft: 4 }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.quoteBox}>
          <Text style={s.quoteLbl}>TOTAL BUDGET COMMITMENT</Text>
          <Text style={s.quoteVal}>${totalCostB.toFixed(2)}B</Text>
          <Text style={s.quoteSub}>{seasonsNum} × ${budgetNum.toFixed(0)}M · You have ${state.player.cash.toFixed(2)}B cash · {episodesNum} episodes/season{castSalaryM > 0 ? ` · cast adds ~$${castSalaryM.toFixed(1)}M/season` : ''}</Text>
        </View>

        <TouchableOpacity style={[s.submit, totalCostB > state.player.cash && { opacity: 0.5 }]} onPress={submit} disabled={totalCostB > state.player.cash} testID="series-submit">
          <MaterialCommunityIcons name="movie-roll" size={20} color={T.cardDark} />
          <Text style={s.submitTxt}>GREENLIGHT SERIES</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Talent picker overlay */}
      {showTalentPicker ? (
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Pick {showTalentPicker.replace('_', ' ').toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setShowTalentPicker(null)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {availableTalents(showTalentPicker).length === 0 ? (
                <Text style={s.hint}>No available talent of this type. Try the Talent Database to hire more.</Text>
              ) : availableTalents(showTalentPicker).map(t => {
                const isCrew = showTalentPicker === 'writer' || showTalentPicker === 'director';
                const tvSalary = +(t.salary * 0.6).toFixed(2);
                const acc = !isCrew ? calculateAcceptance(t, 1, tvSalary, 0, 0.6) : null;
                const willSign = acc ? (acc.verdict === 'will_accept' || acc.verdict === 'likely_accept') : true;
                const accColor = !acc ? T.green : willSign ? T.green : acc.verdict === 'considering' ? T.yellow : T.orange;
                return (
                  <TouchableOpacity key={t.id} style={s.talentRow} onPress={() => {
                    if (showTalentPicker === 'writer') setWriterId(t.id);
                    else if (showTalentPicker === 'director') setDirectorId(t.id);
                    else setCastIds(prev => [...prev, { talentId: t.id, role: showTalentPicker as any }]);
                    setShowTalentPicker(null);
                  }} testID={`talent-pick-${t.id}`}>
                    <Avatar skin={t.avatarColor} hair={t.hairColor} hairStyle={t.hairStyle} facialHair={t.facialHair} size={40} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.talentName}>{t.name}</Text>
                        <View style={[s.colorBadge, { backgroundColor: COLOR_HEX[t.colorTrait] }]} />
                      </View>
                      <Text style={s.talentSub}>★{t.fame} · Skill {t.skill}/100 · ${t.salary.toFixed(1)}M base{!isCrew ? ` (TV ~$${tvSalary.toFixed(1)}M)` : ''}</Text>
                      {acc ? (
                        <Text style={[s.talentAcc, { color: accColor }]}>
                          {willSign ? '✓ Will sign at TV rate' : acc.verdict === 'considering' ? `🤝 Considering: ${acc.reason}` : `✗ Likely rejects: ${acc.reason}`}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  lbl: { color: T.text, fontWeight: '900', fontSize: 12, marginTop: 16 },
  subLbl: { color: T.text, fontWeight: '900', fontSize: 11, marginTop: 8, marginBottom: 4 },
  hint: { color: T.textDim, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  inp: { backgroundColor: T.cardDark, color: T.text, padding: 10, borderRadius: 8, marginTop: 6, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: T.border },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: T.border },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  stratCard: { width: '100%', backgroundColor: T.cardDark, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: T.border, marginTop: 4 },
  stratLabel: { color: T.text, fontWeight: '900', fontSize: 13, marginTop: 4 },
  stratDesc: { color: T.textDim, fontSize: 11, marginTop: 2 },
  subPanel: { backgroundColor: T.card, padding: 10, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: T.border },
  quoteBox: { backgroundColor: T.cardDark, padding: 14, borderRadius: 10, marginTop: 18, borderWidth: 1, borderColor: T.border },
  quoteLbl: { color: T.textDim, fontSize: 10, fontWeight: '900' },
  quoteVal: { color: T.green, fontSize: 24, fontWeight: '900', marginTop: 2 },
  quoteSub: { color: T.textDim, fontSize: 11, marginTop: 4 },
  submit: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.yellow, paddingVertical: 14, borderRadius: 10 },
  submitTxt: { color: T.cardDark, fontWeight: '900', fontSize: 14 },
  // V36 — cast/crew styles
  crewBox: { backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: T.border, gap: 8 },
  crewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  crewLbl: { color: T.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  crewName: { color: T.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  // V37 — cast row with avatar + acceptance chip
  castRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  castSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  acceptChip: { borderWidth: 1.5, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6, marginTop: 4, alignSelf: 'flex-start' },
  acceptT: { fontWeight: '800', fontSize: 10 },
  chemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, marginTop: 6, backgroundColor: T.cardDark, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  chemDots: { flexDirection: 'row', gap: 3 },
  chemDot: { width: 11, height: 11, borderRadius: 6 },
  chemTxt: { fontWeight: '900', fontSize: 12 },
  colorBadge: { width: 10, height: 10, borderRadius: 5 },
  talentAcc: { fontSize: 10, fontWeight: '800', marginTop: 2 },
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  pickerCard: { width: '100%', maxWidth: 420, backgroundColor: T.cardDark, borderRadius: 12, padding: 12, borderWidth: 2, borderColor: T.border },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: T.border, marginBottom: 8 },
  pickerTitle: { color: T.text, fontSize: 14, fontWeight: '900' },
  talentRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, marginBottom: 6, backgroundColor: T.card },
  avatarDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: T.border },
  talentName: { color: T.text, fontWeight: '900', fontSize: 13 },
  talentSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  negotiateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1.5, borderColor: T.magenta, alignSelf: 'flex-start' },
  negotiateBtnT: { color: T.magenta, fontSize: 10, fontWeight: '900' },
  browseTalentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 10, borderRadius: 8, backgroundColor: T.cyan },
  browseTalentBtnT: { color: T.cardDark, fontSize: 12, fontWeight: '900' },
});
