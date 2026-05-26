// V43 — Weekly Recap Modal
// Shown after Simulate Week / Simulate Multiple Weeks. Accumulates across multi-week sims.
// Reopenable later via Studio Stats screen.

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { T, SHADOW } from './theme';
import type { PendingRecap } from '../game/types';
import { sumInflowsB, sumOutflowsB } from '../game/ledger';

function fmtB(b: number): string {
  const abs = Math.abs(b);
  if (abs >= 1) return `$${b.toFixed(2)}B`;
  if (abs >= 0.001) return `$${(b * 1000).toFixed(1)}M`;
  return `$${(b * 1000 * 1000).toFixed(0)}K`;
}

function fmtSigned(b: number): string {
  const s = fmtB(b);
  return b >= 0 ? `+${s}` : `-${s.replace('-', '')}`;
}

interface Row { label: string; valueB: number; icon: string; color: string }

function RowItem({ label, valueB, icon, color, indent }: Row & { indent?: boolean }) {
  if (!valueB || Math.abs(valueB) < 0.0001) return null;
  return (
    <View style={[s.row, indent && { paddingLeft: 24 }]}>
      <MaterialCommunityIcons name={icon as any} size={16} color={color} style={{ marginRight: 8 }} />
      <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.rowValue, { color }]}>{fmtB(valueB)}</Text>
    </View>
  );
}

