// V43 — Studio Financials: per-week history with revenue/cost breakdowns, plus full recap viewer.
// Accessible from: Weekly Recap "See Full Stats" + Dashboard "Financials" button.

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T, SHADOW } from '../src/ui/theme';
import type { WeekHistoryRecord } from '../src/game/types';

function fmtB(b: number): string {
  const abs = Math.abs(b);
  if (abs >= 1) return `$${b.toFixed(2)}B`;
  if (abs >= 0.001) return `$${(b * 1000).toFixed(1)}M`;
  return `$${(b * 1000 * 1000).toFixed(0)}K`;
}

const _RANGE_OPTS = [4, 12, 24, 48, 200] as const;
type Range = typeof _RANGE_OPTS[number];

export default function FinancialsScreen() {
  const router = useRouter();
  const { state } = useGame();
  const [range, setRange] = useState<Range>(12);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);
  const [showFullRecap, setShowFullRecap] = useState(false);

  if (!state) return null;
  const history: WeekHistoryRecord[] = state.weekHistory || [];
  const window = useMemo(() => history.slice(-range), [history, range]);

  // Aggregate totals for the window
  const totals = useMemo(() => {
    const acc = {
      revenue: 0, costs: 0,
      cinemaBO: 0, ownedCinema: 0,
      streamSubs: 0, streamAds: 0, tvSubs: 0, tvAds: 0,
      cableIn: 0, playerCable: 0, packs: 0,
      licIn: 0, ipIn: 0, crossIn: 0,
      cinemaOpex: 0, serverCost: 0, broadcast: 0, carriageOut: 0,
      prod: 0, mkt: 0, licOut: 0, ipOut: 0, crossOut: 0,
      moviesRel: 0, seriesRel: 0, awards: 0, noms: 0,
    };
    window.forEach(w => {
      acc.cinemaBO += w.cinemaBoxOfficeInB; acc.ownedCinema += w.ownedCinemaRevB;
      acc.streamSubs += w.streamingSubsInB; acc.streamAds += w.streamingAdsInB;
      acc.tvSubs += w.tvNetworkSubsInB; acc.tvAds += w.tvNetworkAdsInB;
      acc.cableIn += w.cableCarriageInB; acc.playerCable += w.playerCableSubsInB;
      acc.packs += w.channelPacksInB;
      acc.licIn += w.licensingInB; acc.ipIn += w.ipRoyaltiesInB; acc.crossIn += w.crossoverInB;
      acc.cinemaOpex += w.cinemaOpexB; acc.serverCost += w.streamingServerB;
      acc.broadcast += w.tvBroadcastB; acc.carriageOut += w.cableCarriageOutB;
      acc.prod += w.productionCostB; acc.mkt += w.marketingCostB;
      acc.licOut += w.licensingOutB; acc.ipOut += w.ipRoyaltiesOutB; acc.crossOut += w.crossoverOutB;
      acc.moviesRel += w.moviesReleased; acc.seriesRel += w.seriesReleased;
      acc.awards += w.awardsWeek; acc.noms += w.nominationsWeek;
    });
    acc.revenue = acc.cinemaBO + acc.ownedCinema + acc.streamSubs + acc.streamAds + acc.tvSubs + acc.tvAds
      + acc.cableIn + acc.playerCable + acc.packs + acc.licIn + acc.ipIn + acc.crossIn;
    acc.costs = acc.cinemaOpex + acc.serverCost + acc.broadcast + acc.carriageOut + acc.prod + acc.mkt
      + acc.licOut + acc.ipOut + acc.crossOut;
    return acc;
  }, [window]);

  const net = totals.revenue - totals.costs;
  const cashStart = window[0]?.cashEndB ?? state.player.cash;
  const cashEnd = window[window.length - 1]?.cashEndB ?? state.player.cash;

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} testID="financials-back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={s.topTitle}>Studio Financials</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 60 }}>
        {/* Range selector */}
        <View style={s.rangeRow}>
          {_RANGE_OPTS.map(r => (
            <TouchableOpacity
              key={r}
              style={[s.rangeChip, range === r && s.rangeChipActive]}
              onPress={() => setRange(r)}
              testID={`range-${r}`}
            >
              <Text style={[s.rangeChipText, range === r && { color: '#000' }]}>{r === 200 ? 'All' : `${r}w`}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Aggregate Card */}
        <View style={[s.aggCard, { borderColor: net >= 0 ? T.green : T.red }]}>
          <Text style={s.aggLabel}>NET — LAST {window.length} WEEK{window.length !== 1 ? 'S' : ''}</Text>
          <Text style={[s.aggValue, { color: net >= 0 ? T.green : T.red }]} testID="agg-net">{net >= 0 ? '+' : '-'}{fmtB(Math.abs(net))}</Text>
          <View style={s.aggRow}>
            <View style={s.aggCell}>
              <Text style={[s.aggCellLabel, { color: T.green }]}>REVENUE</Text>
              <Text style={s.aggCellValue}>{fmtB(totals.revenue)}</Text>
            </View>
            <View style={s.aggCell}>
              <Text style={[s.aggCellLabel, { color: T.red }]}>COSTS</Text>
              <Text style={s.aggCellValue}>{fmtB(totals.costs)}</Text>
            </View>
          </View>
          <Text style={s.cashTrack}>Cash {fmtB(cashStart)} → {fmtB(cashEnd)}</Text>
        </View>

        {/* Stats pills */}
        <View style={s.opsRow}>
          <View style={s.opPill}><MaterialCommunityIcons name="movie-roll" size={14} color={T.cyan} /><Text style={s.opText}>{totals.moviesRel} movies</Text></View>
          <View style={s.opPill}><MaterialCommunityIcons name="television-play" size={14} color={T.magenta} /><Text style={s.opText}>{totals.seriesRel} series eps</Text></View>
          <View style={s.opPill}><MaterialCommunityIcons name="trophy" size={14} color={T.yellow} /><Text style={s.opText}>{totals.awards} wins</Text></View>
          <View style={s.opPill}><MaterialCommunityIcons name="star-outline" size={14} color={T.yellow} /><Text style={s.opText}>{totals.noms} noms</Text></View>
        </View>

        {/* Revenue Breakdown */}
        <Text style={s.section}>REVENUE BREAKDOWN</Text>
        <BreakdownRow label="Cinemas — Theatrical BO" value={totals.cinemaBO} color={T.cyan} icon="movie-roll" total={totals.revenue} />
        <BreakdownRow label="Owned Cinemas" value={totals.ownedCinema} color={T.cyan} icon="home-city" total={totals.revenue} />
        <BreakdownRow label="Streaming — Subscriptions" value={totals.streamSubs} color={T.magenta} icon="play-circle" total={totals.revenue} />
        <BreakdownRow label="Streaming — Ads" value={totals.streamAds} color={T.magenta} icon="advertisements" total={totals.revenue} />
        <BreakdownRow label="TV Networks — Subs" value={totals.tvSubs} color={T.yellow} icon="television" total={totals.revenue} />
        <BreakdownRow label="TV Networks — Ads" value={totals.tvAds} color={T.yellow} icon="television-classic" total={totals.revenue} />
        <BreakdownRow label="Cable Carriage In" value={totals.cableIn} color={T.green} icon="router-wireless" total={totals.revenue} />
        <BreakdownRow label="Player Cable Network" value={totals.playerCable} color={T.green} icon="connection" total={totals.revenue} />
        <BreakdownRow label="Channel Packs" value={totals.packs} color={T.green} icon="package-variant" total={totals.revenue} />
        <BreakdownRow label="Licensing Deals" value={totals.licIn} color={T.pink} icon="file-document" total={totals.revenue} />
        <BreakdownRow label="External IP" value={totals.ipIn} color={T.pink} icon="book-open-variant" total={totals.revenue} />
        <BreakdownRow label="Crossovers" value={totals.crossIn} color={T.pink} icon="shuffle-variant" total={totals.revenue} />

        {/* Costs Breakdown */}
        <Text style={s.section}>COSTS BREAKDOWN</Text>
        <BreakdownRow label="Cinema Opex" value={totals.cinemaOpex} color={T.red} icon="home-alert" total={totals.costs} />
        <BreakdownRow label="Streaming Servers" value={totals.serverCost} color={T.red} icon="server-network" total={totals.costs} />
        <BreakdownRow label="TV Broadcast Infra" value={totals.broadcast} color={T.red} icon="broadcast" total={totals.costs} />
        <BreakdownRow label="Cable Carriage Fees" value={totals.carriageOut} color={T.red} icon="cash-minus" total={totals.costs} />
        <BreakdownRow label="Production" value={totals.prod} color={T.red} icon="movie-edit" total={totals.costs} />
        <BreakdownRow label="Marketing" value={totals.mkt} color={T.red} icon="bullhorn" total={totals.costs} />
        <BreakdownRow label="License Fees Paid" value={totals.licOut} color={T.red} icon="file-export" total={totals.costs} />
        <BreakdownRow label="IP Royalties Paid" value={totals.ipOut} color={T.red} icon="book-arrow-right" total={totals.costs} />
        <BreakdownRow label="Crossover Fees Paid" value={totals.crossOut} color={T.red} icon="shuffle-variant" total={totals.costs} />

        {/* Per-week timeline */}
        <Text style={s.section}>PER-WEEK TIMELINE</Text>
        {window.length === 0 && <Text style={s.empty}>No history yet. Simulate weeks to start tracking.</Text>}
        {window.slice().reverse().map((w, i) => {
          const id = `${w.year}-${w.week}`;
          const wRev = w.cinemaBoxOfficeInB + w.ownedCinemaRevB + w.streamingSubsInB + w.streamingAdsInB
            + w.tvNetworkSubsInB + w.tvNetworkAdsInB + w.cableCarriageInB + w.playerCableSubsInB
            + w.channelPacksInB + w.licensingInB + w.ipRoyaltiesInB + w.crossoverInB + w.miscInB;
          const wCost = w.cinemaOpexB + w.streamingServerB + w.tvBroadcastB + w.cableCarriageOutB
            + w.productionCostB + w.marketingCostB + w.licensingOutB + w.ipRoyaltiesOutB + w.crossoverOutB + w.miscOutB;
          const wNet = wRev - wCost;
          const exp = expandedWeek === id;
          return (
            <TouchableOpacity key={i} style={s.weekRow} onPress={() => setExpandedWeek(exp ? null : id)} testID={`week-${id}`}>
              <View style={{ flex: 1 }}>
                <Text style={s.weekTitle}>W{w.week} · {w.year}</Text>
                <Text style={s.weekSub}>Cash {fmtB(w.cashEndB)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.weekNet, { color: wNet >= 0 ? T.green : T.red }]}>{wNet >= 0 ? '+' : ''}{fmtB(wNet)}</Text>
                <Text style={s.weekSub}>↑{fmtB(wRev)} ↓{fmtB(wCost)}</Text>
              </View>
              <MaterialCommunityIcons name={exp ? 'chevron-up' : 'chevron-down'} size={20} color={T.textMute} />
              {exp && (
                <View style={s.expandPanel}>
                  {w.cinemaBoxOfficeInB > 0 && <MiniRow label="Theatrical BO" v={w.cinemaBoxOfficeInB} c={T.cyan} />}
                  {w.ownedCinemaRevB > 0 && <MiniRow label="Owned Cinemas" v={w.ownedCinemaRevB} c={T.cyan} />}
                  {w.streamingSubsInB > 0 && <MiniRow label="Streaming Subs" v={w.streamingSubsInB} c={T.magenta} />}
                  {w.streamingAdsInB > 0 && <MiniRow label="Streaming Ads" v={w.streamingAdsInB} c={T.magenta} />}
                  {w.tvNetworkSubsInB > 0 && <MiniRow label="TV Subs" v={w.tvNetworkSubsInB} c={T.yellow} />}
                  {w.tvNetworkAdsInB > 0 && <MiniRow label="TV Ads" v={w.tvNetworkAdsInB} c={T.yellow} />}
                  {w.cableCarriageInB > 0 && <MiniRow label="Cable Carriage" v={w.cableCarriageInB} c={T.green} />}
                  {w.playerCableSubsInB > 0 && <MiniRow label="Player Cable" v={w.playerCableSubsInB} c={T.green} />}
                  {w.channelPacksInB > 0 && <MiniRow label="Channel Packs" v={w.channelPacksInB} c={T.green} />}
                  {w.licensingInB > 0 && <MiniRow label="Licensing In" v={w.licensingInB} c={T.pink} />}
                  {w.cinemaOpexB > 0 && <MiniRow label="− Cinema Opex" v={-w.cinemaOpexB} c={T.red} />}
                  {w.streamingServerB > 0 && <MiniRow label="− Streaming Servers" v={-w.streamingServerB} c={T.red} />}
                  {w.tvBroadcastB > 0 && <MiniRow label="− TV Broadcast" v={-w.tvBroadcastB} c={T.red} />}
                  {w.cableCarriageOutB > 0 && <MiniRow label="− Carriage Fees" v={-w.cableCarriageOutB} c={T.red} />}
                  {w.productionCostB > 0 && <MiniRow label="− Production" v={-w.productionCostB} c={T.red} />}
                  {w.marketingCostB > 0 && <MiniRow label="− Marketing" v={-w.marketingCostB} c={T.red} />}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>

      {showFullRecap && state.pendingRecap && (
        <Modal transparent visible animationType="fade">
          <View style={recapModalStyles.scrim}><Text style={recapModalStyles.text}>{JSON.stringify(state.pendingRecap)}</Text></View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function BreakdownRow({ label, value, color, icon, total }: { label: string; value: number; color: string; icon: string; total: number }) {
  if (value <= 0.0001) return null;
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={s.brRow}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} style={{ marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.brLabel}>{label}</Text>
          <Text style={[s.brValue, { color }]}>{fmtB(value)} <Text style={{ color: T.textMute, fontSize: 10 }}>· {pct.toFixed(1)}%</Text></Text>
        </View>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
        </View>
      </View>
    </View>
  );
}

function MiniRow({ label, v, c }: { label: string; v: number; c: string }) {
  return (
    <View style={s.miniRow}>
      <Text style={s.miniLabel}>{label}</Text>
      <Text style={[s.miniValue, { color: c }]}>{v >= 0 ? '+' : ''}{fmtB(v)}</Text>
    </View>
  );
}

const recapModalStyles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  text: { color: T.text },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: T.panel, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  topTitle: { color: T.text, fontSize: 18, fontWeight: '800' },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  rangeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: T.panel, borderWidth: 1, borderColor: T.border },
  rangeChipActive: { backgroundColor: T.cyan, borderColor: T.cyan },
  rangeChipText: { color: T.text, fontWeight: '700', fontSize: 13 },
  aggCard: { borderWidth: 2, borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: T.cardDark },
  aggLabel: { color: T.textMute, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  aggValue: { fontSize: 36, fontWeight: '800', marginTop: 2 },
  aggRow: { flexDirection: 'row', marginTop: 10, gap: 20 },
  aggCell: { alignItems: 'center' },
  aggCellLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  aggCellValue: { color: T.text, fontSize: 18, fontWeight: '800' },
  cashTrack: { color: T.textMute, fontSize: 12, marginTop: 8 },
  opsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 4 },
  opPill: { backgroundColor: T.panel, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: T.border },
  opText: { color: T.text, fontSize: 11, fontWeight: '600' },
  section: { color: T.text, fontSize: 13, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 8, paddingHorizontal: 4 },
  brRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: T.panel, padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: T.border },
  brLabel: { color: T.text, fontSize: 13, fontWeight: '600' },
  brValue: { fontSize: 13, fontWeight: '800' },
  bar: { height: 6, backgroundColor: T.cardDark, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  empty: { color: T.textMute, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  weekRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', backgroundColor: T.panel, padding: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: T.border },
  weekTitle: { color: T.text, fontSize: 14, fontWeight: '800' },
  weekSub: { color: T.textMute, fontSize: 11 },
  weekNet: { fontSize: 14, fontWeight: '800' },
  expandPanel: { flexBasis: '100%', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  miniRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  miniLabel: { color: T.text, fontSize: 12 },
  miniValue: { fontSize: 12, fontWeight: '700' },
});
