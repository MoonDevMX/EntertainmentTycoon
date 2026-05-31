import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../src/game/state';
import { T } from '../../src/ui/theme';
import { TopBar, IconTile } from '../../src/ui/components';
import { MARKETING_CHANNELS, ageWeightsForSegment, computeMarketingEfficiency, AgeBand } from '../../src/game/marketing';
import { uiAlert } from '../../src/ui/ui-alert';

function notify(title: string, msg: string) {
  uiAlert(title, msg);
}

const PRESETS: { key: string; label: string; icon: string; channels: string[] }[] = [
  { key: 'mass', label: 'Mass Market', icon: 'broadcast', channels: ['network_tv', 'cable', 'internet', 'trailers_big', 'billboards'] },
  { key: 'youth', label: 'Youth/Online', icon: 'cellphone', channels: ['internet', 'own_streaming', 'cable', 'promotions'] },
  { key: 'prestige', label: 'Prestige/Adult', icon: 'newspaper-variant', channels: ['newspaper', 'magazine', 'radio', 'billboards', 'trailers_medium'] },
  { key: 'niche', label: 'Niche/Cult', icon: 'target', channels: ['magazine', 'promotions', 'trailers_tiny', 'internet'] },
];

export default function MarketingAlloc() {
  const router = useRouter();
  const { movieId } = useLocalSearchParams<{ movieId: string }>();
  const { state, setMarketingAllocation, setMarketingAuto, computeOptimalMarketing } = useGame();
  const [alloc, setAlloc] = useState<Record<string, number>>({});

  const movie = useMemo(() => state?.movies.find(m => m.id === movieId), [state, movieId]);

  useEffect(() => {
    if (movie) {
      if (movie.marketingAllocation) setAlloc({ ...movie.marketingAllocation });
      else applyPreset('mass');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie?.id]);

  const totalAlloc = Object.values(alloc).reduce((a, b) => a + (b || 0), 0);
  const budget = movie?.marketingBudget || 0;
  const remaining = +(budget - totalAlloc).toFixed(2);
  const efficiency = computeMarketingEfficiency(alloc, state?.audience || []);
  const efficiencyPct = ((efficiency - 1) * 100).toFixed(1);

  // Reach by age band
  const reachByAge = useMemo(() => {
    const totals: Record<AgeBand, number> = { young: 0, adult: 0, mid: 0, senior: 0 };
    if (!state) return totals;
    state.audience.forEach(seg => {
      const w = ageWeightsForSegment(seg.label);
      MARKETING_CHANNELS.forEach(ch => {
        const spent = alloc[ch.key] || 0;
        if (spent <= 0) return;
        (Object.keys(ch.reach) as AgeBand[]).forEach(ab => {
          totals[ab] += w[ab] * ch.reach[ab] * spent * ch.costEfficiency * seg.share;
        });
      });
    });
    return totals;
  }, [alloc, state?.audience]);

  function applyPreset(key: string) {
    if (!movie) return;
    const preset = PRESETS.find(p => p.key === key);
    if (!preset) return;
    const each = +(movie.marketingBudget / preset.channels.length).toFixed(1);
    const next: Record<string, number> = {};
    preset.channels.forEach(ck => { next[ck] = each; });
    setAlloc(next);
  }

  function rebalanceEvenly() {
    if (!movie) return;
    const used = Object.entries(alloc).filter(([, v]) => v > 0);
    if (used.length === 0) return;
    const each = +(movie.marketingBudget / used.length).toFixed(1);
    const next: Record<string, number> = {};
    used.forEach(([k]) => { next[k] = each; });
    setAlloc(next);
  }

  function setChannel(key: string, val: number) {
    setAlloc(prev => {
      const v = Math.max(0, Math.min(budget, +val.toFixed(1)));
      const copy = { ...prev };
      if (v <= 0) delete copy[key];
      else copy[key] = v;
      return copy;
    });
  }

  function bump(key: string, delta: number) {
    const cur = alloc[key] || 0;
    setChannel(key, cur + delta);
  }

  function maxOut(key: string) {
    const cur = alloc[key] || 0;
    setChannel(key, cur + remaining);
  }

  if (!state) return null;
  if (!movie) return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Marketing" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <Text style={s.empty}>Movie not found.</Text>
    </SafeAreaView>
  );

  const maxReach = Math.max(0.01, ...Object.values(reachByAge));
  const overBudget = totalAlloc > budget + 0.01;
  const incrementSize = budget >= 80 ? 5 : budget >= 30 ? 2 : 1;

  const save = () => {
    if (overBudget) { notify('Over budget', `Total $${totalAlloc.toFixed(1)}M exceeds budget $${budget}M.`); return; }
    const r = setMarketingAllocation(movie.id, alloc);
    if (r.error) notify('Cannot save', r.error);
    else { notify('Saved', `Marketing plan stored. Efficiency: ${efficiency >= 1 ? '+' : ''}${efficiencyPct}% Opening BO`); router.back(); }
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Marketing Plan" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 120 }}>
        {/* Header card */}
        <View style={s.header}>
          <IconTile icon={movie.iconKey} color={movie.iconBg} size={56} />
          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={s.title} numberOfLines={1}>{movie.title}</Text>
            <Text style={s.sub}>{movie.brand} · {movie.genre} · ${budget}M budget</Text>
          </View>
        </View>

        {/* V30 — Marketing Manager auto toggle */}
        <View style={s.autoMgrBox} testID="marketing-manager-box">
          <View style={{ flex: 1 }}>
            <Text style={s.autoMgrTitle}>🤖 Marketing Manager</Text>
            <Text style={s.autoMgrSub}>{movie.marketingAuto ? 'AUTO — manager is optimising for your audience.' : 'Off — you control the spend manually.'}</Text>
          </View>
          <TouchableOpacity
            style={[s.autoMgrBtn, { backgroundColor: movie.marketingAuto ? T.green : T.cardDark, borderColor: movie.marketingAuto ? T.green : T.cyan }]}
            onPress={() => {
              if (movie.marketingAuto) {
                setMarketingAuto(movie.id, false);
                notify('Marketing Manager OFF', 'You now control allocation manually.');
              } else {
                const opt = computeOptimalMarketing(movie.id);
                setAlloc(opt);
                setMarketingAuto(movie.id, true);
                notify('Marketing Manager ON', `Optimal allocation applied (efficiency: ${((computeMarketingEfficiency(opt, state.audience) - 1) * 100).toFixed(1)}%).`);
              }
            }}
            testID="toggle-marketing-auto"
          >
            <MaterialCommunityIcons name={movie.marketingAuto ? 'auto-fix' : 'gesture-tap'} size={16} color={movie.marketingAuto ? T.cardDark : T.cyan} />
            <Text style={[s.autoMgrBtnTxt, { color: movie.marketingAuto ? T.cardDark : T.cyan }]}>{movie.marketingAuto ? 'AUTO ON' : 'TURN ON'}</Text>
          </TouchableOpacity>
        </View>

        {/* Big budget summary card */}
        <View style={[s.summary, overBudget && { borderColor: T.red }]}>
          <View style={s.bigBudgetRow}>
            <Text style={s.bigBudgetLbl}>BUDGET</Text>
            <Text style={[s.bigBudgetVal, { color: overBudget ? T.red : remaining < 0.5 ? T.yellow : T.green }]}>
              ${remaining.toFixed(1)}M left
            </Text>
          </View>
          {/* Budget bar */}
          <View style={s.budgetBar}>
            <View style={[s.budgetFill, { width: `${Math.min(100, (totalAlloc / budget) * 100)}%`, backgroundColor: overBudget ? T.red : T.cyan }]} />
          </View>
          <View style={s.budgetMeta}>
            <Text style={s.budgetMetaTxt}>${totalAlloc.toFixed(1)}M / ${budget}M allocated</Text>
            <Text style={[s.budgetMetaTxt, { color: efficiency >= 1.05 ? T.green : efficiency >= 0.95 ? T.cyan : T.orange }]}>
              {efficiency >= 1 ? '+' : ''}{efficiencyPct}% Opening BO
            </Text>
          </View>
        </View>

        {/* Quick Presets */}
        <Text style={s.sectionTitle}>Quick Presets</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {PRESETS.map(p => (
            <TouchableOpacity key={p.key} style={s.presetChip} onPress={() => applyPreset(p.key)} testID={`preset-${p.key}`}>
              <MaterialCommunityIcons name={p.icon as any} size={16} color={T.yellow} />
              <Text style={s.presetTxt}>{p.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.presetChip, { borderColor: T.cyan }]} onPress={rebalanceEvenly} testID="preset-rebalance">
            <MaterialCommunityIcons name="scale-balance" size={16} color={T.cyan} />
            <Text style={[s.presetTxt, { color: T.cyan }]}>Re-balance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.presetChip, { borderColor: T.red }]} onPress={() => setAlloc({})} testID="preset-clear">
            <MaterialCommunityIcons name="close-circle-outline" size={16} color={T.red} />
            <Text style={[s.presetTxt, { color: T.red }]}>Clear</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Age reach */}
        <Text style={s.sectionTitle}>Reach by Age Band</Text>
        <View style={s.ageBlock}>
          {([
            { k: 'young' as AgeBand, label: '18-29' },
            { k: 'adult' as AgeBand, label: '30-39' },
            { k: 'mid' as AgeBand, label: '40-59' },
            { k: 'senior' as AgeBand, label: '60+' },
          ]).map(ab => {
            const pct = (reachByAge[ab.k] / maxReach) * 100;
            return (
              <View key={ab.k} style={s.ageRow}>
                <Text style={s.ageLbl}>{ab.label}</Text>
                <View style={s.ageBar}>
                  <View style={[s.ageFill, { width: `${pct}%` }]} />
                </View>
                <Text style={s.ageVal}>{reachByAge[ab.k].toFixed(1)}</Text>
              </View>
            );
          })}
        </View>

        {/* Channels */}
        <Text style={s.sectionTitle}>Channels — increments of ${incrementSize}M</Text>
        {MARKETING_CHANNELS.map(ch => {
          const spent = alloc[ch.key] || 0;
          const pct = budget > 0 ? (spent / budget) * 100 : 0;
          const active = spent > 0;
          return (
            <View key={ch.key} style={[s.chCard, active && { borderColor: T.cyan, backgroundColor: T.cardDark }]}>
              <View style={s.chHead}>
                <MaterialCommunityIcons name={ch.icon as any} size={22} color={active ? T.cyan : T.textMute} />
                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                  <Text style={s.chLbl}>{ch.label}</Text>
                  <Text style={s.chDesc} numberOfLines={1}>{ch.desc}</Text>
                </View>
                <Text style={[s.chSpent, { color: active ? T.cyan : T.textMute }]}>${spent.toFixed(1)}M</Text>
              </View>
              {/* Visual fill bar */}
              <View style={s.chBar}>
                <View style={[s.chFill, { width: `${pct}%`, backgroundColor: active ? T.cyan : T.textMute }]} />
              </View>
              {/* Reach age chips */}
              <View style={s.miniReachRow}>
                {(['young', 'adult', 'mid', 'senior'] as AgeBand[]).map(ab => (
                  <View key={ab} style={[s.reachPill, { opacity: 0.4 + ch.reach[ab] * 0.6 }]}>
                    <Text style={s.reachPillTxt}>{ab === 'young' ? '18-29' : ab === 'adult' ? '30-39' : ab === 'mid' ? '40-59' : '60+'} {(ch.reach[ab] * 100).toFixed(0)}</Text>
                  </View>
                ))}
              </View>
              {/* Big control row */}
              <View style={s.chCtrlRow}>
                <TouchableOpacity style={[s.chCtrlBtn, { backgroundColor: T.red }]} onPress={() => setChannel(ch.key, 0)} disabled={spent <= 0} testID={`ch-${ch.key}-zero`}>
                  <MaterialCommunityIcons name="close" size={14} color={T.cardDark} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.chCtrlBtn, { backgroundColor: T.orange }]} onPress={() => bump(ch.key, -incrementSize)} disabled={spent <= 0} testID={`ch-${ch.key}-dec`}>
                  <Text style={s.chCtrlTxt}>-{incrementSize}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.chCtrlBtn, { backgroundColor: T.green }]} onPress={() => bump(ch.key, +incrementSize)} disabled={remaining < incrementSize} testID={`ch-${ch.key}-inc`}>
                  <Text style={s.chCtrlTxt}>+{incrementSize}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.chCtrlBtn, { backgroundColor: T.yellow }]} onPress={() => maxOut(ch.key)} disabled={remaining <= 0} testID={`ch-${ch.key}-max`}>
                  <Text style={[s.chCtrlTxt, { color: T.cardDark, fontSize: 9 }]}>MAX +${remaining.toFixed(0)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={[s.saveBtn, overBudget && { opacity: 0.5 }]}
          onPress={save} disabled={overBudget} testID="save-marketing-btn">
          <MaterialCommunityIcons name="content-save" size={18} color={T.cardDark} />
          <Text style={s.saveTxt}>SAVE MARKETING PLAN</Text>
        </TouchableOpacity>
        <Text style={s.note}>Higher efficiency = more opening box office. Channels matched to your audience age mix yield up to +15% opening.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  empty: { color: T.textMute, padding: 24, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: T.border, marginBottom: 10 },
  title: { color: T.text, fontWeight: '900', fontSize: 16 },
  sub: { color: T.textDim, fontSize: 12, marginTop: 2 },

  summary: { backgroundColor: T.cardDark, padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: T.border, gap: 8 },
  bigBudgetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bigBudgetLbl: { color: T.textDim, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  bigBudgetVal: { fontWeight: '900', fontSize: 22 },
  budgetBar: { height: 14, backgroundColor: T.bg, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: T.border },
  budgetFill: { height: '100%' },
  budgetMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  budgetMetaTxt: { color: T.textDim, fontSize: 12, fontWeight: '700' },

  sectionTitle: { color: T.cyan, fontWeight: '900', fontSize: 12, marginTop: 14, marginBottom: 6, letterSpacing: 1 },

  presetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.cardDark, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2, borderColor: T.yellow },
  presetTxt: { color: T.yellow, fontWeight: '900', fontSize: 12 },

  ageBlock: { backgroundColor: T.cardDark, padding: 10, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: T.border },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageLbl: { color: T.text, fontSize: 12, fontWeight: '700', width: 50 },
  ageBar: { flex: 1, height: 10, backgroundColor: T.bg, borderRadius: 5, overflow: 'hidden' },
  ageFill: { height: '100%', backgroundColor: T.magenta, borderRadius: 5 },
  ageVal: { color: T.textDim, fontSize: 11, fontWeight: '700', minWidth: 36, textAlign: 'right' },

  chCard: { backgroundColor: T.bg, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.border },
  chHead: { flexDirection: 'row', alignItems: 'center' },
  chLbl: { color: T.text, fontWeight: '900', fontSize: 13 },
  chDesc: { color: T.textDim, fontSize: 11 },
  chSpent: { fontWeight: '900', fontSize: 14, minWidth: 60, textAlign: 'right' },
  chBar: { height: 5, backgroundColor: T.cardDark, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  chFill: { height: '100%' },
  miniReachRow: { flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  reachPill: { backgroundColor: T.magenta, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  reachPillTxt: { color: T.cardDark, fontSize: 9, fontWeight: '900' },
  chCtrlRow: { flexDirection: 'row', gap: 4, marginTop: 8 },
  chCtrlBtn: { flex: 1, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  chCtrlTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12 },

  saveBtn: { flexDirection: 'row', backgroundColor: T.green, padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, borderWidth: 2, borderColor: T.border },
  saveTxt: { color: T.cardDark, fontWeight: '900', fontSize: 15 },
  note: { color: T.textDim, fontSize: 11, textAlign: 'center', padding: 12, fontStyle: 'italic' },
  autoMgrBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: T.cyan, marginBottom: 10, gap: 10 },
  autoMgrTitle: { color: T.cyan, fontWeight: '900', fontSize: 14 },
  autoMgrSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  autoMgrBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 2 },
  autoMgrBtnTxt: { fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
});
