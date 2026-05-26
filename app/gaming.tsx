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
  ROLE_WEEKLY_SALARY 
} from '../src/game/gaming';
import { GameEngineModule, GamingStudioType, GamingProject } from '../src/game/types';

type GamingTab = 'studios' | 'pipeline' | 'engines' | 'consoles' | 'gamepass' | 'trends';

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
    researchNextGen
  } = useGame();

  const [activeTab, setActiveTab] = useState<GamingTab>('studios');

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
  const [passSelectedConsoles, setPassSelectedConsoles] = useState<string[]>([]);
  const [passSelectedGames, setPassSelectedGames] = useState<string[]>([]);

  if (!state) {
    return (
      <SafeAreaView style={style.centered}>
        <ActivityIndicator size="large" color={T.cyan} />
      </SafeAreaView>
    );
  }

  // Derived filters
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

  return (
    <SafeAreaView style={style.container} edges={['top']}>
      <TopBar title="MASS ENTERTAINMENT TYCOON" right={<Text style={{ color: T.cyan, fontWeight: '900' }}>${(state.player.cash * 1000).toFixed(0)}M</Text>} />
      
      {/* Sub navigation Tabs */}
      <View style={style.tabs}>
        {(['studios', 'pipeline', 'engines', 'consoles', 'gamepass', 'trends'] as GamingTab[]).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[style.tab, activeTab === tab && style.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[style.tabTxt, activeTab === tab && { color: T.cyan, fontWeight: '900' }]}>
              {tab === 'studios' ? 'Studios' 
               : tab === 'pipeline' ? 'Projects' 
               : tab === 'engines' ? 'Engines' 
               : tab === 'consoles' ? 'Hardware' 
               : tab === 'gamepass' ? 'Game Pass' 
               : 'Market Trends'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={style.scroll}>
        
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
                </View>
              ))
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
              <Text style={style.sectionTitle}>Game Pass Subsystem</Text>
              {playerPass && (
                <TouchableOpacity style={style.primaryBtn} onPress={() => {
                  setPassNameInput(playerPass.name || '');
                  setPassPriceInput(String(playerPass.standardPrice || 14.99));
                  setPassBasicPrice(String(playerPass.basicPrice || 9.99));
                  setPassPremiumPrice(String(playerPass.premiumPrice || 19.99));
                  setPassAdSupported(!!playerPass.adSupported);
                  setPassSelectedConsoles(playerPass.enabledConsoleIds || []);
                  setPassSelectedGames(playerPass.catalogProjectIds || []);
                  setPassModalOpen(true);
                }}>
                  <MaterialCommunityIcons name="pencil-box-multiple" size={20} color="#000" />
                  <Text style={style.primaryBtnTxt}>Configure Catalog Subscription</Text>
                </TouchableOpacity>
              )}
            </View>

            {playerPass ? (
              <View style={style.passCard}>
                <View style={style.passHeader}>
                  <MaterialCommunityIcons name="card-bulleted-outline" size={32} color={T.magenta} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={style.passTitle}>{playerPass.name}</Text>
                    <Text style={style.passLabel}>Global Subscription Core Service</Text>
                  </View>
                </View>

                <View style={style.gStatsRow}>
                  <View style={style.gStatField}>
                    <Text style={style.gStatLabel}>Standard Price</Text>
                    <Text style={style.gStatVal}>${playerPass.standardPrice}/mo</Text>
                  </View>
                  <View style={style.gStatField}>
                    <Text style={style.gStatLabel}>Subscribers</Text>
                    <Text style={[style.gStatVal, { color: T.cyan }]}>{(playerPass.subscriberCount * 1000).toFixed(0)}K sub users</Text>
                  </View>
                  <View style={style.gStatField}>
                    <Text style={style.gStatLabel}>Monthly Revenue</Text>
                    <Text style={[style.gStatVal, { color: T.green }]}>${(playerPass.monthlyRevenueB * 1000).toFixed(2)}M/mo</Text>
                  </View>
                </View>
                
                <Text style={style.bulletsHeader}>Active Catalog Includes ({releasedGames.length} title releases)</Text>
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

        {/* TAB 6: Market Trends */}
        {activeTab === 'trends' && (
          <View style={style.padBox}>
            <Text style={style.sectionTitle}>Global Gaming Market Sector Metrics</Text>
            
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
              
              <Text style={style.inputLabel}>SUBSCRIPTION SERVICE BRAND NAME</Text>
              <TextInput 
                style={style.textbox} 
                value={passNameInput}
                onChangeText={setPassNameInput}
              />

              <Text style={style.inputLabel}>MONTHLY ACCESS PRICING TIERS</Text>
              <View style={{ gap: 8 }}>
                <View style={[style.rowJust, { backgroundColor: T.panelAlt, padding: 8, borderRadius: 8 }]}>
                  <Text style={{ color: T.textMute, fontSize: 12, fontWeight: '700' }}>Basic (with ads or limits)</Text>
                  <TextInput 
                    style={[style.textbox, { width: 80, marginBottom: 0, paddingVertical: 4, textAlign: 'right' }]} 
                    keyboardType="numeric" 
                    value={passBasicPrice} 
                    onChangeText={setPassBasicPrice}
                  />
                </View>
                <View style={[style.rowJust, { backgroundColor: T.panelAlt, padding: 8, borderRadius: 8 }]}>
                  <Text style={{ color: T.cyan, fontSize: 12, fontWeight: '700' }}>Standard (Full Access)</Text>
                  <TextInput 
                    style={[style.textbox, { width: 80, marginBottom: 0, paddingVertical: 4, textAlign: 'right' }]} 
                    keyboardType="numeric" 
                    value={passPriceInput} 
                    onChangeText={setPassPriceInput}
                  />
                </View>
                <View style={[style.rowJust, { backgroundColor: T.panelAlt, padding: 8, borderRadius: 8 }]}>
                  <Text style={{ color: T.yellow, fontSize: 12, fontWeight: '700' }}>Premium (Direct TV Synced)</Text>
                  <TextInput 
                    style={[style.textbox, { width: 80, marginBottom: 0, paddingVertical: 4, textAlign: 'right' }]} 
                    keyboardType="numeric" 
                    value={passPremiumPrice} 
                    onChangeText={setPassPremiumPrice}
                  />
                </View>
              </View>

              <Text style={style.inputLabel}>HYBRID AD SUPPORT MODEL</Text>
              <TouchableOpacity 
                style={[style.pillBtn, { marginRight: 0, alignItems: 'center', backgroundColor: passAdSupported ? T.cyan : T.panelAlt }]} 
                onPress={() => setPassAdSupported(!passAdSupported)}
              >
                <Text style={[style.pillTxt, { color: passAdSupported ? '#000' : '#fff' }]}>
                  {passAdSupported ? '● AD INTEGRATION ACTIVE (adds audience ad-revenue)' : '○ NO ADS PLATFORM (pure subscription model)'}
                </Text>
              </TouchableOpacity>

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

    </SafeAreaView>
  );
}

const style = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centered: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: T.panel, borderBottomWidth: 1, borderColor: T.border, flexWrap: 'wrap' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent', minWidth: 80 },
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
