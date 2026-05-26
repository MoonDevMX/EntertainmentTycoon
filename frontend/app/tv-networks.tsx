import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, SafeAreaView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { TV_NETWORKS_SEED, CABLE_PROVIDERS_SEED } from '../src/game/data';
import { T } from '../src/ui/theme';
import { TopBar } from '../src/ui/components';
import { uiAlert } from '../src/ui/ui-alert';
import type { TVChannelKind, TVNetworkRegion } from '../src/game/types';

const REGIONS: TVNetworkRegion[] = ['North America', 'Europe', 'Latin America', 'Asia', 'Oceania', 'Africa'];
const KIND_LABEL: Record<TVChannelKind, string> = { public: 'Public', cable: 'Cable', premium: 'Premium' };
const KIND_COLOR: Record<TVChannelKind, string> = { public: T.cyan, cable: T.yellow, premium: T.magenta };

type Tab = 'networks' | 'deals' | 'mine' | 'cable' | 'mycable' | 'manager';

export default function TVNetworksScreen() {
  const { state, proposeTVNetworkDeal, acceptTVNetworkCounter, rejectTVNetworkCounter, createPlayerTVChannel, quoteTVNetworkDeal, setChannelMonthlyFee, setChannelProgramming, signCableDistributionDeal, createChannelPack, deleteChannelPack, quoteChannelContentLicense, proposeChannelContentLicense, renameTVChannel, deleteTVChannel, quoteCableCarriageDeal, signCableCarriageDeal, acceptCableCarriageCounter, rejectCableCarriageDeal, cancelCableCarriageDeal, approveTVManagerProposal, rejectTVManagerProposal, setChannelPackTierPricing, renameChannelPack, setChannelPackMonthlyFee, createPlayerCableNetwork, deletePlayerCableNetwork, renamePlayerCableNetwork, addChannelToPlayerCable, removeChannelFromPlayerCable, setPlayerCableTier, addPlayerCableTier, deletePlayerCableTier, addChannelToPack, removeChannelFromPack, setChannelAdProgrammingRatio, setEntityMarketing, quoteWholeNetworkLicense, signWholeNetworkLicenseOutbound, approveTVManagerOwnContent } = useGame();
  // V41 — Renamed tabs: 'mine' is now displayed as "My TV Network" and absorbs the old "Deals" content.
  const [tab, setTab] = useState<Tab>('networks');
  // V44 — expand/collapse state for sister-network groups in the Networks tab
  const [expandedNetGroups, setExpandedNetGroups] = useState<Set<string>>(new Set());
  const [regionFilter, setRegionFilter] = useState<TVNetworkRegion | 'All'>('All');
  const [kindFilter, setKindFilter] = useState<TVChannelKind | 'All'>('All');

  const [dealNetId, setDealNetId] = useState<string | null>(null);
  const [pickedMovieIds, setPickedMovieIds] = useState<string[]>([]);
  const [years, setYears] = useState('3');
  const [exclusivity, setExclusivity] = useState(false);
  const [askingFee, setAskingFee] = useState('0.5');

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRegion, setNewRegion] = useState<TVNetworkRegion>('North America');
  const [newKind, setNewKind] = useState<TVChannelKind>('cable');

  // V35 — Manage owned channel
  const [manageChannelId, setManageChannelId] = useState<string | null>(null);
  const [feeInput, setFeeInput] = useState('');
  const [progPicks, setProgPicks] = useState<string[]>([]);
  // V35 — Channel Pack & Inbound License modals
  const [packOpen, setPackOpen] = useState(false);
  const [packName, setPackName] = useState('');
  const [packChannelIds, setPackChannelIds] = useState<string[]>([]);
  const [packFee, setPackFee] = useState('19.99');
  // V39 — Tier-based pricing toggle for the pack
  const [packTieredOn, setPackTieredOn] = useState(false);
  const [packBudget, setPackBudget] = useState('14.99');
  const [packStandard, setPackStandard] = useState('19.99');
  const [packPremium, setPackPremium] = useState('29.99');
  // V43 — Channel search (P2) + Whole-Network Deal modal (P0)
  const [searchQ, setSearchQ] = useState('');
  const [wnDealStudioId, setWnDealStudioId] = useState<string | null>(null);
  const [wnPicks, setWnPicks] = useState<string[]>([]);
  const [wnYears, setWnYears] = useState('5');
  const [wnFee, setWnFee] = useState('1.0');
  const [licenseChannelId, setLicenseChannelId] = useState<string | null>(null);
  const [licenseRivalId, setLicenseRivalId] = useState<string | null>(null);
  const [licensePicks, setLicensePicks] = useState<string[]>([]);
  const [licenseYears, setLicenseYears] = useState('3');
  const [licenseFee, setLicenseFee] = useState('0.5');
  // V36 — Rename modal & Cable carriage modal
  const [renameChannelId, setRenameChannelId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  // V41 — Pack management modal (rename + pricing edit)
  const [managePackId, setManagePackId] = useState<string | null>(null);
  const [packEditName, setPackEditName] = useState('');
  const [packEditFee, setPackEditFee] = useState('');
  const [packEditTieredOn, setPackEditTieredOn] = useState(false);
  const [packEditBudget, setPackEditBudget] = useState('');
  const [packEditStandard, setPackEditStandard] = useState('');
  const [packEditPremium, setPackEditPremium] = useState('');
  const [carriageProviderId, setCarriageProviderId] = useState<string | null>(null);
  // V41 — My Cable Carriage Network state
  const [pcnCreateOpen, setPcnCreateOpen] = useState(false);
  const [pcnNewName, setPcnNewName] = useState('');
  const [pcnNewRegion, setPcnNewRegion] = useState<TVNetworkRegion>('North America');
  const [pcnManageId, setPcnManageId] = useState<string | null>(null);
  const [pcnAddChannelOpen, setPcnAddChannelOpen] = useState(false);
  const [pcnAddChannelId, setPcnAddChannelId] = useState<string | null>(null);
  const [pcnAddChannelFee, setPcnAddChannelFee] = useState('0.50');
  // V42b — Bulk multi-select licensing for cable carriage + search
  const [pcnBulkSelected, setPcnBulkSelected] = useState<Set<string>>(new Set());
  const [pcnSearch, setPcnSearch] = useState('');
  const [pcnSortBy, setPcnSortBy] = useState<'reputation' | 'subscribers' | 'name'>('reputation');
  // V42c — Tier configurator: track which auto-packs are expanded for inline editing
  const [expandedAutoPacks, setExpandedAutoPacks] = useState<Set<string>>(new Set());
  // V42d — Collapse carried channels list (takes lots of room with many channels)
  const [carriedCollapsed, setCarriedCollapsed] = useState<Set<string>>(new Set());
  const [pcnEditTierId, setPcnEditTierId] = useState<string | null>(null);
  const [pcnTierNameEdit, setPcnTierNameEdit] = useState('');
  const [pcnTierFeeEdit, setPcnTierFeeEdit] = useState('');
  const [carriageChannelId, setCarriageChannelId] = useState<string | null>(null);
  const [carriageYears, setCarriageYears] = useState('5');
  const [carriageFee, setCarriageFee] = useState('0.50');
  const [cableRegion, setCableRegion] = useState<TVNetworkRegion | 'All'>('All');
  // V39 — TV Manager proposals modal state (must be defined BEFORE any conditional return to satisfy Rules of Hooks)
  const [mgrOpen, setMgrOpen] = useState(false);

  // V42d — ALL hooks must come before the `if (!state) return null` check.
  // Compute `filtered` networks via useMemo here (safely handling null state).
  const filtered = useMemo(() => {
    if (!state) return [];
    const allNets = state.tvNetworks && state.tvNetworks.length > 0 ? state.tvNetworks : TV_NETWORKS_SEED.map(n => ({ ...n })) as any;
    const q = searchQ.trim().toLowerCase();
    return allNets.filter((n: any) =>
      (regionFilter === 'All' || n.region === regionFilter) &&
      (kindFilter === 'All' || n.kind === kindFilter) &&
      !n.ownerStudioId &&
      (q === '' || (n.name || '').toLowerCase().includes(q) || (n.region || '').toLowerCase().includes(q))
    );
  }, [state, regionFilter, kindFilter, searchQ]);

  // V43 — Rival-owned channel groups for whole-network deals (groups of ≥2 channels owned by same rival)
  const rivalGroups = useMemo(() => {
    if (!state) return [];
    const grouped: Record<string, { studioId: string; studioName: string; channels: any[] }> = {};
    const allNets = state.tvNetworks && state.tvNetworks.length > 0 ? state.tvNetworks : TV_NETWORKS_SEED.map(n => ({ ...n })) as any;
    allNets.forEach((n: any) => {
      if (!n.ownerStudioId || n.ownerStudioId === state.player.id || n.closed) return;
      const rival = state.rivals.find(r => r.id === n.ownerStudioId);
      if (!rival) return;
      if (!grouped[n.ownerStudioId]) grouped[n.ownerStudioId] = { studioId: rival.id, studioName: rival.name, channels: [] };
      grouped[n.ownerStudioId].channels.push(n);
    });
    return Object.values(grouped).filter(g => g.channels.length >= 2);
  }, [state]);


  if (!state) return null;

  // ensure seed
  const networks = state.tvNetworks && state.tvNetworks.length > 0 ? state.tvNetworks : TV_NETWORKS_SEED.map(n => ({ ...n })) as any;
  const playerNets = networks.filter((n: any) => n.ownerStudioId === state.player.id);
  const deals = state.tvNetworkDeals || [];
  const myReleased = state.movies.filter(m => m.studioId === state.player.id && m.status === 'released');

  const openDealModal = (netId: string) => {
    setDealNetId(netId);
    setPickedMovieIds([]);
    setYears('3');
    setExclusivity(false);
    setAskingFee('0.5');
  };

  const recomputeAsk = (mids: string[], yrs: number, excl: boolean) => {
    if (!dealNetId || mids.length === 0 || yrs < 1) return;
    const q = quoteTVNetworkDeal({ networkId: dealNetId, movieIds: mids, years: yrs, exclusivity: excl });
    if (!q.error) setAskingFee(q.feeB.toFixed(2));
  };

  const submitDeal = () => {
    if (!dealNetId) return;
    const yrs = parseInt(years, 10) || 0;
    const fee = parseFloat(askingFee) || 0;
    if (pickedMovieIds.length === 0) { uiAlert('Pick films', 'Select at least one movie to license.'); return; }
    if (yrs < 1 || yrs > 10) { uiAlert('Invalid term', 'Years must be 1–10.'); return; }
    if (fee <= 0) { uiAlert('Invalid fee', 'Set an asking fee.'); return; }
    const r = proposeTVNetworkDeal({ networkId: dealNetId, movieIds: pickedMovieIds, askingFeeB: fee, years: yrs, exclusivity });
    if (r.error) { uiAlert('Failed', r.error); return; }
    setDealNetId(null);
    if (r.accepted) {
      uiAlert('Deal signed ✓', `$${fee.toFixed(2)}B paid upfront. Franchise popularity will tick up weekly.`);
    } else {
      uiAlert('Counter received', `Network counter-offered $${r.counterFeeB?.toFixed(2)}B. Review in the Deals tab.`);
    }
  };

  // V39 — TV Manager proposals modal state
  const mgrProposals = state?.tvManagerProposals || [];

  const submitCreate = () => {
    if (!newName.trim()) { uiAlert('Name required', 'Pick a channel name.'); return; }
    const r = createPlayerTVChannel({ name: newName.trim(), region: newRegion, kind: newKind });
    if (r.error) { uiAlert('Cannot launch', r.error); return; }
    setCreateOpen(false);
    setNewName('');
    uiAlert('Channel launched ✓', `Welcome to ${newName}. Start commissioning content!`);
  };

  return (
    <View style={s.root}>
      <TopBar title="TV Networks" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />

      {/* V44 — TV Manager banner: redirects to Manager tab. Always visible. */}
      <TouchableOpacity style={s.mgrBanner} onPress={() => setTab('manager')} testID="open-tv-manager">
        <MaterialCommunityIcons name="lightbulb-on" size={18} color={T.yellow} />
        <Text style={s.mgrBannerT}>{mgrProposals.length > 0 ? `💡 TV Manager: ${mgrProposals.length} new deal suggestion${mgrProposals.length !== 1 ? 's' : ''}` : '💡 TV Manager — Tap to review suggestions'}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={T.yellow} />
      </TouchableOpacity>

      <View style={s.tabbar}>
        {([
          { k: 'networks' as Tab, label: 'Networks', icon: 'television-classic', badge: filtered.length },
          { k: 'mine' as Tab, label: 'My TV', icon: 'broadcast', badge: playerNets.length + deals.length },
          { k: 'mycable' as Tab, label: 'My Cable', icon: 'satellite-uplink', badge: (state.playerCableNetworks || []).length },
          { k: 'cable' as Tab, label: 'Cable', icon: 'cable-data', badge: (state.cableCarriageDeals || []).filter(d => d.status === 'active').length },
          { k: 'manager' as Tab, label: 'Manager', icon: 'robot', badge: mgrProposals.length },
        ]).map(t => (
          <TouchableOpacity key={t.k} style={[s.tab, tab === t.k && s.tabActive]} onPress={() => setTab(t.k)} testID={`tv-tab-${t.k}`}>
            <MaterialCommunityIcons name={t.icon as any} size={16} color={tab === t.k ? T.cardDark : T.text} />
            <Text style={[s.tabTxt, tab === t.k && { color: T.cardDark }]}>{t.label}</Text>
            <View style={[s.tabBadge, tab === t.k && { backgroundColor: T.cardDark }]}><Text style={[s.tabBadgeTxt, tab === t.k && { color: T.cyan }]}>{t.badge}</Text></View>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'networks' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
          <Text style={s.sectionHint}>License your released movies to TV networks. Premium pays more per sub; Public reaches more eyeballs. Active deals slowly boost franchise popularity but split audience away from streaming.</Text>

          {/* V43 — Channel search (P2) */}
          <TextInput
            value={searchQ}
            onChangeText={setSearchQ}
            placeholder="🔍 Search by channel name or region…"
            placeholderTextColor={T.textMute}
            style={s.searchInput}
            testID="channel-search"
          />

          <Text style={s.filterLbl}>Region</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {(['All', ...REGIONS] as const).map(r => (
              <TouchableOpacity key={r} style={[s.chip, regionFilter === r && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setRegionFilter(r as any)}>
                <Text style={[s.chipTxt, regionFilter === r && { color: T.cardDark }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.filterLbl}>Kind</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {(['All', 'public', 'cable', 'premium'] as const).map(k => (
              <TouchableOpacity key={k} style={[s.chip, kindFilter === k && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setKindFilter(k as any)}>
                <Text style={[s.chipTxt, kindFilter === k && { color: T.cardDark }]}>{k === 'All' ? 'All' : KIND_LABEL[k as TVChannelKind]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* V43 — Whole-Network Single-Deal Licensing (P0) */}
          {rivalGroups.length > 0 && myReleased.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={[s.filterLbl, { color: T.green }]}>🤝 WHOLE-NETWORK DEALS — License to entire rival groups in one stroke</Text>
              {rivalGroups.map(g => (
                <TouchableOpacity
                  key={g.studioId}
                  style={s.wnGroupCard}
                  onPress={() => {
                    setWnDealStudioId(g.studioId);
                    setWnPicks([]);
                    setWnYears('5');
                    setWnFee('1.0');
                  }}
                  testID={`wn-group-${g.studioId}`}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons name="handshake" size={20} color={T.green} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.netName}>{g.studioName}</Text>
                      <Text style={s.netSub}>{g.channels.length} channels · {g.channels.reduce((a, c) => a + (c.subscribers || 0), 0).toFixed(0)}M combined reach</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={T.textMute} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            {filtered.length === 0 ? (
              <Text style={s.empty}>No networks match this filter.</Text>
            ) : (() => {
              // V44 — Group channels by sister-network prefix (first word of name) for compact listing.
              const groups: Record<string, any[]> = {};
              for (const n of filtered) {
                const prefix = (n.name || '').split(/\s+/)[0] || 'Other';
                const key = `${prefix}__${n.region}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(n);
              }
              const groupList = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
              return groupList.map(([key, chans]) => {
                const prefix = key.split('__')[0];
                const region = key.split('__')[1] || '';
                const expanded = expandedNetGroups.has(key);
                const totalSubs = chans.reduce((a: number, c: any) => a + (c.subscribers || 0), 0);
                const avgRep = Math.round(chans.reduce((a: number, c: any) => a + (c.reputation || 0), 0) / chans.length);
                if (chans.length === 1) {
                  // Single channel — render directly without group wrapper
                  const n = chans[0];
                  return (
                    <View key={n.id} style={s.netCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[s.kindBadge, { backgroundColor: KIND_COLOR[n.kind as TVChannelKind] }]}>
                          <Text style={s.kindBadgeTxt}>{KIND_LABEL[n.kind as TVChannelKind]}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={s.netName}>{n.name}</Text>
                          <Text style={s.netSub}>{n.region} · {n.subscribers}M subs · {n.reputation}/100 rep</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={s.dealBtn} onPress={() => openDealModal(n.id)} testID={`tv-deal-${n.id}`}>
                        <MaterialCommunityIcons name="handshake" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>License Content</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
                return (
                  <View key={key} style={[s.netCard, { padding: 0, overflow: 'hidden' }]} testID={`net-group-${key}`}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}
                      onPress={() => setExpandedNetGroups(prev => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key); else next.add(key);
                        return next;
                      })}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="folder-network" size={22} color={T.cyan} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={s.netName}>📡 {prefix} Network × {chans.length}</Text>
                        <Text style={s.netSub}>{region} · {totalSubs.toFixed(0)}M combined reach · avg rep {avgRep}</Text>
                      </View>
                      <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={T.textDim} />
                    </TouchableOpacity>
                    {expanded && (
                      <View style={{ padding: 8, gap: 6, backgroundColor: T.card, borderTopWidth: 1, borderTopColor: T.border }}>
                        {chans.map((n: any) => (
                          <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 8, borderRadius: 6, gap: 8 }}>
                            <View style={[s.kindBadge, { backgroundColor: KIND_COLOR[n.kind as TVChannelKind] }]}>
                              <Text style={s.kindBadgeTxt}>{KIND_LABEL[n.kind as TVChannelKind]}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[s.netName, { fontSize: 12 }]}>{n.name}</Text>
                              <Text style={[s.netSub, { fontSize: 10 }]}>{n.subscribers}M · {n.reputation}/100</Text>
                            </View>
                            <TouchableOpacity style={[s.dealBtn, { paddingHorizontal: 8, paddingVertical: 6 }]} onPress={() => openDealModal(n.id)} testID={`tv-deal-${n.id}`}>
                              <MaterialCommunityIcons name="handshake" size={14} color={T.cardDark} />
                              <Text style={[s.dealBtnTxt, { fontSize: 10 }]}>License</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              });
            })()}
          </View>
        </ScrollView>
      )}

      {/* V44 — Manager tab: always-available list of TV Manager proposals + Scan button */}
      {tab === 'manager' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
          <View style={[s.sectionHintBox]}>
            <MaterialCommunityIcons name="robot" size={28} color={T.yellow} />
            <Text style={s.sectionHint}>TV Manager scans weekly for new cable carriage deals, content licenses, and own-content opportunities. Approve or dismiss suggestions.</Text>
          </View>
          {mgrProposals.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <MaterialCommunityIcons name="lightbulb-off-outline" size={42} color={T.textDim} />
              <Text style={[s.empty, { textAlign: 'center', marginTop: 8 }]}>No suggestions yet.</Text>
              <Text style={[s.netSub, { textAlign: 'center', marginTop: 4 }]}>Manager scans automatically each week once you own channels.</Text>
            </View>
          ) : mgrProposals.map(p => {
            const kindLabel = p.kind === 'cable_carriage' ? 'Cable Carriage' : p.kind === 'channel_content_license' ? 'Buy Rival Content' : (p as any).kind === 'air_own_movie' ? '📺 Air Your Own Movies' : 'License to Rival';
            const kindIcon = p.kind === 'cable_carriage' ? 'cable-data' : p.kind === 'channel_content_license' ? 'movie-open-plus' : (p as any).kind === 'air_own_movie' ? 'movie-roll' : 'television-classic';
            const kindColor = p.direction === 'inbound' ? T.green : T.yellow;
            return (
              <View key={p.id} style={s.mgrCard} testID={`tv-mgr-${p.id}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name={kindIcon as any} size={22} color={kindColor} />
                  <Text style={s.mgrCardKind}>{kindLabel}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[s.dirPill, { backgroundColor: kindColor }]}><Text style={s.dirPillT}>{p.direction.toUpperCase()}</Text></View>
                </View>
                <Text style={s.mgrRationale}>{p.rationale}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={[s.mgrBtn, { backgroundColor: T.green }]} onPress={() => {
                    const isAirOwn = (p as any).kind === 'air_own_movie';
                    const r = isAirOwn ? approveTVManagerOwnContent(p.id) : approveTVManagerProposal(p.id);
                    if (r.error) uiAlert('Cannot approve', r.error);
                    else uiAlert('Approved ✓', 'Manager submitted the deal.');
                  }} testID={`tv-mgr-approve-${p.id}`}>
                    <MaterialCommunityIcons name="check-bold" size={16} color={T.cardDark} />
                    <Text style={s.mgrBtnT}>APPROVE</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.mgrBtn, { backgroundColor: '#E84545' }]} onPress={() => rejectTVManagerProposal(p.id)} testID={`tv-mgr-reject-${p.id}`}>
                    <MaterialCommunityIcons name="close-thick" size={16} color={T.text} />
                    <Text style={[s.mgrBtnT, { color: T.text }]}>DISMISS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {tab === 'mine' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
          {/* V41 — Outbound license deals (movies → external networks) merged here from old "Deals" tab */}
          {deals.length > 0 ? (
            <>
              <Text style={[s.filterLbl, { marginTop: 0 }]}>OUTBOUND LICENSE DEALS — Your movies on rival networks</Text>
              {deals.map(d => {
                const net = networks.find((n: any) => n.id === d.networkId);
                return (
                  <View key={d.id} style={s.dealCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={s.dealNetName}>{net?.name || 'Unknown Network'}</Text>
                      <View style={[s.dealStatusPill, { backgroundColor: d.status === 'active' ? T.green : d.status === 'pending' ? T.yellow : T.textMute }]}>
                        <Text style={s.dealStatusTxt}>{d.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={s.dealMeta}>${d.feeB.toFixed(2)}B · {d.years}yr · {d.movieIds.length} films{d.exclusivity ? ' · exclusive' : ''}</Text>
                    {d.status === 'pending' ? (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.green }]} onPress={() => {
                          const r = acceptTVNetworkCounter(d.id);
                          if (r.error) uiAlert('Failed', r.error); else uiAlert('Accepted ✓', `$${d.feeB.toFixed(2)}B paid upfront.`);
                        }} testID={`tv-accept-${d.id}`}>
                          <Text style={s.smallBtnTxt}>ACCEPT COUNTER</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.red }]} onPress={() => rejectTVNetworkCounter(d.id)} testID={`tv-reject-${d.id}`}>
                          <Text style={s.smallBtnTxt}>REJECT</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}

          <TouchableOpacity style={[s.bigBtn, { backgroundColor: T.magenta }]} onPress={() => setCreateOpen(true)} testID="tv-create-channel">
            <MaterialCommunityIcons name="plus-circle" size={18} color={T.cardDark} />
            <Text style={s.bigBtnTxt}>LAUNCH NEW CHANNEL</Text>
          </TouchableOpacity>
          {playerNets.length >= 2 ? (
            <TouchableOpacity style={[s.bigBtn, { backgroundColor: T.yellow, marginTop: 0 }]} onPress={() => { setPackOpen(true); setPackChannelIds([]); setPackName(''); setPackFee('19.99'); }} testID="pack-create-open">
              <MaterialCommunityIcons name="package-variant" size={18} color={T.cardDark} />
              <Text style={s.bigBtnTxt}>CREATE CHANNEL PACK (BUNDLE)</Text>
            </TouchableOpacity>
          ) : null}

          {(state.channelPacks || []).filter(p => p.ownerStudioId === state.player.id).length > 0 ? (
            <>
              <Text style={[s.filterLbl, { marginTop: 12 }]}>YOUR CHANNEL PACKS</Text>
              {(state.channelPacks || []).filter(p => p.ownerStudioId === state.player.id).map(p => {
                const inc = networks.filter((n: any) => p.channelIds.includes(n.id));
                const weeklyRevM = +((p.subscribers * p.monthlyFeeUSD) / 4).toFixed(2);
                const tiered = (p as any).pricingByTier;
                return (
                  <View key={p.id} style={s.netCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.netName}>{p.name}</Text>
                        <Text style={s.netSub}>{inc.length} channels · ${p.monthlyFeeUSD.toFixed(2)}/mo {tiered ? `· tiered ($${tiered.budget}/$${tiered.standard}/$${tiered.premium})` : ''} · {p.subscribers.toFixed(1)}M subs</Text>
                        <Text style={[s.netSub, { color: T.green }]}>~${weeklyRevM}M/wk revenue</Text>
                      </View>
                    </View>
                    <Text style={[s.netHint, { marginTop: 4 }]}>{inc.map((c: any) => c.name).join(' · ')}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.yellow, flex: 1 }]} onPress={() => {
                        setManagePackId(p.id);
                        setPackEditName(p.name);
                        setPackEditFee(String(p.monthlyFeeUSD));
                        setPackEditTieredOn(!!tiered);
                        setPackEditBudget(String(tiered?.budget ?? p.monthlyFeeUSD * 0.75));
                        setPackEditStandard(String(tiered?.standard ?? p.monthlyFeeUSD));
                        setPackEditPremium(String(tiered?.premium ?? p.monthlyFeeUSD * 1.4));
                      }} testID={`pack-manage-${p.id}`}>
                        <MaterialCommunityIcons name="cog" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>Manage Pack</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.red, flex: 1 }]} onPress={() => { deleteChannelPack(p.id); }} testID={`pack-del-${p.id}`}>
                        <MaterialCommunityIcons name="delete" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}

          {playerNets.length === 0 ? (
            <Text style={s.empty}>You don't own any channels yet. Launch one above to start broadcasting.</Text>
          ) : (
            <>
              <Text style={[s.filterLbl, { marginTop: 12 }]}>YOUR CHANNELS</Text>
              {playerNets.map((n: any) => {
                const progCount = (n.programmingMovieIds || []).length;
                const weeklyRevM = +((n.subscribers * (n.monthlyFeeUSD || 0)) / 4).toFixed(2);
                // V41 — Licensed-in content on this channel (rival movies player paid to broadcast)
                const licIn = (state.channelContentLicenses || []).filter(l => l.channelId === n.id && l.status === 'active');
                return (
                  <View key={n.id} style={s.netCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[s.kindBadge, { backgroundColor: KIND_COLOR[n.kind as TVChannelKind] }]}>
                        <Text style={s.kindBadgeTxt}>{KIND_LABEL[n.kind as TVChannelKind]}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={s.netName}>{n.name}</Text>
                        <Text style={s.netSub}>{n.region} · {n.subscribers}M subs · ${(n.monthlyFeeUSD || 0).toFixed(2)}/mo · {progCount} on-air</Text>
                        <Text style={[s.netSub, { color: T.green }]}>~${weeklyRevM}M/wk revenue {n.cableDistributionDeals ? `· ${n.cableDistributionDeals} cable deals` : ''}</Text>
                        {licIn.length > 0 ? (
                          <Text style={[s.netSub, { color: T.cyan }]}>📺 {licIn.reduce((a, l) => a + l.movieIds.length, 0)} licensed-in titles</Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.yellow, flex: 1 }]} onPress={() => {
                        setManageChannelId(n.id);
                        setFeeInput(String(n.monthlyFeeUSD ?? 0));
                        setProgPicks(n.programmingMovieIds || []);
                      }} testID={`tv-manage-${n.id}`}>
                        <MaterialCommunityIcons name="cog" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>Manage</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.cyan, flex: 1 }]} onPress={() => {
                        setLicenseChannelId(n.id);
                        setLicenseRivalId(state.rivals[0]?.id || null);
                        setLicensePicks([]);
                        setLicenseYears('3');
                        setLicenseFee('0.5');
                      }} testID={`tv-license-${n.id}`}>
                        <MaterialCommunityIcons name="shopping" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>License</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.magenta, flex: 1 }]} onPress={() => {
                        setRenameChannelId(n.id);
                        setRenameInput(n.displayName || n.name);
                      }} testID={`tv-rename-${n.id}`}>
                        <MaterialCommunityIcons name="rename-box" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>Rename</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.red, flex: 1 }]} onPress={() => {
                        if (typeof window !== 'undefined' && typeof (window as any).confirm === 'function') {
                          if (!(window as any).confirm(`Shut down ${n.name}? You'll receive 30% salvage refund.`)) return;
                          const r = deleteTVChannel(n.id);
                          if (r.error) uiAlert('Cannot close', r.error); else uiAlert('Channel closed ✓', 'Salvage refund credited.');
                        } else {
                          Alert.alert('Shut down channel?', `${n.name} will be permanently closed. You'll receive 30% salvage refund.`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Shut Down', style: 'destructive', onPress: () => {
                              const r = deleteTVChannel(n.id);
                              if (r.error) uiAlert('Cannot close', r.error); else uiAlert('Channel closed ✓', 'Salvage refund credited.');
                            }},
                          ]);
                        }
                      }} testID={`tv-delete-${n.id}`}>
                        <MaterialCommunityIcons name="delete" size={16} color={T.cardDark} />
                        <Text style={s.dealBtnTxt}>Close</Text>
                      </TouchableOpacity>
                    </View>

                    {/* V43 — Ad Programming Ratio (drives ad revenue, mild attrition at high ratios) */}
                    <View style={s.econCard}>
                      <Text style={s.econTitle}>📺 Ad Programming Ratio</Text>
                      <Text style={s.econSub}>
                        {((n.adProgrammingRatio ?? (n.kind === 'public' ? 0.35 : n.kind === 'cable' ? 0.15 : 0.05)) * 100).toFixed(0)}% of airtime is ads
                        {(n.adProgrammingRatio ?? 0) > 0.35 ? ' · ⚠ attrition risk' : ''}
                      </Text>
                      <View style={s.econRow}>
                        {[0, 0.10, 0.20, 0.35, 0.50, 0.60].map(r => {
                          const cur = n.adProgrammingRatio ?? (n.kind === 'public' ? 0.35 : n.kind === 'cable' ? 0.15 : 0.05);
                          const active = Math.abs(cur - r) < 0.01;
                          return (
                            <TouchableOpacity
                              key={r}
                              style={[s.econChip, active && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                              onPress={() => { const res = setChannelAdProgrammingRatio(n.id, r); if (res.error) uiAlert('Cannot set ratio', res.error); }}
                              testID={`tv-ratio-${n.id}-${Math.round(r * 100)}`}
                            >
                              <Text style={[s.econChipTxt, active && { color: T.cardDark }]}>{(r * 100).toFixed(0)}%</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* V43 — Marketing Budget */}
                    <View style={s.econCard}>
                      <Text style={s.econTitle}>📣 Marketing Budget</Text>
                      <Text style={s.econSub}>${(n.marketingBudgetM || 0).toFixed(1)}M / week → boosts subscriber growth</Text>
                      <View style={s.econRow}>
                        {[0, 0.5, 1, 2, 5, 10].map(b => {
                          const active = Math.abs((n.marketingBudgetM || 0) - b) < 0.01;
                          return (
                            <TouchableOpacity
                              key={b}
                              style={[s.econChip, active && { backgroundColor: T.green, borderColor: T.green }]}
                              onPress={() => { const res = setEntityMarketing('channel', n.id, b); if (res.error) uiAlert('Cannot set marketing', res.error); }}
                              testID={`tv-mkt-${n.id}-${b}`}
                            >
                              <Text style={[s.econChipTxt, active && { color: T.cardDark }]}>${b}M</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {tab === 'cable' && (() => {
        const providers = (state.cableProviders && state.cableProviders.length > 0) ? state.cableProviders : CABLE_PROVIDERS_SEED;
        const filteredProv = cableRegion === 'All' ? providers : providers.filter((p: any) => p.region === cableRegion);
        const cableDeals = state.cableCarriageDeals || [];
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
            <Text style={s.sectionHint}>Negotiate recurring carriage deals with cable providers. They pay you per subscriber per month for distributing your channels. Higher reputation providers pay more.</Text>

            {/* Active carriage deals */}
            {cableDeals.length > 0 ? (
              <>
                <Text style={[s.filterLbl, { marginTop: 8 }]}>YOUR CARRIAGE DEALS</Text>
                {cableDeals.map(d => {
                  const prov = providers.find((p: any) => p.id === d.providerId);
                  const ch = playerNets.find((n: any) => n.id === d.channelId);
                  const weeklyRevM = prov ? +((prov.subscribers * d.feePerSubPerMonthUSD) / 4).toFixed(2) : 0;
                  return (
                    <View key={d.id} style={s.netCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.netName}>{prov?.name || 'Unknown'} → {ch?.name || 'Unknown'}</Text>
                          <Text style={s.netSub}>${d.feePerSubPerMonthUSD.toFixed(2)}/sub/mo · {d.years}yr · exp W{d.expiresWeek} Y{d.expiresYear}</Text>
                          <Text style={[s.netSub, { color: d.status === 'active' ? T.green : T.yellow }]}>{d.status.toUpperCase()} · ~${weeklyRevM}M/wk · lifetime ${d.lifetimeRevenueB.toFixed(2)}B</Text>
                        </View>
                        {d.status === 'pending' ? (
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.green, paddingHorizontal: 10 }]} onPress={() => {
                              const r = acceptCableCarriageCounter(d.id, d.feePerSubPerMonthUSD);
                              if (r.error) uiAlert('Failed', r.error); else uiAlert('Accepted ✓', 'Carriage deal active. Recurring revenue starts next week.');
                            }} testID={`cd-accept-${d.id}`}>
                              <Text style={s.smallBtnTxt}>ACCEPT</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.red, paddingHorizontal: 10 }]} onPress={() => rejectCableCarriageDeal(d.id)} testID={`cd-reject-${d.id}`}>
                              <Text style={s.smallBtnTxt}>REJECT</Text>
                            </TouchableOpacity>
                          </View>
                        ) : d.status === 'active' ? (
                          <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.red, paddingHorizontal: 10 }]} onPress={() => {
                            const r = cancelCableCarriageDeal(d.id);
                            if (r.error) uiAlert('Cannot cancel', r.error); else uiAlert('Cancelled', 'Early termination penalty paid.');
                          }} testID={`cd-cancel-${d.id}`}>
                            <Text style={s.smallBtnTxt}>CANCEL</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </>
            ) : null}

            <Text style={[s.filterLbl, { marginTop: 12 }]}>Region</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
              {(['All', ...REGIONS] as const).map(r => (
                <TouchableOpacity key={r} style={[s.chip, cableRegion === r && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setCableRegion(r as any)}>
                  <Text style={[s.chipTxt, cableRegion === r && { color: T.cardDark }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[s.filterLbl, { marginTop: 12 }]}>CABLE PROVIDERS ({filteredProv.length})</Text>
            {playerNets.filter((n: any) => n.kind !== 'public').length === 0 ? (
              <Text style={s.empty}>You need a Cable or Premium channel to negotiate carriage deals. Launch one in the "Mine" tab.</Text>
            ) : null}
            {filteredProv.map((p: any) => {
              const tierColor = p.tier === 'premium' ? T.magenta : p.tier === 'standard' ? T.yellow : p.tier === 'public' ? T.cyan : T.green;
              return (
                <View key={p.id} style={s.netCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.kindBadge, { backgroundColor: tierColor }]}>
                      <Text style={s.kindBadgeTxt}>{p.tier.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={s.netName}>{p.name}</Text>
                      <Text style={s.netSub}>{p.region} · {p.subscribers}M subs · {p.reputation}/100 rep</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[s.dealBtn, { backgroundColor: tierColor }]} onPress={() => {
                    // V41 — Auto-pick eligible channel: match region AND public/commercial classification
                    const isPublicProv = p.tier === 'public';
                    const eligibleCh = playerNets.find((n: any) => n.region === p.region && (isPublicProv ? n.kind === 'public' : n.kind !== 'public'));
                    if (!eligibleCh) { uiAlert('No eligible channel', `${p.name} (${p.tier}) needs a ${isPublicProv ? 'public' : 'cable/premium'} channel in ${p.region}.`); return; }
                    setCarriageProviderId(p.id);
                    setCarriageChannelId(eligibleCh.id);
                    setCarriageYears('5');
                    const q = quoteCableCarriageDeal({ providerId: p.id, channelId: eligibleCh.id, years: 5 });
                    setCarriageFee(q.fairUSD.toFixed(2));
                  }} testID={`cp-deal-${p.id}`}>
                    <MaterialCommunityIcons name="cable-data" size={16} color={T.cardDark} />
                    <Text style={s.dealBtnTxt}>Negotiate Carriage</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        );
      })()}

      {/* V41 — MY CABLE: Player runs their own cable carriage business (Dish/Sky-style) */}
      {tab === 'mycable' && (() => {
        const mine = state.playerCableNetworks || [];
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 80 }}>
            <View style={{ backgroundColor: T.cardDark, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 12 }}>
              <Text style={{ color: T.cyan, fontWeight: '900', fontSize: 12 }}>📡 MY CABLE CARRIAGE NETWORK</Text>
              <Text style={{ color: T.textDim, fontSize: 11, marginTop: 4, lineHeight: 15 }}>Run your own Dish/Sky-style cable carrier. License rival or your own channels per-sub-per-month, package them into Basic/Standard/Premium tiers, bundle streaming services, enable PPV. Compete with the AI cable providers seeded in the Cable tab.</Text>
            </View>
            <TouchableOpacity style={[s.bigBtn, { backgroundColor: T.cyan }]} onPress={() => { setPcnNewName(''); setPcnNewRegion('North America'); setPcnCreateOpen(true); }} testID="pcn-create-open">
              <MaterialCommunityIcons name="satellite-uplink" size={18} color={T.cardDark} />
              <Text style={s.bigBtnTxt}>LAUNCH CABLE NETWORK ($0.5B)</Text>
            </TouchableOpacity>
            {mine.length === 0 ? (
              <Text style={s.empty}>You don't run a cable carriage business yet. Launch one above to start licensing channels and selling tiered packages.</Text>
            ) : mine.map((net: any) => {
              const totalSubs = net.tiers.reduce((s: number, t: any) => s + t.subscribers, 0);
              const weeklyRevM = net.tiers.reduce((s: number, t: any) => s + (t.subscribers * t.monthlyFeeUSD) / 4, 0);
              const weeklyCostM = net.carriedChannelLicenses.reduce((s: number, l: any) => s + (totalSubs * l.feePerSubPerMonthUSD) / 4, 0);
              return (
                <View key={net.id} style={s.netCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[s.kindBadge, { backgroundColor: T.cyan }]}>
                      <Text style={s.kindBadgeTxt}>CABLE</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={s.netName}>{net.name}</Text>
                      <Text style={s.netSub}>{net.region} · {totalSubs.toFixed(2)}M subs · {net.tiers.length} tiers · {net.carriedChannelLicenses.length} channels carried</Text>
                      <Text style={[s.netSub, { color: T.green }]}>~${weeklyRevM.toFixed(2)}M/wk gross · ${weeklyCostM.toFixed(2)}M/wk carriage cost · ${(weeklyRevM - weeklyCostM).toFixed(2)}M net</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.yellow, flex: 1 }]} onPress={() => setPcnManageId(net.id)} testID={`pcn-manage-${net.id}`}>
                      <MaterialCommunityIcons name="cog" size={16} color={T.cardDark} />
                      <Text style={s.dealBtnTxt}>Manage</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.red, flex: 1 }]} onPress={() => {
                      if (typeof window !== 'undefined' && (window as any).confirm) {
                        if (!(window as any).confirm(`Close ${net.name}? You'll get a 5% salvage refund.`)) return;
                      }
                      const r = deletePlayerCableNetwork(net.id);
                      if (r.error) uiAlert('Failed', r.error); else uiAlert('Closed ✓', 'Cable network shut down.');
                    }} testID={`pcn-del-${net.id}`}>
                      <MaterialCommunityIcons name="delete" size={16} color={T.cardDark} />
                      <Text style={s.dealBtnTxt}>Close</Text>
                    </TouchableOpacity>
                  </View>
                  {/* V43 — Marketing budget for cable network */}
                  <View style={s.econCard}>
                    <Text style={s.econTitle}>📣 Marketing Budget</Text>
                    <Text style={s.econSub}>${(net.marketingBudgetM || 0).toFixed(1)}M / week → boosts subscriber growth</Text>
                    <View style={s.econRow}>
                      {[0, 0.5, 1, 2, 5, 10].map(b => {
                        const active = Math.abs((net.marketingBudgetM || 0) - b) < 0.01;
                        return (
                          <TouchableOpacity
                            key={b}
                            style={[s.econChip, active && { backgroundColor: T.green, borderColor: T.green }]}
                            onPress={() => { const res = setEntityMarketing('cable', net.id, b); if (res.error) uiAlert('Cannot set marketing', res.error); }}
                            testID={`pcn-mkt-${net.id}-${b}`}
                          >
                            <Text style={[s.econChipTxt, active && { color: T.cardDark }]}>${b}M</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        );
      })()}

      {/* V41 — Create Player Cable Network modal */}
      <Modal visible={pcnCreateOpen} transparent animationType="fade" onRequestClose={() => setPcnCreateOpen(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Launch Cable Network</Text>
            <Text style={s.lbl}>NAME</Text>
            <TextInput value={pcnNewName} onChangeText={setPcnNewName} placeholder="e.g. LunaCable Plus" placeholderTextColor={T.textMute} maxLength={32} style={s.inp} testID="pcn-name-input" autoFocus />
            <Text style={s.lbl}>REGION</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r} style={[s.chip, pcnNewRegion === r && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setPcnNewRegion(r)} testID={`pcn-region-${r}`}>
                  <Text style={[s.chipTxt, pcnNewRegion === r && { color: T.cardDark }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.cardDark, flex: 1, paddingVertical: 12 }]} onPress={() => setPcnCreateOpen(false)}>
                <Text style={[s.smallBtnTxt, { color: T.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.green, flex: 1, paddingVertical: 12 }]} onPress={() => {
                const r = createPlayerCableNetwork({ name: pcnNewName, region: pcnNewRegion });
                if (r.error) uiAlert('Failed', r.error); else { uiAlert('Launched ✓', `${pcnNewName} is live with 0.5M founding subs.`); setPcnCreateOpen(false); }
              }} testID="pcn-create-confirm">
                <Text style={s.smallBtnTxt}>LAUNCH</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* V41 — Manage Player Cable Network: full-screen with channels + tiers */}
      <Modal visible={!!pcnManageId} animationType="slide" onRequestClose={() => setPcnManageId(null)}>
        {pcnManageId ? (() => {
          const net = (state.playerCableNetworks || []).find((n: any) => n.id === pcnManageId);
          if (!net) return null;
          const eligibleChannels = (state.tvNetworks || []).filter((c: any) => c.region === net.region && !net.carriedChannelLicenses.some((l: any) => l.channelId === c.id));
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              <View style={s.fsHeader}>
                <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setPcnManageId(null)} testID="pcn-manage-close"><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>Manage {net.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <Text style={s.netSub}>{net.region} · {net.subscribers.toFixed(2)}M total subs · {net.carriedChannelLicenses.length} channels · {net.tiers.length} tiers</Text>

                <Text style={s.lbl}>NETWORK NAME</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput defaultValue={net.name} onChangeText={(v) => setPcnTierNameEdit(v)} maxLength={32} style={[s.inp, { flex: 1 }]} testID="pcn-rename-input" />
                  <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.magenta, paddingHorizontal: 14 }]} onPress={() => {
                    if (!pcnTierNameEdit.trim()) return;
                    const r = renamePlayerCableNetwork(net.id, pcnTierNameEdit);
                    if (r.error) uiAlert('Failed', r.error); else uiAlert('Renamed ✓', '');
                  }} testID="pcn-rename-save"><Text style={s.dealBtnTxt}>Save</Text></TouchableOpacity>
                </View>

                {/* V42d — Collapsible carried channels list (takes too much space with many channels) */}
                <TouchableOpacity style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: T.cardDark, padding: 12, borderRadius: 8, borderWidth: 1.5, borderColor: T.border }} onPress={() => {
                  const next = new Set(carriedCollapsed);
                  if (next.has(net.id)) next.delete(net.id); else next.add(net.id);
                  setCarriedCollapsed(next);
                }} testID={`pcn-carried-toggle-${net.id}`}>
                  <Text style={[s.lbl, { marginTop: 0 }]}>CARRIED CHANNELS ({net.carriedChannelLicenses.length}) — {net.region}</Text>
                  <MaterialCommunityIcons name={carriedCollapsed.has(net.id) ? 'chevron-down' : 'chevron-up'} size={22} color={T.text} />
                </TouchableOpacity>
                {!carriedCollapsed.has(net.id) ? (
                  net.carriedChannelLicenses.length === 0 ? (
                    <Text style={s.empty}>No channels yet. License some below.</Text>
                  ) : net.carriedChannelLicenses.map((lic: any) => {
                  const ch = (state.tvNetworks || []).find((c: any) => c.id === lic.channelId);
                  if (!ch) return null;
                  return (
                    <View key={lic.channelId} style={s.netCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[s.kindBadge, { backgroundColor: KIND_COLOR[ch.kind as TVChannelKind] }]}>
                          <Text style={s.kindBadgeTxt}>{KIND_LABEL[ch.kind as TVChannelKind]}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={s.netName}>{ch.name}</Text>
                          <Text style={s.netSub}>${lic.feePerSubPerMonthUSD.toFixed(2)}/sub/mo · {ch.subscribers}M reach · {ch.ownerStudioId === state.player.id ? 'YOUR CHANNEL' : 'rival'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeChannelFromPlayerCable(net.id, lic.channelId)} testID={`pcn-rm-${lic.channelId}`} style={{ padding: 12 }}>
                          <MaterialCommunityIcons name="delete" size={22} color={T.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                  })
                ) : (
                  <Text style={[s.netHint, { paddingHorizontal: 12, marginTop: 6 }]}>Tap header above to show the full list.</Text>
                )}
                {eligibleChannels.length > 0 ? (
                  <TouchableOpacity style={[s.bigBtn, { backgroundColor: T.cyan, marginTop: 8 }]} onPress={() => { setPcnAddChannelId(eligibleChannels[0].id); setPcnAddChannelFee('0.50'); setPcnAddChannelOpen(true); }} testID="pcn-add-channel-open">
                    <MaterialCommunityIcons name="plus" size={18} color={T.cardDark} />
                    <Text style={s.bigBtnTxt}>LICENSE A CHANNEL ({eligibleChannels.length} available)</Text>
                  </TouchableOpacity>
                ) : <Text style={s.netHint}>All {net.region} channels already carried.</Text>}

                <Text style={[s.lbl, { marginTop: 16 }]}>SUBSCRIPTION TIERS ({net.tiers.length})</Text>
                {net.tiers.map((tier: any) => (
                  <View key={tier.id} style={[s.netCard, { padding: 16, marginBottom: 14, borderWidth: 2 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        {/* V42b — Editable tier name (was readonly) */}
                        <TextInput
                          defaultValue={tier.name}
                          onEndEditing={(e) => {
                            const v = (e.nativeEvent.text || '').trim();
                            if (v && v !== tier.name) setPlayerCableTier(net.id, tier.id, { name: v });
                          }}
                          maxLength={32}
                          style={{ color: T.text, fontSize: 17, fontWeight: '900', backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 2, borderColor: T.border }}
                          testID={`pcn-tier-name-${tier.id}`}
                        />
                        <Text style={[s.netSub, { marginTop: 6, fontSize: 12 }]}>${tier.monthlyFeeUSD.toFixed(2)}/mo · {tier.subscribers.toFixed(2)}M subs · {tier.channelIds.length} channels {tier.ppvEnabled ? '· PPV' : ''}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deletePlayerCableTier(net.id, tier.id)} testID={`pcn-tier-del-${tier.id}`} style={{ padding: 12, marginLeft: 8 }}>
                        <MaterialCommunityIcons name="delete" size={24} color={T.red} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }}>
                      <Text style={{ color: T.textDim, fontSize: 13, fontWeight: '900' }}>PRICE $</Text>
                      <TextInput defaultValue={String(tier.monthlyFeeUSD)} onEndEditing={(e) => {
                        const v = parseFloat((e.nativeEvent.text || '').replace(/[^0-9.]/g, '')) || 0;
                        setPlayerCableTier(net.id, tier.id, { monthlyFeeUSD: v });
                      }} keyboardType="decimal-pad" maxLength={6} style={[s.inp, { flex: 1, paddingVertical: 12, paddingHorizontal: 12, fontSize: 15, marginTop: 0 }]} testID={`pcn-tier-price-${tier.id}`} />
                      <TouchableOpacity onPress={() => setPlayerCableTier(net.id, tier.id, { ppvEnabled: !tier.ppvEnabled })} style={[s.dealBtn, { backgroundColor: tier.ppvEnabled ? T.green : T.textMute, paddingHorizontal: 16, paddingVertical: 12 }]} testID={`pcn-tier-ppv-${tier.id}`}>
                        <MaterialCommunityIcons name={tier.ppvEnabled ? 'check' : 'close'} size={18} color={T.cardDark} />
                        <Text style={[s.dealBtnTxt, { fontSize: 13, marginLeft: 4 }]}>PPV</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[s.netHint, { marginTop: 10, fontSize: 12, fontWeight: '900' }]}>📺 CHANNELS IN THIS TIER — tap pack to toggle all, tap "view" to expand:</Text>
                    {(() => {
                      // V42c — Auto-cluster carried channels into "sister packs" by shared name prefix.
                      const carried = net.carriedChannelLicenses
                        .map((lic: any) => (state.tvNetworks || []).find((c: any) => c.id === lic.channelId))
                        .filter(Boolean);
                      const groups: Record<string, any[]> = {};
                      for (const ch of carried) {
                        const key = ch.name.split(' ')[0];
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(ch);
                      }
                      const groupKeys = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b));
                      return (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {groupKeys.map(key => {
                            const list = groups[key];
                            if (list.length < 3) {
                              return list.map((ch: any) => {
                                const sel = tier.channelIds.includes(ch.id);
                                const kindColor = KIND_COLOR[ch.kind as TVChannelKind];
                                return (
                                  <TouchableOpacity key={ch.id} style={[s.tcChip, sel && { backgroundColor: T.green, borderColor: T.green }, !sel && { borderLeftWidth: 5, borderLeftColor: kindColor }]} onPress={() => {
                                    const next = sel ? tier.channelIds.filter((x: string) => x !== ch.id) : [...tier.channelIds, ch.id];
                                    setPlayerCableTier(net.id, tier.id, { channelIds: next });
                                  }} testID={`pcn-tier-ch-${tier.id}-${ch.id}`}>
                                    <Text style={[s.tcChipTxt, sel && { color: T.cardDark }]}>{ch.name} · {ch.kind[0].toUpperCase()}</Text>
                                  </TouchableOpacity>
                                );
                              });
                            }
                            const groupId = `${tier.id}_${key}`;
                            const isExpanded = expandedAutoPacks.has(groupId);
                            const allIds = list.map(c => c.id);
                            const inTier = allIds.filter(id => tier.channelIds.includes(id));
                            const partial = inTier.length > 0 && inTier.length < list.length;
                            const allIn = inTier.length === list.length;
                            const allOut = inTier.length === 0;
                            const packBg = allIn ? T.green : partial ? T.yellow : T.cardDark;
                            const packTxt = allIn || partial ? T.cardDark : T.text;
                            return (
                              <View key={groupId} style={{ width: '100%' }}>
                                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                                  <TouchableOpacity style={[s.tcChip, { backgroundColor: packBg, borderColor: packBg, paddingHorizontal: 14, flex: 1 }]} onPress={() => {
                                    const next = allOut || partial ? [...new Set([...tier.channelIds, ...allIds])] : tier.channelIds.filter((x: string) => !allIds.includes(x));
                                    setPlayerCableTier(net.id, tier.id, { channelIds: next });
                                  }} testID={`pcn-tier-pack-${groupId}`}>
                                    <MaterialCommunityIcons name={allIn ? 'check-all' : partial ? 'check' : 'close'} size={18} color={packTxt} />
                                    <Text style={[s.tcChipTxt, { color: packTxt, marginLeft: 8, fontWeight: '900' }]}>📦 {key} Pack ({inTier.length}/{list.length})</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity style={[s.tcChip, { backgroundColor: T.cyan, borderColor: T.cyan, paddingHorizontal: 14 }]} onPress={() => {
                                    const next = new Set(expandedAutoPacks);
                                    if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
                                    setExpandedAutoPacks(next);
                                  }} testID={`pcn-tier-pack-expand-${groupId}`}>
                                    <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={T.cardDark} />
                                    <Text style={[s.tcChipTxt, { color: T.cardDark, marginLeft: 4, fontWeight: '900' }]}>{isExpanded ? 'hide' : 'view'}</Text>
                                  </TouchableOpacity>
                                </View>
                                {isExpanded ? (
                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6, marginLeft: 12, paddingLeft: 8, borderLeftWidth: 3, borderLeftColor: T.border }}>
                                    {list.map((ch: any) => {
                                      const sel = tier.channelIds.includes(ch.id);
                                      const kindColor = KIND_COLOR[ch.kind as TVChannelKind];
                                      return (
                                        <TouchableOpacity key={ch.id} style={[s.tcChip, sel && { backgroundColor: T.green, borderColor: T.green }, !sel && { borderLeftWidth: 4, borderLeftColor: kindColor }]} onPress={() => {
                                          const next = sel ? tier.channelIds.filter((x: string) => x !== ch.id) : [...tier.channelIds, ch.id];
                                          setPlayerCableTier(net.id, tier.id, { channelIds: next });
                                        }} testID={`pcn-tier-ch-${tier.id}-${ch.id}`}>
                                          <Text style={[s.tcChipTxt, sel && { color: T.cardDark }]}>{ch.name.replace(key + ' ', '')} · {ch.kind[0].toUpperCase()}</Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                ) : null}
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}
                    {/* V42b — Channel packs as tier add-ons (premium tier benefit) */}
                    {(state.channelPacks || []).filter((p: any) => p.ownerStudioId === state.player.id).length > 0 ? (
                      <>
                        <Text style={[s.netHint, { marginTop: 14, fontSize: 12, fontWeight: '900' }]}>🎁 MY CHANNEL PACKS (bundle as benefit):</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                          {(state.channelPacks || []).filter((p: any) => p.ownerStudioId === state.player.id).map((pack: any) => {
                            const sel = (tier.includedChannelPackIds || []).includes(pack.id);
                            return (
                              <TouchableOpacity key={pack.id} style={[s.tcChip, sel && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => {
                                const cur: string[] = tier.includedChannelPackIds || [];
                                const next = sel ? cur.filter((x: string) => x !== pack.id) : [...cur, pack.id];
                                setPlayerCableTier(net.id, tier.id, { includedChannelPackIds: next });
                              }} testID={`pcn-tier-pack-${tier.id}-${pack.id}`}>
                                <Text style={[s.tcChipTxt, sel && { color: T.cardDark }]}>📦 {pack.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    ) : null}
                    {/* V42c — Streaming bundle: per-service tier picker (basic/standard/premium of each service) */}
                    {(state.streamingServices || []).filter((sv: any) => sv.studioId === state.player.id).length > 0 ? (
                      <>
                        <Text style={[s.netHint, { marginTop: 14, fontSize: 12, fontWeight: '900' }]}>📡 BUNDLE STREAMING (pick a tier per service):</Text>
                        {(state.streamingServices || []).filter((sv: any) => sv.studioId === state.player.id).map((sv: any) => {
                          const currentSelections: { serviceId: string; tierId: string }[] = tier.includedStreamingTiers || [];
                          const legacyServices: string[] = tier.includedStreamingServiceIds || [];
                          const currentTierForSvc = currentSelections.find(x => x.serviceId === sv.id)?.tierId
                            || (legacyServices.includes(sv.id) && sv.tiers && sv.tiers[0] ? sv.tiers[0].id : undefined);
                          return (
                            <View key={sv.id} style={{ marginTop: 8 }}>
                              <Text style={{ color: T.text, fontSize: 12, fontWeight: '900', marginBottom: 4 }}>{sv.name}</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                <TouchableOpacity style={[s.tcChip, !currentTierForSvc && { backgroundColor: T.cardDark, borderColor: T.border }]} onPress={() => {
                                  const next = currentSelections.filter(x => x.serviceId !== sv.id);
                                  const nextLegacy = legacyServices.filter(x => x !== sv.id);
                                  setPlayerCableTier(net.id, tier.id, { includedStreamingTiers: next, includedStreamingServiceIds: nextLegacy });
                                }} testID={`pcn-tier-sv-${tier.id}-${sv.id}-none`}>
                                  <Text style={s.tcChipTxt}>none</Text>
                                </TouchableOpacity>
                                {(sv.tiers || []).map((svTier: any) => {
                                  const sel = currentTierForSvc === svTier.id;
                                  return (
                                    <TouchableOpacity key={svTier.id} style={[s.tcChip, sel && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => {
                                      const filtered = currentSelections.filter(x => x.serviceId !== sv.id);
                                      const next = [...filtered, { serviceId: sv.id, tierId: svTier.id }];
                                      const nextLegacy = [...new Set([...legacyServices, sv.id])];
                                      setPlayerCableTier(net.id, tier.id, { includedStreamingTiers: next, includedStreamingServiceIds: nextLegacy });
                                    }} testID={`pcn-tier-sv-${tier.id}-${sv.id}-${svTier.id}`}>
                                      <Text style={[s.tcChipTxt, sel && { color: T.cardDark }]}>{svTier.name} · ${svTier.price}/mo</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          );
                        })}
                      </>
                    ) : null}
                  </View>
                ))}
                <TouchableOpacity style={[s.bigBtn, { backgroundColor: T.yellow, marginTop: 8 }]} onPress={() => {
                  const r = addPlayerCableTier(net.id, `Tier ${net.tiers.length + 1}`, 24.99);
                  if (r.error) uiAlert('Failed', r.error);
                }} testID="pcn-tier-add">
                  <MaterialCommunityIcons name="plus" size={18} color={T.cardDark} />
                  <Text style={s.bigBtnTxt}>ADD TIER</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })() : null}
      </Modal>

      {/* V42b — Add channels to player cable network modal (bulk multi-select + search) */}
      <Modal visible={pcnAddChannelOpen} transparent animationType="fade" onRequestClose={() => setPcnAddChannelOpen(false)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxHeight: '90%', maxWidth: 520 }]}>
            <Text style={s.modalTitle}>License Channels for Cable (Bulk)</Text>
            {pcnManageId ? (() => {
              const net = (state.playerCableNetworks || []).find((n: any) => n.id === pcnManageId);
              if (!net) return null;
              const eligibleChannels = (state.tvNetworks || []).filter((c: any) => c.region === net.region && !net.carriedChannelLicenses.some((l: any) => l.channelId === c.id) && !c.closed);
              const kindRank: Record<string, number> = { public: 0, cable: 1, premium: 2 };
              let sorted = eligibleChannels.slice();
              if (pcnSortBy === 'reputation') sorted.sort((a: any, b: any) => (kindRank[a.kind] - kindRank[b.kind]) || (b.reputation - a.reputation));
              else if (pcnSortBy === 'subscribers') sorted.sort((a: any, b: any) => (kindRank[a.kind] - kindRank[b.kind]) || (b.subscribers - a.subscribers));
              else sorted.sort((a: any, b: any) => (kindRank[a.kind] - kindRank[b.kind]) || a.name.localeCompare(b.name));
              const kindFiltered = kindFilter === 'All' ? sorted : sorted.filter((c: any) => c.kind === kindFilter);
              const q = pcnSearch.trim().toLowerCase();
              const searched = q ? kindFiltered.filter((c: any) => c.name.toLowerCase().includes(q)) : kindFiltered;
              // Cap displayed to first 60 to keep UI responsive; user can search for more
              const displayed = searched.slice(0, 60);
              const fee = parseFloat(pcnAddChannelFee) || 0;
              const selCount = pcnBulkSelected.size;
              return (
                <ScrollView style={{ maxHeight: 480 }} keyboardShouldPersistTaps="handled">
                  <Text style={s.netHint}>{net.region} · {eligibleChannels.length} eligible · {selCount} selected. Set fee then bulk-license. Premium for premium tiers, public for basic.</Text>
                  <TextInput
                    value={pcnSearch}
                    onChangeText={setPcnSearch}
                    placeholder="Search channels by name..."
                    placeholderTextColor={T.textMute}
                    style={[s.inp, { marginTop: 8 }]}
                    testID="pcn-search"
                  />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {(['All', 'public', 'cable', 'premium'] as const).map(k => (
                      <TouchableOpacity key={k} style={[s.chip, kindFilter === k && { backgroundColor: T.magenta, borderColor: T.magenta }]} onPress={() => setKindFilter(k as any)} testID={`pcn-kind-${k}`}>
                        <Text style={[s.chipTxt, kindFilter === k && { color: T.cardDark }]}>{k === 'All' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}</Text>
                      </TouchableOpacity>
                    ))}
                    {(['reputation', 'subscribers', 'name'] as const).map(sb => (
                      <TouchableOpacity key={sb} style={[s.chip, pcnSortBy === sb && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setPcnSortBy(sb)}>
                        <Text style={[s.chipTxt, pcnSortBy === sb && { color: T.cardDark }]}>↓ {sb}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity style={[s.chip, { backgroundColor: T.green, borderColor: T.green }]} onPress={() => {
                      const next = new Set(pcnBulkSelected);
                      displayed.forEach((c: any) => next.add(c.id));
                      setPcnBulkSelected(next);
                    }} testID="pcn-select-all">
                      <Text style={[s.chipTxt, { color: T.cardDark, fontWeight: '900' }]}>Select All Visible</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.chip, { backgroundColor: T.red, borderColor: T.red }]} onPress={() => setPcnBulkSelected(new Set())} testID="pcn-clear-sel">
                      <Text style={[s.chipTxt, { color: '#fff', fontWeight: '900' }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {displayed.map((ch: any) => {
                      const sel = pcnBulkSelected.has(ch.id);
                      const kindColor = KIND_COLOR[ch.kind as TVChannelKind];
                      return (
                        <TouchableOpacity key={ch.id} style={[s.chip, sel && { backgroundColor: T.cyan, borderColor: T.cyan }, !sel && { borderLeftWidth: 4, borderLeftColor: kindColor }]} onPress={() => {
                          const next = new Set(pcnBulkSelected);
                          if (next.has(ch.id)) next.delete(ch.id); else next.add(ch.id);
                          setPcnBulkSelected(next);
                        }} testID={`pcn-addch-${ch.id}`}>
                          <Text style={[s.chipTxt, sel && { color: T.cardDark }]}>{sel ? '✓ ' : ''}{ch.name} · {ch.subscribers}M</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {searched.length > 60 ? (
                    <Text style={{ color: T.textMute, fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>Showing 60 of {searched.length}. Refine search to see more.</Text>
                  ) : null}
                  <Text style={[s.lbl, { marginTop: 12 }]}>FEE — $ PER SUB PER MONTH (applied to all selected)</Text>
                  <TextInput value={pcnAddChannelFee} onChangeText={v => setPcnAddChannelFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={5} style={s.inp} testID="pcn-addch-fee" />
                  {selCount > 0 ? (
                    <Text style={{ color: T.yellow, fontSize: 12, marginTop: 6 }}>Total: ${(fee * selCount).toFixed(2)}/sub/mo × {selCount} channels</Text>
                  ) : null}
                </ScrollView>
              );
            })() : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.cardDark, flex: 1, paddingVertical: 12 }]} onPress={() => { setPcnAddChannelOpen(false); setPcnBulkSelected(new Set()); setPcnSearch(''); }}>
                <Text style={[s.smallBtnTxt, { color: T.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.green, flex: 2, paddingVertical: 12 }]} onPress={() => {
                if (!pcnManageId || pcnBulkSelected.size === 0) { uiAlert('Pick channels', 'Select one or more channels to license.'); return; }
                const fee = parseFloat(pcnAddChannelFee) || 0;
                let okCount = 0; let failCount = 0;
                pcnBulkSelected.forEach((cid: string) => {
                  const r = addChannelToPlayerCable(pcnManageId, cid, fee);
                  if (r.error) failCount++; else okCount++;
                });
                uiAlert(`Licensed ${okCount} ✓`, failCount > 0 ? `${failCount} failed.` : `All carrying at $${fee.toFixed(2)}/sub/mo.`);
                setPcnAddChannelOpen(false);
                setPcnBulkSelected(new Set());
                setPcnSearch('');
              }} testID="pcn-addch-confirm">
                <Text style={s.smallBtnTxt}>LICENSE SELECTED ({pcnBulkSelected.size})</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      <Modal visible={!!dealNetId} animationType="slide" onRequestClose={() => setDealNetId(null)}>
        {dealNetId ? (() => {
          const net = networks.find((n: any) => n.id === dealNetId);
          if (!net) return null;
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              <View style={s.fsHeader}>
                <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setDealNetId(null)} testID="tv-deal-close"><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>License to {net.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <Text style={s.netSub}>{net.region} · {KIND_LABEL[net.kind as TVChannelKind]} · {net.subscribers}M subs · {net.reputation}/100 rep</Text>

                <Text style={s.lbl}>YEARS (1–10)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {[1, 3, 5, 7, 10].map(y => (
                    <TouchableOpacity key={y} style={[s.chip, parseInt(years, 10) === y && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => { setYears(String(y)); recomputeAsk(pickedMovieIds, y, exclusivity); }} testID={`tv-years-${y}`}>
                      <Text style={[s.chipTxt, parseInt(years, 10) === y && { color: T.cardDark }]}>{y}yr</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.lbl}>SELECT MOVIES ({pickedMovieIds.length} picked)</Text>
                {myReleased.length === 0 ? (
                  <Text style={s.empty}>You have no released movies to license.</Text>
                ) : myReleased.map(m => {
                  const selected = pickedMovieIds.includes(m.id);
                  return (
                    <TouchableOpacity key={m.id} style={[s.movieRow, selected && { borderColor: T.cyan, backgroundColor: 'rgba(60,207,231,0.12)' }]}
                      onPress={() => {
                        const nv = selected ? pickedMovieIds.filter(x => x !== m.id) : [...pickedMovieIds, m.id];
                        setPickedMovieIds(nv);
                        recomputeAsk(nv, parseInt(years, 10) || 3, exclusivity);
                      }} testID={`tv-pick-${m.id}`}>
                      <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={selected ? T.cyan : T.textMute} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={s.movieTxt} numberOfLines={1}>{m.title}</Text>
                        <Text style={s.movieSub}>Y{m.releaseYear} · {m.criticScore}/100 · ${m.boxOffice.toFixed(2)}B BO</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity style={[s.exclRow, exclusivity && { backgroundColor: 'rgba(217,82,201,0.18)', borderColor: T.magenta }]}
                  onPress={() => { const v = !exclusivity; setExclusivity(v); recomputeAsk(pickedMovieIds, parseInt(years, 10) || 3, v); }} testID="tv-exclusive">
                  <MaterialCommunityIcons name={exclusivity ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={exclusivity ? T.magenta : T.textMute} />
                  <Text style={{ color: T.text, marginLeft: 8, fontWeight: '700', fontSize: 12 }}>Exclusive (+50% fee, network locks out competitors)</Text>
                </TouchableOpacity>

                <Text style={s.lbl}>YOUR ASKING PRICE ($B)</Text>
                <TextInput value={askingFee} onChangeText={(v) => setAskingFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={7} style={s.inp} testID="tv-fee-input" />
                {pickedMovieIds.length > 0 && parseInt(years, 10) > 0 ? (() => {
                  const q = quoteTVNetworkDeal({ networkId: dealNetId, movieIds: pickedMovieIds, years: parseInt(years, 10), exclusivity });
                  return (
                    <View style={s.quoteBox}>
                      <Text style={s.quoteLbl}>FAIR VALUE</Text>
                      <Text style={s.quoteVal}>${q.feeB.toFixed(2)}B</Text>
                      <Text style={s.quoteSub}>Asking within ±20% will likely be accepted on the spot.</Text>
                    </View>
                  );
                })() : null}

                <TouchableOpacity style={s.submit} onPress={submitDeal} testID="tv-deal-submit">
                  <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                  <Text style={s.submitTxt}>OPEN NEGOTIATION</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })() : null}
      </Modal>

      {/* Create channel modal */}
      <Modal visible={createOpen} animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
          <View style={s.fsHeader}>
            <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setCreateOpen(false)} testID="tv-create-close"><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
            <Text style={s.fsHeaderTitle}>Launch Channel</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.lbl}>CHANNEL NAME</Text>
            <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Apex Stories" placeholderTextColor={T.textMute} maxLength={32} style={s.inp} testID="tv-new-name" />

            <Text style={s.lbl}>REGION</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r} style={[s.chip, newRegion === r && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => setNewRegion(r)} testID={`tv-new-region-${r}`}>
                  <Text style={[s.chipTxt, newRegion === r && { color: T.cardDark }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.lbl}>CHANNEL TYPE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {(['public', 'cable', 'premium'] as TVChannelKind[]).map(k => (
                <TouchableOpacity key={k} style={[s.chip, newKind === k && { backgroundColor: KIND_COLOR[k], borderColor: KIND_COLOR[k] }]} onPress={() => setNewKind(k)} testID={`tv-new-kind-${k}`}>
                  <Text style={[s.chipTxt, newKind === k && { color: T.cardDark }]}>{KIND_LABEL[k]} · ${k === 'premium' ? '0.30' : k === 'cable' ? '0.18' : '0.10'}B</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.quoteBox}>
              <Text style={s.quoteLbl}>SETUP COST</Text>
              <Text style={s.quoteVal}>${newKind === 'premium' ? '0.30' : newKind === 'cable' ? '0.18' : '0.10'}B</Text>
              <Text style={s.quoteSub}>You'll have ${state.player.cash.toFixed(2)}B cash. {newKind === 'premium' ? 'Premium channels start small but pay best per-sub.' : newKind === 'cable' ? 'Cable balances reach and revenue.' : 'Public channels reach the widest audience.'}</Text>
            </View>

            <TouchableOpacity style={s.submit} onPress={submitCreate} testID="tv-create-submit">
              <MaterialCommunityIcons name="broadcast" size={20} color={T.cardDark} />
              <Text style={s.submitTxt}>LAUNCH CHANNEL</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {/* V35 — Manage owned channel (fee, programming, cable distribution) */}
      <Modal visible={!!manageChannelId} animationType="slide" onRequestClose={() => setManageChannelId(null)}>
        {manageChannelId ? (() => {
          const ch = playerNets.find((n: any) => n.id === manageChannelId);
          if (!ch) return null;
          const cableCount = ch.cableDistributionDeals || 0;
          const nextCableCost = 0.05 * (cableCount + 1);
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              <View style={s.fsHeader}>
                <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setManageChannelId(null)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>Manage {ch.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <Text style={s.netSub}>{ch.region} · {KIND_LABEL[ch.kind as TVChannelKind]} · {ch.subscribers}M subs · {ch.reputation}/100 rep</Text>

                {ch.kind !== 'public' ? (
                  <>
                    <Text style={s.lbl}>MONTHLY SUBSCRIPTION FEE (USD)</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput value={feeInput} onChangeText={(v) => setFeeInput(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={5} style={[s.inp, { flex: 1 }]} testID="ch-fee-input" />
                      <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.green, paddingHorizontal: 14 }]} onPress={() => {
                        const f = parseFloat(feeInput) || 0;
                        const r = setChannelMonthlyFee(manageChannelId, f);
                        if (r.error) uiAlert('Failed', r.error); else uiAlert('Saved ✓', `Monthly fee set to $${f.toFixed(2)}.`);
                      }} testID="ch-fee-save">
                        <Text style={s.dealBtnTxt}>Save Fee</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.netHint}>Higher fees boost revenue per sub but slow subscriber growth.</Text>
                  </>
                ) : <Text style={[s.netHint, { marginTop: 12 }]}>Public channels are ad-supported (no subscription fee). Revenue comes from sub growth tied to programming.</Text>}

                <Text style={s.lbl}>PROGRAMMING — Broadcast Movies ({progPicks.length} on-air)</Text>
                <Text style={s.netHint}>Adding 5+ titles unlocks +1%/wk subscriber growth. Empty channels lose subs. V41: includes your movies AND any licensed-in content from your network — re-arrange freely.</Text>
                {(() => {
                  // V41 — Build pool: player's released movies + ALL movies covered by player's active channel content licenses (network-wide pool)
                  const ownMovies = state.movies.filter(m => m.studioId === state.player.id && m.status === 'released');
                  const licMovieIds = new Set<string>();
                  (state.channelContentLicenses || []).forEach(l => {
                    if (l.status !== 'active') return;
                    const licCh = (state.tvNetworks || []).find(n => n.id === l.channelId);
                    if (!licCh || licCh.ownerStudioId !== state.player.id) return;
                    l.movieIds.forEach(mid => licMovieIds.add(mid));
                  });
                  const licMovies = state.movies.filter(m => licMovieIds.has(m.id) && m.status === 'released' && m.studioId !== state.player.id);
                  const allPool = [...ownMovies, ...licMovies];
                  if (allPool.length === 0) {
                    return <Text style={s.empty}>No released movies yet. Make movies or license content from rival studios.</Text>;
                  }
                  return allPool.map(m => {
                    const selected = progPicks.includes(m.id);
                    const isLic = m.studioId !== state.player.id;
                    return (
                      <TouchableOpacity key={m.id} style={[s.movieRow, selected && { borderColor: T.green, backgroundColor: 'rgba(166,226,46,0.18)' }]}
                        onPress={() => setProgPicks(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} testID={`prog-pick-${m.id}`}>
                        <MaterialCommunityIcons name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={selected ? T.green : T.textMute} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={s.movieTxt} numberOfLines={1}>{m.title}{isLic ? ' · LICENSED' : ''}</Text>
                          <Text style={s.movieSub}>Rated {m.rating} · {m.type} · Y{m.releaseYear} · {m.criticScore}/100 · ${m.boxOffice.toFixed(2)}B BO</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  });
                })()}
                <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.cyan, marginTop: 12 }]} onPress={() => {
                  const r = setChannelProgramming(manageChannelId, progPicks);
                  if (r.error) uiAlert('Failed', r.error); else uiAlert('Programming saved ✓', `${progPicks.length} title${progPicks.length !== 1 ? 's' : ''} now on-air.`);
                }} testID="prog-save">
                  <MaterialCommunityIcons name="content-save" size={16} color={T.cardDark} />
                  <Text style={s.dealBtnTxt}>Save Programming</Text>
                </TouchableOpacity>

                {ch.kind !== 'public' ? (
                  <>
                    {/* V41 — Deprecated cable distribution +15% removed; cable carriage tab now handles this properly */}
                  </>
                ) : null}
              </ScrollView>
            </SafeAreaView>
          );
        })() : null}
      </Modal>
      {/* V35 — Create Channel Pack */}
      <Modal visible={packOpen} animationType="slide" onRequestClose={() => setPackOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
          <View style={s.fsHeader}>
            <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setPackOpen(false)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
            <Text style={s.fsHeaderTitle}>Create Channel Pack</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16 }}>
            <Text style={s.netHint}>Bundle 2+ owned channels under one subscription. Synergy: pack subscriber base = avg(channel subs) × 0.30 × (1 + 0.10 × N channels).</Text>
            <Text style={s.lbl}>PACK NAME</Text>
            <TextInput value={packName} onChangeText={setPackName} placeholder="e.g. Premium Bundle" placeholderTextColor={T.textMute} maxLength={32} style={s.inp} testID="pack-name" />
            <Text style={s.lbl}>BUNDLE FEE ($/month) — flat fallback</Text>
            <TextInput value={packFee} onChangeText={(v) => setPackFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={6} style={s.inp} testID="pack-fee" />
            {/* V39 — Tier-based pricing for cable providers (budget / standard / premium) */}
            <View style={[s.exclRow, { alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingVertical: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                <MaterialCommunityIcons name={packTieredOn ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={packTieredOn ? T.cyan : T.textDim} />
                <TouchableOpacity onPress={() => setPackTieredOn(v => !v)} testID="pack-tiered-toggle">
                  <Text style={{ color: T.text, fontWeight: '900', fontSize: 13 }}>TIER-BASED PRICING (per cable carriage tier)</Text>
                </TouchableOpacity>
              </View>
              {packTieredOn && (
                <>
                  <Text style={{ color: T.textDim, fontSize: 11, lineHeight: 15 }}>Charge different $/mo to budget / standard / premium subscribers via your cable carriage deals. Revenue is tier-weighted by your active providers' subscriber mix.</Text>
                  <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: T.textDim, fontSize: 10, fontWeight: '900' }}>BUDGET</Text>
                      <TextInput value={packBudget} onChangeText={v => setPackBudget(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.inp} maxLength={6} testID="pack-tier-budget" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: T.textDim, fontSize: 10, fontWeight: '900' }}>STANDARD</Text>
                      <TextInput value={packStandard} onChangeText={v => setPackStandard(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.inp} maxLength={6} testID="pack-tier-standard" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: T.textDim, fontSize: 10, fontWeight: '900' }}>PREMIUM</Text>
                      <TextInput value={packPremium} onChangeText={v => setPackPremium(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.inp} maxLength={6} testID="pack-tier-premium" />
                    </View>
                  </View>
                </>
              )}
            </View>
            <Text style={s.lbl}>INCLUDED CHANNELS ({packChannelIds.length} picked)</Text>
            {playerNets.map((n: any) => {
              const sel = packChannelIds.includes(n.id);
              return (
                <TouchableOpacity key={n.id} style={[s.movieRow, sel && { borderColor: T.yellow, backgroundColor: 'rgba(244,208,63,0.18)' }]}
                  onPress={() => setPackChannelIds(prev => prev.includes(n.id) ? prev.filter(x => x !== n.id) : [...prev, n.id])} testID={`pack-pick-${n.id}`}>
                  <MaterialCommunityIcons name={sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={sel ? T.yellow : T.textMute} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={s.movieTxt}>{n.name}</Text>
                    <Text style={s.movieSub}>{KIND_LABEL[n.kind as TVChannelKind]} · {n.subscribers}M subs · ${(n.monthlyFeeUSD || 0).toFixed(2)}/mo</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={s.submit} onPress={() => {
              const tiered = packTieredOn ? {
                budget: parseFloat(packBudget) || 0,
                standard: parseFloat(packStandard) || 0,
                premium: parseFloat(packPremium) || 0,
              } : undefined;
              const r = createChannelPack({ name: packName, channelIds: packChannelIds, monthlyFeeUSD: parseFloat(packFee) || 0, pricingByTier: tiered });
              if (r.error) { uiAlert('Failed', r.error); return; }
              setPackOpen(false);
              uiAlert('Pack created ✓', `${packName} is live with ${packChannelIds.length} channels.${packTieredOn ? ' Tier-based pricing active.' : ''}`);
            }} testID="pack-submit">
              <MaterialCommunityIcons name="package-variant-closed" size={20} color={T.cardDark} />
              <Text style={s.submitTxt}>CREATE PACK</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* V35 — License rival content for player channel */}
      <Modal visible={!!licenseChannelId} animationType="slide" onRequestClose={() => setLicenseChannelId(null)}>
        {licenseChannelId ? (() => {
          const ch = playerNets.find((n: any) => n.id === licenseChannelId);
          if (!ch) return null;
          const rival = state.rivals.find(r => r.id === licenseRivalId);
          const rivalMovies = rival ? state.movies.filter(m => m.studioId === rival.id && m.status === 'released') : [];
          const yrs = parseInt(licenseYears, 10) || 0;
          const fair = licensePicks.length > 0 && rival ? quoteChannelContentLicense({ rivalStudioId: rival.id, movieIds: licensePicks, years: yrs }).feeB : 0;
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              <View style={s.fsHeader}>
                <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setLicenseChannelId(null)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>License Content → {ch.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <Text style={s.netHint}>Pay rival studios upfront to broadcast their released movies on your channel for the term. Adds to programming.</Text>
                <Text style={s.lbl}>RIVAL STUDIO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {state.rivals.map(r => (
                    <TouchableOpacity key={r.id} style={[s.chip, licenseRivalId === r.id && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => { setLicenseRivalId(r.id); setLicensePicks([]); }} testID={`lic-rival-${r.id}`}>
                      <Text style={[s.chipTxt, licenseRivalId === r.id && { color: T.cardDark }]}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.lbl}>YEARS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {[1, 3, 5, 7, 10].map(y => (
                    <TouchableOpacity key={y} style={[s.chip, parseInt(licenseYears, 10) === y && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => setLicenseYears(String(y))} testID={`lic-yrs-${y}`}>
                      <Text style={[s.chipTxt, parseInt(licenseYears, 10) === y && { color: T.cardDark }]}>{y}yr</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* V41 — Bulk-select toolbar (mirrors catalog pack UX) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <Text style={s.lbl}>SELECT MOVIES ({licensePicks.length} of {rivalMovies.length})</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.cyan, paddingHorizontal: 10, paddingVertical: 6 }]} onPress={() => setLicensePicks(rivalMovies.map(m => m.id))} testID="lic-pick-all">
                      <Text style={s.smallBtnTxt}>Select All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.textMute, paddingHorizontal: 10, paddingVertical: 6 }]} onPress={() => setLicensePicks([])} testID="lic-pick-clear">
                      <Text style={[s.smallBtnTxt, { color: T.cardDark }]}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 8 }}>
                  {[5, 10, 25].map(n => (
                    <TouchableOpacity key={`n${n}`} style={[s.chip, { paddingVertical: 6 }]} onPress={() => {
                      const latest = [...rivalMovies].sort((a, b) => (b.releaseYear * 100 + (b.releaseWeek || 0)) - (a.releaseYear * 100 + (a.releaseWeek || 0))).slice(0, n).map(m => m.id);
                      setLicensePicks(latest);
                    }} testID={`lic-pick-latest-${n}`}>
                      <Text style={s.chipTxt}>Latest {n}</Text>
                    </TouchableOpacity>
                  ))}
                  {[5, 10, 25].map(n => (
                    <TouchableOpacity key={`bo${n}`} style={[s.chip, { paddingVertical: 6 }]} onPress={() => {
                      const top = [...rivalMovies].sort((a, b) => b.boxOffice - a.boxOffice).slice(0, n).map(m => m.id);
                      setLicensePicks(top);
                    }} testID={`lic-pick-topbo-${n}`}>
                      <Text style={s.chipTxt}>Top {n} BO</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {rivalMovies.length === 0 ? (
                  <Text style={s.empty}>No eligible released movies from this rival.</Text>
                ) : rivalMovies.map(m => {
                  const sel = licensePicks.includes(m.id);
                  // V41 — Already licensed on THIS channel?
                  const alreadyLic = (state.channelContentLicenses || []).some(l => l.channelId === licenseChannelId && l.status === 'active' && l.movieIds.includes(m.id));
                  return (
                    <TouchableOpacity key={m.id} disabled={alreadyLic} style={[s.movieRow, sel && { borderColor: T.green, backgroundColor: 'rgba(166,226,46,0.18)' }, alreadyLic && { opacity: 0.5 }]}
                      onPress={() => setLicensePicks(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} testID={`lic-pick-${m.id}`}>
                      <MaterialCommunityIcons name={alreadyLic ? 'check-circle' : sel ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={alreadyLic ? T.green : sel ? T.green : T.textMute} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={s.movieTxt} numberOfLines={1}>{m.title}{alreadyLic ? '  · already licensed' : ''}</Text>
                        <Text style={s.movieSub}>Y{m.releaseYear} · {m.criticScore}/100 · ${m.boxOffice.toFixed(2)}B BO</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <Text style={s.lbl}>YOUR OFFER ($B upfront)</Text>
                <TextInput value={licenseFee} onChangeText={(v) => setLicenseFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={6} style={s.inp} testID="lic-fee" />
                {fair > 0 ? (
                  <View style={s.quoteBox}>
                    <Text style={s.quoteLbl}>FAIR VALUE</Text>
                    <Text style={s.quoteVal}>${fair.toFixed(2)}B</Text>
                    <Text style={s.quoteSub}>Offer at ~fair value to close; underbidding risks counter.</Text>
                  </View>
                ) : null}

                <TouchableOpacity style={s.submit} onPress={() => {
                  if (!licenseChannelId || !licenseRivalId) return;
                  const r = proposeChannelContentLicense({ channelId: licenseChannelId, rivalStudioId: licenseRivalId, movieIds: licensePicks, askingFeeB: parseFloat(licenseFee) || 0, years: yrs });
                  if (r.error) { uiAlert('Failed', r.error); return; }
                  setLicenseChannelId(null);
                  if (r.accepted) uiAlert('Deal signed ✓', 'Movies are now broadcasting on your channel.');
                  else uiAlert('Counter received', `Rival countered at $${r.counterFeeB?.toFixed(2)}B. Accept in News.`);
                }} testID="lic-submit">
                  <MaterialCommunityIcons name="handshake" size={20} color={T.cardDark} />
                  <Text style={s.submitTxt}>SUBMIT OFFER</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })() : null}
      </Modal>

      {/* V36 — Rename channel modal */}
      <Modal visible={!!renameChannelId} transparent animationType="fade" onRequestClose={() => setRenameChannelId(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Rename Channel</Text>
            <TextInput value={renameInput} onChangeText={setRenameInput} placeholder="New channel name" placeholderTextColor={T.textMute} maxLength={32} style={s.inp} testID="rename-input" autoFocus />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.cardDark, flex: 1, paddingVertical: 12 }]} onPress={() => setRenameChannelId(null)}>
                <Text style={[s.smallBtnTxt, { color: T.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.smallBtn, { backgroundColor: T.green, flex: 1, paddingVertical: 12 }]} onPress={() => {
                if (!renameChannelId) return;
                const r = renameTVChannel(renameChannelId, renameInput);
                if (r.error) { uiAlert('Failed', r.error); return; }
                setRenameChannelId(null);
                uiAlert('Renamed ✓', `Channel renamed to "${renameInput}".`);
              }} testID="rename-save">
                <Text style={s.smallBtnTxt}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* V41 — Manage Channel Pack modal (rename + edit pricing, keyboard input) */}
      <Modal visible={!!managePackId} animationType="slide" onRequestClose={() => setManagePackId(null)}>
        {managePackId ? (() => {
          const pack = (state.channelPacks || []).find(p => p.id === managePackId);
          if (!pack) return null;
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              <View style={s.fsHeader}>
                <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setManagePackId(null)} testID="pack-manage-close"><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>Manage {pack.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1, backgroundColor: T.panel }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
                <Text style={s.netSub}>{pack.channelIds.length} channels · {pack.subscribers.toFixed(1)}M subs</Text>

                <Text style={s.lbl}>PACK NAME</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput value={packEditName} onChangeText={setPackEditName} maxLength={32} style={[s.inp, { flex: 1 }]} testID="pack-edit-name" />
                  <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.magenta, paddingHorizontal: 14 }]} onPress={() => {
                    const r = renameChannelPack(managePackId, packEditName);
                    if (r.error) uiAlert('Failed', r.error); else uiAlert('Renamed ✓', `Pack renamed to "${packEditName}".`);
                  }} testID="pack-edit-name-save">
                    <Text style={s.dealBtnTxt}>Save Name</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.lbl}>FLAT MONTHLY FEE (USD)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput value={packEditFee} onChangeText={v => setPackEditFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={6} style={[s.inp, { flex: 1 }]} testID="pack-edit-fee" />
                  <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.green, paddingHorizontal: 14 }]} onPress={() => {
                    const f = parseFloat(packEditFee) || 0;
                    const r = setChannelPackMonthlyFee(managePackId, f);
                    if (r.error) uiAlert('Failed', r.error); else uiAlert('Saved ✓', `Flat fee set to $${f.toFixed(2)}/mo.`);
                  }} testID="pack-edit-fee-save">
                    <Text style={s.dealBtnTxt}>Save Fee</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.netHint}>Applies when no tier-based pricing is active (or as fallback).</Text>

                <View style={[s.exclRow, { alignItems: 'flex-start', flexDirection: 'column', gap: 8, paddingVertical: 12, marginTop: 12 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
                    <TouchableOpacity onPress={() => setPackEditTieredOn(v => !v)} testID="pack-edit-tiered-toggle" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name={packEditTieredOn ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={packEditTieredOn ? T.cyan : T.textDim} />
                      <Text style={{ color: T.text, fontWeight: '900', fontSize: 13 }}>TIER-BASED PRICING</Text>
                    </TouchableOpacity>
                  </View>
                  {packEditTieredOn && (
                    <>
                      <Text style={{ color: T.textDim, fontSize: 11, lineHeight: 15 }}>Different $/mo per cable carriage tier. Type prices directly.</Text>
                      <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: T.textDim, fontSize: 10, fontWeight: '900' }}>BUDGET</Text>
                          <TextInput value={packEditBudget} onChangeText={v => setPackEditBudget(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.inp} maxLength={6} testID="pack-edit-budget" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: T.textDim, fontSize: 10, fontWeight: '900' }}>STANDARD</Text>
                          <TextInput value={packEditStandard} onChangeText={v => setPackEditStandard(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.inp} maxLength={6} testID="pack-edit-standard" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: T.textDim, fontSize: 10, fontWeight: '900' }}>PREMIUM</Text>
                          <TextInput value={packEditPremium} onChangeText={v => setPackEditPremium(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" style={s.inp} maxLength={6} testID="pack-edit-premium" />
                        </View>
                      </View>
                    </>
                  )}
                  <TouchableOpacity style={[s.dealBtn, { backgroundColor: T.cyan, marginTop: 8, alignSelf: 'stretch' }]} onPress={() => {
                    if (packEditTieredOn) {
                      const r = setChannelPackTierPricing(managePackId, {
                        budget: parseFloat(packEditBudget) || 0,
                        standard: parseFloat(packEditStandard) || 0,
                        premium: parseFloat(packEditPremium) || 0,
                      });
                      if (r.error) uiAlert('Failed', r.error); else uiAlert('Saved ✓', 'Tier prices updated.');
                    } else {
                      const r = setChannelPackTierPricing(managePackId, null);
                      if (r.error) uiAlert('Failed', r.error); else uiAlert('Saved ✓', 'Tier pricing disabled — flat fee in effect.');
                    }
                  }} testID="pack-edit-tier-save">
                    <MaterialCommunityIcons name="content-save" size={16} color={T.cardDark} />
                    <Text style={s.dealBtnTxt}>{packEditTieredOn ? 'Save Tier Pricing' : 'Disable Tier Pricing'}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.lbl}>INCLUDED CHANNELS</Text>
                {pack.channelIds.length <= 2 ? (
                  <Text style={s.netHint}>Min 2 channels required. Delete the pack to remove the last one.</Text>
                ) : null}
                {networks.filter((n: any) => pack.channelIds.includes(n.id)).map((n: any) => (
                  <View key={n.id} style={[s.movieRow, { borderColor: T.border }]}>
                    <MaterialCommunityIcons name="television-classic" size={18} color={T.cyan} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={s.movieTxt}>{n.name}</Text>
                      <Text style={s.movieSub}>{n.region} · {KIND_LABEL[n.kind as TVChannelKind]} · {n.subscribers}M subs</Text>
                    </View>
                    {pack.channelIds.length > 2 ? (
                      <TouchableOpacity onPress={() => {
                        const r = removeChannelFromPack(pack.id, n.id);
                        if (r.error) uiAlert('Failed', r.error);
                      }} testID={`pack-rm-${n.id}`}>
                        <MaterialCommunityIcons name="delete" size={18} color={T.red} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
                {/* V42 — Add more owned channels to this pack */}
                {(() => {
                  const candidates = (state.tvNetworks || []).filter((n: any) => n.ownerStudioId === state.player.id && !pack.channelIds.includes(n.id) && !n.closed);
                  if (candidates.length === 0) return null;
                  return (
                    <>
                      <Text style={[s.lbl, { marginTop: 10 }]}>ADD MORE CHANNELS</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {candidates.map((n: any) => (
                          <TouchableOpacity key={n.id} style={[s.chip]} onPress={() => {
                            const r = addChannelToPack(pack.id, n.id);
                            if (r.error) uiAlert('Failed', r.error);
                          }} testID={`pack-add-${n.id}`}>
                            <MaterialCommunityIcons name="plus" size={12} color={T.text} />
                            <Text style={[s.chipTxt, { marginLeft: 4 }]}>{n.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            </SafeAreaView>
          );
        })() : null}
      </Modal>


      {/* V36 — Carriage deal negotiation modal */}
      <Modal visible={!!carriageProviderId} animationType="slide" onRequestClose={() => setCarriageProviderId(null)}>
        {carriageProviderId && carriageChannelId ? (() => {
          const providers = (state.cableProviders && state.cableProviders.length > 0) ? state.cableProviders : CABLE_PROVIDERS_SEED;
          const prov = providers.find((p: any) => p.id === carriageProviderId);
          const ch = playerNets.find((n: any) => n.id === carriageChannelId);
          if (!prov || !ch) return null;
          const yrs = parseInt(carriageYears, 10) || 5;
          const q = quoteCableCarriageDeal({ providerId: carriageProviderId, channelId: carriageChannelId, years: yrs });
          const askingF = parseFloat(carriageFee) || 0;
          const estWeekly = +((prov.subscribers * askingF) / 4).toFixed(2);
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: T.panel }} edges={['top', 'bottom']}>
              <View style={s.fsHeader}>
                <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setCarriageProviderId(null)}><MaterialCommunityIcons name="close" size={22} color={T.text} /></TouchableOpacity>
                <Text style={s.fsHeaderTitle} numberOfLines={1}>Carriage Deal · {prov.name}</Text>
                <View style={{ width: 40 }} />
              </View>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
                <Text style={s.netSub}>{prov.region} · {(prov as any).tier.toUpperCase()} TIER · {prov.subscribers}M subs · {prov.reputation}/100 rep</Text>

                <Text style={s.lbl}>YOUR CHANNEL ({prov.region} · {(prov as any).tier === 'public' ? 'public only' : 'cable/premium only'})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {playerNets.filter((n: any) => n.region === prov.region && ((prov as any).tier === 'public' ? n.kind === 'public' : n.kind !== 'public')).map((n: any) => (
                    <TouchableOpacity key={n.id} style={[s.chip, carriageChannelId === n.id && { backgroundColor: T.cyan, borderColor: T.cyan }]} onPress={() => {
                      setCarriageChannelId(n.id);
                      const nq = quoteCableCarriageDeal({ providerId: carriageProviderId, channelId: n.id, years: yrs });
                      setCarriageFee(nq.fairUSD.toFixed(2));
                    }}>
                      <Text style={[s.chipTxt, carriageChannelId === n.id && { color: T.cardDark }]}>{n.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={s.lbl}>YEARS (1–10)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {[1, 3, 5, 7, 10].map(y => (
                    <TouchableOpacity key={y} style={[s.chip, parseInt(carriageYears, 10) === y && { backgroundColor: T.yellow, borderColor: T.yellow }]} onPress={() => {
                      setCarriageYears(String(y));
                      const nq = quoteCableCarriageDeal({ providerId: carriageProviderId, channelId: carriageChannelId, years: y });
                      setCarriageFee(nq.fairUSD.toFixed(2));
                    }}>
                      <Text style={[s.chipTxt, parseInt(carriageYears, 10) === y && { color: T.cardDark }]}>{y}yr</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.lbl}>FEE PER SUB / MONTH (USD)</Text>
                <TextInput value={carriageFee} onChangeText={(v) => setCarriageFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={6} style={s.inp} testID="cd-fee-input" />
                <View style={s.quoteBox}>
                  <Text style={s.quoteLbl}>FAIR VALUE</Text>
                  <Text style={s.quoteVal}>${q.fairUSD.toFixed(2)}/sub/mo</Text>
                  <Text style={s.quoteSub}>Range ${q.minUSD.toFixed(2)} – ${q.maxUSD.toFixed(2)} · ~${estWeekly}M/wk recurring · Signing bonus: $${q.signingBonusM.toFixed(2)}M upfront</Text>
                </View>

                <TouchableOpacity style={s.submit} onPress={() => {
                  if (!carriageProviderId || !carriageChannelId) return;
                  const r = signCableCarriageDeal({ providerId: carriageProviderId, channelId: carriageChannelId, askingFeeUSD: askingF, years: yrs });
                  if (r.error) { uiAlert('Failed', r.error); return; }
                  setCarriageProviderId(null);
                  if (r.accepted) uiAlert('Deal signed ✓', `Recurring ${estWeekly}M/wk for ${yrs} years.`);
                  else uiAlert('Counter received', `Provider countered at $${r.counterFeeUSD?.toFixed(2)}/sub/mo. Accept in the Cable tab.`);
                }} testID="cd-submit">
                  <MaterialCommunityIcons name="cable-data" size={20} color={T.cardDark} />
                  <Text style={s.submitTxt}>SUBMIT OFFER</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          );
        })() : null}
      </Modal>
      {/* V39 — TV Manager proposals modal */}
      <Modal visible={mgrOpen} animationType="slide" onRequestClose={() => setMgrOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
          <View style={s.fsHeader}>
            <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setMgrOpen(false)}><MaterialCommunityIcons name="close" size={24} color={T.text} /></TouchableOpacity>
            <Text style={s.fsHeaderTitle}>💡 TV Manager — Suggestions</Text>
            <View style={s.fsHeaderBtn} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
            {mgrProposals.length === 0 ? (
              <Text style={s.empty}>No suggestions right now. Manager scans weekly for new opportunities.</Text>
            ) : mgrProposals.map(p => {
              const kindLabel = p.kind === 'cable_carriage' ? 'Cable Carriage' : p.kind === 'channel_content_license' ? 'Buy Rival Content' : (p as any).kind === 'air_own_movie' ? '📺 Air Your Own Movies' : 'License to Rival';
              const kindIcon = p.kind === 'cable_carriage' ? 'cable-data' : p.kind === 'channel_content_license' ? 'movie-open-plus' : (p as any).kind === 'air_own_movie' ? 'movie-roll' : 'television-classic';
              const kindColor = p.direction === 'inbound' ? T.green : T.yellow;
              return (
                <View key={p.id} style={s.mgrCard} testID={`tv-mgr-${p.id}`}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name={kindIcon as any} size={22} color={kindColor} />
                    <Text style={s.mgrCardKind}>{kindLabel}</Text>
                    <View style={{ flex: 1 }} />
                    <View style={[s.dirPill, { backgroundColor: kindColor }]}><Text style={s.dirPillT}>{p.direction.toUpperCase()}</Text></View>
                  </View>
                  <Text style={s.mgrRationale}>{p.rationale}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[s.mgrBtn, { backgroundColor: T.green }]} onPress={() => {
                      // V43 — air_own_movie kind needs the new handler
                      const isAirOwn = (p as any).kind === 'air_own_movie';
                      const r = isAirOwn ? approveTVManagerOwnContent(p.id) : approveTVManagerProposal(p.id);
                      if (r.error) uiAlert('Cannot approve', r.error);
                      else uiAlert('Approved ✓', 'Manager submitted the deal.');
                    }} testID={`tv-mgr-approve-${p.id}`}>
                      <MaterialCommunityIcons name="check-bold" size={16} color={T.cardDark} />
                      <Text style={s.mgrBtnT}>APPROVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.mgrBtn, { backgroundColor: '#E84545' }]} onPress={() => rejectTVManagerProposal(p.id)} testID={`tv-mgr-reject-${p.id}`}>
                      <MaterialCommunityIcons name="close-thick" size={16} color={T.text} />
                      <Text style={[s.mgrBtnT, { color: T.text }]}>DISMISS</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* V43 — Whole-Network Single-Deal modal (player sells movies to ALL rival channels) */}
      <Modal visible={!!wnDealStudioId} animationType="slide" onRequestClose={() => setWnDealStudioId(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
          <View style={s.fsHeader}>
            <Text style={s.fsTitle}>🤝 Whole-Network Deal</Text>
            <TouchableOpacity style={s.fsHeaderBtn} onPress={() => setWnDealStudioId(null)} testID="wn-close">
              <MaterialCommunityIcons name="close" size={22} color={T.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 60 }}>
            {(() => {
              if (!wnDealStudioId) return null;
              const group = rivalGroups.find(g => g.studioId === wnDealStudioId);
              if (!group) return null;
              const q = wnPicks.length === 0 ? null : quoteWholeNetworkLicense({ rivalStudioId: wnDealStudioId, movieIds: wnPicks, years: parseInt(wnYears, 10) || 5 });
              return (
                <>
                  <Text style={s.netName}>{group.studioName}</Text>
                  <Text style={s.netSub}>{group.channels.length} channels · License your movies to ALL of them in one bulk deal.</Text>
                  <Text style={[s.filterLbl, { marginTop: 12 }]}>YOUR MOVIES ({wnPicks.length} picked)</Text>
                  {myReleased.length === 0 ? (
                    <Text style={s.empty}>You need at least one released movie to pitch.</Text>
                  ) : myReleased.slice(0, 50).map(m => (
                    <TouchableOpacity
                      key={m.id}
                      style={[s.movieRow, wnPicks.includes(m.id) && { borderColor: T.green, borderWidth: 2 }]}
                      onPress={() => setWnPicks(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                      testID={`wn-pick-${m.id}`}
                    >
                      <Text style={s.movieTitle}>{m.title}</Text>
                      <Text style={s.movieMeta}>{m.genre} · ${(m.boxOffice * 1000).toFixed(0)}M BO · ★{m.rating.toFixed(1)}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={[s.filterLbl, { marginTop: 12 }]}>YEARS (1–10)</Text>
                  <TextInput value={wnYears} onChangeText={setWnYears} keyboardType="number-pad" style={s.searchInput} testID="wn-years" />
                  {q && !q.error && (
                    <View style={[s.econCard, { marginTop: 10 }]}>
                      <Text style={s.econTitle}>FAIR VALUE</Text>
                      <Text style={s.econSub}>${q.feeB.toFixed(2)}B across {q.channelCount} channels (bulk pricing applied)</Text>
                    </View>
                  )}
                  <Text style={[s.filterLbl, { marginTop: 12 }]}>YOUR ASKING FEE ($B)</Text>
                  <TextInput value={wnFee} onChangeText={setWnFee} keyboardType="decimal-pad" style={s.searchInput} testID="wn-fee" />
                  <TouchableOpacity
                    style={[s.bigBtn, { backgroundColor: T.green, marginTop: 18 }]}
                    onPress={() => {
                      const years = Math.max(1, Math.min(10, parseInt(wnYears, 10) || 5));
                      const fee = Math.max(0.01, parseFloat(wnFee) || 1.0);
                      if (wnPicks.length === 0) { uiAlert('Pick movies', 'Select at least one movie to license.'); return; }
                      const r = signWholeNetworkLicenseOutbound({ rivalStudioId: wnDealStudioId, movieIds: wnPicks, years, askingFeeB: fee });
                      if (r.error) { uiAlert('Deal failed', r.error); return; }
                      if (r.accepted) {
                        uiAlert('Deal closed ✓', `${group.studioName} pays $${fee.toFixed(2)}B upfront. Movies now on ${group.channels.length} channels.`);
                        setWnDealStudioId(null);
                      } else if (r.counterFeeB) {
                        uiAlert(`${group.studioName} counters`, `They propose $${r.counterFeeB.toFixed(2)}B. Adjust and try again.`);
                        setWnFee(r.counterFeeB.toFixed(2));
                      }
                    }}
                    testID="wn-submit"
                  >
                    <MaterialCommunityIcons name="handshake" size={18} color={T.cardDark} />
                    <Text style={s.bigBtnTxt}>PITCH DEAL</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  tabbar: { flexDirection: 'row', padding: 8, gap: 6, backgroundColor: T.cardDark },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 8, backgroundColor: T.card },
  tabActive: { backgroundColor: T.cyan },
  tabTxt: { color: T.text, fontWeight: '900', fontSize: 11 },
  tabBadge: { backgroundColor: T.cardDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  tabBadgeTxt: { color: T.cyan, fontWeight: '900', fontSize: 10 },
  sectionHint: { color: T.text, fontSize: 12, marginBottom: 10, lineHeight: 16 },
  sectionHintBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: T.cardDark, borderRadius: 8, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  filterLbl: { color: T.text, fontWeight: '900', fontSize: 11, marginTop: 8 },
  chip: { backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, minHeight: 36 },
  chipTxt: { color: T.text, fontWeight: '800', fontSize: 12 },
  // V42d — Tier-configurator chip: bigger touch target, more padding so 100+ channels don't feel cramped
  tcChip: { backgroundColor: T.cardDark, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: T.border, minHeight: 42, flexDirection: 'row', alignItems: 'center' },
  tcChipTxt: { color: T.text, fontWeight: '800', fontSize: 13 },
  empty: { color: T.text, opacity: 0.7, fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
  netCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  kindBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  kindBadgeTxt: { color: T.cardDark, fontWeight: '900', fontSize: 10 },
  netName: { color: T.text, fontWeight: '900', fontSize: 14 },
  netSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  netHint: { color: T.textDim, fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  dealBtn: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: T.green, paddingVertical: 8, borderRadius: 6 },
  econCard: { marginTop: 8, padding: 10, backgroundColor: T.card, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  econTitle: { color: T.text, fontWeight: '800', fontSize: 12 },
  econSub: { color: T.textDim, fontSize: 11, marginTop: 2, marginBottom: 6 },
  econRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  econChip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.border },
  econChipTxt: { color: T.text, fontWeight: '700', fontSize: 11 },
  searchInput: { backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: T.text, fontSize: 14, marginBottom: 4 },
  wnGroupCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: T.green },
  movieRow: { backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: T.border },
  movieTitle: { color: T.text, fontSize: 14, fontWeight: '700' },
  movieMeta: { color: T.textDim, fontSize: 11, marginTop: 2 },
  dealBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12 },
  dealCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: T.border },
  dealNetName: { color: T.text, fontWeight: '900', fontSize: 14 },
  dealMeta: { color: T.textDim, fontSize: 11, marginTop: 4 },
  dealStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  dealStatusTxt: { color: T.cardDark, fontWeight: '900', fontSize: 10 },
  smallBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  smallBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 11 },
  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 10, marginBottom: 12 },
  bigBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 14 },
  fsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.cardDark },
  fsHeaderBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fsHeaderTitle: { flex: 1, color: T.text, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  lbl: { color: T.text, fontWeight: '900', fontSize: 11, marginTop: 14 },
  inp: { backgroundColor: T.cardDark, color: T.text, padding: 10, borderRadius: 8, marginTop: 6, fontSize: 14, fontWeight: '700', borderWidth: 1, borderColor: T.border },
  movieRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 10, borderRadius: 8, marginTop: 6, borderWidth: 1, borderColor: T.border },
  movieTxt: { color: T.text, fontWeight: '800', fontSize: 13 },
  movieSub: { color: T.textDim, fontSize: 11, marginTop: 2 },
  exclRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.cardDark },
  quoteBox: { backgroundColor: T.cardDark, padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: T.border },
  quoteLbl: { color: T.textDim, fontSize: 10, fontWeight: '900' },
  quoteVal: { color: T.green, fontSize: 22, fontWeight: '900', marginTop: 2 },
  quoteSub: { color: T.textDim, fontSize: 11, marginTop: 4 },
  submit: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.yellow, paddingVertical: 14, borderRadius: 10 },
  submitTxt: { color: T.cardDark, fontWeight: '900', fontSize: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: T.card, padding: 20, borderRadius: 14, width: '100%', maxWidth: 380, borderWidth: 2, borderColor: T.border },
  modalTitle: { color: T.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  // V39 — Manager banner + proposal card
  mgrBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.cardDark, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: T.yellow },
  mgrBannerT: { color: T.yellow, fontWeight: '900', fontSize: 13, flex: 1 },
  mgrCard: { backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: T.border },
  mgrCardKind: { color: T.text, fontWeight: '900', fontSize: 14 },
  mgrRationale: { color: T.text, fontSize: 12, marginTop: 8, lineHeight: 17 },
  mgrBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 6 },
  mgrBtnT: { color: T.cardDark, fontWeight: '900', fontSize: 12 },
  dirPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  dirPillT: { color: T.cardDark, fontWeight: '900', fontSize: 9, letterSpacing: 0.4 },
});
