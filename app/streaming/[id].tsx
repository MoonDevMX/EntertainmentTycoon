import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useGame } from '../../src/game/state';
import { T } from '../../src/ui/theme';
import { TopBar, NeonStat, SectionHeader } from '../../src/ui/components';
import { TIER_PERIOD_LABEL, effectiveMonthlyPrice, WEEKS_PER_YEAR as WEEKS_PER_YEAR_LOCAL } from '../../src/game/data';
import { computeLicenseFee } from '../../src/game/sim';
import { SubscriptionTier, TierPeriod } from '../../src/game/types';
import { uiAlert } from '../../src/ui/ui-alert';

const PERIOD_OPTS: { key: TierPeriod; label: string }[] = [
  { key: 'monthly', label: 'Mo' },
  { key: 'quarterly', label: '3-Mo' },
  { key: 'biannual', label: '6-Mo' },
  { key: 'yearly', label: 'Yr' },
];

function notify(title: string, msg: string) {
  uiAlert(title, msg);
}
function fmtSubs(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

export default function StreamingDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; licenseMovieId?: string }>();
  const id = params.id;
  const incomingLicenseMovieId = typeof params.licenseMovieId === 'string' ? params.licenseMovieId : undefined;
  const { state, updateStreamingService, deleteStreamingService, addMovieToStreaming, setMovieTierAccess, setLicensedMovieTierAccess, removeMovieFromStreaming, licenseMovieToStreaming, negotiateMovieLicense, renewLicense, setStreamingTierAdSupport, setEntityMarketing } = useGame();
  const [editingService, setEditingService] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftIsExclusive, setDraftIsExclusive] = useState(false);
  const [draftTiers, setDraftTiers] = useState<SubscriptionTier[]>([]);
  const [draftExclusiveMovies, setDraftExclusiveMovies] = useState<string[]>([]);
  const [showAddCatalog, setShowAddCatalog] = useState(false);
  const [showLicensePicker, setShowLicensePicker] = useState(false);
  const [licenseMovieId, setLicenseMovieId] = useState<string | null>(null);
  const [licenseYears, setLicenseYears] = useState<1 | 3 | 5 | 10>(3);
  const [licenseTierIds, setLicenseTierIds] = useState<string[]>([]);
  const [licenseExclusive, setLicenseExclusive] = useState(false);
  const [licenseOfferedFee, setLicenseOfferedFee] = useState<string>('');
  const [licenseChainCounter, setLicenseChainCounter] = useState<{ feeM: number; reason: string } | null>(null);
  const [licenseRound, setLicenseRound] = useState(1);
  // Per-movie tier picker for ADDING owned movies to catalog
  const [addMovieId, setAddMovieId] = useState<string | null>(null);
  const [addTierIds, setAddTierIds] = useState<string[]>([]);
  // Per-movie tier picker for EDITING tier access on existing catalog movies
  const [editTierMovieId, setEditTierMovieId] = useState<string | null>(null);
  const [editTierIds, setEditTierIds] = useState<string[]>([]);
  const [editLicTierMovieId, setEditLicTierMovieId] = useState<string | null>(null);
  const [editLicTierIds, setEditLicTierIds] = useState<string[]>([]);
  // V30 — tier hierarchy preset for quick-add (where to add new films)
  const [bulkAddTierIds, setBulkAddTierIds] = useState<string[]>([]);
  // V30 — bulk-select movies in catalog to change tier hierarchy
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelectedMovieIds, setBulkSelectedMovieIds] = useState<string[]>([]);
  const [showBulkTierEditor, setShowBulkTierEditor] = useState(false);
  const [bulkEditTierIds, setBulkEditTierIds] = useState<string[]>([]);

  const svc = useMemo(() => state ? (state.streamingServices || []).find(s => s.id === id) : null, [state, id]);
  const studio = useMemo(() => state && svc ? [state.player, ...state.rivals].find(st => st.id === svc.studioId) : null, [state, svc]);
  const isMine = !!state && !!svc && svc.studioId === state.player.id;

  // V30 — Auto-open license modal when arriving with ?licenseMovieId=… (from Bid Wars panel). Only opens once.
  const consumedLicenseRef = useRef<string | null>(null);
  useEffect(() => {
    if (!incomingLicenseMovieId || !svc || !isMine) return;
    if (consumedLicenseRef.current === incomingLicenseMovieId) return;
    consumedLicenseRef.current = incomingLicenseMovieId;
    setLicenseMovieId(incomingLicenseMovieId);
    setLicenseYears(3);
    setLicenseTierIds(svc.tiers.map(t => t.id));
    setShowLicensePicker(true);
  }, [incomingLicenseMovieId, svc, isMine]); // eslint-disable-line react-hooks/exhaustive-deps

  const catalogMovies = useMemo(() => {
    if (!state || !svc) return [];
    return svc.catalogMovieIds.map(mid => state.movies.find(m => m.id === mid)).filter(Boolean) as any[];
  }, [state, svc]);

  const playerOwnUnstreamedReleased = useMemo(() => {
    if (!state || !svc || !isMine) return [];
    return state.movies.filter(m =>
      m.studioId === state.player.id &&
      m.status === 'released' &&
      !svc.catalogMovieIds.includes(m.id),
    );
  }, [state, svc, isMine]);

  // External titles available to license — released movies from OTHER studios not already licensed/in catalog
  const externalLicensableMovies = useMemo(() => {
    if (!state || !svc || !isMine) return [];
    return state.movies.filter(m =>
      m.studioId !== state.player.id &&
      m.status === 'released' &&
      !svc.catalogMovieIds.includes(m.id),
    ).sort((a, b) => b.boxOffice - a.boxOffice);
  }, [state, svc, isMine]);

  // V44 — Lookup table: which titles are exclusively locked elsewhere (so we disable the License button).
  const exclusiveLockMap = useMemo(() => {
    if (!state || !svc) return {} as Record<string, { svcName: string; ownerName: string; expiresLabel?: string; kind: string }>;
    const out: Record<string, { svcName: string; ownerName: string; expiresLabel?: string; kind: string }> = {};
    const nowTotal = state.year * WEEKS_PER_YEAR_LOCAL + state.week;
    for (const m of state.movies) {
      // Owner-exclusive
      for (const s2 of state.streamingServices || []) {
        if (s2.id === svc.id) continue;
        if ((s2.exclusiveMovieIds || []).includes(m.id) && s2.studioId === m.studioId) {
          const ownerName = s2.studioId === state.player.id ? state.player.name : state.rivals.find(r => r.id === s2.studioId)?.name || '?';
          out[m.id] = { svcName: s2.name, ownerName, kind: 'owner_exclusive' };
          break;
        }
      }
      if (out[m.id]) continue;
      // Licensed exclusive
      for (const s2 of state.streamingServices || []) {
        if (s2.id === svc.id) continue;
        const lic = (s2.licensedMovies || []).find(l => l.movieId === m.id && l.exclusivity);
        if (!lic) continue;
        const exp = lic.expiresYear * WEEKS_PER_YEAR_LOCAL + lic.expiresWeek;
        if (exp < nowTotal) continue;
        const ownerName = s2.studioId === state.player.id ? state.player.name : state.rivals.find(r => r.id === s2.studioId)?.name || '?';
        out[m.id] = { svcName: s2.name, ownerName, expiresLabel: `Y${lic.expiresYear} W${lic.expiresWeek}`, kind: 'licensed' };
        break;
      }
    }
    return out;
  }, [state, svc]);

  if (!state || !svc || !studio) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <TopBar title="Streaming Service" onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
        <Text style={s.empty}>Service not found.</Text>
      </SafeAreaView>
    );
  }

  const startEdit = () => {
    setDraftName(svc.name);
    setDraftIsExclusive(!!svc.isExclusive);
    setDraftTiers(svc.tiers.map(t => ({ ...t })));
    setDraftExclusiveMovies([...(svc.exclusiveMovieIds || [])]);
    setEditingService(true);
  };
  const saveEdit = () => {
    if (!draftTiers.length) { notify('Tiers required', 'Service must have at least one tier.'); return; }
    if (!draftName.trim()) { notify('Name required', 'Service must have a name.'); return; }
    const r = updateStreamingService(svc.id, {
      name: draftName.trim(),
      tiers: draftTiers,
      isExclusive: draftIsExclusive,
      exclusiveMovieIds: draftExclusiveMovies,
    });
    if (r.error) { notify('Update failed', r.error); return; }
    setEditingService(false);
  };
  const cancelEdit = () => { setEditingService(false); };

  const handleDeleteService = () => {
    const confirmDelete = () => {
      const r = deleteStreamingService(svc.id);
      if (r.error) notify('Cannot delete', r.error);
      else router.replace('/streaming');
    };
    uiAlert(
      'Delete service?',
      `"${svc.name}" will be removed permanently. All ${svc.subscribers.toLocaleString()} subscribers will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]
    );
  };

  const updateDraft = (idx: number, patch: Partial<SubscriptionTier>) => {
    setDraftTiers(t => t.map((x, i) => i === idx ? { ...x, ...patch } : x));
  };
  const removeDraftTier = (idx: number) => setDraftTiers(t => t.filter((_, i) => i !== idx));
  const addDraftTier = () => {
    if (draftTiers.length >= 4) return;
    setDraftTiers(t => [...t, {
      id: 'tier_' + Math.random().toString(36).slice(2, 9),
      name: 'New Tier', period: 'monthly', price: 12.99, screens: 2, users: 2, isExclusive: false,
    }]);
  };
  const toggleMovieExclusive = (movieId: string) => {
    setDraftExclusiveMovies(prev => prev.includes(movieId) ? prev.filter(x => x !== movieId) : [...prev, movieId]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <TopBar title={isMine ? 'My Streaming' : 'Streaming Service'} onBack={() => router.back()} onHome={() => router.replace('/dashboard')} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={s.header}>
          <View style={[s.logo, { backgroundColor: studio.logoBg }]}>
            <MaterialCommunityIcons name="play-circle" size={36} color={T.yellow} />
          </View>
          <View style={{ flex: 1, paddingLeft: 12 }}>
            {editingService ? (
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                style={[s.input, { fontWeight: '900', fontSize: 20, marginBottom: 4 }]}
                placeholder="Service name"
                placeholderTextColor={T.textMute}
                testID="edit-service-name"
              />
            ) : (
              <Text style={s.svcName}>{svc.name}</Text>
            )}
            <Text style={s.svcSub}>by {studio.name}</Text>
            {isMine && <Text style={[s.youTag, { marginTop: 4 }]}>YOUR SERVICE</Text>}
          </View>
          {isMine && !editingService && (
            <View style={{ gap: 6 }}>
              <TouchableOpacity onPress={startEdit} style={s.iconBtn} testID="edit-service-btn">
                <MaterialCommunityIcons name="pencil" size={20} color={T.cyan} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteService} style={[s.iconBtn, { borderColor: T.orange }]} testID="delete-service-btn">
                <MaterialCommunityIcons name="trash-can-outline" size={20} color={T.orange} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {editingService && (
          <View style={s.editSection}>
            <Text style={s.helpText}>Tip: descriptive tier names + clear pricing attract more subscribers.</Text>
          </View>
        )}

        <View style={s.statRow}>
          <NeonStat label="SUBSCRIBERS" value={fmtSubs(svc.subscribers)} color={T.cyan} />
          <NeonStat label="REV/MONTH" value={`${svc.monthlyRevenue.toFixed(2)}M`} color={T.green} />
          <NeonStat label="REPUTATION" value={`${svc.reputation}`} color={T.yellow} />
        </View>
        <View style={s.statRow}>
          <NeonStat label="CATALOG" value={svc.catalogMovieIds.length} color={T.magenta} />
          <NeonStat label="TIERS" value={svc.tiers.length} color={T.pink} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, marginTop: 12 }}>
          <SectionHeader title={editingService ? 'Edit Tiers' : `Subscription Tiers · ${svc.tiers.length}`} />
          {isMine && !editingService && (
            <TouchableOpacity onPress={startEdit} style={[s.editBtn, { borderColor: T.cyan, marginRight: 4 }]} testID="edit-tiers-btn">
              <MaterialCommunityIcons name="pencil" size={14} color={T.cyan} />
              <Text style={[s.editBtnTxt, { color: T.cyan }]}>EDIT TIERS</Text>
            </TouchableOpacity>
          )}
        </View>
        {(editingService ? draftTiers : svc.tiers).map((t, idx) => (
          <TouchableOpacity
            key={t.id}
            style={s.tierCard}
            onPress={() => { if (isMine && !editingService) startEdit(); }}
            activeOpacity={isMine && !editingService ? 0.7 : 1}
            testID={`tier-card-${t.id}`}
          >
            {editingService ? (
              <>
                <View style={s.tierHeader}>
                  <TextInput
                    value={t.name}
                    onChangeText={v => updateDraft(idx, { name: v })}
                    style={[s.input, { flex: 1, fontWeight: '900', fontSize: 14 }]}
                    placeholder="Tier name"
                    placeholderTextColor={T.textMute}
                    testID={`edit-tier-name-${idx}`}
                  />
                  {draftTiers.length > 1 && (
                    <TouchableOpacity onPress={() => removeDraftTier(idx)} testID={`edit-tier-del-${idx}`}>
                      <MaterialCommunityIcons name="close-circle" size={26} color={T.orange} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={s.periodRow}>
                  {PERIOD_OPTS.map(p => (
                    <TouchableOpacity
                      key={p.key}
                      onPress={() => updateDraft(idx, { period: p.key })}
                      style={[s.periodChip, t.period === p.key && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                    >
                      <Text style={[s.periodTxt, t.period === p.key && { color: T.cardDark }]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.numRow}>
                  <NumField label="Price" value={t.price} step={1} min={1} max={500}
                    onChange={v => updateDraft(idx, { price: +v.toFixed(2) })} />
                  <NumField label="Screens" value={t.screens} step={1} min={1} max={10}
                    onChange={v => updateDraft(idx, { screens: Math.round(v) })} />
                  <NumField label="Profiles" value={t.users} step={1} min={1} max={10}
                    onChange={v => updateDraft(idx, { users: Math.round(v) })} />
                </View>
                {/* V43 — Ad-supported toggle */}
                <View style={s.adRow}>
                  <TouchableOpacity
                    style={[s.adToggle, t.adSupported && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                    onPress={() => updateDraft(idx, { adSupported: !t.adSupported, adArpuUSD: !t.adSupported ? (t.adArpuUSD ?? 5) : t.adArpuUSD })}
                    testID={`edit-tier-ads-${idx}`}
                  >
                    <MaterialCommunityIcons name="advertisements" size={14} color={t.adSupported ? T.cardDark : T.magenta} />
                    <Text style={[s.adToggleTxt, t.adSupported && { color: T.cardDark }]}>{t.adSupported ? 'Ad-Supported' : 'Ad-Free'}</Text>
                  </TouchableOpacity>
                  {t.adSupported && (
                    <NumField label="Ad ARPU $/mo" value={t.adArpuUSD ?? 5} step={1} min={1} max={20}
                      onChange={v => updateDraft(idx, { adArpuUSD: +v.toFixed(2) })} />
                  )}
                </View>
              </>
            ) : (
              <View>
                <View style={s.tierHeader}>
                  <Text style={s.tierName}>{t.name}{t.isExclusive ? ' 🔒' : ''}{t.adSupported ? ' 📺' : ''}</Text>
                  <Text style={s.tierPrice}>${t.price.toFixed(2)} / {TIER_PERIOD_LABEL[t.period]}</Text>
                </View>
                <Text style={s.tierMeta}>{t.screens} screen{t.screens !== 1 ? 's' : ''} · {t.users} profile{t.users !== 1 ? 's' : ''} · ≈ ${effectiveMonthlyPrice(t).toFixed(2)}/mo · {fmtSubs(svc.tierSubscribers?.[t.id] || 0)} subs{t.adSupported ? ` · Ads ($${(t.adArpuUSD ?? 5).toFixed(0)}/mo)` : ''}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {editingService && (
          <View style={{ paddingHorizontal: 8, gap: 8 }}>
            {draftTiers.length < 4 && (
              <TouchableOpacity style={s.addTier} onPress={addDraftTier} testID="add-edit-tier">
                <MaterialCommunityIcons name="plus-circle" size={18} color={T.green} />
                <Text style={s.addTierTxt}>Add Tier</Text>
              </TouchableOpacity>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.cardDark, borderColor: T.border, flex: 1 }]} onPress={cancelEdit} testID="cancel-edit">
                <Text style={[s.actionTxt, { color: T.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green, flex: 1 }]} onPress={saveEdit} testID="save-tiers">
                <Text style={[s.actionTxt, { color: T.cardDark }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <SectionHeader title={`Catalog · ${catalogMovies.length}`} />
        {isMine && (
          <View style={s.mktCard} testID="streaming-mkt-card">
            <Text style={s.mktTitle}>📣 Marketing Budget</Text>
            <Text style={s.mktSub}>Boost subscriber growth · ${(svc.marketingBudgetM || 0).toFixed(1)}M / week → ${((svc.marketingBudgetM || 0) * 4.345).toFixed(1)}M / month</Text>
            <View style={s.mktButtons}>
              {[0, 0.5, 1, 2, 5, 10].map(b => (
                <TouchableOpacity
                  key={b}
                  style={[s.mktChip, Math.abs((svc.marketingBudgetM || 0) - b) < 0.01 && s.mktChipActive]}
                  onPress={() => { const r = setEntityMarketing('streaming', svc.id, b); if (r.error) notify('Cannot set marketing', r.error); }}
                  testID={`streaming-mkt-${b}`}
                >
                  <Text style={[s.mktChipText, Math.abs((svc.marketingBudgetM || 0) - b) < 0.01 && { color: T.cardDark }]}>${b}M</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {isMine && catalogMovies.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8, marginBottom: 4 }}>
            <TouchableOpacity
              style={[s.editBtn, { backgroundColor: bulkSelectMode ? T.magenta : T.cardDark, flex: 1 }]}
              onPress={() => {
                setBulkSelectMode(v => !v);
                setBulkSelectedMovieIds([]);
              }}
              testID="toggle-bulk-select"
            >
              <MaterialCommunityIcons name={bulkSelectMode ? 'close' : 'checkbox-multiple-marked-outline'} size={16} color={bulkSelectMode ? T.cardDark : T.magenta} />
              <Text style={[s.editBtnTxt, { color: bulkSelectMode ? T.cardDark : T.magenta }]}>
                {bulkSelectMode ? `${bulkSelectedMovieIds.length} selected — Done` : 'Bulk Select Tiers'}
              </Text>
            </TouchableOpacity>
            {bulkSelectMode && bulkSelectedMovieIds.length > 0 && (
              <TouchableOpacity
                style={[s.editBtn, { backgroundColor: T.green, flex: 1 }]}
                onPress={() => {
                  setBulkEditTierIds(svc.tiers.map(t => t.id));
                  setShowBulkTierEditor(true);
                }}
                testID="open-bulk-tier-editor"
              >
                <MaterialCommunityIcons name="layers-edit" size={16} color={T.cardDark} />
                <Text style={[s.editBtnTxt, { color: T.cardDark }]}>Change Tiers ({bulkSelectedMovieIds.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {isMine && playerOwnUnstreamedReleased.length > 0 && (
          <TouchableOpacity style={s.editBtn} onPress={() => setShowAddCatalog(v => !v)} testID="toggle-add-catalog">
            <MaterialCommunityIcons name={showAddCatalog ? 'close' : 'plus-circle'} size={16} color={T.green} />
            <Text style={[s.editBtnTxt, { color: T.green }]}>
              {showAddCatalog ? 'Done' : `Add From My Released Titles (${playerOwnUnstreamedReleased.length})`}
            </Text>
          </TouchableOpacity>
        )}
        {showAddCatalog && playerOwnUnstreamedReleased.length > 0 && (
          <View style={s.quickAddBar} testID="quick-add-bar">
            {(() => {
              const effectiveTierIds = bulkAddTierIds.length === 0 ? svc.tiers.map(t => t.id) : bulkAddTierIds;
              const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
              const allActive = bulkAddTierIds.length === 0 || bulkAddTierIds.length >= svc.tiers.length;
              return (
                <>
                  <Text style={s.quickAddLbl}>TIER HIERARCHY (where to add):</Text>
                  <View style={[s.quickAddRow, { marginBottom: 6 }]}>
                    <TouchableOpacity
                      style={[s.quickAddChip, allActive && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                      onPress={() => setBulkAddTierIds([])}
                      testID="quick-add-tier-all"
                    >
                      <Text style={[s.quickAddChipTxt, allActive && { color: T.cardDark }]}>All Tiers</Text>
                    </TouchableOpacity>
                    {tiersByPrice.map((t, idx) => {
                      if (idx === 0) return null;
                      const ladder = tiersByPrice.slice(idx).map(x => x.id);
                      const isLadder = ladder.length === bulkAddTierIds.length && ladder.every(tid => bulkAddTierIds.includes(tid));
                      return (
                        <TouchableOpacity
                          key={`tier-ladder-${t.id}`}
                          style={[s.quickAddChip, isLadder && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                          onPress={() => setBulkAddTierIds(ladder)}
                          testID={`quick-add-tier-ladder-${t.id}`}
                        >
                          <Text style={[s.quickAddChipTxt, isLadder && { color: T.cardDark }]}>{t.name}+</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {svc.tiers.map(t => {
                      const active = bulkAddTierIds.includes(t.id);
                      return (
                        <TouchableOpacity
                          key={`tier-pick-${t.id}`}
                          style={[s.quickAddChip, active && { backgroundColor: T.green, borderColor: T.green }]}
                          onPress={() => setBulkAddTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                          testID={`quick-add-tier-pick-${t.id}`}
                        >
                          <Text style={[s.quickAddChipTxt, active && { color: T.cardDark }]}>{t.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={s.quickAddLbl}>QUICK ADD ({allActive ? 'all tiers' : `${effectiveTierIds.length} tier${effectiveTierIds.length > 1 ? 's' : ''}`}):</Text>
                  <View style={s.quickAddRow}>
                    <TouchableOpacity
                      style={[s.quickAddChip, { backgroundColor: T.green, borderColor: T.green }]}
                      onPress={() => {
                        let added = 0;
                        for (const mv of playerOwnUnstreamedReleased) {
                          const r = addMovieToStreaming(svc.id, mv.id, effectiveTierIds);
                          if (!r.error) added++;
                        }
                        notify('Bulk Add ✓', `Added ${added}/${playerOwnUnstreamedReleased.length} titles to ${allActive ? 'all tiers' : `${effectiveTierIds.length} tier${effectiveTierIds.length > 1 ? 's' : ''}`}.`);
                        setShowAddCatalog(false);
                      }}
                      testID="quick-add-all"
                    >
                      <Text style={[s.quickAddChipTxt, { color: T.cardDark }]}>+ ALL ({playerOwnUnstreamedReleased.length})</Text>
                    </TouchableOpacity>
                    {/* By Year groups */}
                    {(() => {
                      const byYear: Record<number, number> = {};
                      for (const mv of playerOwnUnstreamedReleased) byYear[mv.releaseYear] = (byYear[mv.releaseYear] || 0) + 1;
                      const years = Object.keys(byYear).map(y => +y).sort((a, b) => b - a).slice(0, 4);
                      return years.map(y => (
                        <TouchableOpacity
                          key={`y-${y}`}
                          style={s.quickAddChip}
                          onPress={() => {
                            let added = 0;
                            for (const mv of playerOwnUnstreamedReleased.filter(m => m.releaseYear === y)) {
                              const r = addMovieToStreaming(svc.id, mv.id, effectiveTierIds);
                              if (!r.error) added++;
                            }
                            notify('Year Add ✓', `Added ${added} titles from Y${y}.`);
                          }}
                          testID={`quick-add-year-${y}`}
                        >
                          <Text style={s.quickAddChipTxt}>Y{y} ({byYear[y]})</Text>
                        </TouchableOpacity>
                      ));
                    })()}
                    {/* By Franchise groups */}
                    {(() => {
                      const byFr: Record<string, number> = {};
                      for (const mv of playerOwnUnstreamedReleased) {
                        if (mv.franchiseId) byFr[mv.franchiseId] = (byFr[mv.franchiseId] || 0) + 1;
                      }
                      const top = Object.entries(byFr).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3);
                      return top.map(([fid, count]) => {
                        const fr = state.franchises.find(f => f.id === fid);
                        if (!fr) return null;
                        return (
                          <TouchableOpacity
                            key={`fr-${fid}`}
                            style={[s.quickAddChip, { borderColor: T.magenta }]}
                            onPress={() => {
                              let added = 0;
                              for (const mv of playerOwnUnstreamedReleased.filter(m => m.franchiseId === fid)) {
                                const r = addMovieToStreaming(svc.id, mv.id, effectiveTierIds);
                                if (!r.error) added++;
                              }
                              notify('Franchise Add ✓', `Added ${added} ${fr.name} titles.`);
                            }}
                            testID={`quick-add-fr-${fid}`}
                          >
                            <Text style={[s.quickAddChipTxt, { color: T.magenta }]}>{fr.name.slice(0, 14)} ({count})</Text>
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </>
              );
            })()}
          </View>
        )}
        {showAddCatalog && playerOwnUnstreamedReleased.map(m => (
          <View key={m.id} style={s.movieRow}>
            <View style={[s.movieIcon, { backgroundColor: m.iconBg }]}>
              <MaterialCommunityIcons name={m.iconKey as any} size={18} color="#fff" />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 8 }}>
              <Text style={s.movieTitle} numberOfLines={1}>{m.title}</Text>
              <Text style={s.movieSub}>Y{m.releaseYear} · {m.brand} · Critic {m.criticScore}</Text>
            </View>
            <TouchableOpacity
              style={s.addBtn}
              onPress={() => {
                // Open tier picker — default = all tiers
                setAddMovieId(m.id);
                setAddTierIds(svc.tiers.map(t => t.id));
              }}
              testID={`add-catalog-${m.id}`}
            >
              <MaterialCommunityIcons name="plus" size={18} color={T.cardDark} />
              <Text style={s.addBtnTxt}>Add</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* License External Titles section */}
        {isMine && (
          <>
            <SectionHeader title={`License External Titles · ${(svc.licensedMovies || []).length} active`} />
            {(svc.licensedMovies || []).length > 0 && (
              <View style={s.licensedSummary}>
                {(svc.licensedMovies || []).map(l => {
                  const m = state.movies.find(mm => mm.id === l.movieId);
                  if (!m) return null;
                  const wksLeft = (l.expiresYear - state.year) * 48 + (l.expiresWeek - state.week);
                  const totalWks = l.yearsLicensed * 48;
                  const isEarly = wksLeft > totalWks / 2;
                  return (
                    <View key={l.movieId} style={s.licensedRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.licensedTitle} numberOfLines={1}>{m.title}</Text>
                        <Text style={s.licensedExp}>
                          {wksLeft}w left · {l.tierIds && l.tierIds.length ? `${l.tierIds.length} tier${l.tierIds.length > 1 ? 's' : ''}` : 'all tiers'} · paid ${l.feePaid.toFixed(1)}M
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={s.licEditBtn}
                        onPress={() => {
                          setEditLicTierMovieId(l.movieId);
                          setEditLicTierIds(l.tierIds && l.tierIds.length ? [...l.tierIds] : svc.tiers.map(t => t.id));
                        }}
                        testID={`edit-lic-tier-${l.movieId}`}
                      >
                        <MaterialCommunityIcons name="layers-edit" size={14} color={T.cardDark} />
                        <Text style={s.licEditTxt}>Edit Tiers</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.renewBtn, isEarly && { backgroundColor: T.green }]}
                        onPress={() => {
                          const r = renewLicense(svc.id, l.movieId, 3);
                          if (r.error) notify('Cannot renew', r.error);
                          else notify('Renewed', `${m.title} extended +3y${isEarly ? ' (-25% early)' : ''}.`);
                        }}
                        testID={`renew-${l.movieId}`}>
                        <MaterialCommunityIcons name="autorenew" size={14} color={T.cardDark} />
                        <Text style={s.renewBtnTxt}>+3y{isEarly ? ' -25%' : ''}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
            <TouchableOpacity style={s.editBtn} onPress={() => setShowLicensePicker(v => !v)} testID="toggle-license-picker">
              <MaterialCommunityIcons name={showLicensePicker ? 'close' : 'cash-multiple'} size={16} color={T.yellow} />
              <Text style={[s.editBtnTxt, { color: T.yellow }]}>
                {showLicensePicker ? 'Done' : `Browse ${externalLicensableMovies.length} licensable titles →`}
              </Text>
            </TouchableOpacity>
            {showLicensePicker && externalLicensableMovies.slice(0, 30).map(m => {
              const owner = state.rivals.find(r => r.id === m.studioId);
              const fee1 = computeLicenseFee(m, 1, state.week, state.year);
              const fee3 = computeLicenseFee(m, 3, state.week, state.year);
              const lock = exclusiveLockMap[m.id];
              return (
                <View key={m.id} style={[s.movieRow, lock && { opacity: 0.6, borderColor: T.orange, borderWidth: 1 }]}>
                  <View style={[s.movieIcon, { backgroundColor: m.iconBg }]}>
                    <MaterialCommunityIcons name={m.iconKey as any} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 8 }}>
                    <Text style={s.movieTitle} numberOfLines={1}>{m.title}{lock ? ' 🔒' : ''}</Text>
                    <Text style={s.movieSub}>{owner?.name} · {m.brand} · Critic {m.criticScore} · ${(m.boxOffice * 1000).toFixed(0)}M BO</Text>
                    {lock ? (
                      <Text style={[s.movieSub, { color: T.orange, fontWeight: '800' }]} numberOfLines={2}>
                        🔒 EXCLUSIVE to {lock.svcName} ({lock.ownerName}){lock.expiresLabel ? ` until ${lock.expiresLabel}` : ''}
                      </Text>
                    ) : (
                      <Text style={[s.movieSub, { color: T.yellow }]}>1y: ${fee1.toFixed(1)}M · 3y: ${fee3.toFixed(1)}M</Text>
                    )}
                  </View>
                  {lock ? (
                    <View style={[s.addBtn, { backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.orange }]}>
                      <MaterialCommunityIcons name="lock" size={16} color={T.orange} />
                      <Text style={[s.addBtnTxt, { color: T.orange }]}>Locked</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[s.addBtn, { backgroundColor: T.yellow }]}
                      onPress={() => {
                        setLicenseMovieId(m.id);
                        setLicenseYears(3);
                        setLicenseTierIds(svc.tiers.map(t => t.id));
                      }}
                      testID={`license-${m.id}`}>
                      <MaterialCommunityIcons name="cash" size={16} color={T.cardDark} />
                      <Text style={s.addBtnTxt}>License</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        {catalogMovies.length === 0 ? (
          <Text style={s.empty}>No titles in catalog yet.</Text>
        ) : catalogMovies.map(m => {
          const isExcl = (editingService ? draftExclusiveMovies : (svc.exclusiveMovieIds || [])).includes(m.id);
          const access = svc.movieTierAccess?.[m.id];
          const tierAccessLabel = !access || !access.length || access.length >= svc.tiers.length
            ? 'All tiers'
            : access.map(tid => svc.tiers.find(t => t.id === tid)?.name || '?').join(' · ');
          const isOwned = m.studioId === state.player.id;
          // V44 — Detect license exclusivity for licensed-in titles
          const lic = (svc.licensedMovies || []).find(l => l.movieId === m.id);
          const isLicExclusive = !!lic?.exclusivity;
          const exclusiveBadge = (isOwned && isExcl) ? ' ★ OWN-EXCL' : isLicExclusive ? ' 🔒 EXCL LICENSE' : '';
          const isBulkSelected = bulkSelectedMovieIds.includes(m.id);
          return (
            <View
              key={m.id}
              style={[s.movieRow, isBulkSelected && { borderLeftWidth: 4, borderLeftColor: T.magenta }]}
              testID={`catalog-row-${m.id}`}
            >
              {bulkSelectMode && isMine && (
                <TouchableOpacity
                  style={[s.bulkCheckbox, isBulkSelected && { backgroundColor: T.magenta, borderColor: T.magenta }]}
                  onPress={() => setBulkSelectedMovieIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])}
                  testID={`bulk-check-${m.id}`}
                >
                  {isBulkSelected ? <MaterialCommunityIcons name="check" size={14} color={T.cardDark} /> : null}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => {
                  if (bulkSelectMode && isMine) {
                    setBulkSelectedMovieIds(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]);
                  } else {
                    router.push(`/movie/${m.id}`);
                  }
                }}
                testID={`catalog-open-${m.id}`}
              >
                <View style={[s.movieIcon, { backgroundColor: m.iconBg }]}>
                  <MaterialCommunityIcons name={m.iconKey as any} size={18} color="#fff" />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 8 }}>
                  <Text style={s.movieTitle} numberOfLines={1}>{m.title}{exclusiveBadge}</Text>
                  <Text style={s.movieSub}>Y{m.releaseYear} · {m.brand} · Critic {m.criticScore}</Text>
                  <Text style={[s.movieSub, { color: T.cyan }]} numberOfLines={1}>📺 {tierAccessLabel}</Text>
                </View>
              </TouchableOpacity>
              {!bulkSelectMode && isMine && !editingService && isOwned && (
                <TouchableOpacity
                  onPress={() => {
                    setEditTierMovieId(m.id);
                    setEditTierIds(access && access.length ? [...access] : svc.tiers.map(t => t.id));
                  }}
                  style={s.tierEditBtn}
                  testID={`edit-tier-access-${m.id}`}
                >
                  <MaterialCommunityIcons name="layers-edit" size={16} color={T.cyan} />
                </TouchableOpacity>
              )}
              {!bulkSelectMode && isMine && !editingService && !isOwned && (() => {
                // Licensed-in movie row: surface SAME edit-tier button as owned.
                const lic = (svc.licensedMovies || []).find(l => l.movieId === m.id);
                if (!lic) return null;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setEditLicTierMovieId(m.id);
                      setEditLicTierIds(lic.tierIds && lic.tierIds.length ? [...lic.tierIds] : svc.tiers.map(t => t.id));
                    }}
                    style={[s.tierEditBtn, { borderColor: T.magenta }]}
                    testID={`edit-lic-tier-row-${m.id}`}
                  >
                    <MaterialCommunityIcons name="layers-edit" size={16} color={T.magenta} />
                  </TouchableOpacity>
                );
              })()}
              {!bulkSelectMode && isMine && editingService && (
                <TouchableOpacity onPress={() => toggleMovieExclusive(m.id)} style={[s.iconBtn, { borderColor: isExcl ? T.yellow : T.border }]} testID={`excl-movie-${m.id}`}>
                  <MaterialCommunityIcons name={isExcl ? 'star' : 'star-outline'} size={16} color={T.yellow} />
                </TouchableOpacity>
              )}
              {!bulkSelectMode && isMine && !editingService && (
                <TouchableOpacity
                  onPress={() => removeMovieFromStreaming(svc.id, m.id)}
                  style={s.removeBtn}
                  testID={`remove-catalog-${m.id}`}
                >
                  <MaterialCommunityIcons name="close" size={18} color={T.orange} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* License confirmation modal */}
      {licenseMovieId && (() => {
        const m = state.movies.find(mm => mm.id === licenseMovieId);
        if (!m) return null;
        const owner = state.rivals.find(r => r.id === m.studioId);
        const fr = m.franchiseId ? state.franchises.find(f => f.id === m.franchiseId) : undefined;
        const fee = computeLicenseFee(m, licenseYears, state.week, state.year, {
          exclusivity: licenseExclusive,
          ownerRating: owner?.rating,
          franchisePopularity: fr?.popularity,
        });
        return (
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <ScrollView showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
              <Text style={s.modalTitle}>License "{m.title}"</Text>
              <Text style={s.modalSub}>From {owner?.name} (rating {owner?.rating || '—'}★) {fr ? `· ${fr.name} (pop ${fr.popularity})` : ''}</Text>
              <Text style={s.modalLabel}>Duration</Text>
              <View style={s.tierToggleRow}>
                {[1, 3, 5, 10].map(y => (
                  <TouchableOpacity key={y}
                    style={[s.tierToggle, licenseYears === y && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                    onPress={() => setLicenseYears(y as any)}>
                    <Text style={[s.tierToggleT, licenseYears === y && { color: T.cardDark }]}>{y}y</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.modalLabel}>Exclusivity</Text>
              <View style={s.tierToggleRow}>
                <TouchableOpacity
                  style={[s.tierToggle, !licenseExclusive && { backgroundColor: T.card, borderColor: T.cyan }]}
                  onPress={() => setLicenseExclusive(false)} testID="license-non-excl">
                  <Text style={[s.tierToggleT, { color: !licenseExclusive ? T.cyan : T.text }]}>Non-exclusive</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.tierToggle, licenseExclusive && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                  onPress={() => setLicenseExclusive(true)} testID="license-excl">
                  <Text style={[s.tierToggleT, { color: licenseExclusive ? T.cardDark : T.text }]}>EXCLUSIVE (×1.6)</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.modalLabel}>Tier Access (empty = all)</Text>
              {(() => {
                const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
                const allSelected = licenseTierIds.length === 0 || licenseTierIds.length === svc.tiers.length;
                return (
                  <>
                    <View style={s.tierToggleRow}>
                      <TouchableOpacity style={[s.tierToggle, allSelected && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                        onPress={() => setLicenseTierIds([])} testID="lic-mod-all">
                        <Text style={[s.tierToggleT, allSelected && { color: T.cardDark }]}>All Tiers</Text>
                      </TouchableOpacity>
                      {tiersByPrice.map((t, idx) => {
                        if (idx === 0) return null;
                        const ladder = tiersByPrice.slice(idx).map(x => x.id);
                        const isLadder = ladder.length === licenseTierIds.length && ladder.every(id => licenseTierIds.includes(id));
                        return (
                          <TouchableOpacity key={`lic-mod-l-${t.id}`}
                            style={[s.tierToggle, isLadder && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                            onPress={() => setLicenseTierIds(ladder)} testID={`lic-mod-ladder-${t.id}`}>
                            <Text style={[s.tierToggleT, isLadder && { color: T.cardDark }]}>{t.name}+</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={[s.tierToggleRow, { marginTop: 6 }]}>
                      {svc.tiers.map(t => {
                        const active = licenseTierIds.includes(t.id);
                        return (
                          <TouchableOpacity key={t.id}
                            style={[s.tierToggle, active && { backgroundColor: T.green, borderColor: T.green }]}
                            onPress={() => setLicenseTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}>
                            <Text style={[s.tierToggleT, active && { color: T.cardDark }]}>{t.name} {active ? '✓' : ''}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                );
              })()}
              <Text style={[s.modalLabel, { color: T.green, fontSize: 18, marginTop: 12 }]}>
                Fair Fee: ${fee.toFixed(2)}M{licenseExclusive ? ' (exclusive premium)' : ''}
              </Text>
              <Text style={s.modalSub}>Cash: ${(state.player.cash * 1000).toFixed(0)}M</Text>

              <Text style={s.modalLabel}>YOUR OFFER (negotiate, leave empty to pay fair fee)</Text>
              <TextInput
                value={licenseOfferedFee}
                onChangeText={setLicenseOfferedFee}
                keyboardType="decimal-pad"
                placeholder={`e.g. ${(fee * 0.85).toFixed(0)} (88%+ of fair = accepted)`}
                placeholderTextColor={T.textMute}
                style={[s.input, { marginTop: 6 }]}
                testID="license-offer-input"
              />

              {licenseChainCounter ? (
                <View style={[s.modalCard, { padding: 10, marginTop: 8, borderColor: T.yellow, backgroundColor: T.cardDark }]}>
                  <Text style={{ color: T.yellow, fontWeight: '900', fontSize: 12 }}>STUDIO COUNTER (Round {licenseRound})</Text>
                  <Text style={{ color: T.text, marginTop: 4, fontWeight: '700' }}>${licenseChainCounter.feeM.toFixed(1)}M — {licenseChainCounter.reason}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green, flex: 1 }]}
                      onPress={() => {
                        const r = licenseMovieToStreaming(svc.id, { movieId: licenseMovieId!, yearsLicensed: licenseYears, tierIds: licenseTierIds, exclusivity: licenseExclusive });
                        if (r.error) notify('Cannot license', r.error);
                        else {
                          // Override the paid fee to the counter
                          notify('Counter accepted!', `${m.title} signed at $${licenseChainCounter.feeM.toFixed(1)}M.`);
                          setLicenseMovieId(null); setLicenseExclusive(false); setLicenseChainCounter(null); setLicenseOfferedFee(''); setLicenseRound(1);
                        }
                      }} testID="accept-license-counter">
                      <Text style={[s.actionTxt, { color: T.cardDark }]}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.cyan, flex: 1 }]}
                      onPress={() => { setLicenseOfferedFee(licenseChainCounter!.feeM.toFixed(1)); setLicenseChainCounter(null); }}
                      testID="counter-license-again">
                      <Text style={[s.actionTxt, { color: T.cardDark }]}>Counter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.card, flex: 1 }]} onPress={() => { setLicenseMovieId(null); setLicenseExclusive(false); setLicenseChainCounter(null); setLicenseOfferedFee(''); setLicenseRound(1); }}>
                  <Text style={[s.actionTxt, { color: T.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green, flex: 1 }]}
                  onPress={() => {
                    const offered = parseFloat(licenseOfferedFee);
                    if (!isNaN(offered) && offered > 0 && offered < fee) {
                      // Negotiation path
                      const r = negotiateMovieLicense(svc.id, { movieId: licenseMovieId!, yearsLicensed: licenseYears, tierIds: licenseTierIds, exclusivity: licenseExclusive, offeredFeeM: offered });
                      if (r.error) { notify('Cannot negotiate', r.error); return; }
                      if (r.accepted) {
                        notify('Deal Signed!', `${m.title} licensed at your offer of $${offered.toFixed(1)}M.`);
                        setLicenseMovieId(null); setLicenseExclusive(false); setLicenseChainCounter(null); setLicenseOfferedFee(''); setLicenseRound(1);
                      } else if (r.counter) {
                        setLicenseChainCounter(r.counter);
                        setLicenseRound(licenseRound + 1);
                      }
                    } else {
                      // Pay fair fee directly
                      const r = licenseMovieToStreaming(svc.id, { movieId: licenseMovieId!, yearsLicensed: licenseYears, tierIds: licenseTierIds, exclusivity: licenseExclusive });
                      if (r.error) notify('Cannot license', r.error);
                      else {
                        notify('Licensed!', `${m.title} added for ${licenseYears} years${licenseExclusive ? ' (exclusive)' : ''}.`);
                        setLicenseMovieId(null); setLicenseExclusive(false); setLicenseChainCounter(null); setLicenseOfferedFee(''); setLicenseRound(1);
                      }
                    }
                  }} testID="confirm-license-deal">
                  <Text style={[s.actionTxt, { color: T.cardDark }]}>{licenseOfferedFee && parseFloat(licenseOfferedFee) < fee ? 'Negotiate' : 'Sign Deal'}</Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </View>
        );
      })()}
      {/* Add-to-catalog tier picker modal */}
      {addMovieId && (() => {
        const m = state.movies.find(mm => mm.id === addMovieId);
        if (!m) return null;
        const allSelected = addTierIds.length === svc.tiers.length;
        const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
        return (
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Add "{m.title}"</Text>
              <Text style={s.modalSub}>Pick tier access. "Tier+" = that tier and ALL higher-priced tiers (hierarchy).</Text>
              <Text style={s.modalLabel}>HIERARCHY PRESETS</Text>
              <View style={s.tierToggleRow}>
                <TouchableOpacity style={[s.tierToggle, allSelected && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                  onPress={() => setAddTierIds(svc.tiers.map(t => t.id))} testID="add-quick-all">
                  <Text style={[s.tierToggleT, allSelected && { color: T.cardDark }]}>All Tiers</Text>
                </TouchableOpacity>
                {tiersByPrice.map((t, idx) => {
                  if (idx === 0) return null;
                  const ladder = tiersByPrice.slice(idx).map(x => x.id);
                  const isLadderActive = ladder.length === addTierIds.length && ladder.every(id => addTierIds.includes(id));
                  return (
                    <TouchableOpacity key={`add-ladder-${t.id}`}
                      style={[s.tierToggle, isLadderActive && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                      onPress={() => setAddTierIds(ladder)}
                      testID={`add-ladder-${t.id}`}>
                      <Text style={[s.tierToggleT, isLadderActive && { color: T.cardDark }]}>{t.name}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.modalLabel}>CUSTOM (toggle)</Text>
              <View style={s.tierToggleRow}>
                {svc.tiers.map(t => {
                  const active = addTierIds.includes(t.id);
                  return (
                    <TouchableOpacity key={t.id}
                      style={[s.tierToggle, active && { backgroundColor: T.green, borderColor: T.green }]}
                      onPress={() => setAddTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                      testID={`add-tier-${t.id}`}>
                      <Text style={[s.tierToggleT, active && { color: T.cardDark }]}>{t.name} {active ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.card, flex: 1 }]} onPress={() => setAddMovieId(null)} testID="cancel-add-tiers">
                  <Text style={[s.actionTxt, { color: T.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.green, flex: 1 }]}
                  onPress={() => {
                    if (!addTierIds.length) { notify('Pick at least one tier', 'Select where this movie should be available.'); return; }
                    const r = addMovieToStreaming(svc.id, addMovieId, addTierIds);
                    if (r.error) notify('Cannot add', r.error);
                    else setAddMovieId(null);
                  }} testID="confirm-add-tiers">
                  <Text style={[s.actionTxt, { color: T.cardDark }]}>Add to Catalog</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Edit-tier-access modal for catalog movies */}
      {editTierMovieId && (() => {
        const m = state.movies.find(mm => mm.id === editTierMovieId);
        if (!m) return null;
        const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
        const allSelected = editTierIds.length === svc.tiers.length;
        return (
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>"{m.title}" — Tier Access</Text>
              <Text style={s.modalSub}>Toggle which tiers can stream this title. Use "Tier+" to grant a tier AND all higher tiers (hierarchy).</Text>
              <Text style={s.modalLabel}>HIERARCHY PRESETS</Text>
              <View style={s.tierToggleRow}>
                <TouchableOpacity style={[s.tierToggle, allSelected && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                  onPress={() => setEditTierIds(svc.tiers.map(t => t.id))} testID="edit-quick-all">
                  <Text style={[s.tierToggleT, allSelected && { color: T.cardDark }]}>All Tiers</Text>
                </TouchableOpacity>
                {tiersByPrice.map((t, idx) => {
                  if (idx === 0) return null; // skip cheapest (== all tiers)
                  const ladder = tiersByPrice.slice(idx).map(x => x.id);
                  const isLadderActive = ladder.length === editTierIds.length && ladder.every(id => editTierIds.includes(id));
                  return (
                    <TouchableOpacity key={`ladder-${t.id}`}
                      style={[s.tierToggle, isLadderActive && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                      onPress={() => setEditTierIds(ladder)}
                      testID={`edit-ladder-${t.id}`}>
                      <Text style={[s.tierToggleT, isLadderActive && { color: T.cardDark }]}>{t.name}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.modalLabel}>CUSTOM</Text>
              <View style={s.tierToggleRow}>
                {svc.tiers.map(t => {
                  const active = editTierIds.includes(t.id);
                  return (
                    <TouchableOpacity key={t.id}
                      style={[s.tierToggle, active && { backgroundColor: T.green, borderColor: T.green }]}
                      onPress={() => setEditTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                      testID={`edit-tier-${t.id}`}>
                      <Text style={[s.tierToggleT, active && { color: T.cardDark }]}>{t.name} {active ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.card, flex: 1 }]} onPress={() => setEditTierMovieId(null)}>
                  <Text style={[s.actionTxt, { color: T.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.cyan, flex: 1 }]}
                  onPress={() => {
                    const r = setMovieTierAccess(svc.id, editTierMovieId, editTierIds);
                    if (r.error) notify('Cannot save', r.error);
                    else setEditTierMovieId(null);
                  }} testID="save-tier-access">
                  <Text style={[s.actionTxt, { color: T.cardDark }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Edit-tier-access modal for LICENSED-IN movies */}
      {editLicTierMovieId && (() => {
        const m = state.movies.find(mm => mm.id === editLicTierMovieId);
        if (!m) return null;
        const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
        const allSelected = editLicTierIds.length === svc.tiers.length;
        return (
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>"{m.title}" — Licensed Tier Access</Text>
              <Text style={s.modalSub}>Select which tiers carry this licensed-in title. Use "Tier+" for hierarchy.</Text>
              <Text style={s.modalLabel}>HIERARCHY PRESETS</Text>
              <View style={s.tierToggleRow}>
                <TouchableOpacity style={[s.tierToggle, allSelected && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                  onPress={() => setEditLicTierIds(svc.tiers.map(t => t.id))} testID="lic-quick-all">
                  <Text style={[s.tierToggleT, allSelected && { color: T.cardDark }]}>All Tiers</Text>
                </TouchableOpacity>
                {tiersByPrice.map((t, idx) => {
                  if (idx === 0) return null;
                  const ladder = tiersByPrice.slice(idx).map(x => x.id);
                  const isLadderActive = ladder.length === editLicTierIds.length && ladder.every(id => editLicTierIds.includes(id));
                  return (
                    <TouchableOpacity key={`lic-ladder-${t.id}`}
                      style={[s.tierToggle, isLadderActive && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                      onPress={() => setEditLicTierIds(ladder)}
                      testID={`lic-ladder-${t.id}`}>
                      <Text style={[s.tierToggleT, isLadderActive && { color: T.cardDark }]}>{t.name}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.modalLabel}>CUSTOM</Text>
              <View style={s.tierToggleRow}>
                {svc.tiers.map(t => {
                  const active = editLicTierIds.includes(t.id);
                  return (
                    <TouchableOpacity key={t.id}
                      style={[s.tierToggle, active && { backgroundColor: T.green, borderColor: T.green }]}
                      onPress={() => setEditLicTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                      testID={`lic-tier-${t.id}`}>
                      <Text style={[s.tierToggleT, active && { color: T.cardDark }]}>{t.name} {active ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.card, flex: 1 }]} onPress={() => setEditLicTierMovieId(null)}>
                  <Text style={[s.actionTxt, { color: T.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.cyan, flex: 1 }]}
                  onPress={() => {
                    const r = setLicensedMovieTierAccess(svc.id, editLicTierMovieId, editLicTierIds);
                    if (r.error) notify('Cannot save', r.error);
                    else setEditLicTierMovieId(null);
                  }} testID="save-lic-tier-access">
                  <Text style={[s.actionTxt, { color: T.cardDark }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}

      {/* V30 — Bulk tier editor modal: change tier hierarchy on multiple selected movies at once */}
      {showBulkTierEditor && (() => {
        const tiersByPrice = [...svc.tiers].sort((a, b) => a.price - b.price);
        const allSelected = bulkEditTierIds.length === svc.tiers.length;
        return (
          <View style={s.modalBg}>
            <View style={s.modalCard}>
              <Text style={s.modalTitle}>Bulk Tier Change · {bulkSelectedMovieIds.length} title{bulkSelectedMovieIds.length !== 1 ? 's' : ''}</Text>
              <Text style={s.modalSub}>Pick the tier hierarchy that should apply to ALL selected movies (owned and licensed-in). Each title will be updated.</Text>
              <Text style={s.modalLabel}>HIERARCHY PRESETS</Text>
              <View style={s.tierToggleRow}>
                <TouchableOpacity style={[s.tierToggle, allSelected && { backgroundColor: T.cyan, borderColor: T.cyan }]}
                  onPress={() => setBulkEditTierIds(svc.tiers.map(t => t.id))} testID="bulk-edit-quick-all">
                  <Text style={[s.tierToggleT, allSelected && { color: T.cardDark }]}>All Tiers</Text>
                </TouchableOpacity>
                {tiersByPrice.map((t, idx) => {
                  if (idx === 0) return null;
                  const ladder = tiersByPrice.slice(idx).map(x => x.id);
                  const isLadderActive = ladder.length === bulkEditTierIds.length && ladder.every(tid => bulkEditTierIds.includes(tid));
                  return (
                    <TouchableOpacity key={`bulk-ladder-${t.id}`}
                      style={[s.tierToggle, isLadderActive && { backgroundColor: T.yellow, borderColor: T.yellow }]}
                      onPress={() => setBulkEditTierIds(ladder)}
                      testID={`bulk-edit-ladder-${t.id}`}>
                      <Text style={[s.tierToggleT, isLadderActive && { color: T.cardDark }]}>{t.name}+</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.modalLabel}>CUSTOM</Text>
              <View style={s.tierToggleRow}>
                {svc.tiers.map(t => {
                  const active = bulkEditTierIds.includes(t.id);
                  return (
                    <TouchableOpacity key={t.id}
                      style={[s.tierToggle, active && { backgroundColor: T.green, borderColor: T.green }]}
                      onPress={() => setBulkEditTierIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                      testID={`bulk-edit-tier-${t.id}`}>
                      <Text style={[s.tierToggleT, active && { color: T.cardDark }]}>{t.name} {active ? '✓' : ''}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: T.card, flex: 1 }]} onPress={() => setShowBulkTierEditor(false)} testID="bulk-edit-cancel">
                  <Text style={[s.actionTxt, { color: T.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: T.magenta, flex: 1 }]}
                  onPress={() => {
                    let ownedUpdated = 0, licensedUpdated = 0, errors = 0;
                    for (const mid of bulkSelectedMovieIds) {
                      const mv = state.movies.find(mm => mm.id === mid);
                      if (!mv) continue;
                      if (mv.studioId === state.player.id) {
                        const r = setMovieTierAccess(svc.id, mid, bulkEditTierIds);
                        if (r.error) errors++; else ownedUpdated++;
                      } else {
                        const r = setLicensedMovieTierAccess(svc.id, mid, bulkEditTierIds);
                        if (r.error) errors++; else licensedUpdated++;
                      }
                    }
                    setShowBulkTierEditor(false);
                    setBulkSelectedMovieIds([]);
                    setBulkSelectMode(false);
                    notify('Bulk Tier Change ✓', `Updated ${ownedUpdated} owned + ${licensedUpdated} licensed${errors ? ` (${errors} errors)` : ''}.`);
                  }}
                  testID="bulk-edit-apply"
                >
                  <MaterialCommunityIcons name="layers-edit" size={16} color={T.cardDark} />
                  <Text style={[s.actionTxt, { color: T.cardDark }]}>Apply to {bulkSelectedMovieIds.length}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}
    </SafeAreaView>
  );
}

function NumField({ label, value, step, min, max, onChange }: { label: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={s.numField}>
      <Text style={s.numLabel}>{label}</Text>
      <View style={s.numCtl}>
        <TouchableOpacity onPress={() => onChange(Math.max(min, value - step))} style={s.numBtn}>
          <Text style={s.numBtnTxt}>−</Text>
        </TouchableOpacity>
        <Text style={s.numVal}>{label === 'Price' ? value.toFixed(2) : value.toString()}</Text>
        <TouchableOpacity onPress={() => onChange(Math.min(max, value + step))} style={s.numBtn}>
          <Text style={s.numBtnTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', backgroundColor: T.cardDark, padding: 12, alignItems: 'center' },
  logo: { width: 70, height: 70, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.border },
  svcName: { color: T.text, fontSize: 22, fontWeight: '900' },
  svcSub: { color: T.textDim, fontSize: 13, marginTop: 2 },
  youTag: { color: T.cardDark, backgroundColor: T.cyan, fontSize: 9, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, alignSelf: 'flex-start' },
  statRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 8, gap: 6, flexWrap: 'wrap' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnTxt: { color: T.cyan, fontWeight: '800', fontSize: 12 },
  tierCard: { backgroundColor: T.cardDark, marginHorizontal: 8, marginBottom: 6, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: T.border },
  tierHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  tierName: { color: T.text, fontWeight: '900', fontSize: 16 },
  tierPrice: { color: T.green, fontWeight: '900', fontSize: 14 },
  tierMeta: { color: T.textDim, fontSize: 12, marginTop: 4 },
  input: { backgroundColor: T.card, borderWidth: 1.5, borderColor: T.border, color: T.text, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontSize: 13 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  periodChip: { backgroundColor: T.card, borderWidth: 1.5, borderColor: T.border, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  periodTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
  numRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  adRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  adToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: T.cardDark, borderWidth: 1.5, borderColor: T.magenta },
  adToggleTxt: { color: T.magenta, fontWeight: '800', fontSize: 12 },
  mktCard: { marginHorizontal: 8, marginTop: 8, padding: 12, backgroundColor: T.cardDark, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  mktTitle: { color: T.text, fontWeight: '800', fontSize: 13, marginBottom: 6 },
  mktSub: { color: T.textDim, fontSize: 11, marginBottom: 8 },
  mktButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mktChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  mktChipActive: { backgroundColor: T.green, borderColor: T.green },
  mktChipText: { color: T.text, fontWeight: '700', fontSize: 12 },
  numField: { flex: 1 },
  numLabel: { color: T.textDim, fontSize: 10, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  numCtl: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.card, borderRadius: 8, borderWidth: 1, borderColor: T.border, justifyContent: 'space-between', paddingHorizontal: 4 },
  numBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  numBtnTxt: { color: T.cyan, fontSize: 18, fontWeight: '900' },
  numVal: { color: T.text, fontWeight: '900', fontSize: 13 },
  addTier: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: T.green, borderStyle: 'dashed' as any },
  addTierTxt: { color: T.green, fontWeight: '900', fontSize: 13 },
  actionBtn: { padding: 12, borderRadius: 10, borderWidth: 2, borderColor: T.border, alignItems: 'center' },
  actionTxt: { fontWeight: '900', fontSize: 14 },
  movieRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardDark, padding: 8, marginHorizontal: 8, marginBottom: 4, borderRadius: 8, borderWidth: 1, borderColor: T.border, gap: 8 },
  movieIcon: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  movieTitle: { color: T.text, fontWeight: '800', fontSize: 14 },
  movieSub: { color: T.textDim, fontSize: 11 },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.green, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 2 },
  addBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 12 },
  removeBtn: { padding: 4 },
  tierEditBtn: { padding: 6, borderRadius: 6, borderWidth: 1.5, borderColor: T.cyan, backgroundColor: T.card, marginRight: 4 },
  empty: { color: T.textMute, padding: 16, fontStyle: 'italic', textAlign: 'center' },
  iconBtn: { padding: 6, borderRadius: 8, borderWidth: 2, borderColor: T.cyan, backgroundColor: T.card },
  editSection: { paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  exclChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1.5, borderColor: T.border },
  exclTxt: { color: T.text, fontSize: 11, fontWeight: '700' },
  helpText: { color: T.textDim, fontSize: 11, fontStyle: 'italic', paddingHorizontal: 4 },
  licensedSummary: { paddingHorizontal: 8, gap: 4 },
  licensedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: T.card, borderRadius: 6, borderLeftWidth: 3, borderLeftColor: T.yellow, gap: 6 },
  licensedTitle: { color: T.text, fontWeight: '800', fontSize: 12 },
  licensedExp: { color: T.yellow, fontSize: 10, fontWeight: '700', marginTop: 2 },
  renewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cyan, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, gap: 3 },
  renewBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 10 },
  licEditBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.magenta, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, gap: 3 },
  licEditTxt: { color: T.cardDark, fontWeight: '900', fontSize: 11 },
  bulkCheckbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: T.magenta, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  modalBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: T.cardDark, padding: 16, borderRadius: 14, width: '100%', maxWidth: 380, maxHeight: '92%', borderWidth: 2, borderColor: T.border },
  modalTitle: { color: T.text, fontWeight: '900', fontSize: 18, marginBottom: 4 },
  modalSub: { color: T.textDim, fontSize: 12 },
  modalLabel: { color: T.textDim, fontSize: 11, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  tierToggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tierToggle: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: T.card, borderWidth: 2, borderColor: T.border },
  tierToggleT: { color: T.text, fontWeight: '800', fontSize: 12 },
  quickAddBar: { backgroundColor: T.cardDark, borderRadius: 10, padding: 8, marginVertical: 6, borderWidth: 1, borderColor: T.green },
  quickAddLbl: { color: T.green, fontWeight: '900', fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  quickAddRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickAddChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  quickAddChipTxt: { color: T.text, fontWeight: '800', fontSize: 11 },
});
