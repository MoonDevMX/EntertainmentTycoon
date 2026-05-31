import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T } from '../src/ui/theme';
import { TopBar } from '../src/ui/components';
import { uiAlert } from '../src/ui/ui-alert';

const STRAT_LABEL: Record<string, string> = { tv: 'Direct to TV', streaming: 'Streaming', hybrid: 'Hybrid' };
const STRAT_ICON: Record<string, string> = { tv: 'television-classic', streaming: 'play-circle', hybrid: 'compare-horizontal' };

export default function MySeriesScreen() {
  const { state, renewTVSeries } = useGame();
  const [renewId, setRenewId] = useState<string | null>(null);
  const [renewEps, setRenewEps] = useState('10');
  const [renewBudget, setRenewBudget] = useState('60');

  if (!state) return null;
  const series = (state.tvSeries || []).filter(s => s.studioId === state.player.id);

  const doRenew = () => {
    if (!renewId) return;
    const eps = parseInt(renewEps, 10) || 0;
    const budget = parseFloat(renewBudget) || 0;
    const r = renewTVSeries(renewId, { episodes: eps, budgetM: budget });
    if (r.error) { uiAlert('Failed', r.error); return; }
    setRenewId(null);
    uiAlert('Renewed ✓', 'New season added.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.bg }}>
      <TopBar title={`My TV Series · ${series.length}`} onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
        <TouchableOpacity style={s.bigBtn} onPress={() => router.push({ pathname: '/create-movie', params: { reset: '1' } })} testID="series-new-btn">
          <MaterialCommunityIcons name="plus-circle" size={18} color={T.cardDark} />
          <Text style={s.bigBtnTxt}>CREATE NEW SERIES</Text>
        </TouchableOpacity>

        {series.length === 0 ? (
          <Text style={s.empty}>No TV series yet. Tap "CREATE NEW SERIES" to greenlight your first show.</Text>
        ) : series.map(sr => {
          const releasedSeasons = sr.seasons.filter(sn => sn.releaseWeek !== undefined).length;
          const inProd = sr.productionWeeksLeft !== undefined;
          const progress = inProd && sr.productionTotalWeeks && sr.productionTotalWeeks > 0
            ? Math.max(0, Math.min(1, 1 - ((sr.productionWeeksLeft || 0) / sr.productionTotalWeeks)))
            : 0;
          const cast = sr.cast || [];
          const writer = sr.writerId ? state.talents.find(t => t.id === sr.writerId) : null;
          const director = sr.directorId ? state.talents.find(t => t.id === sr.directorId) : null;
          const hybridLabel = sr.releaseStrategy === 'hybrid'
            ? (sr.hybridPriority === 'streaming_first' ? ' · Streaming-first' : ' · TV-first')
            : '';
          return (
            <TouchableOpacity key={sr.id} style={s.card} onPress={() => router.push(`/series/${sr.id}`)} testID={`series-card-${sr.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name={STRAT_ICON[sr.releaseStrategy] as any} size={20} color={T.cyan} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={s.title}>{sr.title}</Text>
                  <Text style={s.meta}>{sr.brand?.toUpperCase()} · {STRAT_LABEL[sr.releaseStrategy]}{hybridLabel} · {sr.seasons.length} season{sr.seasons.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={[s.pill, { backgroundColor: inProd ? T.yellow : T.green }]}>
                  <Text style={s.pillTxt}>{inProd ? `S${sr.productionSeason} · ${sr.productionWeeksLeft}w` : 'AIRED'}</Text>
                </View>
              </View>

              {/* V36 — Production progress bar */}
              {inProd ? (
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
                  <Text style={s.progressTxt}>{Math.round(progress * 100)}% of S{sr.productionSeason} produced</Text>
                </View>
              ) : null}

              {/* V36 — Cast & Crew */}
              {(writer || director || cast.length > 0) ? (
                <View style={s.crewMini}>
                  {writer ? <Text style={s.crewMiniTxt}><Text style={s.crewMiniLbl}>WRITER </Text>{writer.name}</Text> : null}
                  {director ? <Text style={s.crewMiniTxt}><Text style={s.crewMiniLbl}>DIRECTOR </Text>{director.name}</Text> : null}
                  {cast.length > 0 ? (
                    <Text style={s.crewMiniTxt}>
                      <Text style={s.crewMiniLbl}>CAST </Text>
                      {cast.slice(0, 3).map(c => state.talents.find(t => t.id === c.talentId)?.name).filter(Boolean).join(', ')}
                      {cast.length > 3 ? ` +${cast.length - 3} more` : ''}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={{ marginTop: 8 }}>
                {sr.seasons.map(sn => (
                  <View key={sn.number} style={s.seasonRow}>
                    <Text style={s.seasonTitle}>Season {sn.number}</Text>
                    <Text style={s.seasonMeta}>{sn.episodes} eps · ${sn.budgetM}M{sn.avgScore ? ` · ${sn.avgScore}/100` : sn.releaseWeek === undefined ? ' · pending' : ''}{sn.renewed ? ' · renewed' : ''}</Text>
                  </View>
                ))}
              </View>
              {!inProd && sr.seasons.length < 10 ? (
                <TouchableOpacity style={s.renewBtn} onPress={() => { setRenewId(sr.id); setRenewEps('10'); setRenewBudget(String(sr.seasons[sr.seasons.length - 1]?.budgetM || 60)); }} testID={`series-renew-${sr.id}`}>
                  <MaterialCommunityIcons name="refresh" size={16} color={T.cardDark} />
                  <Text style={s.renewTxt}>RENEW FOR NEW SEASON</Text>
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={!!renewId} animationType="slide" onRequestClose={() => setRenewId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
          <View style={s.fsHeader}>
            <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setRenewId(null)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
            <Text style={s.fsHeaderTitle}>Renew Season</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.lbl}>EPISODES (6–22)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {[6, 8, 10, 13, 16, 22].map(n => (
                <TouchableOpacity key={n} style={[s.chip, parseInt(renewEps, 10) === n && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setRenewEps(String(n))}>
                  <Text style={[s.chipTxt, parseInt(renewEps, 10) === n && { color: T.cardDark }]}>{n} eps</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.lbl}>BUDGET ($M)</Text>
            <TextInput value={renewBudget} onChangeText={(v) => setRenewBudget(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={5} style={s.inp} testID="renew-budget" />
            <TouchableOpacity style={s.submit} onPress={doRenew} testID="renew-submit">
              <MaterialCommunityIcons name="movie-roll" size={20} color={T.cardDark} />
              <Text style={s.submitTxt}>RENEW (${(parseFloat(renewBudget) || 0).toFixed(1)}M)</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  empty: { color: T.text, opacity: 0.85, fontStyle: 'italic', marginTop: 30, textAlign: 'center' },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 10, backgroundColor: T.magenta, marginBottom: 12 },
  bigBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 14 },
  card: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  title: { color: T.text, fontWeight: '900', fontSize: 14 },
  meta: { color: T.textDim, fontSize: 11, marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pillTxt: { color: T.cardDark, fontWeight: '900', fontSize: 10 },
  seasonRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: T.border },
  seasonTitle: { color: T.text, fontSize: 12, fontWeight: '800' },
  seasonMeta: { color: T.textDim, fontSize: 11 },
  renewBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.green, padding: 10, borderRadius: 8 },
  renewTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12 },
  fsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.cardDark },
  fsHeaderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fsHeaderTitle: { flex: 1, color: T.text, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  lbl: { color: T.text, fontWeight: '900', fontSize: 11, marginTop: 14 },
  chip: { backgroundColor: T.cardDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: T.border },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  inp: { backgroundColor: T.cardDark, color: T.text, padding: 10, borderRadius: 8, marginTop: 6, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: T.border },
  submit: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.yellow, paddingVertical: 14, borderRadius: 10 },
  submitTxt: { color: T.cardDark, fontWeight: '900', fontSize: 14 },
  progressTrack: { marginTop: 10, height: 18, backgroundColor: T.card, borderRadius: 9, borderWidth: 1, borderColor: T.border, overflow: 'hidden', justifyContent: 'center', position: 'relative' },
  progressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: T.green },
  progressTxt: { color: T.text, fontSize: 10, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  crewMini: { marginTop: 8, backgroundColor: T.card, padding: 8, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: T.cyan },
  crewMiniTxt: { color: T.text, fontSize: 11, fontWeight: '700' },
  crewMiniLbl: { color: T.textDim, fontWeight: '900' },
});
