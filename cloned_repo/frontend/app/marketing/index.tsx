import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../src/game/state';
import { T } from '../../src/ui/theme';
import { TopBar, IconTile } from '../../src/ui/components';
import { monthOf, WEEKS_PER_YEAR } from '../../src/game/data';

export default function MarketingIndex() {
  const router = useRouter();
  const { state } = useGame();
  if (!state) return null;

  const myMovies = state.movies.filter(m => m.studioId === state.player.id && m.status === 'production');
  const released = state.movies.filter(m => m.studioId === state.player.id && m.status === 'released').slice(0, 6);

  const totalAlloc = (m: any): number => Object.values(m.marketingAllocation || {}).reduce((a: number, b: any) => a + (b || 0), 0);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title="Marketing Plans" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <FlatList
        data={myMovies}
        keyExtractor={m => m.id}
        ListHeaderComponent={
          <View style={s.intro}>
            <MaterialCommunityIcons name="bullhorn" size={28} color={T.yellow} />
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={s.introTitle}>Marketing plan per title</Text>
              <Text style={s.introSub}>Allocate channels (TV, internet, billboards, etc.) for each in-production movie. Real-time efficiency feedback.</Text>
            </View>
          </View>
        }
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        renderItem={({ item: m }) => {
          const wkLeft = (m.targetReleaseYear || 0) * WEEKS_PER_YEAR + (m.targetReleaseWeek || 0) - (state.year * WEEKS_PER_YEAR + state.week);
          const allocTotal = totalAlloc(m);
          const pct = m.marketingBudget > 0 ? Math.min(100, Math.round((allocTotal / m.marketingBudget) * 100)) : 0;
          const isAllocated = m.marketingAllocation && Object.keys(m.marketingAllocation).length > 0;
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => router.push(`/marketing/${m.id}`)}
              testID={`marketing-card-${m.id}`}
            >
              <IconTile icon={m.iconKey} color={m.iconBg} size={56} />
              <View style={{ flex: 1, paddingHorizontal: 10 }}>
                <Text style={s.title} numberOfLines={1}>{m.title}</Text>
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
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialCommunityIcons name="filmstrip-off" size={42} color={T.textMute} />
            <Text style={s.emptyT}>No movies in production.</Text>
            <Text style={s.emptyS}>Once you create a movie, its marketing plan will appear here for editing.</Text>
            <TouchableOpacity style={s.newBtn} onPress={() => router.push({ pathname: '/create-movie', params: { reset: '1' } })}>
              <Text style={s.newBtnT}>+ Create new movie</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={released.length > 0 ? (
          <View style={s.histBlock}>
            <Text style={s.histHdr}>Recently released (read-only)</Text>
            {released.map(m => {
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
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 2, borderColor: T.yellow },
  introTitle: { color: T.text, fontWeight: '900', fontSize: 14 },
  introSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.border },
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
});