export function WeeklyRecapModal({ recap, onClose, onSeeMore }: { recap: PendingRecap; onClose: () => void; onSeeMore?: () => void }) {
  const totalIn = sumInflowsB(recap);
  const totalOut = sumOutflowsB(recap);
  const net = totalIn - totalOut;
  const periodLabel = recap.weeks === 1
    ? `Week ${recap.endWeek}, ${recap.endYear}`
    : `W${recap.startWeek} ${recap.startYear} → W${recap.endWeek} ${recap.endYear} (${recap.weeks} weeks)`;

  // Owned inflows
  const ownedRows: Row[] = [
    { label: 'Cinemas — Theatrical BO', valueB: recap.inflows.cinemaBoxOfficeInB, icon: 'movie-roll', color: T.cyan },
    { label: 'Owned Cinemas', valueB: recap.inflows.ownedCinemaRevB, icon: 'home-city', color: T.cyan },
    { label: 'Streaming — Subscriptions', valueB: recap.inflows.streamingSubsInB, icon: 'play-circle', color: T.magenta },
    { label: 'Streaming — Ads', valueB: recap.inflows.streamingAdsInB, icon: 'advertisements', color: T.magenta },
    { label: 'TV Networks — Subs', valueB: recap.inflows.tvNetworkSubsInB, icon: 'television', color: T.yellow },
    { label: 'TV Networks — Ads', valueB: recap.inflows.tvNetworkAdsInB, icon: 'television-classic', color: T.yellow },
    { label: 'Cable Carriage In', valueB: recap.inflows.cableCarriageInB, icon: 'router-wireless', color: T.green },
    { label: 'Player Cable Network', valueB: recap.inflows.playerCableSubsInB, icon: 'connection', color: T.green },
    { label: 'Channel Packs', valueB: recap.inflows.channelPacksInB, icon: 'package-variant', color: T.green },
  ];
  // Licensed inflows
  const licRows: Row[] = [
    { label: 'Licensing Deals', valueB: recap.inflows.licensingInB, icon: 'file-document', color: T.cyan },
    { label: 'External IP Royalties', valueB: recap.inflows.ipRoyaltiesInB, icon: 'book-open-variant', color: T.cyan },
    { label: 'Crossover Royalties', valueB: recap.inflows.crossoverInB, icon: 'shuffle-variant', color: T.cyan },
    { label: 'Other', valueB: recap.inflows.miscInB, icon: 'dots-horizontal', color: T.cyan },
  ];
  // Outflows
  const outRows: Row[] = [
    { label: 'Cinema Opex', valueB: recap.outflows.cinemaOpexB, icon: 'home-alert', color: T.red },
    { label: 'Streaming Servers', valueB: recap.outflows.streamingServerB, icon: 'server-network', color: T.red },
    { label: 'TV Broadcast Infra', valueB: recap.outflows.tvBroadcastB, icon: 'broadcast', color: T.red },
    { label: 'Cable Carriage Fees', valueB: recap.outflows.cableCarriageOutB, icon: 'cash-minus', color: T.red },
    { label: 'Production Costs', valueB: recap.outflows.productionCostB, icon: 'movie-edit', color: T.red },
    { label: 'Marketing Spend', valueB: recap.outflows.marketingCostB, icon: 'bullhorn', color: T.red },
    { label: 'License Fees Paid', valueB: recap.outflows.licensingOutB, icon: 'file-export', color: T.red },
    { label: 'IP Royalties Paid', valueB: recap.outflows.ipRoyaltiesOutB, icon: 'book-arrow-right', color: T.red },
    { label: 'Crossover Fees Paid', valueB: recap.outflows.crossoverOutB, icon: 'shuffle-variant', color: T.red },
    { label: 'Other Costs', valueB: recap.outflows.miscOutB, icon: 'dots-horizontal', color: T.red },
  ];

  return (
    <Modal transparent animationType="fade" visible>
      <View style={s.scrim}>
        <View style={s.card} testID="weekly-recap-modal">
          <View style={s.headerRow}>
            <View style={s.headerIcon}>
              <MaterialCommunityIcons name="calendar-month" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Weekly Recap</Text>
              <Text style={s.subtitle}>{periodLabel}</Text>
            </View>
          </View>

          {/* Headline Net Card */}
          <View style={[s.netCard, { borderColor: net >= 0 ? T.green : T.red }]}>
            <Text style={s.netLabel}>NET RESULT</Text>
            <Text style={[s.netValue, { color: net >= 0 ? T.green : T.red }]} testID="recap-net">{fmtSigned(net)}</Text>
            <View style={s.netRow}>
              <Text style={[s.netSub, { color: T.green }]}>↑ {fmtB(totalIn)}</Text>
              <Text style={s.netSep}>·</Text>
              <Text style={[s.netSub, { color: T.red }]}>↓ {fmtB(totalOut)}</Text>
            </View>
            <Text style={s.cashLine}>Cash {fmtB(recap.startCashB)} → {fmtB(recap.endCashB)}</Text>
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {/* Operational */}
            {(recap.moviesReleased > 0 || recap.seriesReleased > 0 || recap.awardsWeek > 0 || recap.nominationsWeek > 0) && (
              <View style={s.opsBar}>
                {recap.moviesReleased > 0 && <View style={s.opPill}><Text style={s.opPillText}>🎬 {recap.moviesReleased} released</Text></View>}
                {recap.seriesReleased > 0 && <View style={s.opPill}><Text style={s.opPillText}>📺 {recap.seriesReleased} series ep</Text></View>}
                {recap.awardsWeek > 0 && <View style={s.opPill}><Text style={s.opPillText}>🏆 {recap.awardsWeek} wins</Text></View>}
                {recap.nominationsWeek > 0 && <View style={s.opPill}><Text style={s.opPillText}>⭐ {recap.nominationsWeek} noms</Text></View>}
              </View>
            )}

            {/* Owned revenue */}
            <Text style={s.section}>OWNED REVENUE</Text>
            {ownedRows.map((r, i) => <RowItem key={i} {...r} />)}
            {ownedRows.every(r => !r.valueB || Math.abs(r.valueB) < 0.0001) && <Text style={s.empty}>No owned revenue this period.</Text>}

            {/* Licensed revenue */}
            <Text style={s.section}>LICENSED REVENUE</Text>
            {licRows.map((r, i) => <RowItem key={i} {...r} />)}
            {licRows.every(r => !r.valueB || Math.abs(r.valueB) < 0.0001) && <Text style={s.empty}>No licensed revenue this period.</Text>}

            {/* Outflows */}
            <Text style={s.section}>COSTS / OUTFLOWS</Text>
            {outRows.map((r, i) => <RowItem key={i} {...r} />)}
            {outRows.every(r => !r.valueB || Math.abs(r.valueB) < 0.0001) && <Text style={s.empty}>No costs this period.</Text>}
          </ScrollView>

          <View style={s.actions}>
            {onSeeMore && (
              <TouchableOpacity style={[s.btn, { backgroundColor: T.card, flex: 1 }]} onPress={onSeeMore} testID="recap-see-more-btn">
                <MaterialCommunityIcons name="chart-line" size={16} color={T.text} style={{ marginRight: 6 }} />
                <Text style={s.btnText}>See Full Stats</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btn, { backgroundColor: T.cyan, flex: 1 }]} onPress={onClose} testID="recap-ok-btn">
              <Text style={[s.btnText, { color: '#000' }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'center', padding: 12 },
  card: { backgroundColor: T.panel, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: T.border, ...SHADOW },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.cyan, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { fontSize: 22, fontWeight: '800', color: T.text },
  subtitle: { color: T.textMute, fontSize: 12, marginTop: 2 },
  netCard: { borderWidth: 2, borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12, backgroundColor: T.cardDark },
  netLabel: { color: T.textMute, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  netValue: { fontSize: 32, fontWeight: '800', marginTop: 2 },
  netRow: { flexDirection: 'row', marginTop: 4, gap: 6 },
  netSub: { fontSize: 13, fontWeight: '700' },
  netSep: { color: T.textMute },
  cashLine: { color: T.textMute, fontSize: 12, marginTop: 6 },
  section: { color: T.textMute, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: T.border },
  rowLabel: { color: T.text, fontSize: 13, flex: 1 },
  rowValue: { fontSize: 13, fontWeight: '700' },
  empty: { color: T.textMute, fontSize: 12, fontStyle: 'italic', paddingHorizontal: 8, paddingVertical: 4 },
  opsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingVertical: 4 },
  opPill: { backgroundColor: T.cardDark, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: T.border },
  opPillText: { color: T.text, fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnText: { color: T.text, fontWeight: '800', fontSize: 14 },
});
