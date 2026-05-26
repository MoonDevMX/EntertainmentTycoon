import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../src/game/state';
import { T } from '../../src/ui/theme';
import { TopBar, SectionHeader, NeonStat } from '../../src/ui/components';
import { uiAlert } from '../../src/ui/ui-alert';

const STRAT_LABEL: Record<string, string> = { tv: 'Direct to TV', streaming: 'Streaming', hybrid: 'Hybrid' };
const STRAT_ICON: Record<string, string> = { tv: 'television-classic', streaming: 'play-circle', hybrid: 'compare-horizontal' };

export default function SeriesDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, renewTVSeries, cancelTVSeries, setEntityMarketing } = useGame();
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewEps, setRenewEps] = useState('10');
  const [renewBudget, setRenewBudget] = useState('60');
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (!state) return null;
  const series = (state.tvSeries || []).find(s => s.id === id);
  if (!series) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <TopBar title="Series" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
        <Text style={[s.empty, { padding: 30 }]}>Series not found.</Text>
      </SafeAreaView>
    );
  }

  const owner = series.studioId === state.player.id ? state.player : state.rivals.find(r => r.id === series.studioId);
  const isOwn = series.studioId === state.player.id;
  const franchise = series.franchiseId ? state.franchises.find(f => f.id === series.franchiseId) : null;
  const writer = series.writerId ? state.talents.find(t => t.id === series.writerId) : null;
  const director = series.directorId ? state.talents.find(t => t.id === series.directorId) : null;
  const network = series.tvNetworkId ? state.tvNetworks?.find(n => n.id === series.tvNetworkId) : null;
  const svc = series.streamingTargetServiceId ? state.streamingServices?.find(sv => sv.id === series.streamingTargetServiceId) : null;

  const inProd = series.productionWeeksLeft !== undefined;
  const progress = inProd && series.productionTotalWeeks && series.productionTotalWeeks > 0
    ? Math.max(0, Math.min(1, 1 - ((series.productionWeeksLeft || 0) / series.productionTotalWeeks)))
    : 0;

  const totalBudgetM = series.seasons.reduce((sum, sn) => sum + sn.budgetM, 0);
  const releasedSeasons = series.seasons.filter(sn => sn.releaseWeek !== undefined);
  const scores = releasedSeasons.map(sn => sn.avgScore || 0).filter(n => n > 0);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const cast = series.cast || [];

  const hybridLabel = series.releaseStrategy === 'hybrid'
    ? (series.hybridPriority === 'streaming_first' ? 'Streaming-first' : 'TV-first')
    : '';

  const doRenew = () => {
    const eps = parseInt(renewEps, 10) || 0;
    const budget = parseFloat(renewBudget) || 0;
    const r = renewTVSeries(series.id, { episodes: eps, budgetM: budget });
    if (r.error) { uiAlert('Cannot renew', r.error); return; }
    setRenewOpen(false);
    uiAlert('Renewed ✓', `New season greenlit. Production started.`);
  };

  const doCancel = () => {
    const r = cancelTVSeries(series.id);
    if (r.error) { uiAlert('Cannot cancel', r.error); return; }
    setConfirmCancel(false);
    uiAlert('Series cancelled', `${series.title} has been pulled from production.`);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <TopBar title="TV Series" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={s.header}>
          <MaterialCommunityIcons name={STRAT_ICON[series.releaseStrategy] as any} size={48} color={T.magenta} />
          <View style={{ flex: 1, paddingLeft: 12 }}>
            <Text style={s.title}>{series.title}</Text>
            <Text style={s.sub}>{owner?.name || '—'}{franchise ? ` · ${franchise.name}` : ''}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <View style={[s.tag, { borderColor: T.cyan }]}>
                <Text style={[s.tagTxt, { color: T.cyan }]}>{series.brand?.toUpperCase() || 'ORIGINAL'}</Text>
              </View>
              <View style={[s.tag, { borderColor: T.magenta }]}>
                <Text style={[s.tagTxt, { color: T.magenta }]}>{STRAT_LABEL[series.releaseStrategy]}{hybridLabel ? ` · ${hybridLabel}` : ''}</Text>
              </View>
              <View style={[s.tag, { borderColor: inProd ? T.yellow : series.status === 'cancelled' ? T.red : T.green }]}>
                <Text style={[s.tagTxt, { color: inProd ? T.yellow : series.status === 'cancelled' ? T.red : T.green }]}>
                  {inProd ? `S${series.productionSeason} · ${series.productionWeeksLeft}w left` : series.status === 'cancelled' ? 'CANCELLED' : 'AIRED'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        {inProd ? (
          <View style={s.progressWrap}>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={s.progressTxt}>{Math.round(progress * 100)}% of Season {series.productionSeason} produced ({series.productionWeeksLeft}w remaining)</Text>
          </View>
        ) : null}

        {/* Stats row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, padding: 12 }}>
          <NeonStat label="SEASONS" value={series.seasons.length} color={T.cyan} />
          <NeonStat label="RELEASED" value={releasedSeasons.length} color={T.green} />
          {avgScore !== null ? <NeonStat label="AVG SCORE" value={`${avgScore}/100`} color={T.yellow} /> : null}
          <NeonStat label="TOTAL BUDGET" value={`$${(totalBudgetM / 1000).toFixed(2)}B`} color={T.magenta} />
        </ScrollView>

        {/* Distribution */}
        <SectionHeader title="Distribution" />
        <View style={s.statsBox}>
          {network ? (
            <Text style={s.statTxt}>📺 TV Network: <Text style={{ color: T.cyan, fontWeight: '900' }}>{network.name}</Text> ({network.kind})</Text>
          ) : null}
          {svc ? (
            <Text style={s.statTxt}>▶ Streaming: <Text style={{ color: T.magenta, fontWeight: '900' }}>{svc.name}</Text>{(series.streamingTargetTierIds || []).length > 0 ? ` · ${(series.streamingTargetTierIds || []).length} tier(s)` : ''}</Text>
          ) : null}
          {series.releaseStrategy === 'hybrid' && series.streamingWindowWeeks !== undefined ? (
            <Text style={s.statTxt}>⏱ Hybrid window: <Text style={{ color: T.yellow, fontWeight: '900' }}>{series.streamingWindowWeeks}w</Text></Text>
          ) : null}
        </View>

        {/* Weekly Marketing Budget */}
        {isOwn && series.status !== 'cancelled' ? (
          <>
            <SectionHeader title="Weekly Marketing Budget" />
            <View style={s.statsBox}>
              <Text style={s.statTxt}>Weekly promo: <Text style={{ color: T.green, fontWeight: '900' }}>${series.marketingBudgetM || 0}M / week</Text></Text>
              <Text style={[s.hint, { marginTop: 2, marginBottom: 8 }]}>Continuously drives viewer fatigue down and boosts weekly viewership.</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[0, 2, 5, 10, 20].map(b => {
                  const active = (series.marketingBudgetM || 0) === b;
                  return (
                    <TouchableOpacity
                      key={b}
                      style={[s.chip, active && { backgroundColor: T.green, borderColor: T.green }]}
                      onPress={() => {
                        const r = setEntityMarketing('series', series.id, b);
                        if (r && r.error) {
                          uiAlert('Failed', r.error);
                        }
                      }}
                      testID={`series-detail-marketing-${b}`}
                    >
                      <Text style={[s.chipTxt, active && { color: T.cardDark }]}>{b === 0 ? 'OFF' : `$${b}M`}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        ) : null}

        {/* Cast & Crew */}
        {(writer || director || cast.length > 0) ? (
          <>
            <SectionHeader title="Cast & Crew" />
            <View style={s.statsBox}>
              {writer ? (
                <View style={s.crewRow}>
                  <MaterialCommunityIcons name="pen" size={14} color={T.cyan} />
                  <Text style={s.crewLbl}>WRITER</Text>
                  <Text style={s.crewName}>{writer.name} · ★{writer.fame}</Text>
                </View>
              ) : null}
              {director ? (
                <View style={s.crewRow}>
                  <MaterialCommunityIcons name="movie-open" size={14} color={T.magenta} />
                  <Text style={s.crewLbl}>DIRECTOR</Text>
                  <Text style={s.crewName}>{director.name} · ★{director.fame}</Text>
                </View>
              ) : null}
              {cast.map((c, idx) => {
                const t = state.talents.find(tt => tt.id === c.talentId);
                if (!t) return null;
                const lbl = c.role.startsWith('lead') ? 'LEAD' : 'SUPPORT';
                const genderLbl = c.role.endsWith('actress') ? 'Actress' : 'Actor';
                return (
                  <View key={`${c.talentId}-${idx}`} style={s.crewRow}>
                    <MaterialCommunityIcons name="account" size={14} color={T.yellow} />
                    <Text style={s.crewLbl}>{lbl} · {genderLbl}</Text>
                    <Text style={s.crewName}>{t.name} · ★{t.fame} · ${c.salary.toFixed(1)}M/season</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Per-season breakdown */}
        <SectionHeader title="Seasons" />
        <View style={{ paddingHorizontal: 12 }}>
          {series.seasons.map(sn => {
            const released = sn.releaseWeek !== undefined;
            const isCurrent = series.productionSeason === sn.number && inProd;
            return (
              <View key={sn.number} style={[s.seasonCard, isCurrent && { borderColor: T.yellow, borderWidth: 2 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={s.seasonTitle}>Season {sn.number}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[s.seasonPill, { backgroundColor: released ? T.green : isCurrent ? T.yellow : T.cardDark }]}>
                    <Text style={s.seasonPillTxt}>{released ? `Aired · W${sn.releaseWeek}/Y${sn.releaseYear}` : isCurrent ? 'IN PRODUCTION' : 'PENDING'}</Text>
                  </View>
                </View>
                <Text style={s.seasonMeta}>{sn.episodes} episodes · ${sn.budgetM}M budget{sn.renewed ? ' · renewed' : ''}</Text>
                {sn.avgScore ? (
                  <View style={s.scoreRow}>
                    <Text style={s.scoreLbl}>SCORE</Text>
                    <Text style={[s.scoreVal, { color: sn.avgScore >= 75 ? T.green : sn.avgScore >= 60 ? T.yellow : T.orange }]}>{sn.avgScore}/100</Text>
                    <View style={s.scoreBarTrack}>
                      <View style={[s.scoreBarFill, { width: `${Math.min(100, sn.avgScore)}%`, backgroundColor: sn.avgScore >= 75 ? T.green : sn.avgScore >= 60 ? T.yellow : T.orange }]} />
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Actions */}
        {isOwn && series.status !== 'cancelled' ? (
          <View style={s.actions}>
            {!inProd && series.seasons.length < 10 ? (
              <TouchableOpacity style={[s.actBtn, { backgroundColor: T.green }]} onPress={() => { setRenewBudget(String(series.seasons[series.seasons.length - 1]?.budgetM || 60)); setRenewOpen(true); }} testID="series-detail-renew-btn">
                <MaterialCommunityIcons name="refresh" size={18} color={T.cardDark} />
                <Text style={s.actBtnTxt}>RENEW FOR NEW SEASON</Text>
              </TouchableOpacity>
            ) : null}
            {franchise ? (
              <TouchableOpacity style={[s.actBtn, { backgroundColor: T.cyan }]} onPress={() => router.push(`/franchise/${franchise.id}`)} testID="series-detail-franchise-btn">
                <MaterialCommunityIcons name="star" size={18} color={T.cardDark} />
                <Text style={s.actBtnTxt}>VIEW FRANCHISE</Text>
              </TouchableOpacity>
            ) : null}
            {/* V41 — License series to TV networks */}
            <TouchableOpacity style={[s.actBtn, { backgroundColor: T.yellow }]} onPress={() => router.push('/tv-networks')} testID="series-detail-license-tv-btn">
              <MaterialCommunityIcons name="television-classic" size={18} color={T.cardDark} />
              <Text style={s.actBtnTxt}>LICENSE TO TV NETWORK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actBtn, { backgroundColor: T.red }]} onPress={() => setConfirmCancel(true)} testID="series-detail-cancel-btn">
              <MaterialCommunityIcons name="close-circle" size={18} color={T.cardDark} />
              <Text style={s.actBtnTxt}>CANCEL SERIES</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Renew modal */}
      <Modal visible={renewOpen} animationType="slide" onRequestClose={() => setRenewOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
          <View style={s.fsHeader}>
            <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setRenewOpen(false)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
            <Text style={s.fsHeaderTitle}>Renew {series.title}</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.lbl}>EPISODES (6–22)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {[6, 8, 10, 13, 16, 22].map(n => (
                <TouchableOpacity key={n} style={[s.chip, parseInt(renewEps, 10) === n && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setRenewEps(String(n))}>
                  <Text style={[s.chipTxt, parseInt(renewEps, 10) === n && { color: T.cardDark }]}>{n} eps</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.lbl}>BUDGET FOR NEW SEASON ($M)</Text>
            <TextInput value={renewBudget} onChangeText={(v) => setRenewBudget(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={5} style={s.inp} testID="renew-budget-detail" />
            <Text style={s.hint}>You have ${state.player.cash.toFixed(2)}B. This will cost ${((parseFloat(renewBudget) || 0) / 1000).toFixed(3)}B.</Text>
            <TouchableOpacity style={s.submit} onPress={doRenew} testID="renew-submit-detail">
              <MaterialCommunityIcons name="movie-roll" size={20} color={T.cardDark} />
              <Text style={s.submitTxt}>RENEW (${((parseFloat(renewBudget) || 0) / 1000).toFixed(2)}B)</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Confirm cancel modal */}
      <Modal visible={confirmCancel} transparent animationType="fade" onRequestClose={() => setConfirmCancel(false)}>
        <View style={s.confirmBg}>
          <View style={s.confirmCard}>
            <MaterialCommunityIcons name="alert" size={36} color={T.red} />
            <Text style={s.confirmTitle}>Cancel {series.title}?</Text>
            <Text style={s.confirmMsg}>
              {inProd
                ? `Production will halt. ~30% of remaining budget for Season ${series.productionSeason} will be salvaged. Cast & crew released.`
                : `Series will be marked cancelled. No future seasons can be greenlit.`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[s.cBtn, { backgroundColor: T.cardDark }]} onPress={() => setConfirmCancel(false)} testID="cancel-confirm-no">
                <Text style={s.cBtnTxt}>Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.cBtn, { backgroundColor: T.red }]} onPress={doCancel} testID="cancel-confirm-yes">
                <Text style={[s.cBtnTxt, { color: '#fff' }]}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  empty: { color: T.textDim, fontStyle: 'italic', textAlign: 'center' },
  header: { flexDirection: 'row', backgroundColor: T.cardDark, padding: 14, alignItems: 'center' },
  title: { color: T.text, fontWeight: '900', fontSize: 22 },
  sub: { color: T.textDim, fontSize: 13, marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1.5 },
  tagTxt: { fontWeight: '900', fontSize: 10, letterSpacing: 0.5 },
  progressWrap: { padding: 12 },
  progressTrack: { height: 18, backgroundColor: T.card, borderRadius: 9, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: T.green },
  progressTxt: { color: T.textDim, fontSize: 11, marginTop: 4, textAlign: 'center', fontWeight: '700' },
  statsBox: { backgroundColor: T.cardDark, marginHorizontal: 12, padding: 12, borderRadius: 10, borderWidth: 2, borderColor: T.border, gap: 6 },
  statTxt: { color: T.textDim, fontSize: 13 },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  crewLbl: { color: T.textMute, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, width: 80 },
  crewName: { color: T.text, fontSize: 12, fontWeight: '700', flex: 1 },
  seasonCard: { backgroundColor: T.cardDark, padding: 12, marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  seasonTitle: { color: T.text, fontWeight: '900', fontSize: 15 },
  seasonMeta: { color: T.textDim, fontSize: 12, marginTop: 4 },
  seasonPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  seasonPillTxt: { color: T.cardDark, fontWeight: '900', fontSize: 9, letterSpacing: 0.4 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  scoreLbl: { color: T.textMute, fontWeight: '900', fontSize: 9, letterSpacing: 0.5 },
  scoreVal: { fontWeight: '900', fontSize: 14, minWidth: 56 },
  scoreBarTrack: { flex: 1, height: 6, backgroundColor: T.card, borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: '100%' },
  actions: { padding: 12, gap: 8 },
  actBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 10 },
  actBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  fsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.cardDark },
  fsHeaderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fsHeaderTitle: { flex: 1, color: T.text, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  lbl: { color: T.text, fontWeight: '900', fontSize: 11, marginTop: 14 },
  chip: { backgroundColor: T.cardDark, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: T.border },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  inp: { backgroundColor: T.cardDark, color: T.text, padding: 10, borderRadius: 8, marginTop: 6, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: T.border },
  hint: { color: T.textDim, fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  submit: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.yellow, paddingVertical: 14, borderRadius: 10 },
  submitTxt: { color: T.cardDark, fontWeight: '900', fontSize: 14 },
  confirmBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  confirmCard: { width: '100%', maxWidth: 400, backgroundColor: T.cardDark, borderRadius: 14, padding: 22, borderWidth: 2, borderColor: T.red, alignItems: 'center' },
  confirmTitle: { color: T.text, fontWeight: '900', fontSize: 18, marginTop: 8 },
  confirmMsg: { color: T.textDim, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  cBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cBtnTxt: { color: T.text, fontWeight: '900', fontSize: 13 },
});
