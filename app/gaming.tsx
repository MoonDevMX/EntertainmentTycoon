import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T } from '../src/ui/theme';
import { TopBar } from '../src/ui/components';
import { uiAlert } from '../src/ui/ui-alert';
import { 
  GENRE_FEATURES_WEIGHTS, 
  ENGINE_MODULES_SPECS, 
  ENGINE_GENERATIONS, 
  STUDIO_ROOMS_DETAIL, 
  ROLE_WEEKLY_SALARY,
  GAMING_WELFARE_SPECS,
  GAMING_CRUNCH_SPECS,
  STUDIO_PERK_SPECS,
  GAMING_PASS_PRICE_SPECS,
  GAMING_PASS_SCOPE_SPECS,
  GAMING_PASS_AD_SPECS
} from '../src/game/gaming';
import { GameEngineModule, GamingStudioType, GamingProject } from '../src/game/types';
import { monthOf } from '../src/game/data';

type GamingTab = 'news' | 'studios' | 'pipeline' | 'games_library' | 'engines' | 'consoles' | 'gamepass' | 'publishers_deals' | 'trends';

export default function GamingDashboardScreen() {
  const router = useRouter();
  const { 
    state, 
    createEngine, 
    foundStudio, 
    startProject, 
    designConsole, 
    buildHQRoom, 
    recruitGamingStaff, 
    configurePass, 
    createMovieFromGame,
    renameGamingStudioHQ,
    deleteGamingStudioHQ,
    renameGameEngine,
    deleteGameEngine,
    renameGamingConsole,
    deleteGamingConsole,
    researchNextGen,
    toggleStudioHQPerk,
    setStudioHQPolicy,
    proposeGamingDeal,
    processGamingDealResponse,
    createORUpdateGamingPassTier,
    deleteGamingPassTier,
    bundlePassWithStreaming,
    discontinueGamingPassService,
    createGamingPass,
    renameGamingPass,
    seedGamingPassTiers,
    simulateWeek,
    simulateMultiple,
    toggleGamingProjectHold,
    cancelGamingProject
  } = useGame();

  const [activeTab, setActiveTab] = useState<GamingTab>('news');

  // Database & Search sub-states
  const [industrySubTab, setIndustrySubTab] = useState<'trends' | 'search' | 'conferences'>('trends');
  const [dbSearchQuery, setDbSearchQuery] = useState('');
  const [dbCategory, setDbCategory] = useState<'Studios' | 'Consoles' | 'Franchises' | 'Publishers'>('Studios');

  // Custom rename states
  const [renameTarget, setRenameTarget] = useState<{ kind: 'studio' | 'engine' | 'console'; id: string; currentName: string } | null>(null);
  const [renameInpVal, setRenameInpVal] = useState('');

  // Subgenre / Topic custom parameters
  const [projSubgenre, setProjSubgenre] = useState('Fantasy');

  // Modal controls
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [engineName, setEngineName] = useState('');
  const [selectedModules, setSelectedModules] = useState<GameEngineModule[]>(['Graphics', 'UI', 'Tools']);
  const [selectedGen, setSelectedGen] = useState(1);

  const [foundHQModalOpen, setFoundHQModalOpen] = useState(false);
  const [hqName, setHQName] = useState('');
  const [hqType, setHQType] = useState<GamingStudioType>('AAA');

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projGenre, setProjGenre] = useState<'RPG' | 'Action' | 'Shooter' | 'Strategy' | 'Simulation' | 'Sports' | 'Adventure' | 'MMO'>('Action');
  const [projEngineId, setProjEngineId] = useState('');
  const [projStudioId, setProjStudioId] = useState('');
  const [projMonetization, setProjMonetization] = useState<'Premium' | 'GaaS' | 'F2P' | 'Subscription' | 'AdSupported'>('Premium');
  const [projFocus, setProjFocus] = useState({
    graphics: 25,
    gameplay: 30,
    story: 15,
    multiplayer: 10,
    ai: 10,
    ui: 5,
    performance: 5
  });
  const [projBudgetM, setProjBudgetM] = useState('30');
  const [projMarketingM, setProjMarketingM] = useState('10');
  const [adaptationMovieId, setAdaptationMovieId] = useState<string>('');

  const [consoleModalOpen, setConsoleModalOpen] = useState(false);
  const [consoleTitle, setConsoleTitle] = useState('');
  const [consoleCpu, setConsoleCpu] = useState<'8-bit' | '16-bit' | '32-bit' | 'Multi-Core' | 'Custom Cloud Architecture' | 'Quantum Hybrid'>('Multi-Core');
  const [consoleGpu, setConsoleGpu] = useState<'Rasterized' | 'Fixed-Pipeline' | 'Voxel-Shaded' | 'Hardware Ray-Tracing' | 'Haptic Spatial Projection'>('Voxel-Shaded');
  const [consoleRam, setConsoleRam] = useState<'KBs' | 'MBs' | 'GBs' | 'Unified High Bandwidth'>('GBs');
  const [consoleStorage, setConsoleStorage] = useState<'Cartridge' | 'Optical' | 'SSD' | 'Direct Streaming'>('SSD');
  const [consoleBackCompat, setConsoleBackCompat] = useState(true);
  const [consoleCloud, setConsoleCloud] = useState(false);
  const [consoleOnline, setConsoleOnline] = useState(true);
  const [consolePrice, setConsolePrice] = useState('399');
  const [consoleMfgCost, setConsoleMfgCost] = useState('280');

  const [passModalOpen, setPassModalOpen] = useState(false);
  const [passPriceInput, setPassPriceInput] = useState('14.99');
  const [passBasicPrice, setPassBasicPrice] = useState('9.99');
  const [passPremiumPrice, setPassPremiumPrice] = useState('19.99');
  const [passNameInput, setPassNameInput] = useState('');
  const [passAdSupported, setPassAdSupported] = useState(false);
  const [passPricingLevel, setPassPricingLevel] = useState<'value' | 'balanced' | 'premium'>('balanced');
  const [passLibraryScope, setPassLibraryScope] = useState<'indie_only' | 'mixed_catalog' | 'day_one_aaa'>('mixed_catalog');
  const [passAdWavelength, setPassAdWavelength] = useState<'none' | 'lite_sponsored' | 'ad_heavy'>('lite_sponsored');
  const [passSelectedConsoles, setPassSelectedConsoles] = useState<string[]>([]);
  const [passSelectedGames, setPassSelectedGames] = useState<string[]>([]);

  // V44 local states
  const [addTierModalOpen, setAddTierModalOpen] = useState(false);
  const [tierEditingId, setTierEditingId] = useState<string | null>(null);
  const [tierName, setTierName] = useState('');
  const [tierPrice, setTierPrice] = useState('9.99');
  const [tierAdSupported, setTierAdSupported] = useState(false);
  const [tierPerks, setTierPerks] = useState<string[]>([]);
  const [allAvailablePerks] = useState([
    'Day-One First Party Releases',
    'Day-One AAA Releases',
    'Exclusive beta access',
    'Cloud Streaming',
    'Extended DLC catalog',
    'Advanced cross-play mods',
    'Offline gameplay support'
  ]);

  const [selectedBundleStreamSvc, setSelectedBundleStreamSvc] = useState<string>('');
  const [bundleDiscount, setBundleDiscount] = useState<number>(15);

  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [newPassName, setNewPassName] = useState('');
  const [showNewPassModal, setShowNewPassModal] = useState(false);
  const [showRenamePassModal, setShowRenamePassModal] = useState(false);
  const [renamePassInp, setRenamePassInp] = useState('');

  const [dealType, setDealType] = useState<'publishing_inbound' | 'publishing_outbound' | 'crossover_license' | 'franchise_trade' | 'gamepass_bulk_catalog'>('publishing_inbound');
  const [proposerStudioId, setProposerStudioId] = useState('');
  const [receiverStudioId, setReceiverStudioId] = useState('');
  const [dealGameId, setDealGameId] = useState('');
  const [dealFranchiseId, setDealFranchiseId] = useState('');
  const [dealUpfrontFeeM, setDealUpfrontFeeM] = useState('25');
  const [dealRoyaltyPercent, setDealRoyaltyPercent] = useState('10');
  const [dealTermsText, setDealTermsText] = useState('Day-one global catalog subscription release pipeline');

  // Time simulation and library sub-tab
  const [showMulti, setShowMulti] = useState(false);
  const [multiWeeks, setMultiWeeks] = useState('4');
  const [librarySubTab, setLibrarySubTab] = useState<'active' | 'on_hold' | 'released'>('active');

  if (!state) {
    return (
      <SafeAreaView style={style.centered}>
        <ActivityIndicator size="large" color={T.cyan} />
      </SafeAreaView>
    );
  }

  // Derived filters
  const player = state.player;
  const stars = '★'.repeat(player.rating) + '☆'.repeat(5 - player.rating);
  const playerStudios = useMemo(() => (state.gamingStudios || []).filter(h => h.studioId === state.player.id), [state.gamingStudios, state.player.id]);
  const playerStudioIds = useMemo(() => playerStudios.map(studio => studio.id), [playerStudios]);
  const playerConsoles = useMemo(() => (state.gamingConsoles || []).filter(c => c.studioId === state.player.id), [state.gamingConsoles, state.player.id]);
  const activeDevGames = useMemo(() => (state.gamingProjects || []).filter(p => (playerStudioIds.includes(p.studioId) || p.studioId === state.player.id) && p.phase !== 'Gold' && p.phase !== 'LiveOps'), [state.gamingProjects, playerStudioIds, state.player.id]);
  const releasedGames = useMemo(() => (state.gamingProjects || []).filter(p => (playerStudioIds.includes(p.studioId) || p.studioId === state.player.id) && (p.phase === 'Gold' || p.phase === 'LiveOps')), [state.gamingProjects, playerStudioIds, state.player.id]);
  const playerEngines = useMemo(() => (state.gameEngines || []).filter(e => e.studioId === state.player.id), [state.gameEngines, state.player.id]);
  
  const playerPasses = useMemo(() => (state.gamingPasses || []).filter(p => p.studioId === state.player.id), [state.gamingPasses, state.player.id]);
  const playerPass = useMemo(() => {
    if (!selectedPassId) return playerPasses[0];
    return playerPasses.find(p => p.id === selectedPassId) || playerPasses[0];
  }, [playerPasses, selectedPassId]);

  // Actions trigger handlers
  const handleCreateEngine = () => {
    if (!engineName) {
      uiAlert('R&D Input Required', 'Provide a suitable design moniker for your engine.');
      return;
    }
    const res = createEngine({ name: engineName, modules: selectedModules, generation: selectedGen });
    if (res?.error) {
      uiAlert('Funding Check Failed', res.error);
    } else {
      uiAlert('Engine Created', `Successfully built and deployed '${engineName}!'`);
      setEngineModalOpen(false);
      setEngineName('');
    }
  };

  const handleFoundHQ = () => {
    if (!hqName) {
      uiAlert('Studio Name Required', 'Provide an expressive name for your brand new studio division.');
      return;
    }
    const res = foundStudio({ name: hqName, type: hqType });
    if (res?.error) {
      uiAlert('Launch Deficit', res.error);
    } else {
      uiAlert('Studio Handoff Secured', `Established ${hqName} [${hqType}] HQ with default coding staff of developers!`);
      setFoundHQModalOpen(false);
      setHQName('');
    }
  };

  const handleStartProject = () => {
    if (!projTitle) {
      uiAlert('Title Needed', 'A great title is key to premium market engagement.');
      return;
    }
    if (!projEngineId) {
      uiAlert('Engine Required', 'Assign a licensed game engine to power your compilation pipeline.');
      return;
    }
    if (!projStudioId) {
      uiAlert('Studio Required', 'Delegate this production line to one of your operational HQs.');
      return;
    }

    const focusVal = projFocus.graphics + projFocus.gameplay + projFocus.story + projFocus.multiplayer + projFocus.ai + projFocus.ui + projFocus.performance;
    if (focusVal !== 100) {
      uiAlert('Invalid Feature Focus Weighting', `Features focus weights sum must hit 100%. Currently: ${focusVal}%`);
      return;
    }

    const res = startProject({
      title: projTitle,
      genre: projGenre,
      subgenre: projSubgenre,
      engineId: projEngineId,
      studioId: projStudioId,
      monetizationModel: projMonetization,
      featuresFocus: projFocus,
      budgetM: parseFloat(projBudgetM) || 10,
      marketingBudgetM: parseFloat(projMarketingM) || 5,
      adaptationMovieId: adaptationMovieId || undefined
    });

    if (res?.error) {
      uiAlert('Pipeline Setup Warning', res.error);
    } else {
      uiAlert('Project Booted', `Engine started! '${projTitle}' enters CONCEPT development phase.`);
      setProjectModalOpen(false);
      setProjTitle('');
    }
  };

  const handleGenericRename = () => {
    if (!renameTarget) return;
    const { kind, id } = renameTarget;
    const val = renameInpVal.trim();
    if (!val) {
      uiAlert('Input Blank', 'Please enter a valid name.');
      return;
    }
    let res;
    if (kind === 'studio') {
      res = renameGamingStudioHQ(id, val);
    } else if (kind === 'engine') {
      res = renameGameEngine(id, val);
    } else if (kind === 'console') {
      res = renameGamingConsole(id, val);
    }
    if (res?.error) {
      uiAlert('Rename Failed', res.error);
    } else {
      uiAlert('Rename Successful ✓', `Updated to '${val}'!`);
      setRenameTarget(null);
      setRenameInpVal('');
    }
  };

  const handleResearchNextGen = () => {
    const res = researchNextGen();
    if (res?.error) {
      uiAlert('Research Blocked', res.error);
    } else {
      const currentVal = state?.player?.unlockedGameGen || 1;
      uiAlert('R&D Upgrade Successful ✓', `Unlocked Generation ${currentVal + 1} processor mechanics!`);
    }
  };

  const handleDesignConsole = () => {
    if (!consoleTitle) {
      uiAlert('Console Tag Required', 'Designate a consumer trade tag for your hardware launcher.');
      return;
    }

    const res = designConsole({
      title: consoleTitle,
      specs: {
        cpu: consoleCpu,
        gpu: consoleGpu,
        ram: consoleRam,
        storage: consoleStorage,
        backwardCompat: consoleBackCompat,
        cloudStreaming: consoleCloud,
        onlineServices: consoleOnline
      },
      price: parseInt(consolePrice) || 399,
      manufacturingCost: parseInt(consoleMfgCost) || 280
    });

    if (res?.error) {
      uiAlert('Prototype Deficit', res.error);
    } else {
      uiAlert('R&D Phase Activated', `Hardware design finalized! '${consoleTitle}' blueprints queued in the R&D labs.`);
      setConsoleModalOpen(false);
      setConsoleTitle('');
    }
  };

  const handleConfigurePass = () => {
    const res = configurePass(
      passPricingLevel,
      passLibraryScope,
      passAdWavelength,
      undefined,
      undefined,
      passSelectedConsoles,
      passSelectedGames
    );
    if (res?.error) {
      uiAlert('System Check Failed', res.error);
    } else {
      uiAlert('Subscription Settings Updated', `Successfully updated subscription catalog configurations for your Game Pass!`);
      setPassModalOpen(false);
    }
  };

  const hqRooms = ['dev_floor', 'qa_lab', 'motion_capture', 'sound_stage', 'liveops_center', 'esports_arena'];

  return (
    <SafeAreaView style={style.container} edges={['top']}>
      <TopBar title={player.name.toUpperCase()} right={<Text style={{ color: T.cyan, fontWeight: '900' }}>${player.cash.toFixed(2)}B</Text>} />

      {/* Modern Studio Performance Banner */}
      <View style={style.studioHeaderDeck}>
        <View style={style.headerInner}>
          <View style={[style.logoOuter, { backgroundColor: player.logoBg }]}>
            <MaterialCommunityIcons name={player.logoIcon as any} size={42} color={T.cyan} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={style.brandSubtitle}>GAMING & PHYSICAL OPERATIONS</Text>
            <Text style={style.brandTitle} numberOfLines={1}>{player.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={style.starRating}>{stars}</Text>
              <Text style={style.rankTag}>GAMING DIVISION ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* Quick Metrics Cards */}
        <View style={style.glanceRow}>
          <View style={style.glanceCard}>
            <Text style={style.glanceLabel}>LIQUID CAPITAL</Text>
            <Text style={[style.glanceValue, { color: T.green }]}>${player.cash.toFixed(2)} B</Text>
          </View>
          <View style={style.glanceCard}>
            <Text style={style.glanceLabel}>TOTAL ACTIVE STUDIOS</Text>
            <Text style={[style.glanceValue, { color: T.cyan }]}>
              {playerStudios.length} Active HQs
            </Text>
          </View>
          <View style={style.glanceCard}>
            <Text style={style.glanceLabel}>CONSOLES INSTALLED</Text>
            <Text style={[style.glanceValue, { color: T.yellow }]}>
              {state.gamingConsoles?.filter(c => c.studioId === player.id).reduce((acc, c) => acc + (c.unitsSold || 0), 0).toFixed(1)}M
            </Text>
          </View>
        </View>
      </View>
      
      {/* Cohesive division switcher */}
      <View style={style.divisionToggleContainer}>
        <TouchableOpacity 
          style={style.divisionToggleBtn}
          onPress={() => router.push('/dashboard' as any)}
        >
          <MaterialCommunityIcons name="movie-roll" size={18} color={T.textMute} />
          <Text style={style.divisionToggleTxt}>CINEMA DIVISION</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[style.divisionToggleBtn, style.divisionToggleBtnActive]}
          onPress={() => {}}
        >
          <MaterialCommunityIcons name="gamepad-variant" size={18} color="#000" />
          <Text style={[style.divisionToggleTxt, style.divisionToggleTxtActive]}>GAMING DIVISION</Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Simulation Time Control (Homogenized) */}
      <View style={style.simPanel}>
        <View style={style.timeDeck}>
          <View>
            <Text style={style.timeSub}>CURRENT CHRONOLOGY</Text>
            <Text style={style.timeMain}>{monthOf(state.week).name} W{monthOf(state.week).weekInMonth}, Year {state.year}</Text>
          </View>
          <View style={[style.calendarButton, { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' }]}>
            <MaterialCommunityIcons name="timeline-clock-outline" size={18} color={T.green} />
            <Text style={[style.calendarButtonText, { color: T.green }]}>LIVE PLAY</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <TouchableOpacity style={style.simButtonMulti} onPress={() => setShowMulti(true)}>
            <MaterialCommunityIcons name="fast-forward" size={20} color={T.cyan} style={{ marginRight: 6 }} />
            <Text style={style.simButtonMultiTxt}>RUN TIMELINE...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={style.simButtonMain} onPress={simulateWeek}>
            <MaterialCommunityIcons name="play" size={22} color={T.cardDark} style={{ marginRight: 4 }} />
            <Text style={style.simButtonMainTxt}>NEXT WEEK</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub navigation Tabs */}
      <View style={{ borderBottomWidth: 1.5, borderBottomColor: T.border, marginTop: 20 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ flexDirection: 'row', gap: 6 }}
        >
          {(['news', 'studios', 'pipeline', 'games_library', 'engines', 'consoles', 'gamepass', 'publishers_deals', 'trends'] as GamingTab[]).map(tab => {
            const getTabDetails = (tb: GamingTab) => {
              switch (tb) {
                case 'news': return { label: 'Gaming News', icon: 'newspaper', color: T.cyan };
                case 'studios': return { label: 'Studios', icon: 'office-building', color: T.magenta };
                case 'pipeline': return { label: 'Projects', icon: 'hammer-wrench', color: T.yellow };
                case 'games_library': return { label: 'Games Library', icon: 'gamepad-variant-outline', color: T.green };
                case 'engines': return { label: 'Engines', icon: 'engine', color: T.orange };
                case 'consoles': return { label: 'Hardware', icon: 'controller-classic', color: T.cyan };
                case 'gamepass': return { label: 'Game Pass', icon: 'ticket-outline', color: T.yellow };
                case 'publishers_deals': return { label: 'Deals & Licensing', icon: 'handshake', color: T.green };
                case 'trends': return { label: 'Database', icon: 'chart-box-outline', color: T.magenta };
              }
            };
            const detail = getTabDetails(tab)!;
            const active = activeTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 12, gap: 6 }, active && { borderBottomColor: detail.color, borderBottomWidth: 3 }]}
                onPress={() => setActiveTab(tab)}
              >
                <MaterialCommunityIcons name={detail.icon as any} size={18} color={active ? detail.color : T.textMute} />
                <Text style={[{ color: active ? detail.color : T.textMute, fontSize: 11, fontWeight: '900', letterSpacing: 1 }]}>
                  {detail.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={style.scroll}>
        
        {/* TAB 0: Gaming News Chronicles */}
        {activeTab === 'news' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={style.sectionTitle}>Gaming & Tech Chronicles</Text>
                <Text style={{ color: T.textMute, fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' }}>REAL-TIME FEED</Text>
              </View>
              <View style={{ backgroundColor: 'rgba(34,211,238,0.1)', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' }}>
                <MaterialCommunityIcons name="newspaper-variant" size={24} color={T.cyan} />
              </View>
            </View>

            <Text style={{ color: T.textMute, fontSize: 13, lineHeight: 18, marginBottom: 16 }}>
              Browse your specialized chronological stream covering newly proposed contracts, finished engines, next-generation research breakthroughs, launched/discontinued game hardware, Game Pass updates, and GOTY achievements!
            </Text>

            {(() => {
              const matches = (state.newsLog || []).filter(n => {
                const t = n.text || '';
                return (
                  t.includes('🎮') ||
                  t.includes('🔬') ||
                  t.includes('🚀 GAME') ||
                  t.includes('🚀 COMPETITOR') ||
                  t.includes('🏆 GOTY') ||
                  t.includes('🏆 goty') ||
                  t.includes('🛠️') ||
                  t.includes('🔬 TECH') ||
                  t.includes('🔬 RESEARCH') ||
                  t.includes('Game Pass') ||
                  t.includes('game engine') ||
                  t.includes('Game engine') ||
                  t.includes('Video Club') ||
                  t.includes('Video club') ||
                  t.includes('Video Clubs') ||
                  t.includes('VHS') ||
                  t.includes('DVD') ||
                  t.includes('📼')
                );
              });

              if (matches.length === 0) {
                return (
                  <View style={style.emptyCard}>
                    <MaterialCommunityIcons name="newspaper" size={48} color={T.textMute} />
                    <Text style={style.emptyTitle}>Chronicles Empty</Text>
                    <Text style={style.emptySub}>No gaming division entries have been logged in your campaign timeline yet. Fast-forward weeks or upgrade hardware labs to trigger logs!</Text>
                  </View>
                );
              }

              return (
                <View style={{ gap: 10 }}>
                  {matches.map((n, i) => (
                    <View key={`${n.year}-${n.week}-${i}`} style={{ backgroundColor: '#1E222B', borderWidth: 1, borderColor: '#30363D', borderRadius: 8, padding: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ color: T.cyan, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>WEEK {n.week}, YEAR {n.year}</Text>
                        <MaterialCommunityIcons name="newspaper" size={12} color={n.color || T.cyan} style={{ opacity: 0.6 }} />
                      </View>
                      <Text style={{ color: '#fff', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>{n.text}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}

        {/* TAB 1: Studios management */}
        {activeTab === 'studios' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <Text style={style.sectionTitle}>Gaming Production Division HQs</Text>
              <TouchableOpacity style={style.primaryBtn} onPress={() => setFoundHQModalOpen(true)}>
                <MaterialCommunityIcons name="office-building" size={20} color="#000" />
                <Text style={style.primaryBtnTxt}>Found Studio HQ</Text>
              </TouchableOpacity>
            </View>

            {playerStudios.length === 0 ? (
              <View style={style.emptyCard}>
                <MaterialCommunityIcons name="gamepad-variant-outline" size={48} color={T.textMute} />
                <Text style={style.emptyTitle}>No Operational Studios</Text>
                <Text style={style.emptySub}>Build a specialized gaming division HQ to hire professionals, organize developers, and create content.</Text>
              </View>
            ) : (
              playerStudios.map(hq => (
                <View key={hq.id} style={style.hqCard}>
                  <View style={style.hqHeader}>
                    <View style={style.row}>
                      <MaterialCommunityIcons name="desktop-tower-monitor" size={24} color={T.cyan} />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={style.hqTitle}>{hq.name}</Text>
                        <Text style={style.hqTypeBadge}>{hq.type} Tier Specialized Studios</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity 
                        style={[style.roomActBtn, { backgroundColor: T.magenta }]}
                        onPress={() => {
                          setRenameTarget({ kind: 'studio', id: hq.id, currentName: hq.name });
                          setRenameInpVal(hq.name);
                        }}
                      >
                        <MaterialCommunityIcons name="pencil" size={14} color="#000" />
                        <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Rename</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[style.roomActBtn, { backgroundColor: T.red }]}
                        onPress={() => {
                          const res = deleteGamingStudioHQ(hq.id);
                          if (res?.error) uiAlert('Disband HQ Failed', res.error); else uiAlert('HQ Disbanded ✓', 'Studio HQ disbanded and 25% foundation opex salvaged!');
                        }}
                      >
                        <MaterialCommunityIcons name="delete" size={14} color="#000" />
                        <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Disband</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ marginBottom: 10 }}>
                    <Text style={style.hqPayroll}>${hq.salaryBandWeeklyM}K / week payroll</Text>
                  </View>

                  {/* Staff Recruiting Pools Segment */}
                  <Text style={style.subSectionTitle}>Staff Recruitment Pools ({Object.values(hq.staffPools).reduce((a, b) => a + b, 0)} employees)</Text>
                  <View style={style.staffGrid}>
                    {(Object.keys(hq.staffPools) as Array<keyof typeof hq.staffPools>).map(role => (
                      <View key={role} style={style.staffBox}>
                        <Text style={style.staffRoleLabel}>{role.toUpperCase()}</Text>
                        <View style={style.staffActions}>
                          <TouchableOpacity 
                            style={style.counterBtn} 
                            onPress={() => recruitGamingStaff(hq.id, role, -10)}
                          >
                            <Text style={style.counterBtnTxt}>-10</Text>
                          </TouchableOpacity>
                          <Text style={style.staffQty}>{hq.staffPools[role]}</Text>
                          <TouchableOpacity 
                            style={style.counterBtn} 
                            onPress={() => recruitGamingStaff(hq.id, role, 10)}
                          >
                            <Text style={style.counterBtnTxt}>+10</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Custom built Rooms / Expansion suites */}
                  <Text style={style.subSectionTitle}>Constructed HQ Rooms</Text>
                  <View style={style.roomsContainer}>
                    {hqRooms.map(rKey => {
                      const built = hq.rooms.includes(rKey);
                      const stateUnder = hq.upgradesFinishedWeeks?.[rKey];
                      return (
                        <View key={rKey} style={[style.roomPill, !built && style.roomPillLocked]}>
                          <MaterialCommunityIcons 
                            name={rKey === 'dev_floor' ? 'source-branch' 
                                  : rKey === 'qa_lab' ? 'bug-play-outline' 
                                  : rKey === 'motion_capture' ? 'human-sports' 
                                  : rKey === 'sound_stage' ? 'music-box-outline' 
                                  : rKey === 'liveops_center' ? 'server' 
                                  : 'shield-star-outline'} 
                            size={16} 
                            color={built ? T.cyan : T.textMute} 
                          />
                          <Text style={[style.roomLabel, built && { color: '#fff' }]}>
                            {STUDIO_ROOMS_DETAIL[rKey]?.label}
                          </Text>
                          
                          {!built && !stateUnder && (
                            <TouchableOpacity 
                              style={style.roomActBtn}
                              onPress={() => {
                                const res = buildHQRoom(hq.id, rKey);
                                if (res?.error) uiAlert('Opex Check', res.error);
                              }}
                            >
                              <Text style={style.roomActBtnTxt}>Build (${STUDIO_ROOMS_DETAIL[rKey]?.bCostM}M)</Text>
                            </TouchableOpacity>
                          )}

                          {stateUnder && (
                            <Text style={style.roomProgressTxt}>Building ({stateUnder.finishWeek - state.week}w left)</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Workplace Policies Sector */}
                  <Text style={style.subSectionTitle}>Workplace Customization & Policies</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {/* Welfare Policy */}
                    <View style={{ flex: 1, backgroundColor: T.panelAlt, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: T.border }}>
                      <Text style={{ color: T.cyan, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Welfare Benefits</Text>
                      <View style={{ gap: 6 }}>
                        {(['basic', 'standard', 'luxurious'] as const).map((wl) => {
                          const spec = GAMING_WELFARE_SPECS[wl];
                          const active = (hq.welfareLevel || 'standard') === wl;
                          return (
                            <TouchableOpacity
                              key={wl}
                              style={{
                                padding: 8,
                                borderRadius: 6,
                                backgroundColor: active ? T.cyan : T.bg,
                                borderWidth: 1,
                                borderColor: active ? T.cyan : T.border,
                              }}
                              onPress={() => {
                                const res = setStudioHQPolicy(hq.id, wl, hq.crunchPolicy || 'balanced');
                                if (res?.error) uiAlert('Policy Update Error', res.error);
                              }}
                            >
                              <Text style={{ color: active ? '#000' : '#E6EDF2', fontSize: 12, fontWeight: '700' }}>
                                {spec.label}
                              </Text>
                              <Text style={{ color: active ? '#1A1D20' : T.textMute, fontSize: 10, marginTop: 2 }}>
                                {wl === 'basic' ? 'Dev speed -5%, Bugs +15%, Salary -10%' : wl === 'luxurious' ? 'Dev speed +12%, Bugs -18%, Quality +6, Salary +25%' : 'Standard Silicon Valley contracts'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Crunch Policy */}
                    <View style={{ flex: 1, backgroundColor: T.panelAlt, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: T.border }}>
                      <Text style={{ color: T.magenta, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>Crunch Policy</Text>
                      <View style={{ gap: 6 }}>
                        {(['none', 'balanced', 'crunch'] as const).map((cp) => {
                          const spec = GAMING_CRUNCH_SPECS[cp];
                          const active = (hq.crunchPolicy || 'balanced') === cp;
                          return (
                            <TouchableOpacity
                              key={cp}
                              style={{
                                padding: 8,
                                borderRadius: 6,
                                backgroundColor: active ? T.magenta : T.bg,
                                borderWidth: 1,
                                borderColor: active ? T.magenta : T.border,
                              }}
                              onPress={() => {
                                const res = setStudioHQPolicy(hq.id, hq.welfareLevel || 'standard', cp);
                                if (res?.error) uiAlert('Policy Update Error', res.error);
                              }}
                            >
                              <Text style={{ color: active ? '#000' : '#E6EDF2', fontSize: 12, fontWeight: '700' }}>
                                {spec.label}
                              </Text>
                              <Text style={{ color: active ? '#1A1D20' : T.textMute, fontSize: 10, marginTop: 2 }}>
                                {cp === 'none' ? 'Bugs -28%, Quality +4, Dev speed -10%, Salary -10%' : cp === 'crunch' ? 'Dev speed +25%, Bugs +38%, Quality -6, Salary +15%' : 'Standard sustainable pace'}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>

                  {/* Team Amenities / Office Perks Section */}
                  <Text style={style.subSectionTitle}>Team Amenities & Office Perks</Text>
                  <View style={{ gap: 8, marginBottom: 12 }}>
                    {(['freeSnacks', 'ergoChairs', 'gym'] as const).map((pk) => {
                      const spec = STUDIO_PERK_SPECS[pk];
                      const active = !!(hq.amenities || {})[pk];
                      return (
                        <View
                          key={pk}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#1E222B',
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: active ? T.green : T.border,
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <MaterialCommunityIcons name={spec.icon as any} size={18} color={active ? T.green : T.textMute} />
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{spec.label}</Text>
                              {active && (
                                <View style={{ backgroundColor: 'rgba(57, 211, 83, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ color: T.green, fontSize: 9, fontWeight: '800' }}>ACTIVE</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ color: T.textMute, fontSize: 11, marginTop: 3 }}>
                              {pk === 'freeSnacks' ? 'Free Organic Bistro: +3% Dev Speed, -3% bugs (+$3K/week upkeep)' : pk === 'ergoChairs' ? 'Herman Miller Chairs: +5% Dev Speed, -7% bugs (+$5M Install, +$1K/week upkeep)' : 'HQ Health Center: +10% Dev Speed, -15% bugs (+$12M Install, +$8K/week upkeep)'}
                            </Text>
                          </View>
                          
                          <TouchableOpacity
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 4,
                              backgroundColor: active ? '#30363D' : T.green,
                            }}
                            onPress={() => {
                              const res = toggleStudioHQPerk(hq.id, pk, !active);
                              if (res?.error) uiAlert('Setup Restriction', res.error);
                            }}
                          >
                            <Text style={{ color: active ? '#fff' : '#000', fontSize: 11, fontWeight: '700' }}>
                              {active ? 'Dismantle' : `Install ($${spec.installCost}M)`}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: Games Library Status Tracker & Roadmap */}
        {activeTab === 'games_library' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <View>
                <Text style={style.sectionTitle}>Corporate Games Library</Text>
                <Text style={{ color: T.textMute, fontSize: 11, marginTop: 4 }}>
                  Comprehensive overview of active research, in-production, on-hold, and released gaming IPs.
                </Text>
              </View>
            </View>

            {/* Custom Sub-Tabs for Library */}
            <View style={{ flexDirection: 'row', backgroundColor: '#0B0F13', padding: 4, borderRadius: 10, marginVertical: 14, borderWidth: 1, borderColor: T.border }}>
              {(['active', 'on_hold', 'released'] as ('active' | 'on_hold' | 'released')[]).map((stb) => (
                <TouchableOpacity
                  key={stb}
                  onPress={() => setLibrarySubTab(stb)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: librarySubTab === stb ? T.cyan : 'transparent'
                  }}
                >
                  <Text style={{ color: librarySubTab === stb ? '#000' : T.textMute, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {stb === 'active' ? '🎮 IN PRODUCTION' : stb === 'on_hold' ? '⏸ ON HOLD' : '🏆 RELEASED GOLD'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Subtab content rendering */}
            {librarySubTab === 'active' && (
              <View>
                <Text style={style.subSectionTitle}>Active Development Pipeline</Text>
                {state.gamingProjects?.filter(p => p.studioId === state.player.id && p.phase !== 'Gold' && p.phase !== 'LiveOps' && !p.onHold).length === 0 ? (
                  <View style={style.emptyCard}>
                    <MaterialCommunityIcons name="gamepad-circle-outline" size={48} color={T.textMute} />
                    <Text style={style.emptyTitle}>No Active Projects</Text>
                    <Text style={style.emptySub}>Setup an active software pipeline in the "Projects" tab to build video game content.</Text>
                  </View>
                ) : (
                  state.gamingProjects?.filter(p => p.studioId === state.player.id && p.phase !== 'Gold' && p.phase !== 'LiveOps' && !p.onHold).map(p => {
                    const progress = p.developmentTotalWeeks > 0 ? (p.developmentWeeksSpent / p.developmentTotalWeeks) * 100 : 0;
                    const studioName = state.gamingStudios?.find(s => s.id === p.studioId)?.name || 'HQ Studio';
                    return (
                      <View key={p.id} style={[style.hqCard, { borderColor: '#10B981' }]}>
                        <View style={style.hqHeader}>
                          <View>
                            <Text style={style.hqTitle}>{p.title}</Text>
                            <Text style={{ color: T.cyan, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              {p.genre.toUpperCase()} {p.subgenre ? `• ${p.subgenre}` : ''} • {p.monetizationModel}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={[style.roomActBtn, { backgroundColor: T.yellow }]}
                              onPress={() => {
                                toggleGamingProjectHold(p.id);
                                uiAlert('Project Paused', `"${p.title}" has been safely put on hold. You can resume it anytime.`);
                              }}
                            >
                              <MaterialCommunityIcons name="pause" size={13} color="#000" />
                              <Text style={style.roomActBtnTxt}>Hold</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[style.roomActBtn, { backgroundColor: T.red }]}
                              onPress={() => {
                                cancelGamingProject(p.id);
                                uiAlert('Project Cancelled', `"${p.title}" development pipeline is dismantled.`);
                              }}
                            >
                              <MaterialCommunityIcons name="close" size={13} color="#fff" />
                              <Text style={[style.roomActBtnTxt, { color: '#fff' }]}>Dismantle</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={{ gap: 8, marginTop: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: T.textMute, fontSize: 11 }}>Progress: {progress.toFixed(0)}% ({Math.floor(p.developmentWeeksSpent)} / {p.developmentTotalWeeks} weeks)</Text>
                            <Text style={{ color: T.yellow, fontSize: 12, fontWeight: '800' }}>{p.phase.toUpperCase()}</Text>
                          </View>
                          {/* Progress Bar */}
                          <View style={{ height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ width: `${Math.min(100, progress)}%`, height: '100%', backgroundColor: T.green }} />
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0B0F13', padding: 8, borderRadius: 8 }}>
                            <Text style={{ color: '#E2E8F0', fontSize: 11 }}>🏢 HQ Studio: {studioName}</Text>
                            <Text style={{ color: T.red, fontSize: 11, fontWeight: 'bold' }}>🐛 Bugs: {p.bugs}</Text>
                          </View>

                          {/* Focus metrics */}
                          <Text style={{ color: T.textMute, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>Focus weighting distribution</Text>
                          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                            {Object.entries(p.featuresFocus || {}).map(([key, val]) => (
                              <View key={key} style={{ backgroundColor: '#1E293B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ color: T.textMute, fontSize: 10 }}>{key}: <Text style={{ color: T.cyan, fontWeight: '700' }}>{val}%</Text></Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {librarySubTab === 'on_hold' && (
              <View>
                <Text style={style.subSectionTitle}>Dormant & On-Hold IP Projects</Text>
                {state.gamingProjects?.filter(p => p.studioId === state.player.id && p.phase !== 'Gold' && p.phase !== 'LiveOps' && p.onHold).length === 0 ? (
                  <View style={style.emptyCard}>
                    <MaterialCommunityIcons name="pause-circle-outline" size={48} color={T.textMute} />
                    <Text style={style.emptyTitle}>No Dormant Projects</Text>
                    <Text style={style.emptySub}>None of your projects are currently on hold.</Text>
                  </View>
                ) : (
                  state.gamingProjects?.filter(p => p.studioId === state.player.id && p.phase !== 'Gold' && p.phase !== 'LiveOps' && p.onHold).map(p => {
                    const progress = p.developmentTotalWeeks > 0 ? (p.developmentWeeksSpent / p.developmentTotalWeeks) * 100 : 0;
                    return (
                      <View key={p.id} style={[style.hqCard, { borderColor: '#EAB308', opacity: 0.85 }]}>
                        <View style={style.hqHeader}>
                          <View>
                            <Text style={[style.hqTitle, { color: T.textMute }]}>{p.title} (PAUSED)</Text>
                            <Text style={{ color: T.textMute, fontSize: 11, marginTop: 2 }}>
                              {p.genre.toUpperCase()} {p.subgenre ? `• ${p.subgenre}` : ''} • {p.monetizationModel}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={[style.roomActBtn, { backgroundColor: T.green }]}
                              onPress={() => {
                                toggleGamingProjectHold(p.id);
                                uiAlert('Project Resumed', `"${p.title}" development pipeline is live again!`);
                              }}
                            >
                              <MaterialCommunityIcons name="play" size={13} color="#000" />
                              <Text style={style.roomActBtnTxt}>Resume</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[style.roomActBtn, { backgroundColor: T.red }]}
                              onPress={() => {
                                cancelGamingProject(p.id);
                                uiAlert('Project Cancelled', `"${p.title}" development pipeline is dismantled.`);
                              }}
                            >
                              <MaterialCommunityIcons name="close" size={13} color="#fff" />
                              <Text style={[style.roomActBtnTxt, { color: '#fff' }]}>Dismantle</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ color: T.textMute, fontSize: 11 }}>Suspended at {progress.toFixed(0)}% completion</Text>
                          <Text style={{ color: T.red, fontSize: 11, fontWeight: 'bold' }}>🐛 Bugs: {p.bugs}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {librarySubTab === 'released' && (
              <View>
                <Text style={style.subSectionTitle}>Dossier of Released Classics</Text>
                {state.gamingProjects?.filter(p => p.studioId === state.player.id && (p.phase === 'Gold' || p.phase === 'LiveOps')).length === 0 ? (
                  <View style={style.emptyCard}>
                    <MaterialCommunityIcons name="trophy-outline" size={48} color={T.textMute} />
                    <Text style={style.emptyTitle}>No Released Masterpieces</Text>
                    <Text style={style.emptySub}>Diligently guide an active production to 100% progress and ship it to unlock live sales & review records here!</Text>
                  </View>
                ) : (
                  state.gamingProjects?.filter(p => p.studioId === state.player.id && (p.phase === 'Gold' || p.phase === 'LiveOps')).map(p => {
                    return (
                      <View key={p.id} style={[style.hqCard, { borderColor: '#3B82F6' }]}>
                        <View style={style.hqHeader}>
                          <View>
                            <Text style={style.hqTitle}>🏆 {p.title}</Text>
                            <Text style={{ color: T.cyan, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              {p.genre.toUpperCase()} • Released Year {p.releaseYear} W{p.releaseWeek}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={[style.roomActBtn, { backgroundColor: T.cyan }]}
                            onPress={() => {
                              router.push('/create-movie' as any);
                              uiAlert('Studio Crossover Synergy', `Sign up your blockbuster "${p.title}" as a video game licensing universe blueprint in cinema screen!`);
                            }}
                          >
                            <MaterialCommunityIcons name="movie-creation" size={14} color="#000" />
                            <Text style={style.roomActBtnTxt}>Film Adaptation</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0B0F13', padding: 12, borderRadius: 10, marginTop: 4 }}>
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ color: T.textMute, fontSize: 9 }}>CRITICS RATING</Text>
                            <Text style={{ color: T.yellow, fontSize: 16, fontWeight: '900', marginTop: 2 }}>⭐ {p.criticScore}/100</Text>
                          </View>
                          <View style={{ alignItems: 'center', flex: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                            <Text style={{ color: T.textMute, fontSize: 9 }}>PLAYERS CHOICE</Text>
                            <Text style={{ color: T.cyan, fontSize: 16, fontWeight: '900', marginTop: 2 }}>🎮 {p.userScore}%</Text>
                          </View>
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <Text style={{ color: T.textMute, fontSize: 9 }}>COPIES SOLD</Text>
                            <Text style={{ color: T.green, fontSize: 16, fontWeight: '900', marginTop: 2 }}>{p.unitsSold.toFixed(2)}M</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 4 }}>
                          <Text style={{ color: T.textMute, fontSize: 11 }}>Lifetime Earnings: <Text style={{ color: T.green, fontWeight: 'bold' }}>${(p.lifetimeRevenueB * 1000).toFixed(2)}M</Text></Text>
                          <Text style={{ color: T.textMute, fontSize: 11 }}>Monetization: <Text style={{ color: '#fff' }}>{p.monetizationModel}</Text></Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: Development Pipeline */}
        {activeTab === 'pipeline' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <Text style={style.sectionTitle}>Pipeline & Content Registry</Text>
              <TouchableOpacity 
                style={style.primaryBtn} 
                onPress={() => {
                  if (playerEngines.length === 0) {
                    uiAlert('No Engines Available', 'Engine R&D is required before launching game content projects! Click the Engines tab.');
                    return;
                  }
                  if (playerStudios.length === 0) {
                    uiAlert('No Studios Found', 'Setup a Studio HQ before launching game development projects.');
                    return;
                  }
                  setProjectModalOpen(true);
                  setProjEngineId(playerEngines[0].id);
                  setProjStudioId(playerStudios[0].id);
                }}
              >
                <MaterialCommunityIcons name="shape-square-plus" size={20} color="#000" />
                <Text style={style.primaryBtnTxt}>Launch Project Pipeline</Text>
              </TouchableOpacity>
            </View>

            {/* active pipelines */}
            <Text style={style.listHeader}>Active Productions in Development</Text>
            {activeDevGames.length === 0 ? (
              <View style={style.simpleCard}>
                <Text style={{ color: T.textMute }}>No active games in developer pipelines.</Text>
              </View>
            ) : (
              activeDevGames.map(proj => {
                const compileTotal = proj.developmentTotalWeeks;
                const speedProgress = Math.min(100, Math.round((proj.developmentWeeksSpent / compileTotal) * 100));
                return (
                  <View key={proj.id} style={style.projectCard}>
                    <View style={style.rowJust}>
                      <View>
                        <Text style={style.projectMainTitle}>{proj.title}</Text>
                        <Text style={style.projectMetaLabel}>{proj.genre} • Powered by custom engine</Text>
                      </View>
                      <View style={style.cyanBadge}>
                        <Text style={style.cyanBadgeTxt}>{proj.phase.toUpperCase()}</Text>
                      </View>
                    </View>

                    {/* Progress tracking indicator */}
                    <View style={style.progressArea}>
                      <View style={style.rowJust}>
                        <Text style={style.progressLabel}>Ramp duration progress ({proj.developmentWeeksSpent} / {compileTotal} weeks)</Text>
                        <Text style={style.progressLabel}>{speedProgress}%</Text>
                      </View>
                      <View style={style.progressBarBg}>
                        <View style={[style.progressBarVal, { width: `${speedProgress}%` }]} />
                      </View>
                    </View>

                    <View style={style.rowJust}>
                      <View style={style.row}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color={T.red} />
                        <Text style={style.bugLabel}>Bugs screen queue: {proj.bugs} discovered</Text>
                      </View>
                      <Text style={style.budgetAlloc}>Target investment budget: ${proj.budgetM + proj.marketingBudgetM}M</Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* released game items */}
            <Text style={[style.listHeader, { marginTop: 20 }]}>Released Games Portfolio & LiveOps</Text>
            {releasedGames.length === 0 ? (
              <View style={style.simpleCard}>
                <Text style={{ color: T.textMute }}>No products commercialized yet. Launch programs to distribute software.</Text>
              </View>
            ) : (
              releasedGames.map(proj => (
                <View key={proj.id} style={style.gCard}>
                  <View style={style.gHeader}>
                    <View>
                      <Text style={style.gTitle}>{proj.title}</Text>
                      <Text style={style.gGenre}>{proj.genre} • Monetization: {proj.monetizationModel}</Text>
                    </View>
                    <View style={style.goldRatingCircle}>
                      <Text style={style.goldRatingCircleTxt}>{proj.criticScore}%</Text>
                      <Text style={{ fontSize: 8, color: '#000' }}>Review</Text>
                    </View>
                  </View>

                  <View style={style.gStatsRow}>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Units Sold</Text>
                      <Text style={style.gStatVal}>{proj.unitsSold?.toFixed(2)}M copies</Text>
                    </View>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Lifetime Gross</Text>
                      <Text style={[style.gStatVal, { color: T.green }]}>${(proj.lifetimeRevenueB * 1000).toFixed(1)}M</Text>
                    </View>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Weekly Run rate</Text>
                      <Text style={style.gStatVal}>+${(proj.weeklyRevenueB * 1000).toFixed(2)}M/wk</Text>
                    </View>
                  </View>

                  {/* Adaptive Cinematic Adaption builder button */}
                  <TouchableOpacity 
                    style={style.adaptCinemaBtn}
                    onPress={() => {
                      router.push('/create-movie');
                      uiAlert('Adaptation Pipeline Unlocked', `Configure a parent film adapted from ${proj.title} to unleash +35% dynamic synergy cash boost!`);
                    }}
                  >
                    <MaterialCommunityIcons name="video-input-component" size={16} color={T.cyan} />
                    <Text style={style.adaptCinemaBtnTxt}>Script Cinema Film Adaptation</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: Custom Game Engines */}
        {activeTab === 'engines' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <Text style={style.sectionTitle}>Game Engine Workshop</Text>
              <TouchableOpacity style={style.primaryBtn} onPress={() => setEngineModalOpen(true)}>
                <MaterialCommunityIcons name="tools" size={20} color="#000" />
                <Text style={style.primaryBtnTxt}>Build Custom Engine</Text>
              </TouchableOpacity>
            </View>

            {/* PROGRESSIVE ENGINE TECH LAB BANNER */}
            <View style={{ backgroundColor: '#111', padding: 15, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: T.yellow, marginBottom: 15 }}>
              <View style={style.rowJust}>
                <View style={style.row}>
                  <MaterialCommunityIcons name="microchip" size={24} color={T.yellow} />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Department R&D level: Gen {state?.player?.unlockedGameGen || 1}</Text>
                    <Text style={{ color: T.textMute, fontSize: 11 }}>Unlocks limits on engine blueprint generations (1..6).</Text>
                  </View>
                </View>
                {(state?.player?.unlockedGameGen || 1) < 6 ? (
                  <TouchableOpacity style={[style.roomActBtn, { backgroundColor: T.yellow, minWidth: 120 }]} onPress={handleResearchNextGen}>
                    <MaterialCommunityIcons name="arrow-up" size={14} color="#000" />
                    <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Research Gen {(state?.player?.unlockedGameGen || 1) + 1}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ backgroundColor: '#222', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 5 }}>
                    <Text style={{ color: T.green, fontSize: 11, fontWeight: 'bold' }}>MAX GENERATION UNLOCKED</Text>
                  </View>
                )}
              </View>
              <Text style={{ marginTop: 10, color: '#aaa', fontSize: 11 }}>
                • Active Gen capabilities: {
                  (state?.player?.unlockedGameGen || 1) === 1 ? 'Legacy 2D Engines' :
                  (state?.player?.unlockedGameGen || 1) === 2 ? 'True 3D Polygons & Geometry' :
                  (state?.player?.unlockedGameGen || 1) === 3 ? 'Advanced Shaders & Realistic Physics' :
                  (state?.player?.unlockedGameGen || 1) === 4 ? 'Hardware-Accelerated Raytracing' :
                  (state?.player?.unlockedGameGen || 1) === 5 ? 'Spatial Audio & Immersive VR support' :
                  'Cloud-Native Sandbox Rendering Pipelines'
                }
              </Text>
            </View>

            {playerEngines.length === 0 ? (
              <View style={style.emptyCard}>
                <MaterialCommunityIcons name="hammer-wrench" size={48} color={T.textMute} />
                <Text style={style.emptyTitle}>Workshop Offline</Text>
                <Text style={style.emptySub}>R&D custom game engines loaded with shaders, physics handlers, sound spatialization, or VR support to power premium software development.</Text>
              </View>
            ) : (
              playerEngines.map(eng => (
                <View key={eng.id} style={style.engineCard}>
                  <View style={style.engineBoxHeader}>
                    <View style={style.row}>
                      <MaterialCommunityIcons name="cpu" size={24} color={T.yellow} />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={style.engineTitle}>{eng.name}</Text>
                        <Text style={style.engineGenLabel}>Engineering Technology Generation {eng.generation}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={[style.roomActBtn, { backgroundColor: T.magenta }]}
                        onPress={() => {
                          setRenameTarget({ kind: 'engine', id: eng.id, currentName: eng.name });
                          setRenameInpVal(eng.name);
                        }}
                      >
                        <MaterialCommunityIcons name="pencil" size={12} color="#000" />
                        <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Rename</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[style.roomActBtn, { backgroundColor: T.red }]}
                        onPress={() => {
                          const res = deleteGameEngine(eng.id);
                          if (res?.error) uiAlert('Retire Engine Failed', res.error); else uiAlert('Engine Retired ✓', `'${eng.name}' has been deprecated.`);
                        }}
                      >
                        <MaterialCommunityIcons name="delete" size={12} color="#000" />
                        <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Retire</Text>
                      </TouchableOpacity>
                      <View style={style.engineTechValuePill}>
                        <Text style={style.engineTechValueTxt}>Quality: {eng.licensingValue}/100</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={style.subSectionTitle}>Active Integrated Modules</Text>
                  <View style={style.modulesGrid}>
                    {eng.modules.map(mod => (
                      <View key={mod} style={style.moduleToken}>
                        <Text style={style.moduleTokenTxt}>{mod}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={style.metricsGrid}>
                    <View style={style.metricBox}>
                      <Text style={style.metricLabel}>Graphics Capability</Text>
                      <Text style={style.metricVal}>{eng.renderQuality}%</Text>
                    </View>
                    <View style={style.metricBox}>
                      <Text style={style.metricLabel}>Physics Runtime</Text>
                      <Text style={style.metricVal}>{eng.performance}%</Text>
                    </View>
                    <View style={style.metricBox}>
                      <Text style={style.metricLabel}>Network Ping Score</Text>
                      <Text style={style.metricVal}>{eng.networkStability}%</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: Hardware Consoles Designer */}
        {activeTab === 'consoles' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <Text style={style.sectionTitle}>Hardware Lab & Distribution</Text>
              <TouchableOpacity style={style.primaryBtn} onPress={() => setConsoleModalOpen(true)}>
                <MaterialCommunityIcons name="gamepad" size={20} color="#000" />
                <Text style={style.primaryBtnTxt}>Finalize Console Design</Text>
              </TouchableOpacity>
            </View>

            {playerConsoles.length === 0 ? (
              <View style={style.emptyCard}>
                <MaterialCommunityIcons name="google-controller" size={48} color={T.textMute} />
                <Text style={style.emptyTitle}>Hardware Lab Empty</Text>
                <Text style={style.emptySub}>R&D next-gen gaming consoles, manufacture boxes, configure retail shelves, sign exclusive partnerships, and dominate dynamic hardware market segments.</Text>
              </View>
            ) : (
              playerConsoles.map(con => (
                <View key={con.id} style={style.consoleCard}>
                  <View style={style.cHeader}>
                    <View style={style.row}>
                      <MaterialCommunityIcons 
                        name={con.status === 'rd' ? 'compass-outline' : 'power-plug'} 
                        size={32} 
                        color={con.status === 'rd' ? T.yellow : T.green} 
                      />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={style.cTitle}>{con.title}</Text>
                        <Text style={style.cGenLabel}>Generation {con.generation} Console Launcher</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TouchableOpacity 
                        style={[style.roomActBtn, { backgroundColor: T.magenta }]}
                        onPress={() => {
                          setRenameTarget({ kind: 'console', id: con.id, currentName: con.title });
                          setRenameInpVal(con.title);
                        }}
                      >
                        <MaterialCommunityIcons name="pencil" size={12} color="#000" />
                        <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Rename</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[style.roomActBtn, { backgroundColor: T.red }]}
                        onPress={() => {
                          const res = deleteGamingConsole(con.id);
                          if (res?.error) uiAlert('Retire Console Failed', res.error); else uiAlert('Console Retired ✓', `${con.title} has been retired.`);
                        }}
                      >
                        <MaterialCommunityIcons name="delete" size={12} color="#000" />
                        <Text style={[style.roomActBtnTxt, { color: '#000' }]}>Retire</Text>
                      </TouchableOpacity>
                      <View style={[style.statusBadge, con.status === 'rd' ? { backgroundColor: T.yellow } : { backgroundColor: T.green }]}>
                        <Text style={style.statusBadgeTxt}>
                          {con.status === 'rd' ? `R&D LABS (${con.rdWeeksLeft}w)` : 'ACTIVE DISTRIBUTION'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={style.cSpecsList}>
                    <Text style={style.specsHeader}>Fitted Specs Configuration</Text>
                    <Text style={style.specDetail}>• CPU Core: {con.specs.cpu}</Text>
                    <Text style={style.specDetail}>• Graphics Node: {con.specs.gpu}</Text>
                    <Text style={style.specDetail}>• RAM Unit: {con.specs.ram}</Text>
                    <Text style={style.specDetail}>• Storage drive: {con.specs.storage}</Text>
                    <Text style={style.specDetail}>• Features flags: {con.specs.onlineServices ? 'ONLINE ' : ''}{con.specs.cloudStreaming ? 'CLOUD ' : ''}{con.specs.backwardCompat ? 'BACKWARD-COMPAT' : ''}</Text>
                  </View>

                  <View style={style.gStatsRow}>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Retail Price</Text>
                      <Text style={style.gStatVal}>${con.price}</Text>
                    </View>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Build Cost</Text>
                      <Text style={style.gStatVal}>${con.manufacturingCost}</Text>
                    </View>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Units Sold</Text>
                      <Text style={[style.gStatVal, { color: T.cyan }]}>{con.unitsSold || '0'}M systems</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: Subscription Game Pass */}
        {activeTab === 'gamepass' && (
          <View style={style.padBox}>
            <View style={style.rowHeader}>
              <Text style={style.sectionTitle}>Game Pass Customization Subsystem</Text>
              {playerPass && (!playerPass.tiers || playerPass.tiers.length === 0) && (
                <TouchableOpacity 
                  style={[style.primaryBtn, { backgroundColor: T.green }]} 
                  onPress={() => {
                    const r = seedGamingPassTiers(playerPass.id);
                    if (r?.error) {
                      uiAlert('Error', r.error);
                    } else {
                      uiAlert('Plan Templates Seeded', 'Initialized 3 custom tiers to get you started! Feel free to modify or add more up to 5 tiers.');
                    }
                  }}
                >
                  <MaterialCommunityIcons name="flash-outline" size={18} color="#000" />
                  <Text style={style.primaryBtnTxt}>Generate Plan Templates</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Multi-Subscription Selection & launching bar */}
            <View style={{ marginBottom: 16, backgroundColor: '#1E222B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#30363D' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Your subscription products ({playerPasses.length} Active)</Text>
                <TouchableOpacity 
                  style={{ backgroundColor: T.green, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    setNewPassName('');
                    setShowNewPassModal(true);
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#000" />
                  <Text style={{ color: '#000', fontSize: 11, fontWeight: '800', marginLeft: 4 }}>Launch New Service (-$50M)</Text>
                </TouchableOpacity>
              </View>

              {playerPasses.length === 0 ? (
                <Text style={{ color: T.textMute, fontSize: 11 }}>No active subscription services. Click above to launch one!</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {playerPasses.map(pass => {
                      const active = playerPass && playerPass.id === pass.id;
                      return (
                        <TouchableOpacity
                          key={pass.id}
                          style={{
                            backgroundColor: active ? 'rgba(0, 240, 255, 0.15)' : '#12141C',
                            borderColor: active ? T.cyan : '#2D3139',
                            borderWidth: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 6,
                            flexDirection: 'row',
                            alignItems: 'center'
                          }}
                          onPress={() => setSelectedPassId(pass.id)}
                        >
                          <MaterialCommunityIcons name="card-bulleted" size={14} color={active ? T.cyan : T.textMute} style={{ marginRight: 6 }} />
                          <Text style={{ color: active ? '#fff' : T.textMute, fontSize: 11, fontWeight: '700' }}>{pass.name}</Text>
                          <Text style={{ color: T.textMute, fontSize: 10, marginLeft: 6 }}>({(pass.subscriberCount || 0).toFixed(1)}M subs)</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {playerPass ? (
              <View style={{ gap: 16 }}>
                <View style={style.passCard}>
                  <View style={style.passHeader}>
                    <MaterialCommunityIcons name="card-bulleted-outline" size={32} color={T.magenta} />
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={style.passTitle}>{playerPass.name}</Text>
                        <TouchableOpacity
                          style={{ marginLeft: 8, padding: 4 }}
                          onPress={() => {
                            setRenamePassInp(playerPass.name);
                            setShowRenamePassModal(true);
                          }}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={16} color={T.cyan} />
                        </TouchableOpacity>
                      </View>
                      <Text style={style.passLabel}>Multi-Tier Custom Subscription Catalogue Service</Text>
                    </View>
                    {playerPass.tiers && playerPass.tiers.length > 0 && (
                      <TouchableOpacity 
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                        onPress={() => {
                          const res = discontinueGamingPassService({ passId: playerPass.id });
                          if (res?.error) {
                            uiAlert('Error', res.error);
                          } else {
                            uiAlert('Service Closed 🛑', 'Successfully terminated subscription game pass offerings, retiring active tiers and cancelling joint bundle discounts.');
                          }
                        }}
                      >
                        <Text style={{ color: '#EF4444', fontSize: 11, fontWeight: '900' }}>DISCONTINUE SERVICE</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={style.gStatsRow}>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Custom Plan Tiers</Text>
                      <Text style={style.gStatVal}>{playerPass.tiers?.length || 0} active</Text>
                    </View>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Total Subscribers</Text>
                      <Text style={[style.gStatVal, { color: T.cyan }]}>{(playerPass.subscriberCount).toFixed(2)}M readers/users</Text>
                    </View>
                    <View style={style.gStatField}>
                      <Text style={style.gStatLabel}>Aggregated Revenue</Text>
                      <Text style={[style.gStatVal, { color: T.green }]}>${(playerPass.monthlyRevenueB * 1000).toFixed(2)}M/mo</Text>
                    </View>
                  </View>

                  {playerPass.bundleWithStreamingServiceId && (
                    <View style={{ backgroundColor: 'rgba(34, 211, 238, 0.15)', borderWidth: 1, borderColor: T.cyan, borderRadius: 8, padding: 12, marginTop: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="link-variant" size={18} color={T.cyan} />
                        <Text style={{ color: T.cyan, fontSize: 13, fontWeight: '800', marginLeft: 6 }}>CROSS-DIVISION SYNERGY ACTIVE</Text>
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>
                        Bundled with: <Text style={{ fontWeight: '800', color: T.magenta }}>{state.streamingServices?.find(s => s.id === playerPass.bundleWithStreamingServiceId)?.name || 'Video Streaming Platform'}</Text>
                      </Text>
                      <Text style={{ color: T.textMute, fontSize: 11, marginTop: 2 }}>
                        Offering an epic <Text style={{ color: T.green, fontWeight: 'bold' }}>{playerPass.bundleDiscountPercent}%</Text> discount for joint tier subscribers! Attractiveness rate boosted +25% and retention strengthened.
                      </Text>
                    </View>
                  )}
                </View>

                {/* CROSS DIVISION BUNDLING CONTROLS */}
                <View style={{ backgroundColor: '#1A1D24', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 5 }}>Cross-Division Video Streaming Bundle</Text>
                  <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 12 }}>Select a subscriber-facing Video Streaming channel to pack together and spark subscription surge.</Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    <TouchableOpacity 
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 6,
                        backgroundColor: !playerPass.bundleWithStreamingServiceId ? T.cyan : '#252B35',
                        borderWidth: 1,
                        borderColor: !playerPass.bundleWithStreamingServiceId ? T.cyan : '#30363D'
                      }}
                      onPress={() => bundlePassWithStreaming({ passId: playerPass.id, streamingServiceId: null, discountPercent: 0 })}
                    >
                      <Text style={{ color: !playerPass.bundleWithStreamingServiceId ? '#000' : '#fff', fontSize: 11, fontWeight: '700' }}>Standalone (No Bundle)</Text>
                    </TouchableOpacity>

                    {(state.streamingServices || []).map(stream => {
                      const active = playerPass.bundleWithStreamingServiceId === stream.id;
                      return (
                        <TouchableOpacity 
                          key={stream.id}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 6,
                            backgroundColor: active ? T.cyan : '#252B35',
                            borderWidth: 1,
                            borderColor: active ? T.cyan : '#30363D'
                          }}
                          onPress={() => bundlePassWithStreaming({ passId: playerPass.id, streamingServiceId: stream.id, discountPercent: bundleDiscount })}
                        >
                          <Text style={{ color: active ? '#000' : '#fff', fontSize: 11, fontWeight: '700' }}>{stream.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {playerPass.bundleWithStreamingServiceId && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>Bundle Discount:</Text>
                      {([10, 15, 20, 25, 30] as number[]).map(pct => {
                        const active = playerPass.bundleDiscountPercent === pct;
                        return (
                          <TouchableOpacity 
                            key={pct}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: 4,
                              backgroundColor: active ? T.green : '#252B35',
                              borderWidth: 1,
                              borderColor: active ? T.green : '#30363D'
                            }}
                            onPress={() => bundlePassWithStreaming({ passId: playerPass.id, streamingServiceId: playerPass.bundleWithStreamingServiceId!, discountPercent: pct })}
                          >
                            <Text style={{ color: active ? '#000' : '#fff', fontSize: 11, fontWeight: '800' }}>{pct}%</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* DYNAMIC PLAN TIER CUSTOMIZER & LISTINGS */}
                <View style={{ backgroundColor: '#1A1D24', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: T.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Custom Subscription Plans ({playerPass.tiers?.length || 0} / 5 Tiers)</Text>
                      <Text style={{ color: T.textMute, fontSize: 11 }}>Add up to 5 customized tiers with different pricing scopes, ads models, and perks.</Text>
                    </View>
                    {(playerPass.tiers?.length || 0) < 5 && (
                      <TouchableOpacity 
                        style={[style.primaryBtn, { paddingVertical: 6, paddingHorizontal: 12 }]} 
                        onPress={() => {
                          setTierEditingId(null);
                          setTierName('');
                          setTierPrice('9.99');
                          setTierAdSupported(false);
                          setTierPerks([]);
                          setAddTierModalOpen(true);
                        }}
                      >
                        <MaterialCommunityIcons name="plus-circle" size={16} color="#000" />
                        <Text style={style.primaryBtnTxt}>Create Tier</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {(!playerPass.tiers || playerPass.tiers.length === 0) ? (
                    <View style={{ backgroundColor: '#12141C', padding: 25, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#30363D', borderStyle: 'dashed' }}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={32} color={T.textMute} />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', marginTop: 10 }}>No custom tiers created yet</Text>
                      <Text style={{ color: T.textMute, fontSize: 11, textAlign: 'center', marginTop: 4, maxWidth: 280 }}>Initialize the Game Pass templates above or click "Create Tier" to design your custom offer structure!</Text>
                    </View>
                  ) : (
                    <View style={{ gap: 12 }}>
                      {playerPass.tiers.map((tier) => (
                        <View key={tier.id} style={{ backgroundColor: '#1E222B', borderWidth: 1, borderColor: T.border, borderRadius: 8, padding: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                            <View style={{ flex: 1, minWidth: 200 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{tier.name}</Text>
                                {tier.adSupported && (
                                  <View style={{ backgroundColor: 'rgba(57, 211, 83, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                    <Text style={{ color: T.green, fontSize: 9, fontWeight: '900' }}>AD SUPPORTED</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={{ color: T.textMute, fontSize: 11, marginTop: 2 }}>
                                Subs: <Text style={{ color: T.cyan, fontWeight: '700' }}>{(tier.subscriberCount || 0).toFixed(2)}M users</Text> · Monthly Rev: <Text style={{ color: T.green, fontWeight: '700' }}>${(tier.monthlyRevenueB * 1000).toFixed(2)}M/mo</Text>
                              </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <TouchableOpacity 
                                style={{ backgroundColor: '#2D3139', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#3D414D' }}
                                onPress={() => {
                                  setTierEditingId(tier.id);
                                  setTierName(tier.name);
                                  setTierPrice(String(tier.price));
                                  setTierAdSupported(tier.adSupported);
                                  setTierPerks(tier.perks || []);
                                  setAddTierModalOpen(true);
                                }}
                              >
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity 
                                style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#FF0000' }}
                                onPress={() => {
                                  const r = deleteGamingPassTier({ passId: playerPass.id, tierId: tier.id });
                                  if (r?.error) {
                                    uiAlert('Delete Failed', r.error);
                                  } else {
                                    uiAlert('Tier Removed', 'Custom tier plan successfully archived.');
                                  }
                                }}
                              >
                                <Text style={{ color: '#FF7F7F', fontSize: 11, fontWeight: '700' }}>Delete</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Plan Perks */}
                          {tier.perks && tier.perks.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 10, borderTopWidth: 1, borderTopColor: '#2D3139', paddingTop: 8 }}>
                              {tier.perks.map(perk => (
                                <View key={perk} style={{ backgroundColor: '#252932', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#303541' }}>
                                  <Text style={{ color: T.cyan, fontSize: 10 }}>✔ {perk}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* TIER CREATION/EDIT OVERLAY MODAL */}
                <Modal visible={addTierModalOpen} transparent animationType="slide">
                  <View style={style.modalOverlay}>
                    <View style={[style.modalBody, { maxHeight: '80%' }]}>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={style.modalTitle}>{tierEditingId ? 'Edit Subscription Tier Plan' : 'Create Custom Subscription Tier'}</Text>
                        
                        <Text style={style.inputLabel}>TIER PLAN NAME</Text>
                        <TextInput 
                          style={style.textbox} 
                          placeholder="e.g. Premium Ultimate"
                          placeholderTextColor={T.textMute}
                          value={tierName}
                          onChangeText={setTierName}
                        />

                        <Text style={style.inputLabel}>MONTHLY SUBSCRIPTION PRICE ($)</Text>
                        <TextInput 
                          style={style.textbox} 
                          placeholder="9.99"
                          placeholderTextColor={T.textMute}
                          keyboardType="numeric"
                          value={tierPrice}
                          onChangeText={setTierPrice}
                        />

                        <Text style={style.inputLabel}>HYBRID AD SUPPORT MODEL</Text>
                        <TouchableOpacity 
                          style={[style.rowJust, { backgroundColor: '#1E222B', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#30363D' }]}
                          onPress={() => setTierAdSupported(!tierAdSupported)}
                        >
                          <View>
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Enable Sponsoring Ads</Text>
                            <Text style={{ color: T.textMute, fontSize: 10 }}>Inject small promotional slots to unlock extra ad placement opex offsets.</Text>
                          </View>
                          <MaterialCommunityIcons 
                            name={tierAdSupported ? "toggle-switch" : "toggle-switch-off"} 
                            size={32} 
                            color={tierAdSupported ? T.green : T.textMute} 
                          />
                        </TouchableOpacity>

                        <Text style={style.inputLabel}>FITTED PLATFORM PERKS SPECIFICATIONS</Text>
                        <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 8 }}>Select the premium perks bundled in this subscription tier:</Text>
                        <View style={{ gap: 6, marginBottom: 15 }}>
                          {allAvailablePerks.map(perk => {
                            const included = tierPerks.includes(perk);
                            return (
                              <TouchableOpacity 
                                key={perk}
                                style={{
                                  backgroundColor: included ? 'rgba(0, 240, 255, 0.08)' : '#1E222B',
                                  borderWidth: 1,
                                  borderColor: included ? T.cyan : '#30363D',
                                  padding: 10,
                                  borderRadius: 8,
                                  flexDirection: 'row',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                                onPress={() => {
                                  if (included) {
                                    setTierPerks(tierPerks.filter(p => p !== perk));
                                  } else {
                                    setTierPerks([...tierPerks, perk]);
                                  }
                                }}
                              >
                                <Text style={{ color: included ? T.cyan : '#fff', fontSize: 11, fontWeight: '700' }}>{perk}</Text>
                                <MaterialCommunityIcons 
                                  name={included ? "checkbox-marked" : "checkbox-blank-outline"} 
                                  size={18} 
                                  color={included ? T.cyan : T.textMute} 
                                />
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <View style={[style.rowJust, { marginTop: 15 }]}>
                          <TouchableOpacity style={style.cancelBtn} onPress={() => setAddTierModalOpen(false)}>
                            <Text style={style.cancelBtnTxt}>Close</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={style.resolveBtn} 
                            onPress={() => {
                              if (!tierName.trim()) {
                                uiAlert('Input Required', 'Provide an elegant name for this tier.');
                                return;
                              }
                              const pr = parseFloat(tierPrice);
                              if (isNaN(pr) || pr <= 0) {
                                uiAlert('Invalid Price', 'Provide a valid numeric subscription monthly pricing.');
                                return;
                              }
                              const r = createORUpdateGamingPassTier({
                                passId: playerPass.id,
                                tierId: tierEditingId || undefined,
                                name: tierName.trim(),
                                price: pr,
                                adSupported: tierAdSupported,
                                perks: tierPerks
                              });
                              if (r?.error) {
                                uiAlert('Save Failed', r.error);
                              } else {
                                uiAlert('Plan Saved', 'Custom tier configurations aggregated successfully.');
                                setAddTierModalOpen(false);
                              }
                            }}
                          >
                            <Text style={style.resolveBtnTxt}>{tierEditingId ? 'Save Changes' : 'Launch Tier'}</Text>
                          </TouchableOpacity>
                        </View>
                      </ScrollView>
                    </View>
                  </View>
                </Modal>

                {/* NEW SUBSCRIPTION LAUNCH MODAL */}
                <Modal visible={showNewPassModal} transparent animationType="slide">
                  <View style={style.modalOverlay}>
                    <View style={style.modalBody}>
                      <Text style={style.modalTitle}>Launch New Gaming Subscription</Text>
                      <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 15 }}>
                        Seeding new game catalog streaming and cloud-save infrastructure. This action costs a one-time <Text style={{ color: T.green }}>$50.0M cash</Text> capital opex.
                      </Text>

                      <Text style={style.inputLabel}>SUBSCRIPTION SERVICE BRAND NAME</Text>
                      <TextInput 
                        style={style.textbox} 
                        placeholder="e.g. Galaxy Play Hub"
                        placeholderTextColor={T.textMute}
                        value={newPassName}
                        onChangeText={setNewPassName}
                      />

                      <View style={[style.rowJust, { marginTop: 15 }]}>
                        <TouchableOpacity style={style.cancelBtn} onPress={() => setShowNewPassModal(false)}>
                          <Text style={style.cancelBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={style.resolveBtn} 
                          onPress={() => {
                            if (!newPassName.trim()) {
                              uiAlert('Name Required', 'Please assign a suitable brand name.');
                              return;
                            }
                            const r = createGamingPass({ name: newPassName.trim() });
                            if (r?.error) {
                              uiAlert('Launch Failed', r.error);
                            } else {
                              uiAlert('Subscription Launched! 🚀', 'Your new catalog service is live. Start configuring tiers to fetch subscribers!');
                              setShowNewPassModal(false);
                            }
                          }}
                        >
                          <Text style={style.resolveBtnTxt}>Launch Service</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>

                {/* RENAME SUBSCRIPTION MODAL */}
                <Modal visible={showRenamePassModal} transparent animationType="slide">
                  <View style={style.modalOverlay}>
                    <View style={style.modalBody}>
                      <Text style={style.modalTitle}>Rename Subscription Service</Text>
                      
                      <Text style={style.inputLabel}>NEW BRAND NAME</Text>
                      <TextInput 
                        style={style.textbox} 
                        value={renamePassInp}
                        onChangeText={setRenamePassInp}
                      />

                      <View style={[style.rowJust, { marginTop: 15 }]}>
                        <TouchableOpacity style={style.cancelBtn} onPress={() => setShowRenamePassModal(false)}>
                          <Text style={style.cancelBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={style.resolveBtn} 
                          onPress={() => {
                            if (!renamePassInp.trim()) {
                              uiAlert('Name Required', 'Please assign a suitable brand name.');
                              return;
                            }
                            const r = renameGamingPass({ passId: playerPass.id, name: renamePassInp.trim() });
                            if (r?.error) {
                              uiAlert('Rename Failed', r.error);
                            } else {
                              uiAlert('Brand Updated', 'Successfully rebranded subscription service.');
                              setShowRenamePassModal(false);
                            }
                          }}
                        >
                          <Text style={style.resolveBtnTxt}>Save Rebrand</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>

                <Text style={style.bulletsHeader}>Active Catalog Includes ({releasedGames.length} first-party releases)</Text>
                {releasedGames.length === 0 ? (
                  <Text style={style.bulletsTxt}>No active title releases deployed into catalogue pipeline yet.</Text>
                ) : (
                  releasedGames.map(game => (
                    <Text key={game.id} style={style.bulletsTxt}>• '{game.title}' [{game.genre}] ({game.criticScore}% Critical Score)</Text>
                  ))
                )}
              </View>
            ) : (
              <View style={style.emptyCard}>
                <Text style={style.emptyTitle}>Gaming Pass Service Offline</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 6: Publishers & Deals Subsystem */}
        {activeTab === 'publishers_deals' && (
          <View style={style.padBox}>
            <Text style={style.sectionTitle}>Global Publishers & Inbound/Outbound Deals</Text>
            <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 15 }}>
              Leverage up to 20 publishers, crossover licenses, day-one console exclusives, or buy/sell IPs directly with rivals.
            </Text>

            {/* SECTOR 1: PROPOSE A LEGAL CONTRACT */}
            <View style={{ backgroundColor: '#1A1D24', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: T.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <MaterialCommunityIcons name="handshake" size={22} color={T.cyan} />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Legal Department: Draft Deal Proposal</Text>
              </View>

              <Text style={style.inputLabel}>CONTRACT DEAL TYPOLOGY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                {[
                  { key: 'publishing_inbound', label: 'Inbound Publishing', desc: 'Secure upfront cash opex for your studio' },
                  { key: 'publishing_outbound', label: 'Outbound Publishing', desc: 'Become the publisher for rival studio titles' },
                  { key: 'crossover_license', label: 'Crossover IP License', desc: 'License content/story crossover rights' },
                  { key: 'franchise_trade', label: 'IP Buy/Sell', desc: 'Buy/Sell/Transfer cinema game franchise' },
                  { key: 'gamepass_bulk_catalog', label: 'Game Pass Catalog License', desc: 'License third-party games to library' }
                ].map(item => {
                  const active = dealType === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 6,
                        backgroundColor: active ? T.cyan : '#252B35',
                        borderWidth: 1,
                        borderColor: active ? T.cyan : '#3D4554',
                        flex: 1,
                        minWidth: 140
                      }}
                      onPress={() => {
                        setDealType(item.key as any);
                        if (item.key === 'franchise_trade') {
                          setDealTermsText('Acquisition of trademark franchise intellectual property rights');
                        } else if (item.key === 'gamepass_bulk_catalog') {
                          setDealTermsText('Bulk license of hit game library to customizable Game Pass catalog');
                        } else {
                          setDealTermsText('Multi-year publishing and distribution joint venture');
                        }
                      }}
                    >
                      <Text style={{ color: active ? '#000' : '#fff', fontSize: 10, fontWeight: '800', textAlign: 'center' }}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={style.inputLabel}>PROPOSER STUDIO (ACTIVE HAND)</Text>
                  <View style={{ backgroundColor: '#252830', borderRadius: 6, padding: 3 }}>
                    <select
                      style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', width: '100%', fontSize: '11px', outline: 'none', padding: '6px' }}
                      value={proposerStudioId}
                      onChange={(e) => setProposerStudioId(e.target.value)}
                    >
                      <option value="">Select Studio</option>
                      <option value={state.player.id}>{state.player.name} (Player Owner)</option>
                      {(state.gamingStudios || []).map(stud => (
                        <option key={stud.id} value={stud.id}>{stud.name} [Owned: {stud.studioId === state.player.id ? 'You' : 'Rival'}]</option>
                      ))}
                    </select>
                  </View>
                </View>

                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text style={style.inputLabel}>RECEIVER PARTY (AI AGREEMENT TARGET)</Text>
                  <View style={{ backgroundColor: '#252830', borderRadius: 6, padding: 3 }}>
                    <select
                      style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', width: '100%', fontSize: '11px', outline: 'none', padding: '6px' }}
                      value={receiverStudioId}
                      onChange={(e) => setReceiverStudioId(e.target.value)}
                    >
                      <option value="">Select Publisher / Studio</option>
                      {(state.gamingPublishers || []).filter(p => !p.isPlayerOwned).map(pub => (
                        <option key={pub.id} value={pub.id}>{pub.name} (Rival Publisher)</option>
                      ))}
                      {(state.gamingStudios || []).filter(s => s.studioId !== state.player.id).map(st => (
                        <option key={st.id} value={st.id}>{st.name} (Rival Dev)</option>
                      ))}
                    </select>
                  </View>
                </View>
              </View>

              {dealType === 'franchise_trade' && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={style.inputLabel}>CHOOSE TRADEMARK FRANCHISE IP</Text>
                  <View style={{ backgroundColor: '#252830', borderRadius: 6, padding: 3 }}>
                    <select
                      style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', width: '100%', fontSize: '11px', outline: 'none', padding: '6px' }}
                      value={dealFranchiseId}
                      onChange={(e) => setDealFranchiseId(e.target.value)}
                    >
                      <option value="">Select Franchise Trademark</option>
                      {(state.franchises || []).map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </View>
                </View>
              )}

              {dealType === 'gamepass_bulk_catalog' && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={style.inputLabel}>SELECT THIRD-PARTY SOURCE GAME</Text>
                  <View style={{ backgroundColor: '#252830', borderRadius: 6, padding: 3 }}>
                    <select
                      style={{ backgroundColor: 'transparent', color: '#fff', border: 'none', width: '100%', fontSize: '11px', outline: 'none', padding: '6px' }}
                      value={dealGameId}
                      onChange={(e) => setDealGameId(e.target.value)}
                    >
                      <option value="">Select Game Release</option>
                      {(state.gamingProjects || []).filter(p => p.studioId !== state.player.id && p.phase === 'Gold').map(game => (
                        <option key={game.id} value={game.id}>{game.title} (Critic: {game.criticScore}%)</option>
                      ))}
                    </select>
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <View style={{ flex: 1, minWidth: 110 }}>
                  <Text style={style.inputLabel}>UPFRONT SIGNING CASH ($M)</Text>
                  <TextInput
                    style={style.textbox}
                    placeholder="25"
                    keyboardType="numeric"
                    placeholderTextColor={T.textMute}
                    value={dealUpfrontFeeM}
                    onChangeText={setDealUpfrontFeeM}
                  />
                </View>

                <View style={{ flex: 1, minWidth: 110 }}>
                  <Text style={style.inputLabel}>ROYALTY PERCENTAGE FEE (%)</Text>
                  <TextInput
                    style={style.textbox}
                    placeholder="10"
                    keyboardType="numeric"
                    placeholderTextColor={T.textMute}
                    value={dealRoyaltyPercent}
                    onChangeText={setDealRoyaltyPercent}
                  />
                </View>
              </View>

              <Text style={style.inputLabel}>LEGAL MEMORANDUM & SCOPE TERMS</Text>
              <TextInput
                style={style.textbox}
                placeholder="Day-one catalogue licensing crossover terms..."
                placeholderTextColor={T.textMute}
                value={dealTermsText}
                onChangeText={setDealTermsText}
              />

              <TouchableOpacity
                style={[style.resolveBtn, { width: '100%', marginTop: 10 }]}
                onPress={() => {
                  if (!proposerStudioId || !receiverStudioId) {
                    uiAlert('Parties Required', 'Please choose the proposing studio and target receiver studio for this agreement.');
                    return;
                  }
                  const upfrontFeeB = parseFloat(dealUpfrontFeeM) * 0.001; // convert $M to $B
                  if (isNaN(upfrontFeeB) || upfrontFeeB < 0) {
                    uiAlert('Invalid Fee', 'Upfront signing bonus must be a valid positive number.');
                    return;
                  }
                  const r = proposeGamingDeal({
                    dealType,
                    proposerStudioId,
                    receiverStudioId,
                    gameId: dealGameId || undefined,
                    franchiseId: dealFranchiseId || undefined,
                    upfrontFeeB,
                    royaltyPercent: parseFloat(dealRoyaltyPercent) || 5,
                    termsText: dealTermsText
                  });

                  if (r?.error) {
                    uiAlert('Contract Transmit Failed', r.error);
                  } else {
                    uiAlert('Contract Executed', 'The AI evaluated and processed your contract. Check active ledger logs below!');
                  }
                }}
              >
                <Text style={style.resolveBtnTxt}>Transmit Binding Proposal</Text>
              </TouchableOpacity>
            </View>

            {/* SECTOR 2: ACTIVE LEDGER LOGS */}
            <View style={{ backgroundColor: '#1A1D24', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: T.border, marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 10 }}>Active Legal Ledger Contracts</Text>
              {(!state.gamingPublishingDeals || state.gamingPublishingDeals.length === 0) ? (
                <Text style={{ color: T.textMute, fontSize: 11, fontStyle: 'italic' }}>Zero active deals in legal opex registries.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {state.gamingPublishingDeals.map((deal: any) => (
                    <View key={deal.id} style={{ backgroundColor: '#12141B', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#30363D' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: T.cyan, fontSize: 11, fontWeight: 'bold' }}>{deal.dealType.replace('_', ' ').toUpperCase()}</Text>
                        <View style={{
                          backgroundColor: deal.status === 'accepted' ? 'rgba(57, 211, 83, 0.15)' : deal.status === 'pending' ? 'rgba(255, 211, 0, 0.15)' : 'rgba(255,0,0,0.15)',
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}>
                          <Text style={{ color: deal.status === 'accepted' ? T.green : deal.status === 'pending' ? T.yellow : 'red', fontSize: 9, fontWeight: '900' }}>
                            {deal.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12, marginTop: 4, fontWeight: '600' }}>"{deal.termsText}"</Text>
                      <Text style={{ color: T.textMute, fontSize: 10, marginTop: 2 }}>
                        Upfront Signing cash: <Text style={{ color: T.cyan }}>${(deal.upfrontFeeB * 1000).toFixed(0)}M</Text> · Royalty cut: <Text style={{ color: T.green }}>{deal.royaltyPercent}%</Text>
                      </Text>

                      {deal.status === 'pending' && deal.receiverStudioId === state.player.id && (
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                          <TouchableOpacity
                            style={{ backgroundColor: T.green, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4 }}
                            onPress={() => {
                              const r = processGamingDealResponse({ dealId: deal.id, response: 'accepted' });
                              if (r?.error) uiAlert('Agreement Error', r.error);
                              else uiAlert('Contract Executed', 'Contract terms accepted and executed!');
                            }}
                          >
                            <Text style={{ color: '#000', fontSize: 10, fontWeight: '800' }}>Accept Terms</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ backgroundColor: 'rgba(255,0,0,0.1)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4, borderWidth: 1, borderColor: 'red' }}
                            onPress={() => {
                              processGamingDealResponse({ dealId: deal.id, response: 'rejected' });
                              uiAlert('Contract Terminated', 'Rejected proposed contract terms.');
                            }}
                          >
                            <Text style={{ color: 'red', fontSize: 10, fontWeight: '800' }}>Refuse Agreement</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* SECTOR 3: 20+ REGISTERED PUBLISHERS */}
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 10 }}>Global Sector Publishers Registry ({state.gamingPublishers?.length || 0} Entities)</Text>
            <View style={{ gap: 10 }}>
              {(state.gamingPublishers || []).map((pub: any) => (
                <View key={pub.id} style={{ backgroundColor: '#1A1D24', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 12, height: 12, backgroundColor: pub.logoBg, borderRadius: 2 }} />
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>{pub.name}</Text>
                    </View>
                    <View style={{ backgroundColor: pub.isPlayerOwned ? 'rgba(0,240,255,0.15)' : 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: pub.isPlayerOwned ? T.cyan : T.textMute, fontSize: 9, fontWeight: '900' }}>
                        {pub.isPlayerOwned ? 'PLAYER BRANCH' : 'COMPETING RIVAL'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, flexWrap: 'wrap', gap: 10 }}>
                    <View>
                      <Text style={{ color: T.textMute, fontSize: 10 }}>Sector Market Share</Text>
                      <Text style={{ color: T.cyan, fontSize: 12, fontWeight: 'bold' }}>{(pub.marketShare * 100).toFixed(1)}% market</Text>
                    </View>
                    <View>
                      <Text style={{ color: T.textMute, fontSize: 10 }}>Fitted Capital reserves</Text>
                      <Text style={{ color: T.green, fontSize: 12, fontWeight: 'bold' }}>${(pub.cashB * 1000).toFixed(0)}M cash</Text>
                    </View>
                    <View>
                      <Text style={{ color: T.textMute, fontSize: 10 }}>Focus Genras</Text>
                      <Text style={{ color: '#fff', fontSize: 11 }}>{pub.focusGenre?.join(', ') || 'General'}</Text>
                    </View>
                    <View>
                      <Text style={{ color: T.textMute, fontSize: 10 }}>Corporate Reputation</Text>
                      <Text style={{ color: T.yellow, fontSize: 12, fontWeight: 'bold' }}>{pub.reputation} / 100</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 8: Industry Database, Search, and Conferences Subsystem */}
        {activeTab === 'trends' && (
          <View style={style.padBox}>
            <Text style={style.sectionTitle}>Global Industry Database & Search Hub</Text>
            <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 15 }}>
              Explore comprehensive global records, rival hardware systems, trademarks, sub-publishing corporations, physical clubs, and international conferences.
            </Text>

            {/* UPPER SUB-NAVIGATION SWITCH */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, backgroundColor: '#13171F', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: T.border }}>
              {[
                { key: 'trends', label: 'Genre Trends', icon: 'chart-line' },
                { key: 'search', label: 'DB Search Explorer', icon: 'magnify' },
                { key: 'conferences', label: 'Events & Awards', icon: 'trophy-award' }
              ].map(sub => {
                const active = industrySubTab === sub.key;
                return (
                  <TouchableOpacity
                    key={sub.key}
                    style={{ 
                      flex: 1, 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 4, 
                      paddingVertical: 8, 
                      borderRadius: 6, 
                      backgroundColor: active ? T.cyan : 'transparent' 
                    }}
                    onPress={() => setIndustrySubTab(sub.key as any)}
                  >
                    <MaterialCommunityIcons name={sub.icon as any} size={15} color={active ? '#000' : T.textMute} />
                    <Text style={{ color: active ? '#000' : '#fff', fontSize: 10, fontWeight: '900' }}>{sub.label.toUpperCase()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* SUB-SECTION 1: TREND FEED */}
            {industrySubTab === 'trends' && (
              <View style={style.trendsCard}>
                <Text style={style.passTitle}>Genre Hot-Trend Multipliers</Text>
                <Text style={style.specsHeader}>A genre factor above 1.0 accelerates physical sales of newly Gold-launched pipeline titles.</Text>
                
                {state.gamingTrends && Object.entries(state.gamingTrends.genreTrend).map(([genre, trendVal]: any) => (
                  <View key={genre} style={style.trendRow}>
                    <Text style={style.trendRowLabel}>{genre}</Text>
                    <View style={style.trendRowBarContainer}>
                      <View style={[style.trendRowBarValue, { width: `${Math.min(100, Math.round((trendVal / 2.0) * 100))}%` }]} />
                    </View>
                    <Text style={[style.trendRowVal, trendVal > 1.15 ? { color: T.green } : trendVal < 0.9 ? { color: T.red } : { color: '#fff' }]}>
                      {trendVal.toFixed(2)}x
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* SUB-SECTION 2: DB SEARCH EXPLORER */}
            {industrySubTab === 'search' && (
              <View style={{ gap: 12 }}>
                {/* Search Text Input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: T.panel, borderRadius: 8, borderWidth: 1, borderColor: T.border, paddingHorizontal: 10 }}>
                  <MaterialCommunityIcons name="magnify" size={20} color={T.textMute} style={{ marginRight: 6 }} />
                  <TextInput
                    style={{ flex: 1, color: '#fff', fontSize: 12, paddingVertical: 10 }}
                    placeholder="Search database records..."
                    placeholderTextColor="#556"
                    value={dbSearchQuery}
                    onChangeText={setDbSearchQuery}
                  />
                  {dbSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setDbSearchQuery('')}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={T.textMute} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* DB Category SELECTOR */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                  {(['Studios', 'Consoles', 'Franchises', 'Publishers'] as const).map(cat => {
                    const active = dbCategory === (cat as any);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: active ? T.magenta : '#1E222B',
                          borderWidth: 1,
                          borderColor: active ? T.magenta : '#333D4F',
                          marginRight: 6
                        }}
                        onPress={() => setDbCategory(cat as any)}
                      >
                        <Text style={{ color: active ? '#000' : '#fff', fontSize: 10, fontWeight: '800' }}>{cat.toUpperCase()}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* SEARCH RESULTS FEED */}
                <View style={{ gap: 10 }}>
                  {dbCategory === 'Studios' && (
                    <>
                      {((state.gamingStudios || []) as any[])
                        .filter(st => {
                          const nameMatch = st.name.toLowerCase().includes(dbSearchQuery.toLowerCase());
                          const hqMatch = st.hqName?.toLowerCase().includes(dbSearchQuery.toLowerCase());
                          return nameMatch || hqMatch;
                        })
                        .map(st => {
                          const isPlayer = st.studioId === state.player.id;
                          const isRival = (state.rivals || []).some(r => r.id === st.studioId);
                          const isIndependent = !isPlayer && !isRival;
                          return (
                            <View key={st.id} style={{ backgroundColor: '#1A1D24', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: isPlayer ? T.cyan + '60' : isIndependent ? T.yellow + '30' : T.border }}>
                              <View style={style.rowJust}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{st.name}</Text>
                                <Text style={{
                                  color: isPlayer ? T.cyan : isIndependent ? T.yellow : '#A855F7',
                                  fontSize: 9,
                                  fontWeight: '900',
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  backgroundColor: isPlayer ? T.cyan + '20' : isIndependent ? T.yellow + '15' : '#A855F720'
                                }}>
                                  {isPlayer ? 'YOUR DIVISION' : isIndependent ? 'INDEPENDENT' : 'RIVAL DEV'}
                                </Text>
                              </View>
                              <Text style={{ color: T.textMute, fontSize: 11, marginTop: 2 }}>HQ Moniker: {st.hqName || 'Local Branch Office'}</Text>
                              
                              <View style={{ flexDirection: 'row', gap: 15, marginTop: 8, borderTopWidth: 1, borderColor: '#2E333F', paddingTop: 8 }}>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 9 }}>GEOGRAPHY</Text>
                                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{st.region || 'US'}</Text>
                                </View>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 9 }}>STAFF FORCE</Text>
                                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{st.programmers || 0} Dev / {st.designers || 0} Art</Text>
                                </View>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 9 }}>TECH UNLOCKED</Text>
                                  <Text style={{ color: T.cyan, fontSize: 11, fontWeight: 'bold' }}>Gen {st.unlockedGameGen || 1}</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      {((state.gamingStudios || [])).length === 0 && (
                        <Text style={{ color: T.textMute, fontSize: 11, textAlign: 'center', padding: 25 }}>No active gaming studios registered in database logs.</Text>
                      )}
                    </>
                  )}

                  {dbCategory === 'Consoles' && (
                    <>
                      {((state.gamingConsoles || []) as any[])
                        .filter(c => c.title.toLowerCase().includes(dbSearchQuery.toLowerCase()))
                        .map(c => {
                          const mfr = state.rivals.find(r => r.id === c.studioId)?.name || 'Your Hardware Division';
                          return (
                            <View key={c.id} style={{ backgroundColor: '#1A1D24', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.border }}>
                              <View style={style.rowJust}>
                                <Text style={{ color: T.yellow, fontSize: 13, fontWeight: 'bold' }}>{c.title}</Text>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#2E3345' }}>
                                  Generation {c.generation}
                                </Text>
                              </View>
                              <Text style={{ color: T.textMute, fontSize: 11, marginTop: 2 }}>Manufacturer: {mfr}</Text>

                              <View style={{ gap: 4, marginTop: 8, backgroundColor: '#13161C', borderRadius: 6, padding: 8 }}>
                                <Text style={{ color: T.textMute, fontSize: 10 }}>SPECS: <Text style={{ color: '#fff' }}>CPU: {c.specs.cpu} | GPU: {c.specs.gpu} | ROM: {c.specs.ram} | Storage: {c.specs.storage}</Text></Text>
                              </View>

                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, borderTopWidth: 1, borderColor: '#2E333F', paddingTop: 8 }}>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 8 }}>MARKET SHARE</Text>
                                  <Text style={{ color: T.green, fontSize: 11, fontWeight: 'bold' }}>{(c.marketShare || 0).toFixed(1)}%</Text>
                                </View>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 8 }}>UNITS DISTRIBUTED</Text>
                                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{((c.unitsSold || 0) / 1000000).toFixed(2)}M</Text>
                                </View>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 8 }}>REVENUE FEE</Text>
                                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>${c.price || 499}</Text>
                                </View>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 8 }}>ONLINE SUBS</Text>
                                  <Text style={{ color: T.cyan, fontSize: 11, fontWeight: 'bold' }}>{((c.subscriberCount || 0) / 1000000).toFixed(2)}M</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      {((state.gamingConsoles || [])).length === 0 && (
                        <Text style={{ color: T.textMute, fontSize: 11, textAlign: 'center', padding: 25 }}>No proprietary console hardware platform releases active yet.</Text>
                      )}
                    </>
                  )}

                  {dbCategory === 'Franchises' && (
                    <>
                      {((state.franchises || []) as any[])
                        .filter(f => f.name.toLowerCase().includes(dbSearchQuery.toLowerCase()))
                        .map(f => {
                          const progGames = (state.gamingProjects || []).filter(gp => {
                            if (!gp.adaptationMovieId) return false;
                            const mv = (state.movies || []).find(m => m.id === gp.adaptationMovieId);
                            return mv && mv.franchiseId === f.id;
                          });
                          return (
                            <View key={f.id} style={{ backgroundColor: '#1A1D24', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.border }}>
                              <View style={style.rowJust}>
                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{f.name}</Text>
                                <View style={{ flexDirection: 'row', gap: 4 }}>
                                  <Text style={{ color: T.yellow, fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: T.yellow + '1A' }}>
                                    Popularity: {f.popularity}/100
                                  </Text>
                                </View>
                              </View>
                              <View style={{ flexDirection: 'row', gap: 15, marginTop: 8, borderTopWidth: 1, borderColor: '#2E333F', paddingTop: 8 }}>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 9 }}>ACTIVE RETOUR SEQUELS</Text>
                                  <Text style={{ color: T.cyan, fontSize: 11, fontWeight: 'bold' }}>{progGames.length} Gaming Adapts</Text>
                                </View>
                                <View>
                                  <Text style={{ color: T.textMute, fontSize: 9 }}>ORIGIN</Text>
                                  <Text style={{ color: '#fff', fontSize: 11 }}>Branded IP License</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                    </>
                  )}

                  {dbCategory === 'Publishers' && (
                    <>
                      {((state.gamingPublishers || []) as any[])
                        .filter(p => p.name.toLowerCase().includes(dbSearchQuery.toLowerCase()))
                        .map(p => (
                          <View key={p.id} style={{ backgroundColor: '#1A1D24', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.border }}>
                            <View style={style.rowJust}>
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{p.name}</Text>
                              <Text style={{ color: T.green, fontSize: 10, fontWeight: '900' }}>
                                {p.isPlayerOwned ? 'PLAYER BRANCH' : 'GLOBAL NPC SYNDICATE'}
                              </Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 15, marginTop: 8, borderTopWidth: 1, borderColor: '#2E333F', paddingTop: 8 }}>
                              <View>
                                <Text style={{ color: T.textMute, fontSize: 9 }}>REP STRENGTH</Text>
                                <Text style={{ color: T.yellow, fontSize: 11, fontWeight: 'bold' }}>{p.reputation || 50} / 100</Text>
                              </View>
                              <View>
                                <Text style={{ color: T.textMute, fontSize: 9 }}>FAVORED GENRE</Text>
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{p.favoriteGenre || 'RPG'}</Text>
                              </View>
                              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={{ color: T.textMute, fontSize: 9 }}>CASH HOLDINGS</Text>
                                <Text style={{ color: T.green, fontSize: 11, fontWeight: 'bold' }}>${((p.cash || 50) * 1000).toFixed(1)}M</Text>
                              </View>
                            </View>
                          </View>
                        ))}
                    </>
                  )}
                </View>
              </View>
            )}

            {/* SUB-SECTION 3: CONFERENCES AND AWARDS EVENTS CALENDAR */}
            {industrySubTab === 'conferences' && (
              <View style={{ gap: 12 }}>
                <View style={{ backgroundColor: '#13161C', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ color: T.yellow, fontSize: 13, fontWeight: '800', marginBottom: 6 }}>📅 Active Industry Event Timeline Calendar</Text>
                  <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 8 }}>
                    Each simulation year hosts critical conferences and awards shows. Keep tracking your chronology to align launches with events!
                  </Text>

                  {[
                    { name: 'Sundance Indie Showcase', week: 3, desc: 'Fringe screenwriters & experimental screenplays bonus week.' },
                    { name: 'Academy Awards (Oscars)', week: 12, desc: 'Prestigious global media recognition. Triggers major box office jumps.' },
                    { name: 'Cannes Film Festival Prestige Gala', week: 20, desc: 'High reputation auteur critical praise boost.' },
                    { name: 'E3 Electronic Gaming Expo', week: 24, desc: 'Major proprietary engine module and next-generation specs announcements.' },
                    { name: 'Tokyo Game Show Asia Pavilion', week: 36, desc: 'High visual and console subscriber sign-ups multiplier.' },
                    { name: 'The Global Game Awards (GOTY)', week: 50, desc: 'Annual gaming validation and critical success.' }
                  ].map(evt => {
                    const diff = evt.week - state.week;
                    const statusText = diff === 0 ? 'LIVE EVENT WEEK ★' : diff > 0 ? `In ${diff} weeks` : 'Concluded this year';
                    const activeColor = diff === 0 ? T.green : diff > 0 ? T.cyan : T.textMute;
                    return (
                      <View key={evt.name} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderColor: '#212631', alignItems: 'center' }}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{evt.name}</Text>
                          <Text style={{ color: T.textMute, fontSize: 10, marginTop: 1 }}>{evt.desc}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: activeColor, fontSize: 10, fontWeight: '900' }}>{statusText.toUpperCase()}</Text>
                          <Text style={{ color: T.textMute, fontSize: 10 }}>Week {evt.week}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* AWARD LOGS */}
                <View style={{ backgroundColor: '#1E1B24', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#4C1D95' }}>
                  <Text style={{ color: '#A855F7', fontSize: 13, fontWeight: '800', marginBottom: 6 }}>🏆 Historical Award Winners & Hall of Fame</Text>
                  
                  {((state.awardsLog || []) as any[]).map((log, index) => (
                    <View key={index} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: '#2A1F3B' }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{log.category || 'Game of the Year'} ({log.year})</Text>
                      <Text style={{ color: T.textMute, fontSize: 11, marginTop: 1 }}>Recipient: <Text style={{ color: T.yellow }}>{log.title}</Text> ({log.criticScore}/100)</Text>
                    </View>
                  ))}
                  {((state.awardsLog || [])).length === 0 && (
                    <Text style={{ color: T.textMute, fontSize: 11, textAlign: 'center', paddingVertical: 12 }}>No historical winners logged yet. Complete the first calendar year to register awards!</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* MODALS SECTION */}

      {/* 1. Build Custom Engine */}
      <Modal visible={engineModalOpen} transparent animationType="slide">
        <View style={style.modalOverlay}>
          <View style={style.modalBody}>
            <Text style={style.modalTitle}>R&D Engine Blueprint Builder</Text>
            
            <Text style={style.inputLabel}>ENGINE MONIKER TITLE</Text>
            <TextInput 
              style={style.textbox} 
              placeholder="e.g. Genesis Render Engine" 
              placeholderTextColor={T.textMute} 
              value={engineName}
              onChangeText={setEngineName}
            />

            <Text style={style.inputLabel}>HARDWARE UNLOCKED GENERATION ({selectedGen})</Text>
            <View style={style.row}>
              {ENGINE_GENERATIONS.map(eg => {
                const unlocked = eg.gen <= (state?.player?.unlockedGameGen || 1);
                return (
                  <TouchableOpacity 
                    key={eg.gen} 
                    style={[
                      style.pillBtn, 
                      selectedGen === eg.gen && style.pillBtnActive,
                      !unlocked && { backgroundColor: '#222', borderColor: '#444', opacity: 0.5 }
                    ]}
                    disabled={!unlocked}
                    onPress={() => setSelectedGen(eg.gen)}
                  >
                    <Text style={[style.pillTxt, !unlocked && { color: T.textMute }]}>
                      {unlocked ? '' : '🔒 '}Gen {eg.gen}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={style.upgradeCostMUnder}>
              Upfront licensing setup cost: ${ENGINE_GENERATIONS[selectedGen - 1]?.costM}M opex
            </Text>

            <Text style={style.inputLabel}>FITTED CUSTOM CODE MODULES</Text>
            <View style={style.modulesSelectorGrid}>
              {(Object.keys(ENGINE_MODULES_SPECS) as GameEngineModule[]).map(mod => {
                const checked = selectedModules.includes(mod);
                return (
                  <TouchableOpacity 
                    key={mod} 
                    style={[style.moduleSelectBox, checked && style.moduleSelectBoxChecked]}
                    onPress={() => {
                      if (checked) {
                        setSelectedModules(selectedModules.filter(m => m !== mod));
                      } else {
                        setSelectedModules([...selectedModules, mod]);
                      }
                    }}
                  >
                    <Text style={[style.moduleSelectTxt, checked && { color: '#000' }]}>{mod}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[style.rowJust, { marginTop: 20 }]}>
              <TouchableOpacity style={style.cancelBtn} onPress={() => setEngineModalOpen(false)}>
                <Text style={style.cancelBtnTxt}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={style.resolveBtn} onPress={handleCreateEngine}>
                <Text style={style.resolveBtnTxt}>Confirm Setup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Found Studio HQ */}
      <Modal visible={foundHQModalOpen} transparent animationType="slide">
        <View style={style.modalOverlay}>
          <View style={style.modalBody}>
            <Text style={style.modalTitle}>Found Gaming Specialization Studio HQ</Text>
            
            <Text style={style.inputLabel}>STUDIO DIVISION TITLE</Text>
            <TextInput 
              style={style.textbox} 
              placeholder="e.g. Lunar Core Games" 
              placeholderTextColor={T.textMute} 
              value={hqName}
              onChangeText={setHQName}
            />

            <Text style={style.inputLabel}>SPECIALIZATION TIER FOCUS</Text>
            <View style={style.row}>
              {(['Indie', 'Mobile', 'Mid-Tier', 'AAA'] as GamingStudioType[]).map(tier => (
                <TouchableOpacity 
                  key={tier} 
                  style={[style.pillBtn, hqType === tier && style.pillBtnActive]}
                  onPress={() => setHQType(tier)}
                >
                  <Text style={style.pillTxt}>{tier}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={style.upgradeCostMUnder}>
              Founding upfront opex cost: ${hqType === 'AAA' ? 60 : hqType === 'Mid-Tier' ? 25 : 8}M opex
            </Text>

            <View style={[style.rowJust, { marginTop: 20 }]}>
              <TouchableOpacity style={style.cancelBtn} onPress={() => setFoundHQModalOpen(false)}>
                <Text style={style.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={style.resolveBtn} onPress={handleFoundHQ}>
                <Text style={style.resolveBtnTxt}>Found HQ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Launch Project Pipeline */}
      <Modal visible={projectModalOpen} transparent animationType="slide">
        <View style={style.modalOverlay}>
          <View style={style.modalBody}>
            <ScrollView>
              <Text style={style.modalTitle}>Configure Game Pipeline Production</Text>
              
              <Text style={style.inputLabel}>PROJECT METRIC TITLE</Text>
              <TextInput 
                style={style.textbox} 
                placeholder="e.g. Halo Infinite Remake" 
                placeholderTextColor={T.textMute} 
                value={projTitle}
                onChangeText={setProjTitle}
              />

              <Text style={style.inputLabel}>TARGET MEDIA GENRE</Text>
              <View style={style.modulesSelectorGrid}>
                {Object.keys(GENRE_FEATURES_WEIGHTS).map((g: any) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[style.moduleSelectBox, projGenre === g && style.moduleSelectBoxChecked]}
                    onPress={() => setProjGenre(g)}
                  >
                    <Text style={[style.moduleSelectTxt, projGenre === g && { color: '#000' }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>THEMATIC SUBGENRE & TOPIC FOCUS</Text>
              <View style={style.modulesSelectorGrid}>
                {['Sandbox', 'Survival', 'High Fantasy', 'Cyberpunk', 'Space Opera', 'Zombie Horror', 'Superhero', 'Anime', 'Historical', 'Modern Military'].map((sg: any) => (
                  <TouchableOpacity 
                    key={sg} 
                    style={[style.moduleSelectBox, projSubgenre === sg && style.moduleSelectBoxChecked]}
                    onPress={() => setProjSubgenre(sg)}
                  >
                    <Text style={[style.moduleSelectTxt, projSubgenre === sg && { color: '#000' }]}>{sg}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>LICENSED GAME ENGINE</Text>
              <View style={style.row}>
                {playerEngines.map(e => (
                  <TouchableOpacity 
                    key={e.id} 
                    style={[style.pillBtn, projEngineId === e.id && style.pillBtnActive]}
                    onPress={() => setProjEngineId(e.id)}
                  >
                    <Text style={style.pillTxt}>{e.name} (Gen {e.generation})</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>RESPONSIBLE HQ DELEGATION</Text>
              <View style={style.row}>
                {playerStudios.map(s => (
                  <TouchableOpacity 
                    key={s.id} 
                    style={[style.pillBtn, projStudioId === s.id && style.pillBtnActive]}
                    onPress={() => setProjStudioId(s.id)}
                  >
                    <Text style={style.pillTxt}>{s.name} ({s.type})</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>PLANNED MONETIZATION MODEL</Text>
              <View style={style.row}>
                {(['Premium', 'GaaS', 'F2P', 'Subscription'] as const).map(mon => (
                  <TouchableOpacity 
                    key={mon} 
                    style={[style.pillBtn, projMonetization === mon && style.pillBtnActive]}
                    onPress={() => setProjMonetization(mon)}
                  >
                    <Text style={style.pillTxt}>{mon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>MEDIA ADAPTION CROSS-SYNERGY (OPTIONAL)</Text>
              <View style={style.row}>
                <TouchableOpacity 
                  style={[style.pillBtn, !adaptationMovieId && style.pillBtnActive]}
                  onPress={() => setAdaptationMovieId('')}
                >
                  <Text style={style.pillTxt}>Pure Original Game IP</Text>
                </TouchableOpacity>
                {state.movies.filter(m => m.studioId === state.player.id).slice(0, 3).map(m => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={[style.pillBtn, adaptationMovieId === m.id && style.pillBtnActive]}
                    onPress={() => setAdaptationMovieId(m.id)}
                  >
                    <Text style={style.pillTxt}>Adapt '{m.title}'</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>PRODUCTION BUDGET (SOFTWARE R&D)</Text>
              <TextInput 
                style={style.textbox} 
                keyboardType="numeric"
                value={projBudgetM}
                onChangeText={setProjBudgetM}
              />

              <Text style={style.inputLabel}>LAUNCH CAMPAIGN PROMOTION BUDGET</Text>
              <TextInput 
                style={style.textbox} 
                keyboardType="numeric"
                value={projMarketingM}
                onChangeText={setProjMarketingM}
              />

              <View style={[style.rowJust, { marginTop: 25 }]}>
                <TouchableOpacity style={style.cancelBtn} onPress={() => setProjectModalOpen(false)}>
                  <Text style={style.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={style.resolveBtn} onPress={handleStartProject}>
                  <Text style={style.resolveBtnTxt}>Launch Pipeline</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Hardware Lab Console Designer */}
      <Modal visible={consoleModalOpen} transparent animationType="slide">
        <View style={style.modalOverlay}>
          <View style={style.modalBody}>
            <ScrollView>
              <Text style={style.modalTitle}>Hardware Spec Console Lab</Text>
              
              <Text style={style.inputLabel}>CONSOLE MONIKER</Text>
              <TextInput 
                style={style.textbox} 
                placeholder="e.g. Aegis VR Deck" 
                placeholderTextColor={T.textMute} 
                value={consoleTitle}
                onChangeText={setConsoleTitle}
              />

              <Text style={style.inputLabel}>CPU ARCHITECTURE SELECTION</Text>
              <View style={style.row}>
                {(['Multi-Core', 'Custom Cloud Architecture', 'Quantum Hybrid'] as const).map(cpuKey => (
                  <TouchableOpacity 
                    key={cpuKey} 
                    style={[style.pillBtn, consoleCpu === cpuKey && style.pillBtnActive]}
                    onPress={() => setConsoleCpu(cpuKey)}
                  >
                    <Text style={style.pillTxt}>{cpuKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>GRAPHICS PIPELINE NODE</Text>
              <View style={style.row}>
                {(['Rasterized', 'Fixed-Pipeline', 'Voxel-Shaded', 'Hardware Ray-Tracing'] as const).map(gpuKey => (
                  <TouchableOpacity 
                    key={gpuKey} 
                    style={[style.pillBtn, consoleGpu === gpuKey && style.pillBtnActive]}
                    onPress={() => setConsoleGpu(gpuKey)}
                  >
                    <Text style={style.pillTxt}>{gpuKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>RAM ALLOCATION SIZE</Text>
              <View style={style.row}>
                {(['MBs', 'GBs', 'Unified High Bandwidth'] as const).map(ramKey => (
                  <TouchableOpacity 
                    key={ramKey} 
                    style={[style.pillBtn, consoleRam === ramKey && style.pillBtnActive]}
                    onPress={() => setConsoleRam(ramKey)}
                  >
                    <Text style={style.pillTxt}>{ramKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={style.inputLabel}>HARDWARE CONSUMER RETAIL PRICE (USD)</Text>
              <TextInput 
                style={style.textbox} 
                keyboardType="numeric"
                value={consolePrice}
                onChangeText={setConsolePrice}
              />

              <Text style={style.inputLabel}>INTERNAL MANUFACTURING COST TO ASSEMBLE</Text>
              <TextInput 
                style={style.textbox} 
                keyboardType="numeric"
                value={consoleMfgCost}
                onChangeText={setConsoleMfgCost}
              />

              <View style={[style.rowJust, { marginTop: 25 }]}>
                <TouchableOpacity style={style.cancelBtn} onPress={() => setConsoleModalOpen(false)}>
                  <Text style={style.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={style.resolveBtn} onPress={handleDesignConsole}>
                  <Text style={style.resolveBtnTxt}>Queue R&D</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Configure Game Pass Catalog subscription */}
      <Modal visible={passModalOpen} transparent animationType="slide">
        <View style={style.modalOverlay}>
          <View style={[style.modalBody, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={style.modalTitle}>Configure Custom Game Pass</Text>
              
              <Text style={style.inputLabel}>MONTHLY PLAN PRICING LEVEL</Text>
              <View style={{ gap: 6, marginBottom: 12 }}>
                {(['value', 'balanced', 'premium'] as const).map((lvl) => {
                  const active = passPricingLevel === lvl;
                  const spec = GAMING_PASS_PRICE_SPECS[lvl];
                  return (
                    <TouchableOpacity
                      key={lvl}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: active ? T.cyan : '#1E222B',
                        borderWidth: 1,
                        borderColor: active ? T.cyan : '#30363D',
                      }}
                      onPress={() => setPassPricingLevel(lvl)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: active ? '#000' : '#fff', fontSize: 13, fontWeight: '700' }}>
                          {spec?.label}
                        </Text>
                        <Text style={{ color: active ? '#000' : T.cyan, fontSize: 11, fontWeight: '800' }}>
                          Standard: ${spec?.standard}/mo
                        </Text>
                      </View>
                      <Text style={{ color: active ? '#1A1D20' : T.textMute, fontSize: 11, marginTop: 4 }}>
                        Basic tier: ${spec?.basic}/mo · Premium tier: ${spec?.premium}/mo
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={style.inputLabel}>CATALOG CONTENT SCOPE</Text>
              <View style={{ gap: 6, marginBottom: 12 }}>
                {(['indie_only', 'mixed_catalog', 'day_one_aaa'] as const).map((sc) => {
                  const active = passLibraryScope === sc;
                  const spec = GAMING_PASS_SCOPE_SPECS[sc];
                  return (
                    <TouchableOpacity
                      key={sc}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: active ? T.magenta : '#1E222B',
                        borderWidth: 1,
                        borderColor: active ? T.magenta : '#30363D',
                      }}
                      onPress={() => setPassLibraryScope(sc)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: active ? '#000' : '#fff', fontSize: 13, fontWeight: '700' }}>
                          {spec?.label}
                        </Text>
                        <Text style={{ color: active ? '#000' : T.magenta, fontSize: 11, fontWeight: '800' }}>
                          Catalog Opex Upkeep: {spec?.weeklyOpexMult}x
                        </Text>
                      </View>
                      <Text style={{ color: active ? '#1A1D20' : T.textMute, fontSize: 11, marginTop: 4 }}>
                        Subscriber attraction factor multiplier: {spec?.attractMult}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={style.inputLabel}>HYBRID ADVERTISING NETWORK RANGE</Text>
              <View style={{ gap: 6, marginBottom: 12 }}>
                {(['none', 'lite_sponsored', 'ad_heavy'] as const).map((ad) => {
                  const active = passAdWavelength === ad;
                  const spec = GAMING_PASS_AD_SPECS[ad];
                  return (
                    <TouchableOpacity
                      key={ad}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: active ? T.green : '#1E222B',
                        borderWidth: 1,
                        borderColor: active ? T.green : '#30363D',
                      }}
                      onPress={() => setPassAdWavelength(ad)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: active ? '#000' : '#fff', fontSize: 13, fontWeight: '700' }}>
                          {spec?.label}
                        </Text>
                        <Text style={{ color: active ? '#000' : T.green, fontSize: 11, fontWeight: '800' }}>
                          Ad Revenue: +${spec?.adRevenuePerSubYear}/yr each user
                        </Text>
                      </View>
                      <Text style={{ color: active ? '#1A1D20' : T.textMute, fontSize: 11, marginTop: 4 }}>
                        Organic signups flow multiplier: {spec?.attractMult}x
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={style.inputLabel}>PLATFORM CONSOLE COMPATIBILITY</Text>
              <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 6 }}>Attract subscriber segments by deploying catalog to dynamic consoles</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(state.gamingConsoles || []).map(con => {
                  const selected = passSelectedConsoles.includes(con.id);
                  return (
                    <TouchableOpacity 
                      key={con.id} 
                      style={[style.moduleSelectBox, selected && style.moduleSelectBoxChecked, { paddingVertical: 6 }]}
                      onPress={() => {
                        if (selected) {
                          setPassSelectedConsoles(passSelectedConsoles.filter(id => id !== con.id));
                        } else {
                          setPassSelectedConsoles([...passSelectedConsoles, con.id]);
                        }
                      }}
                    >
                      <Text style={[style.moduleSelectTxt, selected && { color: '#000' }]}>
                        {con.title} (Gen {con.generation})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={style.inputLabel}>DEPLOY GAMES TO CATALOG</Text>
              <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 6 }}>Deploy released IP to catalog. Larger game catalogs spike subscribers demand.</Text>
              <View style={{ gap: 6 }}>
                {releasedGames.length === 0 ? (
                  <Text style={{ color: T.textDim, fontSize: 11, fontStyle: 'italic' }}>Zero released game projects available inside pipeline.</Text>
                ) : (
                  releasedGames.map(game => {
                    const checked = passSelectedGames.includes(game.id);
                    return (
                      <TouchableOpacity 
                        key={game.id} 
                        style={[style.rowJust, { backgroundColor: T.panelAlt, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: checked ? T.cyan : 'transparent' }]}
                        onPress={() => {
                          if (checked) {
                            setPassSelectedGames(passSelectedGames.filter(id => id !== game.id));
                          } else {
                            setPassSelectedGames([...passSelectedGames, game.id]);
                          }
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{game.title}</Text>
                          <Text style={{ color: T.textMute, fontSize: 10 }}>{game.genre} · Critique: {game.criticScore}%</Text>
                        </View>
                        <MaterialCommunityIcons 
                          name={checked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                          size={18} 
                          color={checked ? T.cyan : T.textMute} 
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <View style={[style.rowJust, { marginTop: 25 }]}>
                <TouchableOpacity style={style.cancelBtn} onPress={() => setPassModalOpen(false)}>
                  <Text style={style.cancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={style.resolveBtn} onPress={handleConfigurePass}>
                  <Text style={style.resolveBtnTxt}>Save Settings</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 6. Dynamic Asset Rename Modal */}
      <Modal visible={!!renameTarget} transparent animationType="fade">
        <View style={style.modalOverlay}>
          <View style={style.modalBody}>
            <Text style={style.modalTitle}>Rename {renameTarget?.kind === 'studio' ? 'Specialization HQ' : renameTarget?.kind === 'engine' ? 'Custom Engine' : 'Hardware Console'}</Text>
            
            <Text style={style.inputLabel}>RENAME FROM: "{renameTarget?.currentName}"</Text>
            <TextInput 
              style={style.textbox} 
              placeholder="Enter new name tag" 
              placeholderTextColor={T.textMute} 
              value={renameInpVal}
              onChangeText={setRenameInpVal}
            />

            <View style={[style.rowJust, { marginTop: 20 }]}>
              <TouchableOpacity style={style.cancelBtn} onPress={() => setRenameTarget(null)}>
                <Text style={style.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={style.resolveBtn} onPress={handleGenericRename}>
                <Text style={style.resolveBtnTxt}>Apply Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cohesive Simulation Running Modal */}
      <Modal visible={showMulti} transparent animationType="fade" onRequestClose={() => setShowMulti(false)}>
        <View style={style.modalOverlay}>
          <View style={style.modalBody}>
            <Text style={style.modalTitle}>Fast Timeline Progression</Text>
            <Text style={{ color: T.textMute, fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
              Specify the number of weeks to speed up execution (cap: 96 weeks).
            </Text>
            
            <TextInput
              value={multiWeeks}
              onChangeText={(v) => setMultiWeeks(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={2}
              style={style.textbox}
              placeholder="e.g. 12"
              placeholderTextColor={T.textMute}
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12, justifyContent: 'center' }}>
              {[1, 4, 12, 24, 48].map(w => (
                <TouchableOpacity
                  key={w}
                  style={{ backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: T.border }}
                  onPress={() => setMultiWeeks(String(w))}
                >
                  <Text style={{ color: '#E2E8F0', fontSize: 11, fontWeight: '700' }}>{w} weeks</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[style.rowJust, { marginTop: 20 }]}>
              <TouchableOpacity style={style.cancelBtn} onPress={() => setShowMulti(false)}>
                <Text style={style.cancelBtnTxt}>Cancel Run</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={style.resolveBtn}
                onPress={() => {
                  const n = Math.max(1, Math.min(96, parseInt(multiWeeks, 10) || 0));
                  if (n >= 1) { 
                    simulateMultiple(n); 
                    setShowMulti(false); 
                  }
                }}
              >
                <Text style={style.resolveBtnTxt}>Execute Run</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const style = StyleSheet.create({
  studioHeaderDeck: {
    backgroundColor: '#07090C',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: T.border,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoOuter: {
    width: 60,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.4)',
    shadowColor: T.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandSubtitle: {
    color: T.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandTitle: {
    color: T.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  starRating: {
    color: T.yellow,
    fontSize: 12,
    letterSpacing: 2,
  },
  rankTag: {
    color: T.textMute,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  glanceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  glanceCard: {
    flex: 1,
    backgroundColor: 'rgba(35,40,47,0.35)',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  glanceLabel: {
    color: T.textMute,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  glanceValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  simPanel: {
    backgroundColor: T.panel,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  timeDeck: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 10,
  },
  timeSub: {
    color: T.textMute,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  timeMain: {
    color: T.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    gap: 4,
  },
  calendarButtonText: {
    color: T.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  simButtonMulti: {
    flex: 1.1,
    flexDirection: 'row',
    backgroundColor: '#1E232B',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: T.cyan + '20',
  },
  simButtonMultiTxt: {
    color: T.cyan,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  simButtonMain: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: T.green,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  simButtonMainTxt: {
    color: T.cardDark,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divisionToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F1319',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  divisionToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderRadius: 8,
  },
  divisionToggleBtnActive: {
    backgroundColor: T.cyan,
  },
  divisionToggleTxt: {
    color: T.textMute,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  divisionToggleTxtActive: {
    color: '#000',
  },
  container: { flex: 1, backgroundColor: T.bg },
  centered: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: T.panel, borderBottomWidth: 1, borderColor: T.border },
  tab: { paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  activeTab: { borderColor: T.cyan },
  tabTxt: { color: T.textMute, fontSize: 13, fontWeight: '600' },
  scroll: { flex: 1 },
  padBox: { padding: 16 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  subSectionTitle: { color: T.textDim, fontSize: 13, fontWeight: '700', marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  listHeader: { color: T.cyan, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 },
  primaryBtn: { flexDirection: 'row', gap: 6, backgroundColor: T.cyan, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  primaryBtnTxt: { color: '#000', fontSize: 13, fontWeight: '900' },
  emptyCard: { backgroundColor: T.panel, padding: 32, borderRadius: 12, borderWidth: 1, borderColor: T.border, alignItems: 'center', gap: 12, marginTop: 10 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emptySub: { color: T.textMute, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  
  hqCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  hqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: T.border, paddingBottom: 12, marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  hqTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hqTypeBadge: { color: T.cyan, fontSize: 12, fontWeight: '600', marginTop: 2 },
  hqPayroll: { color: T.textMute, fontSize: 12 },
  
  staffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  staffBox: { flex: 1, minWidth: 100, backgroundColor: T.panelAlt, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  staffRoleLabel: { color: T.textMute, fontSize: 9, fontWeight: '800', marginBottom: 6 },
  staffActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  counterBtn: { backgroundColor: T.card, width: 34, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  counterBtnTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  staffQty: { color: '#fff', fontSize: 14, fontWeight: '900' },
  
  roomsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  roomPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: T.panelAlt, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.cyan },
  roomPillLocked: { borderColor: T.border, opacity: 0.65 },
  roomLabel: { color: T.textMute, fontSize: 12, fontWeight: '700' },
  roomActBtn: { backgroundColor: T.yellow, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginLeft: 4 },
  roomActBtnTxt: { color: '#000', fontSize: 10, fontWeight: '900' },
  roomProgressTxt: { color: T.yellow, fontSize: 10, fontWeight: '700', marginLeft: 4 },

  projectCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 12, gap: 12 },
  projectMainTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  projectMetaLabel: { color: T.textMute, fontSize: 12, marginTop: 2 },
  cyanBadge: { backgroundColor: T.cyan, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  cyanBadgeTxt: { color: '#000', fontSize: 10, fontWeight: '900' },
  progressArea: { gap: 6 },
  progressLabel: { color: T.textDim, fontSize: 11, fontWeight: '700' },
  progressBarBg: { height: 8, backgroundColor: T.panelAlt, borderRadius: 4, overflow: 'hidden' },
  progressBarVal: { height: '100%', backgroundColor: T.cyan, borderRadius: 4 },
  bugLabel: { color: T.red, fontSize: 11, fontWeight: '700', marginLeft: 4 },
  budgetAlloc: { color: T.textMute, fontSize: 11, fontWeight: '700' },

  gCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 12, gap: 12 },
  gHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  gGenre: { color: T.textMute, fontSize: 12, marginTop: 2 },
  goldRatingCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.yellow, alignItems: 'center', justifyContent: 'center' },
  goldRatingCircleTxt: { color: '#000', fontSize: 14, fontWeight: '900' },
  gStatsRow: { flexDirection: 'row', gap: 12, backgroundColor: T.panelAlt, padding: 12, borderRadius: 8 },
  gStatField: { flex: 1, gap: 4 },
  gStatLabel: { color: T.textMute, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  gStatVal: { color: '#fff', fontSize: 13, fontWeight: '900' },
  adaptCinemaBtn: { flexDirection: 'row', gap: 6, backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.cyan, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  adaptCinemaBtnTxt: { color: T.cyan, fontSize: 12, fontWeight: '800' },

  engineCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 12, gap: 12 },
  engineBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  engineTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  engineGenLabel: { color: T.textMute, fontSize: 12, marginTop: 2 },
  engineTechValuePill: { backgroundColor: T.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  engineTechValueTxt: { color: T.yellow, fontSize: 11, fontWeight: '900' },
  modulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moduleToken: { backgroundColor: T.panelAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: T.border },
  moduleTokenTxt: { color: T.cyan, fontSize: 11, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  metricBox: { flex: 1, backgroundColor: T.panelAlt, padding: 8, borderRadius: 8, alignItems: 'center', gap: 2 },
  metricLabel: { color: T.textMute, fontSize: 9, fontWeight: '700' },
  metricVal: { color: '#fff', fontSize: 13, fontWeight: '800' },

  consoleCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 12, gap: 12 },
  cHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cGenLabel: { color: T.textMute, fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeTxt: { color: '#000', fontSize: 10, fontWeight: '900' },
  cSpecsList: { backgroundColor: T.panelAlt, padding: 12, borderRadius: 8, gap: 4 },
  specsHeader: { color: T.textDim, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  specDetail: { color: T.textMute, fontSize: 12 },

  passCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, gap: 12 },
  passHeader: { flexDirection: 'row', alignItems: 'center' },
  passTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  passLabel: { color: T.textMute, fontSize: 12, marginTop: 2 },
  bulletsHeader: { color: T.cyan, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 8 },
  bulletsTxt: { color: T.textMute, fontSize: 12, lineHeight: 18 },

  trendsCard: { backgroundColor: T.panel, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: T.border, gap: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trendRowLabel: { color: '#fff', fontSize: 13, fontWeight: '700', width: 90 },
  trendRowBarContainer: { flex: 1, height: 10, backgroundColor: T.panelAlt, borderRadius: 5, overflow: 'hidden' },
  trendRowBarValue: { height: '100%', backgroundColor: T.cyan },
  trendRowVal: { fontSize: 12, fontWeight: '800', width: 45, textAlign: 'right' },

  simpleCard: { backgroundColor: T.panelAlt, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowJust: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalBody: { width: '100%', maxWidth: 450, backgroundColor: T.panel, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, maxHeight: '90%' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  inputLabel: { color: T.cyan, fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 6, letterSpacing: 0.5 },
  textbox: { backgroundColor: T.panelAlt, color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: T.border, fontSize: 14, marginBottom: 8 },
  pillBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, marginRight: 6 },
  pillBtnActive: { backgroundColor: T.cyan, borderColor: T.cyan },
  pillTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  upgradeCostMUnder: { color: T.yellow, fontSize: 11, fontWeight: '600', marginTop: 4 },
  modulesSelectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moduleSelectBox: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  moduleSelectBoxChecked: { backgroundColor: T.cyan, borderColor: T.cyan },
  moduleSelectTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: T.card, alignItems: 'center', marginRight: 10 },
  cancelBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  resolveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: T.cyan, alignItems: 'center' },
  resolveBtnTxt: { color: '#000', fontSize: 13, fontWeight: '900' }
});
