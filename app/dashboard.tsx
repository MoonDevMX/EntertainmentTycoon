import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../src/game/state';
import { T } from '../src/ui/theme';
import { NeonStat, SectionHeader } from '../src/ui/components';
import { monthOf, nextHolidays } from '../src/game/data';
import { WeeklyRecapModal } from '../src/ui/WeeklyRecapModal';
import { uiAlert } from '../src/ui/ui-alert';
import { 
  GENRE_FEATURES_WEIGHTS, 
  ENGINE_MODULES_SPECS, 
  ENGINE_GENERATIONS, 
  STUDIO_ROOMS_DETAIL, 
  ROLE_WEEKLY_SALARY 
} from '../src/game/gaming';
import { GameEngineModule, GamingStudioType, GamingProject } from '../src/game/types';

export default function Dashboard() {
  const router = useRouter();
  const { 
    state, 
    simulateWeek, 
    simulateMultiple, 
    dismissRecap, 
    saveToSlot, 
    loadFromSlot, 
    listSlots, 
    deleteSlot,
    createEngine, 
    foundStudio, 
    startProject, 
    designConsole, 
    buildHQRoom, 
    recruitGamingStaff, 
    configurePass, 
    createMovieFromGame
  } = useGame();
  const [activeTab, setActiveTab] = useState<'production' | 'empires' | 'reports'>('production');
  const [activeDivision, setActiveDivision] = useState<'cinema' | 'gaming'>('cinema');
  const [activeGamingTab, setActiveGamingTab] = useState<'studios' | 'pipeline' | 'engines' | 'consoles' | 'gamepass' | 'trends'>('studios');

  const [showInfo, setShowInfo] = useState(false);
  const [showMulti, setShowMulti] = useState(false);
  const [multiWeeks, setMultiWeeks] = useState('4');
  const [showSlots, setShowSlots] = useState(false);
  const [slots, setSlots] = useState<{ name: string; updatedAt: number; week: number; year: number; studioName: string; cashB: number }[]>([]);
  const [newSlotName, setNewSlotName] = useState('');
  
  const refreshSlots = async () => { setSlots(await listSlots()); };

  if (!state) {
    return (
      <View style={s.container}><Text>No game</Text></View>
    );
  }

  const { player, week, year, movies } = state;
  const inProduction = movies.filter(m => m.status === 'production' && m.studioId === player.id);
  const released = movies.filter(m => m.status === 'released' && m.studioId === player.id);
  const stars = '★'.repeat(player.rating) + '☆'.repeat(5 - player.rating);

  // Gaming Modal controls
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
  const [passSelectedConsoles, setPassSelectedConsoles] = useState<string[]>([]);
  const [passSelectedGames, setPassSelectedGames] = useState<string[]>([]);

  // Gaming Derived filters
  const playerStudios = useMemo(() => (state.gamingStudios || []).filter(h => h.studioId === state.player.id), [state.gamingStudios, state.player.id]);
  const playerConsoles = useMemo(() => (state.gamingConsoles || []).filter(c => c.studioId === state.player.id), [state.gamingConsoles, state.player.id]);
  const activeDevGames = useMemo(() => (state.gamingProjects || []).filter(p => p.studioId === state.player.id && p.phase !== 'Gold' && p.phase !== 'LiveOps'), [state.gamingProjects, state.player.id]);
  const releasedGames = useMemo(() => (state.gamingProjects || []).filter(p => p.studioId === state.player.id && (p.phase === 'Gold' || p.phase === 'LiveOps')), [state.gamingProjects, state.player.id]);
  const playerEngines = useMemo(() => (state.gameEngines || []).filter(e => e.studioId === state.player.id), [state.gameEngines, state.player.id]);
  const playerPass = useMemo(() => (state.gamingPasses || []).find(p => p.studioId === state.player.id), [state.gamingPasses, state.player.id]);

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
    if (!passNameInput) {
      uiAlert('Title Required', 'Label your dynamic Game Pass catalog subscription.');
      return;
    }
    const standard = parseFloat(passPriceInput) || 14.99;
    const basic = parseFloat(passBasicPrice) || 9.99;
    const premium = parseFloat(passPremiumPrice) || 19.99;
    const res = configurePass(
      standard,
      passNameInput,
      basic,
      premium,
      passAdSupported,
      passSelectedConsoles,
      passSelectedGames
    );
    if (res?.error) {
      uiAlert('System Check Failed', res.error);
    } else {
      uiAlert('Subscription Settings Updated', `Successfully updated subscription catalog configurations for '${passNameInput}'!`);
      setPassModalOpen(false);
    }
  };

  const hqRooms = ['dev_floor', 'qa_lab', 'motion_capture', 'sound_stage', 'liveops_center', 'esports_arena'];

  const renderCard = (title: string, desc: string, icon: string, iconColor: string, onPress: () => void, tag?: string) => {
    return (
      <TouchableOpacity key={title} onPress={onPress} activeOpacity={0.82} style={s.menuCard} testID={`card-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}>
        <View style={[s.cardIconBox, { backgroundColor: iconColor + '15' }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.cardTitle}>{title}</Text>
            {tag ? (
              <View style={[s.cardBadge, { borderColor: iconColor + '40', backgroundColor: iconColor + '10' }]}>
                <Text style={[s.cardBadgeTxt, { color: iconColor }]}>{tag}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.cardDesc} numberOfLines={2}>{desc}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={T.textMute} style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} testID="dashboard-scroller" style={{ flex: 1 }}>
        
        {/* Modern Studio Performance Banner */}
        <View style={s.studioHeaderDeck}>
          <View style={s.headerInner}>
            <View style={[s.logoOuter, { backgroundColor: player.logoBg }]}>
              <MaterialCommunityIcons name={player.logoIcon as any} size={42} color={T.yellow} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={s.brandSubtitle}>HOLLYWOOD OPERATIONS</Text>
              <Text style={s.brandTitle} numberOfLines={1}>{player.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={s.starRating}>{stars}</Text>
                <Text style={s.rankTag}>PRODUCER RATING</Text>
              </View>
            </View>
          </View>

          {/* Quick Metrics Cards */}
          <View style={s.glanceRow}>
            <View style={s.glanceCard}>
              <Text style={s.glanceLabel}>LIQUID CAPITAL</Text>
              <Text style={[s.glanceValue, { color: T.green }]}>${player.cash.toFixed(2)} B</Text>
            </View>
            <View style={s.glanceCard}>
              <Text style={s.glanceLabel}>LIFETIME BOX-OFFICE</Text>
              <Text style={[s.glanceValue, { color: T.magenta }]}>${player.totalBO.toFixed(2)} B</Text>
            </View>
            <View style={s.glanceCard}>
              <Text style={s.glanceLabel}>AWARDS WON</Text>
              <Text style={[s.glanceValue, { color: T.yellow }]}>{player.awards} Total</Text>
            </View>
          </View>
        </View>

        {/* Division Selector: 2 Sides of a Coin */}
        <View style={s.divisionToggleContainer}>
          <TouchableOpacity 
            style={[s.divisionToggleBtn, activeDivision === 'cinema' && s.divisionToggleBtnActive]}
            onPress={() => setActiveDivision('cinema')}
          >
            <MaterialCommunityIcons name="movie-roll" size={18} color={activeDivision === 'cinema' ? '#000' : T.textMute} />
            <Text style={[s.divisionToggleTxt, activeDivision === 'cinema' && s.divisionToggleTxtActive]}>CINEMA DIVISION</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.divisionToggleBtn, activeDivision === 'gaming' && s.divisionToggleBtnActive]}
            onPress={() => setActiveDivision('gaming')}
          >
            <MaterialCommunityIcons name="gamepad-variant" size={18} color={activeDivision === 'gaming' ? '#000' : T.textMute} />
            <Text style={[s.divisionToggleTxt, activeDivision === 'gaming' && s.divisionToggleTxtActive]}>GAMING DIVISION</Text>
          </TouchableOpacity>
        </View>
        
        {/* Dynamic Simulation Time Control */}
        <View style={s.simPanel}>
          <View style={s.timeDeck}>
            <View>
              <Text style={s.timeSub}>CURRENT CHRONOLOGY</Text>
              <Text style={s.timeMain}>{monthOf(week).name} W{monthOf(week).weekInMonth}, Year {year}</Text>
            </View>
            <TouchableOpacity style={s.calendarButton} onPress={() => setShowInfo(true)} testID="info-btn">
              <MaterialCommunityIcons name="calendar-multiselect" size={20} color={T.yellow} />
              <Text style={s.calendarButtonText}>SEASONS</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity style={s.simButtonMulti} onPress={() => setShowMulti(true)} testID="sim-multi-btn">
              <MaterialCommunityIcons name="fast-forward" size={20} color={T.cyan} style={{ marginRight: 6 }} />
              <Text style={s.simButtonMultiTxt}>RUN TIMELINE...</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.simButtonMain} onPress={simulateWeek} testID="sim-week-btn">
              <MaterialCommunityIcons name="play" size={22} color={T.cardDark} style={{ marginRight: 4 }} />
              <Text style={s.simButtonMainTxt}>NEXT WEEK</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Tabbed Dept Selection Bar */}
        {activeDivision === 'cinema' && (
          <>
            <View style={s.tabDeck}>
              <TouchableOpacity 
                onPress={() => setActiveTab('production')} 
                style={[s.tabButton, activeTab === 'production' && { borderBottomColor: T.cyan, borderBottomWidth: 3 }]}
                testID="tab-production"
              >
                <MaterialCommunityIcons name="movie-roll" size={20} color={activeTab === 'production' ? T.cyan : T.textMute} />
                <Text style={[s.tabButtonText, activeTab === 'production' && { color: T.cyan }]}>STUDIO</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setActiveTab('empires')} 
                style={[s.tabButton, activeTab === 'empires' && { borderBottomColor: T.yellow, borderBottomWidth: 3 }]}
                testID="tab-empires"
              >
                <MaterialCommunityIcons name="web" size={20} color={activeTab === 'empires' ? T.yellow : T.textMute} />
                <Text style={[s.tabButtonText, activeTab === 'empires' && { color: T.yellow }]}>DISTRIBUTION</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setActiveTab('reports')} 
                style={[s.tabButton, activeTab === 'reports' && { borderBottomColor: T.green, borderBottomWidth: 3 }]}
                testID="tab-reports"
              >
                <MaterialCommunityIcons name="compass-outline" size={20} color={activeTab === 'reports' ? T.green : T.textMute} />
                <Text style={[s.tabButtonText, activeTab === 'reports' && { color: T.green }]}>MARKET INTEL</Text>
              </TouchableOpacity>
            </View>

            {/* V43 — Manager proposals quick banner */}
            {(() => {
              const totalProposals = (state.tvManagerProposals?.length || 0) + (state.cinemaOwnedManagerProposals?.length || 0);
              if (totalProposals === 0) return null;
              return (
                <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
                  <View style={s.mgrBanner} testID="mgr-banner">
                    <MaterialCommunityIcons name="lightbulb-on" size={20} color={T.yellow} />
                    <Text style={s.mgrBannerTxt}>
                      Your executive managers proposed {totalProposals} contract decisions
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(state.tvManagerProposals?.length || 0) > 0 && (
                        <TouchableOpacity style={s.mgrBannerBtn} onPress={() => router.push('/tv-networks')} testID="mgr-banner-tv">
                          <Text style={s.mgrBannerBtnTxt}>TV PROPOSALS</Text>
                        </TouchableOpacity>
                      )}
                      {(state.cinemaOwnedManagerProposals?.length || 0) > 0 && (
                        <TouchableOpacity style={s.mgrBannerBtn} onPress={() => router.push('/cinemas')} testID="mgr-banner-cin">
                          <Text style={s.mgrBannerBtnTxt}>CINEMA RUNS</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Dynamic Card Display based on Active Command Tab */}
            <View style={s.actionsList} testID="actions-list">
              {activeTab === 'production' && (
                <>
                  {renderCard(
                    "Greenlight Production",
                    "Embark on scripting & filming full-length box office theatrical movies or premium episodic TV titles",
                    "movie-open-plus",
                    T.cyan,
                    () => router.push({ pathname: '/create-movie', params: { reset: '1' } }),
                    (() => {
                      const sr = (state.tvSeries || []).filter(s => s.studioId === player.id);
                      const tvInProd = sr.filter(s => s.productionWeeksLeft !== undefined).length;
                      return `${inProduction.length + tvInProd} Active`;
                    })()
                  )}

                  {renderCard(
                    "Active Filming Projects",
                    "Oversee, rename, hold, schedule release periods, or wrap your current film productions & TV pilots",
                    "filmstrip-box-multiple",
                    T.cyan,
                    () => router.push('/current-movies'),
                    inProduction.length > 0 ? `${inProduction.length} Films` : undefined
                  )}

                  {renderCard(
                    "Talent Recruiting Pool",
                    "Hire premier screenplay writers, world-renowned film directors, and a star-studded cast sorted by caliber & fit",
                    "account-search",
                    T.pink,
                    () => router.push('/talent')
                  )}

                  {renderCard(
                    "Franchise Records",
                    "Configure sequels, review franchise fan trends, execute outbound IP transfers, blockbusters and film extensions",
                    "star-circle",
                    T.yellow,
                    () => router.push('/franchises'),
                    `${state.franchises.filter(f => f.studioId === player.id).length} owned`
                  )}

                  {renderCard(
                    "TV Series Productions",
                    "Produce multiseason episodic shows, order pilot episodes, arrange renewals, or cancel underperforming runs",
                    "movie-roll",
                    T.magenta,
                    () => router.push('/series' as any),
                    `${(state.tvSeries || []).filter(s => s.studioId === player.id).length} series`
                  )}

                  {renderCard(
                    "Marketing & Publicity",
                    "Direct hype campaigns, assign local/global marketing budgets, or customize automatic bulk billing rules",
                    "bullhorn-variant",
                    T.yellow,
                    () => router.push('/marketing' as any)
                  )}
                </>
              )}

              {activeTab === 'empires' && (
                <>
                  {renderCard(
                    "Theatrical & Cinemas Desk",
                    "Configure distribution deals with multiplex grids, sign commercial suppliers, schedule cinema screen sessions, or build and upgrade your own owned multiplexes",
                    "theater",
                    T.cyan,
                    () => router.push('/cinemas'),
                    `${(state.cinemaDeals || []).filter(d => d.studioId === player.id).length} Active`
                  )}

                  {renderCard(
                    "Streaming Deck Center",
                    "Deploy your subscription platforms (AVOD/SVOD/TVOD), customize monthly pricing tiers, adjust streaming access, or license bulk catalogs",
                    "play-circle",
                    T.magenta,
                    () => router.push('/streaming'),
                    `${(state.streamingServices || []).filter(s => s.studioId === player.id).length} services`
                  )}

                  {renderCard(
                    "Broadcast TV Networks",
                    "License blockbuster catalogs to global broadcasters, build private local channels, configure distribution grids, or sign carriage arrangements",
                    "television-classic",
                    T.cyan,
                    () => router.push('/tv-networks' as any)
                  )}

                  {(() => {
                    const playerId = state.player.id;
                    const licensingCount = state.pendingOffers?.length ?? 0;
                    const franchiseCount = (state.franchiseOffers || []).filter(o => o.status === 'pending' && (o.fromStudioId === playerId || o.toStudioId === playerId)).length;
                    const bulkCount = (state.bulkCatalogOffers || []).filter(o => o.status === 'pending' && (o.fromStudioId === playerId || o.toStudioId === playerId)).length;
                    const ipInbCount = (state.externalIPOffers || []).filter(o => o.status === 'pending').length;
                    const myListings = (state.outboundIPListings || []).filter(l => l.studioId === playerId);
                    const ipBidsCount = (state.outboundIPBids || []).filter(b => b.status === 'pending' && myListings.some(l => l.id === b.listingId)).length;
                    const total = licensingCount + franchiseCount + bulkCount + ipInbCount + ipBidsCount;
                    const summary = total === 0
                      ? 'No outstanding terms'
                      : `${total} Pending`;
                    return renderCard(
                      "Interactive Business Deals",
                      "Review bids, evaluate external catalog negotiations, handle IP acquisitions, and authorize inbound business offers",
                      "handshake",
                      total > 0 ? T.yellow : T.cyan,
                      () => router.push('/offers'),
                      total > 0 ? summary : undefined
                    );
                  })()}

                  {renderCard(
                    "External Intellectual Property",
                    "Acquire licensing rights of novels, blockbusters, spin-off items, and games, or sublicense your owned cinematic rights to rival studios",
                    "book-open-page-variant",
                    T.magenta,
                    () => router.push('/external-ip' as any),
                    `${(state.ownedIPLicenses || []).filter(l => l.studioId === player.id).length} licensed`
                  )}

                  {renderCard(
                    "Console & Gaming Division",
                    "Construct specialized developer HQs, R&D custom game engines, design next-gen console hardware, and aggregate subscription Game Pass catalog bundles",
                    "gamepad-variant-outline",
                    T.cyan,
                    () => { setActiveDivision('gaming'); },
                    `${playerStudios.length} Operating`
                  )}
                </>
              )}

              {activeTab === 'reports' && (
                <>
                  {renderCard(
                    "Financial Ledger & Audits",
                    "Review historic profits, opex costs, TV carriage fee receipts, cinema ticket splits, and ledger statements week-by-week",
                    "chart-line",
                    T.green,
                    () => router.push('/financials')
                  )}

                  {renderCard(
                    "Audience Trends & Seasons",
                    "Track genre affinities, examine modern viewing patterns, evaluate audience segments, or configure market research",
                    "chart-line-variant",
                    T.magenta,
                    () => router.push('/trends')
                  )}

                  {renderCard(
                    "Rival Studios Directory",
                    "Compare ratings against AI studios, negotiate bulk movie licensing deals, trade franchises, or evaluate industry statistics",
                    "domain",
                    T.orange,
                    () => router.push('/rivals'),
                    `${state.rivals.length} Rivals`
                  )}

                  {renderCard(
                    "Awards Chronicle",
                    "Consult nominees and winners histories for major cinema events, including the Oscars and Golden Globes",
                    "trophy",
                    T.yellow,
                    () => router.push('/awards')
                  )}

                  {renderCard(
                    "Film Festivals Desk",
                    "Place bids on competitive movie auctions, manage lots, check dates, and win international festival prizes",
                    "movie-roll",
                    T.yellow,
                    () => router.push('/festivals')
                  )}

                  {renderCard(
                    "Save Snapshots Manager",
                    "Store intermediate checkpoints, clone timelines, overwrite saves, or reload slots to retry operations",
                    "content-save-cog",
                    T.green,
                    () => { setShowSlots(true); refreshSlots(); }
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* Dynamic turn-based Gaming Division — Integrated */}
        {activeDivision === 'gaming' && (
          <>
            {/* Gaming tabs bar */}
            <View style={s.gTabs}>
              {(['studios', 'pipeline', 'engines', 'consoles', 'gamepass', 'trends'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[s.gTab, activeGamingTab === tab && s.gActiveTab]}
                  onPress={() => setActiveGamingTab(tab)}
                >
                  <Text style={[s.gTabTxt, activeGamingTab === tab && { color: T.cyan, fontWeight: '800' }]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* TAB 1: Studios & staff HQ */}
            {activeGamingTab === 'studios' && (
              <View style={s.gPadBox}>
                <View style={s.gRowHeader}>
                  <Text style={s.gSectionTitle}>Gaming Specialization HQs</Text>
                  <TouchableOpacity style={s.gPrimaryBtn} onPress={() => setFoundHQModalOpen(true)}>
                    <MaterialCommunityIcons name="office-building" size={18} color="#000" />
                    <Text style={s.gPrimaryBtnTxt}>Found Studio HQ</Text>
                  </TouchableOpacity>
                </View>

                {playerStudios.length === 0 ? (
                  <View style={s.gEmptyCard}>
                    <MaterialCommunityIcons name="office-building-cog" size={40} color={T.textMute} />
                    <Text style={s.gEmptyTitle}>Corporate Division Locked</Text>
                    <Text style={s.gEmptySub}>Found your first AAA or mid-tier studio, construct customized production rooms (MoCap, Sound, QA), and recruit talent pools to begin development.</Text>
                  </View>
                ) : (
                  playerStudios.map(hq => (
                    <View key={hq.id} style={s.gHqCard}>
                      <View style={s.gHqHeader}>
                        <View>
                          <Text style={s.gHqTitle}>{hq.name}</Text>
                          <Text style={s.gHqTypeBadge}>{hq.type.toUpperCase()} CLASSIFICATION DIVISION</Text>
                        </View>
                        <Text style={s.gHqPayroll}>Salary Run-Rate: ${(hq.salaryBandWeeklyM || 0).toFixed(3)}B/wk</Text>
                      </View>

                      <Text style={s.gSubSectionTitle}>Operational Developer Crew</Text>
                      <View style={s.gStaffGrid}>
                        {(Object.keys(hq.staffPools) as Array<keyof typeof hq.staffPools>).map(role => (
                          <View key={role} style={s.gStaffBox}>
                            <Text style={s.gStaffRoleLabel}>{role.toUpperCase()}</Text>
                            <View style={s.gStaffActions}>
                              <TouchableOpacity style={s.gCounterBtn} onPress={() => recruitGamingStaff(hq.id, role, -1)}>
                                <Text style={s.gCounterBtnTxt}>-1</Text>
                              </TouchableOpacity>
                              <Text style={s.gStaffQty}>{hq.staffPools[role] || 0}</Text>
                              <TouchableOpacity style={s.gCounterBtn} onPress={() => recruitGamingStaff(hq.id, role, 1)}>
                                <Text style={s.gCounterBtnTxt}>+1</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>

                      <Text style={s.gSubSectionTitle}>Constructed Facility Rooms</Text>
                      <View style={s.gRoomsContainer}>
                        {hqRooms.map(rm => {
                          const isActive = hq.rooms.includes(rm);
                          const upg = hq.upgradesFinishedWeeks?.[rm];
                          const detail = STUDIO_ROOMS_DETAIL[rm];
                          if (!detail) return null;

                          if (isActive) {
                            return (
                              <View key={rm} style={s.gRoomPill}>
                                <MaterialCommunityIcons name="check-circle" size={14} color={T.cyan} />
                                <Text style={s.gRoomLabel}>{detail.label} (Active)</Text>
                              </View>
                            );
                          } else if (upg) {
                            const startVal = upg.finishYear * 48 + upg.finishWeek;
                            const currentVal = state.year * 48 + state.week;
                            const weeksLeft = Math.max(0, startVal - currentVal);
                            return (
                              <View key={rm} style={s.gRoomPill}>
                                <MaterialCommunityIcons name="clock-outline" size={14} color={T.yellow} />
                                <Text style={s.gRoomLabel}>{detail.label} ({weeksLeft}w left)</Text>
                              </View>
                            );
                          } else {
                            return (
                              <TouchableOpacity 
                                key={rm} 
                                style={[s.gRoomPill, s.gRoomPillLocked]}
                                onPress={() => {
                                  const res = buildHQRoom(hq.id, rm);
                                  if (res?.error) {
                                    uiAlert('Investment Blocked', res.error);
                                  } else {
                                    uiAlert('Construction Initiated', `Adding ${detail.label} module to ${hq.name}. ETA: 2 weeks.`);
                                  }
                                }}
                              >
                                <MaterialCommunityIcons name="lock-outline" size={14} color={T.textMute} />
                                <Text style={s.gRoomLabel}>{detail.label} (${(detail.bCostM).toFixed(0)}M)</Text>
                                <View style={s.gRoomActBtn}>
                                  <Text style={s.gRoomActBtnTxt}>BUILD</Text>
                                </View>
                              </TouchableOpacity>
                            );
                          }
                        })}
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 2: Software Pipeline & Gold Portfolio */}
            {activeGamingTab === 'pipeline' && (
              <View style={s.gPadBox}>
                <View style={s.gRowHeader}>
                  <Text style={s.gSectionTitle}>Software Pipeline & Releases</Text>
                  <TouchableOpacity style={s.gPrimaryBtn} onPress={() => {
                    if (playerStudios.length === 0) {
                      uiAlert('No Operational HQ', 'You must found a Gaming HQ before compiling target projects.');
                      return;
                    }
                    if (playerEngines.length === 0) {
                      uiAlert('No Licensed Engines', 'You must compile at least one R&D game engine first.');
                      return;
                    }
                    const defaultStudio = playerStudios[0]?.id || '';
                    const defaultEngine = playerEngines[0]?.id || '';
                    setProjStudioId(defaultStudio);
                    setProjEngineId(defaultEngine);
                    setProjectModalOpen(true);
                  }}>
                    <MaterialCommunityIcons name="plus" size={18} color="#000" />
                    <Text style={s.gPrimaryBtnTxt}>Assemble New Pipeline</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.gListHeader}>Active Development Compiler Pipelines</Text>
                {activeDevGames.length === 0 ? (
                  <View style={s.gEmptyCard}>
                    <Text style={s.gEmptyTitle}>Pipeline Pipeline Empty</Text>
                    <Text style={s.gEmptySub}>Assemble a concept project on an unlocked engine iteration, configure marketing hyper budgets, and release compiled gold masters to retail counters.</Text>
                  </View>
                ) : (
                  activeDevGames.map((proj: GamingProject) => {
                    const percent = Math.min(100, Math.round((proj.developmentWeeksSpent / proj.developmentTotalWeeks) * 100));
                    const weeksLeft = Math.max(0, proj.developmentTotalWeeks - proj.developmentWeeksSpent);
                    return (
                      <View key={proj.id} style={s.gProjectCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Text style={s.gProjectMainTitle}>'{proj.title}'</Text>
                            <Text style={s.gProjectMetaLabel}>{proj.genre} • {proj.monetizationModel} Model</Text>
                          </View>
                          <View style={s.gCyanBadge}>
                            <Text style={s.gCyanBadgeTxt}>{proj.phase.toUpperCase()}</Text>
                          </View>
                        </View>

                        <View style={s.gProgressArea}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={s.gProgressLabel}>Compiler Build Progress ({percent}%)</Text>
                            <Text style={s.gProgressLabel}>{weeksLeft} weeks left</Text>
                          </View>
                          <View style={s.gProgressBarBg}>
                            <View style={[s.gProgressBarVal, { width: `${percent}%` }]} />
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Text style={s.gBugLabel}>• Bugs In Compilation: {proj.bugs} total</Text>
                          <Text style={s.gBudgetAlloc}>• Dev Budget Alloc: ${proj.budgetM}M</Text>
                        </View>
                      </View>
                    );
                  })
                )}

                <Text style={s.gListHeader}>Gold Portfolio releases</Text>
                {releasedGames.length === 0 ? (
                  <View style={s.gEmptyCard}>
                    <Text style={s.gEmptyTitle}>No Released Masters Yet</Text>
                  </View>
                ) : (
                  releasedGames.map((game: GamingProject) => (
                    <View key={game.id} style={s.gGCard}>
                      <View style={s.gGHeader}>
                        <View>
                          <Text style={s.gGTitle}>'{game.title}'</Text>
                          <Text style={s.gGGenre}>{game.genre} Releases ({game.monetizationModel})</Text>
                        </View>
                        <View style={s.gGoldRatingCircle}>
                          <Text style={s.gGoldRatingCircleTxt}>{game.criticScore || 70}%</Text>
                        </View>
                      </View>

                      <View style={s.gGStatsRow}>
                        <View style={s.gGStatField}>
                          <Text style={s.gGStatLabel}>Total Sales</Text>
                          <Text style={s.gGStatVal}>{(game.unitsSold || 0).toFixed(1)}M copies</Text>
                        </View>
                        <View style={s.gGStatField}>
                          <Text style={s.gGStatLabel}>Net Yields</Text>
                          <Text style={[s.gGStatVal, { color: T.green }]}>${((game.lifetimeRevenueB * 1000) - game.budgetM - game.marketingBudgetM).toFixed(2)}M</Text>
                        </View>
                        <View style={s.gGStatField}>
                          <Text style={s.gGStatLabel}>State</Text>
                          <Text style={[s.gGStatVal, { color: T.cyan }]}>{game.phase === 'LiveOps' ? 'LIVEOPS SUPPORT' : 'CLASSIC MASTER'}</Text>
                        </View>
                      </View>

                      {/* V50 Cross Media Cinema Adaptation Button */}
                      <TouchableOpacity 
                        style={s.gAdaptCinemaBtn}
                        onPress={() => {
                          const res = createMovieFromGame(game.id, game.title, "Adapted screenplay based on hit title", "Action");
                          if (res?.error) {
                            uiAlert('Adaptation Blocked', res.error);
                          } else {
                            uiAlert('Sponsorship Deal Secured', `Successfully adapted '${game.title}' into cinema screenplay pipeline!`);
                            setActiveDivision('cinema');
                            setActiveTab('production');
                          }
                        }}
                      >
                        <MaterialCommunityIcons name="filmstrip" size={16} color={T.cyan} />
                        <Text style={s.gAdaptCinemaBtnTxt}>Script Movie adaptation screenplay</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 3: Custom Game Engines creator */}
            {activeGamingTab === 'engines' && (
              <View style={s.gPadBox}>
                <View style={s.gRowHeader}>
                  <Text style={s.gSectionTitle}>Game Engine licensing Workshop</Text>
                  <TouchableOpacity style={s.gPrimaryBtn} onPress={() => setEngineModalOpen(true)}>
                    <MaterialCommunityIcons name="engine-outline" size={18} color="#000" />
                    <Text style={s.gPrimaryBtnTxt}>Build Custom Engine</Text>
                  </TouchableOpacity>
                </View>

                {playerEngines.length === 0 ? (
                  <View style={s.gEmptyCard}>
                    <MaterialCommunityIcons name="tools" size={40} color={T.textMute} />
                    <Text style={s.gEmptyTitle}>No Licensed Engines</Text>
                    <Text style={s.gEmptySub}>Custom compile core graphic APIs, network synchronization pings, physics colliders, and leverage engine modules to empower compiling high critical projects.</Text>
                  </View>
                ) : (
                  playerEngines.map(eng => (
                    <View key={eng.id} style={s.gEngineCard}>
                      <View style={s.gEngineBoxHeader}>
                        <View>
                          <Text style={s.gEngineTitle}>{eng.name}</Text>
                          <Text style={s.gEngineGenLabel}>Generation {eng.generation} Platform Architecture</Text>
                        </View>
                        <View style={s.gEngineTechValuePill}>
                          <Text style={s.gEngineTechValueTxt}>TECH SCORE: {(((eng.renderQuality + eng.performance + eng.networkStability + eng.toolingEfficiency) / 4) || 1).toFixed(0)}</Text>
                        </View>
                      </View>

                      <Text style={s.gSubSectionTitle}>Active Integrated Modules</Text>
                      <View style={s.gModulesGrid}>
                        {eng.modules.map(mod => (
                          <View key={mod} style={s.gModuleToken}>
                            <Text style={s.gModuleTokenTxt}>{mod}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={s.gMetricsGrid}>
                        <View style={s.gMetricBox}>
                          <Text style={s.gMetricLabel}>Graphics Quality</Text>
                          <Text style={s.gMetricVal}>{eng.renderQuality}%</Text>
                        </View>
                        <View style={s.gMetricBox}>
                          <Text style={s.gMetricLabel}>Physics Runtime</Text>
                          <Text style={s.gMetricVal}>{eng.performance}%</Text>
                        </View>
                        <View style={s.gMetricBox}>
                          <Text style={s.gMetricLabel}>Network Ping Score</Text>
                          <Text style={s.gMetricVal}>{eng.networkStability}%</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 4: Hardware Consoles Designer */}
            {activeGamingTab === 'consoles' && (
              <View style={s.gPadBox}>
                <View style={s.gRowHeader}>
                  <Text style={s.gSectionTitle}>Hardware Lab & Distribution</Text>
                  <TouchableOpacity style={s.gPrimaryBtn} onPress={() => setConsoleModalOpen(true)}>
                    <MaterialCommunityIcons name="gamepad" size={18} color="#000" />
                    <Text style={s.gPrimaryBtnTxt}>Finalize Console Design</Text>
                  </TouchableOpacity>
                </View>

                {playerConsoles.length === 0 ? (
                  <View style={s.gEmptyCard}>
                    <MaterialCommunityIcons name="google-controller" size={40} color={T.textMute} />
                    <Text style={s.gEmptyTitle}>Hardware Lab Empty</Text>
                    <Text style={s.gEmptySub}>R&D next-gen gaming consoles, manufacture boxes, configure retail shelves, sign exclusive partnerships, and dominate dynamic hardware market segments.</Text>
                  </View>
                ) : (
                  playerConsoles.map(con => (
                    <View key={con.id} style={s.gConsoleCard}>
                      <View style={s.gCHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <MaterialCommunityIcons 
                            name={con.status === 'rd' ? 'compass-outline' : 'power-plug'} 
                            size={28} 
                            color={con.status === 'rd' ? T.yellow : T.green} 
                          />
                          <View style={{ marginLeft: 8 }}>
                            <Text style={s.gCTitle}>{con.title}</Text>
                            <Text style={s.gCGenLabel}>Generation {con.generation} Console Launcher</Text>
                          </View>
                        </View>
                        <View style={[s.gStatusBadge, con.status === 'rd' ? { backgroundColor: T.yellow } : { backgroundColor: T.green }]}>
                          <Text style={s.gStatusBadgeTxt}>
                            {con.status === 'rd' ? `R&D LABS (${con.rdWeeksLeft}w)` : 'ACTIVE DISTRIBUTION'}
                          </Text>
                        </View>
                      </View>

                      <View style={s.gCSecsList}>
                        <Text style={s.gSpecsHeader}>Fitted Specs Configuration</Text>
                        <Text style={s.gSpecDetail}>• CPU Core: {con.specs.cpu}</Text>
                        <Text style={s.gSpecDetail}>• Graphics Node: {con.specs.gpu}</Text>
                        <Text style={s.gSpecDetail}>• RAM Unit: {con.specs.ram}</Text>
                        <Text style={s.gSpecDetail}>• Storage drive: {con.specs.storage}</Text>
                        <Text style={s.gSpecDetail}>• Features flags: {con.specs.onlineServices ? 'ONLINE ' : ''}{con.specs.cloudStreaming ? 'CLOUD ' : ''}{con.specs.backwardCompat ? 'BACKWARD-COMPAT' : ''}</Text>
                      </View>

                      <View style={s.gGStatsRow}>
                        <View style={s.gGStatField}>
                          <Text style={s.gGStatLabel}>Retail Price</Text>
                          <Text style={s.gGStatVal}>${con.price}</Text>
                        </View>
                        <View style={s.gGStatField}>
                          <Text style={s.gGStatLabel}>Build Cost</Text>
                          <Text style={s.gGStatVal}>${con.manufacturingCost}</Text>
                        </View>
                        <View style={s.gGStatField}>
                          <Text style={s.gGStatLabel}>Units Sold</Text>
                          <Text style={[s.gGStatVal, { color: T.cyan }]}>{con.unitsSold || '0'}M systems</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB 5: Subscription Game Pass */}
            {activeGamingTab === 'gamepass' && (
              <View style={s.gPadBox}>
                <View style={s.gRowHeader}>
                  <Text style={s.gSectionTitle}>Game Pass Subsystem</Text>
                  {playerPass && (
                    <TouchableOpacity style={s.gPrimaryBtn} onPress={() => {
                      setPassNameInput(playerPass.name || '');
                      setPassPriceInput(String(playerPass.standardPrice || 14.99));
                      setPassBasicPrice(String(playerPass.basicPrice || 9.99));
                      setPassPremiumPrice(String(playerPass.premiumPrice || 19.99));
                      setPassAdSupported(!!playerPass.adSupported);
                      setPassSelectedConsoles(playerPass.enabledConsoleIds || []);
                      setPassSelectedGames(playerPass.catalogProjectIds || []);
                      setPassModalOpen(true);
                    }}>
                      <MaterialCommunityIcons name="pencil-box-multiple" size={18} color="#000" />
                      <Text style={s.gPrimaryBtnTxt}>Configure Catalog Subscription</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {playerPass ? (
                  <View style={s.gPassCard}>
                    <View style={s.gPassHeader}>
                      <MaterialCommunityIcons name="card-bulleted-outline" size={28} color={T.magenta} />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={s.gPassTitle}>{playerPass.name}</Text>
                        <Text style={s.gPassLabel}>Global Subscription Core Service</Text>
                      </View>
                    </View>

                    <View style={s.gGStatsRow}>
                      <View style={s.gGStatField}>
                        <Text style={s.gGStatLabel}>Standard Price</Text>
                        <Text style={s.gGStatVal}>${playerPass.standardPrice}/mo</Text>
                      </View>
                      <View style={s.gGStatField}>
                        <Text style={s.gGStatLabel}>Subscribers</Text>
                        <Text style={[s.gGStatVal, { color: T.cyan }]}>{(playerPass.subscriberCount * 1000).toFixed(0)}K sub users</Text>
                      </View>
                      <View style={s.gGStatField}>
                        <Text style={s.gGStatLabel}>Monthly Revenue</Text>
                        <Text style={[s.gGStatVal, { color: T.green }]}>${(playerPass.monthlyRevenueB * 1000).toFixed(2)}M/mo</Text>
                      </View>
                    </View>
                    
                    <Text style={s.gBulletsHeader}>Active Catalog Includes ({releasedGames.length} title releases)</Text>
                    {releasedGames.length === 0 ? (
                      <Text style={s.gBulletsTxt}>No active title releases deployed into catalogue pipeline yet.</Text>
                    ) : (
                      releasedGames.map(game => (
                        <Text key={game.id} style={s.gBulletsTxt}>• '{game.title}' [{game.genre}] ({game.criticScore}% Critical Score)</Text>
                      ))
                    )}
                  </View>
                ) : (
                  <View style={s.gEmptyCard}>
                    <Text style={s.gEmptyTitle}>Gaming Pass Service Offline</Text>
                  </View>
                )}
              </View>
            )}

            {/* TAB 6: Market Trends */}
            {activeGamingTab === 'trends' && (
              <View style={s.gPadBox}>
                <Text style={s.gSectionTitle}>Global Gaming Market Sector Metrics</Text>
                
                <View style={s.gTrendsCard}>
                  <Text style={s.gPassTitle}>Genre Hot-Trend Multipliers</Text>
                  <Text style={s.gSpecsHeader}>A genre factor above 1.0 accelerates physical sales of newly Gold-launched pipeline titles.</Text>
                  
                  {state.gamingTrends && Object.entries(state.gamingTrends.genreTrend).map(([genre, trendVal]: any) => (
                    <View key={genre} style={s.gTrendRow}>
                      <Text style={s.gTrendRowLabel}>{genre}</Text>
                      <View style={s.gTrendRowBarContainer}>
                        <View style={[s.gTrendRowBarValue, { width: `${Math.min(100, Math.round((trendVal / 2.0) * 100))}%` }]} />
                      </View>
                      <Text style={[s.gTrendRowVal, trendVal > 1.15 ? { color: T.green } : trendVal < 0.9 ? { color: T.red } : { color: '#fff' }]}>
                        {trendVal.toFixed(2)}x
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {/* Global Cinematic Logistics feed */}
        {state.newsLog.length > 0 ? (
          <>
            <SectionHeader title="Hollywood Chronicles" />
            <View style={{ paddingHorizontal: 16 }}>
              {state.newsLog.slice(0, 6).map((n, i) => (
                <View key={`${n.year}-${n.week}-${i}`} style={s.newsItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.newsTime}>W{n.week} Y{n.year}</Text>
                    <MaterialCommunityIcons name="newspaper-variant-outline" size={12} color={T.cyan} style={{ opacity: 0.6 }} />
                  </View>
                  <Text style={s.newsText}>{n.text}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Information modal */}
      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <MaterialCommunityIcons name="chart-line" size={32} color={T.cyan} />
            </View>
            <Text style={s.modalTitle}>General Information</Text>
            <View style={[s.logoOuter, { alignSelf: 'center', backgroundColor: player.logoBg, marginVertical: 12, padding: 12, borderRadius: 16 }]}>
              <MaterialCommunityIcons name={player.logoIcon as any} size={42} color={T.yellow} />
            </View>
            <View style={s.statRow}>
              <View style={[s.glanceCard, { flex: 1, backgroundColor: T.cardDark }]}>
                <Text style={s.glanceLabel}>RELEASES</Text>
                <Text style={[s.glanceValue, { color: T.cyan, fontSize: 14 }]}>{player.releases}</Text>
              </View>
              <View style={[s.glanceCard, { flex: 1, backgroundColor: T.cardDark }]}>
                <Text style={s.glanceLabel}>AWARDS</Text>
                <Text style={[s.glanceValue, { color: T.yellow, fontSize: 14 }]}>{player.awards}</Text>
              </View>
            </View>
            <View style={[s.statRow, { marginTop: 8 }]}>
              <View style={[s.glanceCard, { flex: 1, backgroundColor: T.cardDark }]}>
                <Text style={s.glanceLabel}>TOTAL CO</Text>
                <Text style={[s.glanceValue, { color: T.magenta, fontSize: 14 }]}>${player.totalBO.toFixed(1)}B</Text>
              </View>
              <View style={[s.glanceCard, { flex: 1, backgroundColor: T.cardDark }]}>
                <Text style={s.glanceLabel}>LIQUID CASH</Text>
                <Text style={[s.glanceValue, { color: T.green, fontSize: 14 }]}>${player.cash.toFixed(1)}B</Text>
              </View>
            </View>
            <Text style={[s.modalTitle, { fontSize: 16, marginTop: 12 }]}>{monthOf(week).name} W{monthOf(week).weekInMonth}, Year {year}</Text>
            <Text style={[s.modalTitle, { fontSize: 13, fontWeight: '700', color: T.cyan, marginTop: 4, letterSpacing: 1 }]}>UPCOMING HOLIDAYS</Text>
            {nextHolidays(week, year, 3).map((h) => (
              <View key={`${h.h.name}-${h.weeksAway}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <Text style={{ color: T.text, fontSize: 12, fontWeight: '700' }}>{h.h.name}</Text>
                <Text style={{ color: T.green, fontSize: 12, fontWeight: '700' }}>+{Math.round((h.h.mult - 1) * 100)}% · in {h.weeksAway} weeks</Text>
              </View>
            ))}
            <TouchableOpacity style={s.modalOk} onPress={() => setShowInfo(false)} testID="info-ok">
              <Text style={s.modalOkText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Multi-week modal */}
      <Modal visible={showMulti} transparent animationType="fade" onRequestClose={() => setShowMulti(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Fast Simulation Deck</Text>
            <Text style={{ color: T.textDim, fontSize: 12, textAlign: 'center', marginBottom: 14 }}>
              Speed up time across multiple iterations (cap: 96 weeks).
            </Text>
            <TextInput
              value={multiWeeks}
              onChangeText={(v) => setMultiWeeks(v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
              maxLength={3}
              style={s.weekInput}
              placeholder="e.g. 12"
              placeholderTextColor={T.textMute}
              testID="multi-weeks-input"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                const n = Math.max(1, Math.min(96, parseInt(multiWeeks, 10) || 0));
                if (n >= 1) { simulateMultiple(n); setShowMulti(false); }
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 12, justifyContent: 'center' }}>
              {[1, 4, 12, 24, 48].map(w => (
                <TouchableOpacity
                  key={w}
                  style={s.weekChip}
                  onPress={() => setMultiWeeks(String(w))}
                  testID={`week-chip-${w}`}
                >
                  <Text style={s.weekChipTxt}>{w} weeks</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.modalOk, { backgroundColor: T.cardDark, flex: 1 }]} onPress={() => setShowMulti(false)}>
                <Text style={[s.modalOkText, { color: T.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalOk, { flex: 1 }]}
                onPress={() => {
                  const n = Math.max(1, Math.min(96, parseInt(multiWeeks, 10) || 0));
                  if (n >= 1) { simulateMultiple(n); setShowMulti(false); }
                }}
                testID="multi-weeks-go"
              >
                <Text style={s.modalOkText}>SIMULATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Save Slots Manager */}
      <Modal visible={showSlots} transparent animationType="fade" onRequestClose={() => setShowSlots(false)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { maxHeight: '85%' }]}>
            <Text style={s.modalTitle}>Executive Snapshots</Text>
            <Text style={{ color: T.textDim, fontSize: 11, textAlign: 'center', marginBottom: 12 }}>Create custom labeled checkpoint files. Reload at any time to split timelines.</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              <TextInput
                value={newSlotName}
                onChangeText={setNewSlotName}
                placeholder="e.g. Pre-streaming Launch"
                placeholderTextColor={T.textMute}
                maxLength={28}
                style={{ flex: 1, backgroundColor: T.cardDark, color: T.text, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: T.border, fontSize: 13, fontWeight: '700' }}
                testID="slot-name-input"
              />
              <TouchableOpacity style={[s.modalOk, { paddingHorizontal: 16, marginTop: 0, backgroundColor: T.green }]} onPress={async () => {
                const name = newSlotName.trim() || `Slot ${slots.length + 1}`;
                const r = await saveToSlot(name);
                if (r.error) { alert(r.error); return; }
                setNewSlotName('');
                await refreshSlots();
              }} testID="slot-save-btn">
                <Text style={s.modalOkText}>SAVE</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 340 }}>
              {slots.length === 0 ? (
                <Text style={{ color: T.textDim, fontSize: 12, textAlign: 'center', padding: 20 }}>No snapshots found. Save current timeline state above.</Text>
              ) : slots.map(slot => (
                <View key={slot.name} style={{ backgroundColor: T.cardDark, padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: T.border }}>
                  <Text style={{ color: T.text, fontWeight: '900', fontSize: 13 }}>{slot.name}</Text>
                  <Text style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>{slot.studioName} · Y{slot.year} W{slot.week} · ${slot.cashB.toFixed(1)}B</Text>
                  <Text style={{ color: T.textMute, fontSize: 10, marginTop: 1 }}>Saved {new Date(slot.updatedAt).toLocaleString()}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: T.cyan, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }} onPress={async () => {
                      const r = await loadFromSlot(slot.name);
                      if (r.error) { alert(r.error); return; }
                      setShowSlots(false);
                    }} testID={`slot-load-${slot.name}`}>
                      <Text style={{ color: T.cardDark, fontWeight: '900', fontSize: 11 }}>LOAD</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: T.yellow, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }} onPress={async () => {
                      await saveToSlot(slot.name);
                      await refreshSlots();
                    }} testID={`slot-overwrite-${slot.name}`}>
                      <Text style={{ color: T.cardDark, fontWeight: '900', fontSize: 11 }}>OVERWRITE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ backgroundColor: '#E84545', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' }} onPress={async () => {
                      await deleteSlot(slot.name);
                      await refreshSlots();
                    }} testID={`slot-delete-${slot.name}`}>
                      <MaterialCommunityIcons name="delete" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.modalOk, { backgroundColor: T.cardDark, marginTop: 10 }]} onPress={() => setShowSlots(false)} testID="slots-close">
              <Text style={[s.modalOkText, { color: T.text }]}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Weekly Recap Modal */}
      {state.pendingRecap && (
        <WeeklyRecapModal
          recap={state.pendingRecap}
          onClose={dismissRecap}
          onSeeMore={() => { dismissRecap(); router.push('/financials'); }}
        />
      )}

      {/* GAMING DIVISION MODALS SECTIONS */}

      {/* 1. Build Custom Engine */}
      <Modal visible={engineModalOpen} transparent animationType="slide">
        <View style={s.gModalOverlay}>
          <View style={s.gModalBody}>
            <Text style={s.gModalTitle}>R&D Engine Blueprint Builder</Text>
            
            <Text style={s.gInputLabel}>ENGINE MONIKER TITLE</Text>
            <TextInput 
              style={s.gTextbox} 
              placeholder="e.g. Genesis Render Engine" 
              placeholderTextColor={T.textMute} 
              value={engineName}
              onChangeText={setEngineName}
            />

            <Text style={s.gInputLabel}>HARDWARE UNLOCKED GENERATION ({selectedGen})</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ENGINE_GENERATIONS.map(eg => (
                <TouchableOpacity 
                  key={eg.gen} 
                  style={[s.gPillBtn, selectedGen === eg.gen && s.gPillBtnActive]}
                  onPress={() => setSelectedGen(eg.gen)}
                >
                  <Text style={s.gPillTxt}>Gen {eg.gen}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.gUpgradeCostMUnder}>
              Upfront licensing setup cost: ${ENGINE_GENERATIONS[selectedGen - 1]?.costM}M opex
            </Text>

            <Text style={s.gInputLabel}>FITTED CUSTOM CODE MODULES</Text>
            <View style={s.gModulesSelectorGrid}>
              {(Object.keys(ENGINE_MODULES_SPECS) as GameEngineModule[]).map(mod => {
                const checked = selectedModules.includes(mod);
                return (
                  <TouchableOpacity 
                    key={mod} 
                    style={[s.gModuleSelectBox, checked && s.gModuleSelectBoxChecked]}
                    onPress={() => {
                      if (checked) {
                        setSelectedModules(selectedModules.filter(m => m !== mod));
                      } else {
                        setSelectedModules([...selectedModules, mod]);
                      }
                    }}
                  >
                    <Text style={[s.gModuleSelectTxt, checked && { color: '#000' }]}>{mod}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[s.statRow, { marginTop: 20 }]}>
              <TouchableOpacity style={s.gCancelBtn} onPress={() => setEngineModalOpen(false)}>
                <Text style={s.gCancelBtnTxt}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.gResolveBtn} onPress={handleCreateEngine}>
                <Text style={s.gResolveBtnTxt}>Confirm Setup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 2. Found Studio HQ */}
      <Modal visible={foundHQModalOpen} transparent animationType="slide">
        <View style={s.gModalOverlay}>
          <View style={s.gModalBody}>
            <Text style={s.gModalTitle}>Found Gaming Specialization Studio HQ</Text>
            
            <Text style={s.gInputLabel}>STUDIO DIVISION TITLE</Text>
            <TextInput 
              style={s.gTextbox} 
              placeholder="e.g. Lunar Core Games" 
              placeholderTextColor={T.textMute} 
              value={hqName}
              onChangeText={setHQName}
            />

            <Text style={s.gInputLabel}>SPECIALIZATION TIER FOCUS</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['Indie', 'Mobile', 'Mid-Tier', 'AAA'] as GamingStudioType[]).map(tier => (
                <TouchableOpacity 
                  key={tier} 
                  style={[s.gPillBtn, hqType === tier && s.gPillBtnActive]}
                  onPress={() => setHQType(tier)}
                >
                  <Text style={s.gPillTxt}>{tier}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.gUpgradeCostMUnder}>
              Founding upfront opex cost: ${hqType === 'AAA' ? 60 : hqType === 'Mid-Tier' ? 25 : 8}M opex
            </Text>

            <View style={[s.statRow, { marginTop: 20 }]}>
              <TouchableOpacity style={s.gCancelBtn} onPress={() => setFoundHQModalOpen(false)}>
                <Text style={s.gCancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.gResolveBtn} onPress={handleFoundHQ}>
                <Text style={s.gResolveBtnTxt}>Found HQ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Launch Project Pipeline */}
      <Modal visible={projectModalOpen} transparent animationType="slide">
        <View style={s.gModalOverlay}>
          <View style={s.gModalBody}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.gModalTitle}>Configure Game Pipeline Production</Text>
              
              <Text style={s.gInputLabel}>PROJECT METRIC TITLE</Text>
              <TextInput 
                style={s.gTextbox} 
                placeholder="e.g. Halo Infinite Remake" 
                placeholderTextColor={T.textMute} 
                value={projTitle}
                onChangeText={setProjTitle}
              />

              <Text style={s.gInputLabel}>TARGET MEDIA GENRE</Text>
              <View style={s.gModulesSelectorGrid}>
                {Object.keys(GENRE_FEATURES_WEIGHTS).map((g: any) => (
                  <TouchableOpacity 
                    key={g} 
                    style={[s.gModuleSelectBox, projGenre === g && s.gModuleSelectBoxChecked]}
                    onPress={() => setProjGenre(g)}
                  >
                    <Text style={[s.gModuleSelectTxt, projGenre === g && { color: '#000' }]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>LICENSED GAME ENGINE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {playerEngines.map(e => (
                  <TouchableOpacity 
                    key={e.id} 
                    style={[s.gPillBtn, projEngineId === e.id && s.gPillBtnActive]}
                    onPress={() => setProjEngineId(e.id)}
                  >
                    <Text style={s.gPillTxt}>{e.name} (Gen {e.generation})</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>RESPONSIBLE HQ DELEGATION</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {playerStudios.map(sItem => (
                  <TouchableOpacity 
                    key={sItem.id} 
                    style={[s.gPillBtn, projStudioId === sItem.id && s.gPillBtnActive]}
                    onPress={() => setProjStudioId(sItem.id)}
                  >
                    <Text style={s.gPillTxt}>{sItem.name} ({sItem.type})</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>PLANNED MONETIZATION MODEL</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['Premium', 'GaaS', 'F2P', 'Subscription'] as const).map(mon => (
                  <TouchableOpacity 
                    key={mon} 
                    style={[s.gPillBtn, projMonetization === mon && s.gPillBtnActive]}
                    onPress={() => setProjMonetization(mon)}
                  >
                    <Text style={s.gPillTxt}>{mon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>MEDIA ADAPTION CROSS-SYNERGY (OPTIONAL)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <TouchableOpacity 
                  style={[s.gPillBtn, !adaptationMovieId && s.gPillBtnActive]}
                  onPress={() => setAdaptationMovieId('')}
                >
                  <Text style={s.gPillTxt}>Pure Original Game IP</Text>
                </TouchableOpacity>
                {state.movies.filter(m => m.studioId === state.player.id).slice(0, 3).map(m => (
                  <TouchableOpacity 
                    key={m.id} 
                    style={[s.gPillBtn, adaptationMovieId === m.id && s.gPillBtnActive]}
                    onPress={() => setAdaptationMovieId(m.id)}
                  >
                    <Text style={s.gPillTxt}>Adapt '{m.title}'</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>PRODUCTION BUDGET (SOFTWARE R&D)</Text>
              <TextInput 
                style={s.gTextbox} 
                keyboardType="numeric"
                value={projBudgetM}
                onChangeText={setProjBudgetM}
              />

              <Text style={s.gInputLabel}>LAUNCH CAMPAIGN PROMOTION BUDGET</Text>
              <TextInput 
                style={s.gTextbox} 
                keyboardType="numeric"
                value={projMarketingM}
                onChangeText={setProjMarketingM}
              />

              <View style={[s.statRow, { marginTop: 25 }]}>
                <TouchableOpacity style={s.gCancelBtn} onPress={() => setProjectModalOpen(false)}>
                  <Text style={s.gCancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.gResolveBtn} onPress={handleStartProject}>
                  <Text style={s.gResolveBtnTxt}>Launch Pipeline</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Hardware Lab Console Designer */}
      <Modal visible={consoleModalOpen} transparent animationType="slide">
        <View style={s.gModalOverlay}>
          <View style={s.gModalBody}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.gModalTitle}>Hardware Spec Console Lab</Text>
              
              <Text style={s.gInputLabel}>CONSOLE MONIKER</Text>
              <TextInput 
                style={s.gTextbox} 
                placeholder="e.g. Aegis VR Deck" 
                placeholderTextColor={T.textMute} 
                value={consoleTitle}
                onChangeText={setConsoleTitle}
              />

              <Text style={s.gInputLabel}>CPU ARCHITECTURE SELECTION</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['Multi-Core', 'Custom Cloud Architecture', 'Quantum Hybrid'] as const).map(cpuKey => (
                  <TouchableOpacity 
                    key={cpuKey} 
                    style={[s.gPillBtn, consoleCpu === cpuKey && s.gPillBtnActive]}
                    onPress={() => setConsoleCpu(cpuKey)}
                  >
                    <Text style={s.gPillTxt}>{cpuKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>GRAPHICS PIPELINE NODE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['Rasterized', 'Fixed-Pipeline', 'Voxel-Shaded', 'Hardware Ray-Tracing'] as const).map(gpuKey => (
                  <TouchableOpacity 
                    key={gpuKey} 
                    style={[s.gPillBtn, consoleGpu === gpuKey && s.gPillBtnActive]}
                    onPress={() => setConsoleGpu(gpuKey)}
                  >
                    <Text style={s.gPillTxt}>{gpuKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>RAM ALLOCATION SIZE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(['MBs', 'GBs', 'Unified High Bandwidth'] as const).map(ramKey => (
                  <TouchableOpacity 
                    key={ramKey} 
                    style={[s.gPillBtn, consoleRam === ramKey && s.gPillBtnActive]}
                    onPress={() => setConsoleRam(ramKey)}
                  >
                    <Text style={s.gPillTxt}>{ramKey}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.gInputLabel}>HARDWARE CONSUMER RETAIL PRICE (USD)</Text>
              <TextInput 
                style={s.gTextbox} 
                keyboardType="numeric"
                value={consolePrice}
                onChangeText={setConsolePrice}
              />

              <Text style={s.gInputLabel}>INTERNAL MANUFACTURING COST TO ASSEMBLE</Text>
              <TextInput 
                style={s.gTextbox} 
                keyboardType="numeric"
                value={consoleMfgCost}
                onChangeText={setConsoleMfgCost}
              />

              <View style={[s.statRow, { marginTop: 25 }]}>
                <TouchableOpacity style={s.gCancelBtn} onPress={() => setConsoleModalOpen(false)}>
                  <Text style={s.gCancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.gResolveBtn} onPress={handleDesignConsole}>
                  <Text style={s.gResolveBtnTxt}>Assemble Machine</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. Configure Game Pass Catalog subscription */}
      <Modal visible={passModalOpen} transparent animationType="slide">
        <View style={s.gModalOverlay}>
          <View style={[s.gModalBody, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.gModalTitle}>Configure Custom Game Pass</Text>
              
              <Text style={s.gInputLabel}>SUBSCRIPTION SERVICE BRAND NAME</Text>
              <TextInput 
                style={s.gTextbox} 
                value={passNameInput}
                onChangeText={setPassNameInput}
              />

              <Text style={s.gInputLabel}>MONTHLY ACCESS PRICING TIERS</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.panelAlt, padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: T.textMute, fontSize: 12, fontWeight: '700' }}>Basic (with ads or limits)</Text>
                  <TextInput 
                    style={[s.gTextbox, { width: 80, marginBottom: 0, paddingVertical: 4, textAlign: 'right' }]} 
                    keyboardType="numeric" 
                    value={passBasicPrice} 
                    onChangeText={setPassBasicPrice}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.panelAlt, padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: T.cyan, fontSize: 12, fontWeight: '700' }}>Standard (Full Access)</Text>
                  <TextInput 
                    style={[s.gTextbox, { width: 80, marginBottom: 0, paddingVertical: 4, textAlign: 'right' }]} 
                    keyboardType="numeric" 
                    value={passPriceInput} 
                    onChangeText={setPassPriceInput}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.panelAlt, padding: 8, borderRadius: 8 }}>
                  <Text style={{ color: T.yellow, fontSize: 12, fontWeight: '700' }}>Premium (Direct TV Synced)</Text>
                  <TextInput 
                    style={[s.gTextbox, { width: 80, marginBottom: 0, paddingVertical: 4, textAlign: 'right' }]} 
                    keyboardType="numeric" 
                    value={passPremiumPrice} 
                    onChangeText={setPassPremiumPrice}
                  />
                </View>
              </View>

              <Text style={s.gInputLabel}>HYBRID AD SUPPORT MODEL</Text>
              <TouchableOpacity 
                style={{ borderRadius: 8, padding: 12, marginRight: 0, alignItems: 'center', backgroundColor: passAdSupported ? T.cyan : T.panelAlt }} 
                onPress={() => setPassAdSupported(!passAdSupported)}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: passAdSupported ? '#000' : '#fff' }}>
                  {passAdSupported ? '● AD INTEGRATION ACTIVE (adds audience ad-revenue)' : '○ NO ADS PLATFORM (pure subscription model)'}
                </Text>
              </TouchableOpacity>

              <Text style={s.gInputLabel}>PLATFORM CONSOLE COMPATIBILITY</Text>
              <Text style={{ color: T.textMute, fontSize: 11, marginBottom: 6 }}>Attract subscriber segments by deploying catalog to dynamic consoles</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(state.gamingConsoles || []).map(con => {
                  const selected = passSelectedConsoles.includes(con.id);
                  return (
                    <TouchableOpacity 
                      key={con.id} 
                      style={[s.gModuleSelectBox, selected && s.gModuleSelectBoxChecked, { paddingVertical: 6 }]}
                      onPress={() => {
                        if (selected) {
                          setPassSelectedConsoles(passSelectedConsoles.filter(id => id !== con.id));
                        } else {
                          setPassSelectedConsoles([...passSelectedConsoles, con.id]);
                        }
                      }}
                    >
                      <Text style={[s.gModuleSelectTxt, selected && { color: '#000' }]}>
                        {con.title} (Gen {con.generation})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={s.gInputLabel}>DEPLOY GAMES TO CATALOG</Text>
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
                        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.panelAlt, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: checked ? T.cyan : 'transparent' }}
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

              <View style={[s.statRow, { marginTop: 25 }]}>
                <TouchableOpacity style={s.gCancelBtn} onPress={() => setPassModalOpen(false)}>
                  <Text style={s.gCancelBtnTxt}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.gResolveBtn} onPress={handleConfigurePass}>
                  <Text style={s.gResolveBtnTxt}>Save Settings</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  
  // Cinematic executive studio banner
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
    borderColor: 'rgba(255,215,0,0.4)',
    shadowColor: T.yellow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandSubtitle: {
    color: T.yellow,
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
  
  // Glance stats deck
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
    marginTop: 3,
    letterSpacing: 0.2,
  },

  // Sim console
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
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  calendarButtonText: {
    color: T.yellow,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 5,
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

  // Dynamic system tabs
  tabDeck: {
    flexDirection: 'row',
    marginTop: 20,
    marginHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: T.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabButtonText: {
    color: T.textMute,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Action cards
  actionsList: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: T.panel,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: T.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  cardDesc: {
    color: T.textDim,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
    opacity: 0.8,
  },
  cardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  cardBadgeTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  newsItem: {
    backgroundColor: T.panel,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: T.cyan,
    borderWidth: 1,
    borderColor: T.border,
  },
  newsTime: { color: T.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  newsText: { color: T.text, fontSize: 12, marginTop: 4, lineHeight: 17 },
  
  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: T.panel, padding: 24, borderRadius: 16, width: '100%', maxWidth: 390, borderWidth: 1.5, borderColor: T.border },
  modalIcon: { alignSelf: 'center', backgroundColor: T.cyan, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  modalTitle: { color: T.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginVertical: 8, letterSpacing: 0.5 },
  modalOk: { backgroundColor: T.cyan, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalOkText: { color: T.cardDark, fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  
  mgrBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,215,0,0.05)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  mgrBannerTxt: { color: T.textDim, fontWeight: '700', fontSize: 11, flex: 1 },
  mgrBannerBtn: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: T.yellow, borderRadius: 6 },
  mgrBannerBtnTxt: { color: T.cardDark, fontWeight: '900', fontSize: 9 },
  
  weekInput: { backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.cyan + '40', borderRadius: 10, color: T.text, fontSize: 22, fontWeight: '900', textAlign: 'center', paddingVertical: 12, marginTop: 4 },
  weekChip: { backgroundColor: T.cardDark, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: T.border },
  weekChipTxt: { color: T.text, fontWeight: '900', fontSize: 11 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: T.red, minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.bg, paddingHorizontal: 4 },
  badgeTxt: { color: '#fff', fontWeight: '900', fontSize: 11 },
  statRow: { flexDirection: 'row', gap: 8 },

  // Division select bar
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

  // Gaming Section styles
  gTabs: { flexDirection: 'row', backgroundColor: T.panel, borderBottomWidth: 1, borderColor: T.border, flexWrap: 'wrap', marginTop: 14, marginHorizontal: 16, borderRadius: 8 },
  gTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent', minWidth: 70 },
  gActiveTab: { borderColor: T.cyan },
  gTabTxt: { color: T.textMute, fontSize: 11, fontWeight: '700' },
  gPadBox: { paddingVertical: 16, paddingHorizontal: 16, gap: 12, marginTop: 14, marginHorizontal: 16 },
  gRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  gSectionTitle: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  gSubSectionTitle: { color: T.textDim, fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  gListHeader: { color: T.cyan, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginTop: 12, marginBottom: 8, letterSpacing: 1 },
  gPrimaryBtn: { flexDirection: 'row', gap: 6, backgroundColor: T.cyan, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  gPrimaryBtnTxt: { color: '#000', fontSize: 11, fontWeight: '900' },
  gEmptyCard: { backgroundColor: T.panel, padding: 24, borderRadius: 10, borderWidth: 1, borderColor: T.border, alignItems: 'center', gap: 8 },
  gEmptyTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  gEmptySub: { color: T.textMute, fontSize: 12, textAlign: 'center', lineHeight: 16 },
  
  gHqCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 10 },
  gHqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: T.border, paddingBottom: 10, marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  gHqTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gHqTypeBadge: { color: T.cyan, fontSize: 11, fontWeight: '600', marginTop: 2 },
  gHqPayroll: { color: T.textMute, fontSize: 11 },
  
  gStaffGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  gStaffBox: { flex: 1, minWidth: 90, backgroundColor: T.panelAlt, padding: 8, borderRadius: 6, borderWidth: 1, borderColor: T.border, alignItems: 'center' },
  gStaffRoleLabel: { color: T.textMute, fontSize: 8, fontWeight: '800', marginBottom: 4 },
  gStaffActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gCounterBtn: { backgroundColor: T.card, width: 28, height: 24, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  gCounterBtnTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  gStaffQty: { color: '#fff', fontSize: 12, fontWeight: '900' },
  
  gRoomsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  gRoomPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.panelAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: T.cyan },
  gRoomPillLocked: { borderColor: T.border, opacity: 0.6 },
  gRoomLabel: { color: T.textMute, fontSize: 11, fontWeight: '700' },
  gRoomActBtn: { backgroundColor: T.yellow, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, marginLeft: 2 },
  gRoomActBtnTxt: { color: '#000', fontSize: 9, fontWeight: '900' },
  gRoomProgressTxt: { color: T.yellow, fontSize: 9, fontWeight: '700', marginLeft: 2 },

  gProjectCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 10, gap: 10 },
  gProjectMainTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gProjectMetaLabel: { color: T.textMute, fontSize: 11, marginTop: 2 },
  gCyanBadge: { backgroundColor: T.cyan, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  gCyanBadgeTxt: { color: '#000', fontSize: 9, fontWeight: '900' },
  gProgressArea: { gap: 4 },
  gProgressLabel: { color: T.textDim, fontSize: 10, fontWeight: '700' },
  gProgressBarBg: { height: 6, backgroundColor: T.panelAlt, borderRadius: 3, overflow: 'hidden' },
  gProgressBarVal: { height: '100%', backgroundColor: T.cyan, borderRadius: 3 },
  gBugLabel: { color: T.red, fontSize: 10, fontWeight: '700', marginLeft: 2 },
  gBudgetAlloc: { color: T.textMute, fontSize: 10, fontWeight: '700' },

  gGCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 10, gap: 10 },
  gGHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gGTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gGGenre: { color: T.textMute, fontSize: 11, marginTop: 2 },
  gGoldRatingCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.yellow, alignItems: 'center', justifyContent: 'center' },
  gGoldRatingCircleTxt: { color: '#000', fontSize: 12, fontWeight: '900' },
  gGStatsRow: { flexDirection: 'row', gap: 10, backgroundColor: T.panelAlt, padding: 10, borderRadius: 6 },
  gGStatField: { flex: 1, gap: 2 },
  gGStatLabel: { color: T.textMute, fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  gGStatVal: { color: '#fff', fontSize: 12, fontWeight: '900' },
  gAdaptCinemaBtn: { flexDirection: 'row', gap: 6, backgroundColor: T.cardDark, borderWidth: 1, borderColor: T.cyan, paddingVertical: 8, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  gAdaptCinemaBtnTxt: { color: T.cyan, fontSize: 11, fontWeight: '800' },

  gEngineCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 10, gap: 10 },
  gEngineBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gEngineTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gEngineGenLabel: { color: T.textMute, fontSize: 11, marginTop: 2 },
  gEngineTechValuePill: { backgroundColor: T.card, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  gEngineTechValueTxt: { color: T.yellow, fontSize: 10, fontWeight: '900' },
  gModulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gModuleToken: { backgroundColor: T.panelAlt, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: T.border },
  gModuleTokenTxt: { color: T.cyan, fontSize: 10, fontWeight: '700' },
  gMetricsGrid: { flexDirection: 'row', gap: 6, marginTop: 2 },
  gMetricBox: { flex: 1, backgroundColor: T.panelAlt, padding: 6, borderRadius: 6, alignItems: 'center', gap: 1 },
  gMetricLabel: { color: T.textMute, fontSize: 8, fontWeight: '700' },
  gMetricVal: { color: '#fff', fontSize: 11, fontWeight: '800' },

  gConsoleCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 10, gap: 10 },
  gCHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gCTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gCGenLabel: { color: T.textMute, fontSize: 11, marginTop: 2 },
  gStatusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  gStatusBadgeTxt: { color: '#000', fontSize: 9, fontWeight: '900' },
  gCSecsList: { backgroundColor: T.panelAlt, padding: 10, borderRadius: 6, gap: 3 },
  gSpecsHeader: { color: T.textDim, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
  gSpecDetail: { color: T.textMute, fontSize: 11 },

  gPassCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, gap: 10 },
  gPassHeader: { flexDirection: 'row', alignItems: 'center' },
  gPassTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  gPassLabel: { color: T.textMute, fontSize: 11, marginTop: 2 },
  gBulletsHeader: { color: T.cyan, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 6 },
  gBulletsTxt: { color: T.textMute, fontSize: 11, lineHeight: 16 },

  gTrendsCard: { backgroundColor: T.panel, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: T.border, gap: 10 },
  gTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gTrendRowLabel: { color: '#fff', fontSize: 12, fontWeight: '700', width: 80 },
  gTrendRowBarContainer: { flex: 1, height: 8, backgroundColor: T.panelAlt, borderRadius: 4, overflow: 'hidden' },
  gTrendRowBarValue: { height: '100%', backgroundColor: T.cyan },
  gTrendRowVal: { fontSize: 11, fontWeight: '800', width: 40, textAlign: 'right' },

  gSimpleCard: { backgroundColor: T.panelAlt, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: T.border },
  
  gModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  gModalBody: { width: '100%', maxWidth: 450, backgroundColor: T.panel, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, maxHeight: '90%' },
  gModalTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  gInputLabel: { color: T.cyan, fontSize: 11, fontWeight: '800', marginTop: 12, marginBottom: 6, letterSpacing: 0.5 },
  gTextbox: { backgroundColor: T.panelAlt, color: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: T.border, fontSize: 14, marginBottom: 8 },
  gPillBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: T.card, borderWidth: 1, borderColor: T.border, marginRight: 6 },
  gPillBtnActive: { backgroundColor: T.cyan, borderColor: T.cyan },
  gPillTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  gUpgradeCostMUnder: { color: T.yellow, fontSize: 11, fontWeight: '600', marginTop: 4 },
  gModulesSelectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gModuleSelectBox: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, backgroundColor: T.card, borderWidth: 1, borderColor: T.border },
  gModuleSelectBoxChecked: { backgroundColor: T.cyan, borderColor: T.cyan },
  gModuleSelectTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },
  gCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: T.card, alignItems: 'center', marginRight: 10 },
  gCancelBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '800' },
  gResolveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: T.cyan, alignItems: 'center' },
  gResolveBtnTxt: { color: '#000', fontSize: 13, fontWeight: '900' }
});
