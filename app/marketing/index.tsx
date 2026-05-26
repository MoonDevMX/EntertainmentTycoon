import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../src/game/state';
import { T } from '../../src/ui/theme';
import { TopBar, IconTile } from '../../src/ui/components';
import { uiAlert } from '../../src/ui/ui-alert';
import { monthOf, WEEKS_PER_YEAR } from '../../src/game/data';

export default function MarketingIndex() {
  const router = useRouter();
  const { state, setEntityMarketing, setMarketingAutoBulk } = useGame();
  const [activeTab, setActiveTab] = useState<'movies' | 'series'>('movies');

  if (!state) return null;

  const myMovies = state.movies.filter(m => m.studioId === state.player.id && m.status === 'production');
  const releasedMovies = state.movies.filter(m => m.studioId === state.player.id && m.status === 'released').slice(0, 6);

  const mySeries = (state.tvSeries || []).filter(s => s.studioId === state.player.id && s.status === 'in_production');
  const releasedSeries = (state.tvSeries || []).filter(s => s.studioId === state.player.id && s.status === 'released').slice(0, 6);

  const totalAlloc = (m: any): number => (Object.values(m.marketingAllocation || {}) as number[]).reduce((a: number, b: number) => a + (b || 0), 0);

  const renderMovieCard = (m: any) => {
    const wkLeft = (m.targetReleaseYear || 0) * WEEKS_PER_YEAR + (m.targetReleaseWeek || 0) - (state.year * WEEKS_PER_YEAR + state.week);
    const allocTotal = totalAlloc(m);
    const pct = m.marketingBudget > 0 ? Math.min(100, Math.round((allocTotal / m.marketingBudget) * 100)) : 0;
    const isAllocated = m.marketingAllocation && Object.keys(m.marketingAllocation).length > 0;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push(`/marketing/${m.id}`)}
        testID={`marketing-card-${m.id}`}
        key={m.id}
      >
        <IconTile icon={m.iconKey} color={m.iconBg} size={56} />
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={s.title} numberOfLines={1}>{m.title}</Text>
            {m.marketingAuto && (
              <View style={{ backgroundColor: 'rgba(0, 255, 100, 0.15)', borderWidth: 1, borderColor: T.green, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ color: T.green, fontSize: 8, fontWeight: '900' }}>🤖 AUTO</Text>
              </View>
            )}
          </View>
          <Text style={s.sub}>
            {m.onHold ? '⏸ ON HOLD' : m.targetReleaseWeek ? `Y${m.targetReleaseYear} · ${monthOf(m.targetReleaseWeek).name} W${monthOf(m.targetReleaseWeek).weekInMonth} · in ${wkLeft}w` : 'Schedule needed'}
          </Text>
          <Text style={[s.sub, { color: T.green, marginTop: 2 }]}>
            Budget ${m.marketingBudget.toFixed(0)}M · Allocated ${allocTotal.toFixed(0)}M ({pct}%)
          </Text>
          <View style={s.barTrack}>
            <View style={[s.barFill, { width: `${pct}%`, backgroundColor: pct > 100 ? T.orange : isAllocated ? T.green : T.cyan }]} />
          </View>
        </View>
        <View style={[s.cta, { backgroundColor: isAllocated ? T.green : T.yellow }]}>
          <Text style={s.ctaTxt}>{isAllocated ? 'EDIT' : 'PLAN'}</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={T.cardDark} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSeriesCard = (sre: any) => {
    const currentBudget = sre.marketingBudgetM || 0;
    const budgets = [0, 2, 5, 10, 20];
    return (
      <View style={s.cardSeries} key={sre.id}>
        <View style={s.seriesHeader}>
          <IconTile icon="television-play" color={T.magenta} size={48} />
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Text style={s.title} numberOfLines={1}>{sre.title}</Text>
            <Text style={s.sub}>
              Season {sre.productionSeason || 1} · {sre.productionWeeksLeft ? `Releasing in ${sre.productionWeeksLeft}w` : 'In Production'}
            </Text>
            <Text style={[s.sub, { color: T.yellow, marginTop: 2 }]}>
              Weekly Budget: <Text style={{ color: T.green, fontWeight: '900' }}>${currentBudget}M/wk</Text>
            </Text>
          </View>
        </View>

        <View style={s.budgetContainer}>
          <Text style={s.budgetLabel}>SET WEEKLY MARKETING BUDGET:</Text>
          <View style={s.chipRow}>
            {budgets.map(b => (
              <TouchableOpacity
                key={b}
                style={[s.chip, currentBudget === b && s.chipActive]}
                onPress={() => {
                  const r = setEntityMarketing('series', sre.id, b);
                  if (r && r.error) {
                    // Fail gracefully
                  }
                }}
                testID={`marketing-series-${sre.id}-${b}`}
              >
                <Text style={[s.chipTxt, currentBudget === b && s.chipTxtActive]}>{b === 0 ? 'OFF' : `$${b}M`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Marketing Plans" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />

      {/* Modern Cyber Switch Tabs */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabButton, activeTab === 'movies' && s.tabButtonActive]}
          onPress={() => setActiveTab('movies')}
          testID="tab-marketing-movies"
        >
          <MaterialCommunityIcons name="movie-roll" size={18} color={activeTab === 'movies' ? T.cardDark : T.textMute} />
          <Text style={[s.tabButtonTxt, activeTab === 'movies' && s.tabButtonTxtActive]}>Feature Movies</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabButton, activeTab === 'series' && s.tabButtonActive]}
          onPress={() => setActiveTab('series')}
          testID="tab-marketing-series"
        >
          <MaterialCommunityIcons name="television-play" size={18} color={activeTab === 'series' ? T.cardDark : T.textMute} />
          <Text style={[s.tabButtonTxt, activeTab === 'series' && s.tabButtonTxtActive]}>TV Series</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
        {activeTab === 'movies' ? (
          <>
            <View style={s.intro}>
              <MaterialCommunityIcons name="bullhorn" size={28} color={T.yellow} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={s.introTitle}>Marketing plan per title</Text>
                <Text style={s.introSub}>Allocate channels (TV, internet, billboards, etc.) for each in-production movie. Real-time efficiency feedback.</Text>
              </View>
            </View>

            {/* V45 — Brand-wide Auto Marketing Manager */}
            {myMovies.length > 0 && (() => {
              const automatedCount = myMovies.filter(m => m.marketingAuto).length;
              const allAutomated = myMovies.length > 0 && automatedCount === myMovies.length;
              return (
                <View style={s.autoMgrCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <MaterialCommunityIcons name="robot" size={28} color={allAutomated ? T.green : T.yellow} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.autoMgrTitle}>Auto-Marketing Manager</Text>
                      <Text style={s.autoMgrSub}>
                        {allAutomated 
                          ? '🟢 FULLY ENABLED: Marketing budgets for all of your production films are automatically optimized.'
                          : automatedCount > 0 
                            ? `🟡 PARTIALLY ENABLED: ${automatedCount}/${myMovies.length} production films are automated.`
                            : '⚪ DISABLED: You must configure marketing plans for each film manually.'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[s.autoMgrBtn, { backgroundColor: allAutomated ? T.red : T.green }]} 
                    onPress={() => {
                      const enable = !allAutomated;
                      setMarketingAutoBulk(enable);
                      uiAlert('Marketing Manager', enable ? 'Enabled Auto-Marketing for all movies ✓' : 'Disabled Auto-Marketing for all movies.');
                    }}
                    testID="toggle-auto-marketing-bulk"
                  >
                    <MaterialCommunityIcons name={allAutomated ? "close-circle" : "check-circle"} size={16} color={T.cardDark} />
                    <Text style={s.autoMgrBtnTxt}>{allAutomated ? "DISABLE AUTO-MARKETING" : "ENABLE FOR ALL FILMS"}</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

            {myMovies.length > 0 ? (
              myMovies.map(renderMovieCard)
            ) : (
              <View style={s.empty}>
                <MaterialCommunityIcons name="filmstrip-off" size={42} color={T.textMute} />
                <Text style={s.emptyT}>No movies in production.</Text>
                <Text style={s.emptyS}>Once you create a movie, its marketing plan will appear here for editing.</Text>
                <TouchableOpacity style={s.newBtn} onPress={() => router.push({ pathname: '/create-movie', params: { reset: '1' } })}>
                  <Text style={s.newBtnT}>+ Create new movie</Text>
                </TouchableOpacity>
              </View>
            )}

            {releasedMovies.length > 0 ? (
              <View style={s.histBlock}>
                <Text style={s.histHdr}>Recently released (read-only)</Text>
                {releasedMovies.map(m => {
                  const eff = m.marketingAllocation ? Object.keys(m.marketingAllocation).length : 0;
                  return (
                    <View key={m.id} style={s.histRow}>
                      <IconTile icon={m.iconKey} color={m.iconBg} size={32} />
                      <View style={{ flex: 1, paddingHorizontal: 8 }}>
                        <Text style={s.histTitle} numberOfLines={1}>{m.title}</Text>
                        <Text style={s.histSub}>Y{m.releaseYear} · ${m.marketingBudget.toFixed(0)}M budget · {eff} channels used</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View style={[s.intro, { borderColor: T.magenta }]}>
              <MaterialCommunityIcons name="television-play" size={28} color={T.magenta} />
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={s.introTitle}>TV Series Weekly Marketing</Text>
                <Text style={s.introSub}>Unlike movies which use lump sums, TV Series are promoted continuously. Set a weekly spend to continuously drive viewer fatigue down and increase viewership.</Text>
              </View>
            </View>

            {mySeries.length > 0 ? (
              mySeries.map(renderSeriesCard)
            ) : (
              <View style={s.empty}>
                <MaterialCommunityIcons name="television-guide" size={42} color={T.textMute} />
                <Text style={s.emptyT}>No TV series in production.</Text>
                <Text style={s.emptyS}>Create or renew a TV Series in the unified production studio to market it here.</Text>
                <TouchableOpacity style={[s.newBtn, { backgroundColor: T.magenta }]} onPress={() => router.push({ pathname: '/create-movie', params: { reset: '1' } })}>
                  <Text style={[s.newBtnT, { color: T.text }]}>+ Launch TV Series</Text>
                </TouchableOpacity>
              </View>
            )}

            {releasedSeries.length > 0 ? (
              <View style={s.histBlock}>
                <Text style={s.histHdr}>Recently released TV Series</Text>
                {releasedSeries.map(sr => (
                  <View key={sr.id} style={s.histRow}>
                    <IconTile icon="television-play" color={T.magenta} size={32} />
                    <View style={{ flex: 1, paddingHorizontal: 8 }}>
                      <Text style={s.histTitle} numberOfLines={1}>{sr.title}</Text>
                      <Text style={s.histSub}>Y{sr.releaseYear} · Weekly Marketing: ${sr.marketingBudgetM || 0}M/wk</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 8, gap: 8 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: T.cardDark, paddingVertical: 10, borderRadius: 8, gap: 6, borderWidth: 1, borderColor: T.border },
  tabButtonActive: { backgroundColor: T.cyan, borderColor: T.cyan },
  tabButtonTxt: { color: T.textMute, fontWeight: '700', fontSize: 13 },
  tabButtonTxtActive: { color: T.cardDark, fontWeight: '900' },
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 2, borderColor: T.yellow },
  introTitle: { color: T.text, fontWeight: '900', fontSize: 14 },
  introSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.border },
  cardSeries: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 2, borderColor: T.border },
  seriesHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  budgetContainer: { marginTop: 10 },
  budgetLabel: { color: T.textMute, fontWeight: '800', fontSize: 10, letterSpacing: 1, marginBottom: 6 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  chip: { flex: 1, backgroundColor: T.card, paddingVertical: 8, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  chipActive: { backgroundColor: T.green, borderColor: T.green },
  chipTxt: { color: T.textDim, fontSize: 11, fontWeight: '700' },
  chipTxtActive: { color: T.cardDark, fontWeight: '900' },
  title: { color: T.text, fontWeight: '900', fontSize: 14 },
  sub: { color: T.textDim, fontSize: 11 },
  barTrack: { height: 6, backgroundColor: T.card, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  cta: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaTxt: { color: T.cardDark, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
  empty: { alignItems: 'center', padding: 30, gap: 8 },
  emptyT: { color: T.text, fontWeight: '900', fontSize: 16, marginTop: 8 },
  emptyS: { color: T.textDim, fontSize: 12, textAlign: 'center' },
  newBtn: { backgroundColor: T.green, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, marginTop: 10 },
  newBtnT: { color: T.cardDark, fontWeight: '900' },
  histBlock: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  histHdr: { color: T.textMute, fontWeight: '900', fontSize: 11, marginBottom: 6, letterSpacing: 1 },
  histRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, padding: 8, borderRadius: 6, marginBottom: 4 },
  histTitle: { color: T.text, fontWeight: '800', fontSize: 12 },
  histSub: { color: T.textDim, fontSize: 10 },
  autoMgrCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 2, borderColor: T.yellow },
  autoMgrTitle: { color: T.yellow, fontWeight: '900', fontSize: 14 },
  autoMgrSub: { color: T.text, fontSize: 11, marginTop: 4, lineHeight: 15 },
  autoMgrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, marginTop: 12 },
  autoMgrBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12 },
});
