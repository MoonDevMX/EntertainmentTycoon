import { GameState, GameEngine, GamingStudioHQ, GamingProject, GamingConsole, GamingPass, GamingTrends, GameEngineModule, GamingStudioType, GamingProjectPhase } from './types';

// Procedure to generate unique IDs
function uid(prefix: string): string {
  return prefix + Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Map gaming genres to high-priority feature slots to grade review score
export const GENRE_FEATURES_WEIGHTS: Record<string, Record<string, number>> = {
  RPG: { graphics: 0.1, gameplay: 0.25, story: 0.3, multiplayer: 0.1, ai: 0.1, ui: 0.1, performance: 0.05 },
  Action: { graphics: 0.2, gameplay: 0.3, story: 0.1, multiplayer: 0.1, ai: 0.1, ui: 0.1, performance: 0.1 },
  Shooter: { graphics: 0.2, gameplay: 0.25, story: 0.05, multiplayer: 0.25, ai: 0.05, ui: 0.05, performance: 0.15 },
  Strategy: { graphics: 0.05, gameplay: 0.2, story: 0.05, multiplayer: 0.15, ai: 0.3, ui: 0.15, performance: 0.1 },
  Simulation: { graphics: 0.1, gameplay: 0.2, story: 0.05, multiplayer: 0.05, ai: 0.25, ui: 0.2, performance: 0.15 },
  Sports: { graphics: 0.15, gameplay: 0.3, story: 0.02, multiplayer: 0.25, ai: 0.1, ui: 0.1, performance: 0.08 },
  Adventure: { graphics: 0.15, gameplay: 0.15, story: 0.4, multiplayer: 0.02, ai: 0.1, ui: 0.1, performance: 0.08 },
  MMO: { graphics: 0.1, gameplay: 0.2, story: 0.1, multiplayer: 0.35, ai: 0.05, ui: 0.1, performance: 0.1 }
};

// Seeding engine modules details
export const ENGINE_MODULES_SPECS: Record<GameEngineModule, { costM: number; devWeeks: number; score: number; desc: string }> = {
  Graphics: { costM: 10, devWeeks: 4, score: 15, desc: 'Advanced graphics shader compilation and raster pipelines' },
  Physics: { costM: 8, devWeeks: 3, score: 12, desc: 'Collision simulations, kinematics, and fluid dynamic solvers' },
  AI: { costM: 7, devWeeks: 3, score: 12, desc: 'Behavior tree processors, pathfinding, and decision engines' },
  Sound: { costM: 5, devWeeks: 2, score: 8, desc: 'Spatial ambisonics, dynamic acoustics, and atmospheric music' },
  Networking: { costM: 12, devWeeks: 5, score: 18, desc: 'Sub-millisecond serialization, rollback, and anti-cheat hooks' },
  UI: { costM: 4, devWeeks: 2, score: 6, desc: 'Declarative layout framework and localized text rendering engines' },
  Tools: { costM: 6, devWeeks: 3, score: 10, desc: 'Visual timeline compilers, prefab managers, and rapid pipelines' },
  Cloud: { costM: 15, devWeeks: 6, score: 22, desc: 'State synchronization networks and direct stream compression' },
  VR: { costM: 14, devWeeks: 5, score: 20, desc: 'Stereoscopic projection matching, foveated optimization' }
};

// Generational milestones for Game Engines
export const ENGINE_GENERATIONS = [
  { gen: 1, name: '2D Framework Era', costM: 15, unlockFeaturesCount: 2 },
  { gen: 2, name: 'True 3D Polygons', costM: 35, unlockFeaturesCount: 3 },
  { gen: 3, name: 'PhysX & Shaders', costM: 75, unlockFeaturesCount: 4 },
  { gen: 4, name: 'Hardware Ray-Tracing', costM: 150, unlockFeaturesCount: 5 },
  { gen: 5, name: 'Full-Immersion VR', costM: 280, unlockFeaturesCount: 7 },
  { gen: 6, name: 'Cloud-Native Streaming', costM: 500, unlockFeaturesCount: 9 }
];

// Room modifiers inside HQs
export const STUDIO_ROOMS_DETAIL: Record<string, { label: string; bCostM: number; desc: string; modifier: string }> = {
  dev_floor: { label: 'Dev Floor', bCostM: 8, desc: 'Spacious workspace setup', modifier: '+15% Programming & UI output speed' },
  qa_lab: { label: 'QA Safety Lab', bCostM: 12, desc: 'Rigorous bug screening suite', modifier: 'Autonomously screens up to 4 bugs/week' },
  motion_capture: { label: 'Mo-Cap Stage', bCostM: 25, desc: 'Real-time skeleton sensors setup', modifier: '+25% Graphics quality focus on Adventure/RPG' },
  sound_stage: { label: 'Sound Suite', bCostM: 18, desc: 'Isolated booths for music tracking', modifier: '+20% Sound score boost for Shooters/MMO' },
  liveops_center: { label: 'LiveOps Console', bCostM: 30, desc: 'Real-time telemetry control center', modifier: '-15% GaaS/F2P player attrition rate' },
  esports_arena: { label: 'Esports League Ring', bCostM: 50, desc: 'Arena and coaching grid', modifier: '+30% weekly revenue ceiling for MMO and Shooters' }
};

// Salary metrics based on role
export const ROLE_WEEKLY_SALARY: Record<string, number> = {
  programmers: 0.003, // $3k per staff unit/week ($300k/yr equivalent in 100x bulk)
  designers: 0.0025,
  artists: 0.0025,
  qa: 0.002,
  liveops: 0.003
};

// Initialize default gaming fields if missing
export function seedGamingFields(s: GameState): GameState {
  if (s.gameEngines && s.gamingStudios && s.gamingProjects && s.gamingConsoles && s.gamingPasses && s.gamingTrends) {
    return s;
  }

  const state = { ...s };

  // 1. Initial Engines
  if (!state.gameEngines) {
    state.gameEngines = [
      {
        id: uid('geng_'),
        name: 'RetroVision 2D',
        studioId: state.player.id,
        generation: 1,
        modules: ['Graphics', 'UI', 'Tools'],
        renderQuality: 45,
        performance: 70,
        networkStability: 30,
        toolingEfficiency: 65,
        licensingValue: 40,
        licenseFeeM: 1.0,
        royaltyPercent: 3,
        contractDurationYears: 2,
        isVRAble: false,
        isCloudNative: false,
        licensees: []
      },
      {
        id: uid('geng_'),
        name: 'OmniPolygonal 3D',
        studioId: state.rivals[0]?.id || 'rival_01',
        generation: 2,
        modules: ['Graphics', 'Physics', 'UI', 'Sound'],
        renderQuality: 68,
        performance: 55,
        networkStability: 40,
        toolingEfficiency: 50,
        licensingValue: 55,
        licenseFeeM: 3.5,
        royaltyPercent: 5,
        contractDurationYears: 3,
        isVRAble: false,
        isCloudNative: false,
        licensees: []
      },
      {
        id: uid('geng_'),
        name: 'Hyperion Voxel Engine',
        studioId: state.rivals[1]?.id || 'rival_02',
        generation: 3,
        modules: ['Graphics', 'Physics', 'AI', 'Tools'],
        renderQuality: 82,
        performance: 75,
        networkStability: 60,
        toolingEfficiency: 80,
        licensingValue: 70,
        licenseFeeM: 8.0,
        royaltyPercent: 6,
        contractDurationYears: 3,
        isVRAble: false,
        isCloudNative: false,
        licensees: []
      }
    ];
  }

  // 2. Initial Studio HQs
  if (!state.gamingStudios) {
    const listHQ: GamingStudioHQ[] = [
      {
        id: uid('ghq_'),
        name: `${state.player.name} Systems`,
        studioId: state.player.id,
        type: 'AAA',
        rooms: ['dev_floor'],
        staffPools: { programmers: 20, designers: 15, artists: 15, qa: 5, liveops: 0 },
        salaryBandWeeklyM: 0.15,
        automated: false,
        upgradesFinishedWeeks: {}
      }
    ];
    state.rivals.slice(0, 3).forEach((rival, idx) => {
      listHQ.push({
        id: uid('ghq_'),
        name: `${rival.name} Interactive`,
        studioId: rival.id,
        type: idx === 0 ? 'AAA' : 'Mid-Tier',
        rooms: ['dev_floor'],
        staffPools: { programmers: 15 + idx * 5, designers: 12 + idx * 3, artists: 12 + idx * 3, qa: 4 + idx, liveops: 0 },
        salaryBandWeeklyM: 0.08,
        automated: true,
        upgradesFinishedWeeks: {}
      });
    });
    state.gamingStudios = listHQ;
  }

  // 3. Initial Projects index
  if (!state.gamingProjects) {
    state.gamingProjects = [];
  }

  // 4. Initial Hardware Console catalog
  if (!state.gamingConsoles) {
    state.gamingConsoles = [
      {
        id: uid('gcon_'),
        title: 'Nexon Genesis',
        studioId: state.rivals[1]?.id || 'rival_02',
        generation: 2,
        specs: {
          cpu: '16-bit',
          gpu: 'Fixed-Pipeline',
          ram: 'MBs',
          storage: 'Cartridge',
          backwardCompat: true,
          cloudStreaming: false,
          onlineServices: false
        },
        rdWeeksLeft: 0,
        rdTotalWeeks: 0,
        price: 199,
        manufacturingCost: 140,
        unitsSold: 12.4, // Mil units
        marketShare: 0.35,
        stock: 0.5,
        subscriberCount: 0,
        status: 'active',
        timedExclusivesSignedMovieIds: []
      },
      {
        id: uid('gcon_'),
        title: 'Aura Play Station',
        studioId: state.rivals[0]?.id || 'rival_01',
        generation: 3,
        specs: {
          cpu: 'Multi-Core',
          gpu: 'Voxel-Shaded',
          ram: 'GBs',
          storage: 'SSD',
          backwardCompat: true,
          cloudStreaming: true,
          onlineServices: true
        },
        rdWeeksLeft: 0,
        rdTotalWeeks: 0,
        price: 399,
        manufacturingCost: 280,
        unitsSold: 8.5,
        marketShare: 0.45,
        stock: 0.8,
        subscriberCount: 2.1,
        status: 'active',
        timedExclusivesSignedMovieIds: []
      },
      {
        id: uid('gcon_'),
        title: 'Horizon Deck Alpha',
        studioId: state.rivals[2]?.id || 'rival_03',
        generation: 4,
        specs: {
          cpu: 'Multi-Core',
          gpu: 'Hardware Ray-Tracing',
          ram: 'GBs',
          storage: 'SSD',
          backwardCompat: false,
          cloudStreaming: true,
          onlineServices: true
        },
        rdWeeksLeft: 0,
        rdTotalWeeks: 0,
        price: 499,
        manufacturingCost: 350,
        unitsSold: 3.2,
        marketShare: 0.20,
        stock: 0.4,
        subscriberCount: 1.2,
        status: 'active',
        timedExclusivesSignedMovieIds: []
      }
    ];
  }

  // 5. Initial Game Pass subs
  if (!state.gamingPasses) {
    const listPasses = [
      {
        id: uid('gpass_'),
        studioId: state.player.id,
        name: `${state.player.name} Gaming Hub`,
        basicPrice: 9.99,
        standardPrice: 14.99,
        premiumPrice: 19.99,
        subscriberCount: 0.1, // 100k initial subs
        catalogProjectIds: [],
        thirdPartyCatalogIds: [],
        monthlyRevenueB: 0.001
      }
    ];
    state.rivals.slice(0, 3).forEach((rival, idx) => {
      listPasses.push({
        id: uid('gpass_'),
        studioId: rival.id,
        name: `${rival.name} Game Universe`,
        basicPrice: 8.99,
        standardPrice: 12.99,
        premiumPrice: 17.99,
        subscriberCount: 0.04 + idx * 0.03, // millions
        catalogProjectIds: [],
        thirdPartyCatalogIds: [],
        monthlyRevenueB: 0.0005
      });
    });
    state.gamingPasses = listPasses;
  }

  // 6. Trends engine preset
  if (!state.gamingTrends) {
    state.gamingTrends = {
      genreTrend: {
        RPG: 1.15,
        Action: 1.25,
        Shooter: 0.95,
        Strategy: 0.8,
        Simulation: 1.05,
        Sports: 0.9,
        Adventure: 1.0,
        MMO: 0.9
      },
      marketingTolerance: 1.0,
      microtransactionBacklash: 15
    };
  }

  return state;
}

// Global Core Gaming Simulation Loop (Processes state weekly)
export function tickGamingDivision(state: GameState): GameState {
  let s = seedGamingFields(state);

  const curWeek = s.week;
  const curYear = s.year;

  // Track gaming-specific inflow and outflows for this week's ledger
  let weeklyInflowB = 0;
  let weeklyOutflowB = 0;

  let weeklyEngineLicensingInflowB = 0;
  let weeklyOpexOutflowB = 0;
  let weeklyHardwareOutflowB = 0;

  // A. Trends update (dynamic drift)
  const trends = s.gamingTrends!;
  const nextGenreTrend = { ...trends.genreTrend };
  Object.keys(nextGenreTrend).forEach((g: any) => {
    let drift = (Math.random() - 0.5) * 0.08;
    nextGenreTrend[g as keyof typeof nextGenreTrend] = Math.max(0.5, Math.min(2.0, nextGenreTrend[g] + drift));
  });
  s.gamingTrends = {
    ...trends,
    genreTrend: nextGenreTrend,
    marketingTolerance: Math.max(0.6, Math.min(1.6, trends.marketingTolerance + (Math.random() - 0.5) * 0.05))
  };

  // B. Process Gaming Studio upgrades & room construction
  const studios = (s.gamingStudios || []).map((hq) => {
    const finishedRooms: string[] = [...hq.rooms];
    const upRules = { ...hq.upgradesFinishedWeeks };
    const nextRules = { ...upRules };

    Object.keys(upRules).forEach((rKey) => {
      const schedule = upRules[rKey];
      if (schedule.finishWeek === curWeek && schedule.finishYear === curYear) {
        finishedRooms.push(rKey);
        delete nextRules[rKey];
        if (hq.studioId === s.player.id) {
          s.newsLog = [
            {
              week: curWeek,
              year: curYear,
              text: `🛠️ ${hq.name} completed the build on its new ${STUDIO_ROOMS_DETAIL[rKey]?.label || rKey} room. Modifiers active!`,
              color: s.player.logoBg
            },
            ...s.newsLog
          ];
        }
      }
    });

    const programmers = hq.staffPools.programmers || 0;
    const designers = hq.staffPools.designers || 0;
    const artists = hq.staffPools.artists || 0;
    const qa = hq.staffPools.qa || 0;
    const liveops = hq.staffPools.liveops || 0;

    const weeklyPayload =
      programmers * ROLE_WEEKLY_SALARY.programmers +
      designers * ROLE_WEEKLY_SALARY.designers +
      artists * ROLE_WEEKLY_SALARY.artists +
      qa * ROLE_WEEKLY_SALARY.qa +
      liveops * ROLE_WEEKLY_SALARY.liveops;

    if (hq.studioId === s.player.id) {
      // 0.2B limit protection
      weeklyOpexOutflowB += Math.min(0.08, weeklyPayload + 0.005); // include office rent $5M opex
    }

    return {
      ...hq,
      rooms: finishedRooms,
      upgradesFinishedWeeks: nextRules,
      salaryBandWeeklyM: +(weeklyPayload * 1000).toFixed(2)
    };
  });
  s.gamingStudios = studios;

  // C. Hardware Console R&D & manufacturing simulation
  const consoles = (s.gamingConsoles || []).map((con) => {
    let nextW = con.rdWeeksLeft;
    let nextStatus = con.status;
    let nextUnitsSold = con.unitsSold;
    let nextStock = con.stock;
    const specFactor = (con.specs.backwardCompat ? 1.1 : 1.0) * (con.specs.cloudStreaming ? 1.25 : 1.0) * (con.specs.onlineServices ? 1.15 : 1.0);

    // console R&D completion check
    if (con.status === 'rd') {
      nextW = Math.max(0, con.rdWeeksLeft - 1);
      if (nextW === 0) {
        nextStatus = 'active';
        nextStock = 2.0; // Seed initial retail channel stock 2M units
        const maker = con.studioId === s.player.id ? s.player : s.rivals.find(r => r.id === con.studioId);
        s.newsLog = [
          {
            week: curWeek,
            year: curYear,
            text: `🎮 CONSOLE UNVEILED: ${con.title} manufactured by studio ${maker?.name || 'Rivals'} launched globally at $${con.price}!`,
            color: maker?.logoBg || '#00ffff'
          },
          ...s.newsLog
        ];
      }
      if (con.studioId === s.player.id) {
        // hardware R&D weekly expense
        weeklyHardwareOutflowB += 0.02; // $20M R&D cost
      }
    } else if (con.status === 'active') {
      // Physical adoption modeling
      const exclusivityFactor = 1.0 + (con.timedExclusivesSignedMovieIds?.length || 0) * 0.15;
      const demandRatio = (600 / con.price) * specFactor * exclusivityFactor * (s.gamingTrends?.genreTrend.Adventure || 1.0);
      const weeklyUnitsToSell = Math.min(nextStock, +(0.15 * demandRatio * (0.85 + Math.random() * 0.3)).toFixed(2));

      nextUnitsSold = +(con.unitsSold + weeklyUnitsToSell).toFixed(2);
      nextStock = Math.max(0, +(con.stock - weeklyUnitsToSell).toFixed(2));

      // Console hardware retail splits
      if (con.studioId === s.player.id) {
        const hardwareRev = weeklyUnitsToSell * con.price * 0.001; // millions to billions
        weeklyInflowB += hardwareRev;

        const assemblyCost = weeklyUnitsToSell * con.manufacturingCost * 0.001;
        weeklyHardwareOutflowB += assemblyCost;

        // Auto manufacturing replenishment (rebuild stock back to 1.5M pool)
        if (nextStock < 0.5) {
          const replenishmentQty = 1.5;
          weeklyHardwareOutflowB += replenishmentQty * con.manufacturingCost * 0.001;
          nextStock += replenishmentQty;
        }

        // Online services subscription inflow
        if (con.specs.onlineServices) {
          const serviceSubsNum = con.subscriberCount || (nextUnitsSold * 0.35);
          const serviceSubRev = serviceSubsNum * 5 * 0.001; // $5/week online fee
          weeklyInflowB += serviceSubRev;
        }
      } else {
        const rStudio = s.rivals.find(r => r.id === con.studioId);
        if (rStudio) {
          const hardwareRevM = weeklyUnitsToSell * con.price;
          const assemblyCostM = weeklyUnitsToSell * con.manufacturingCost;
          rStudio.cash = (rStudio.cash || 0) + (hardwareRevM - assemblyCostM);
          if (nextStock < 0.5) {
            nextStock += 1.5;
          }
        }
      }
    }

    return {
      ...con,
      rdWeeksLeft: nextW,
      status: nextStatus,
      unitsSold: nextUnitsSold,
      stock: nextStock
    };
  });
  s.gamingConsoles = consoles;

  // D. Engine Licensing inbound royalties
  const engines = (s.gameEngines || []).map((eng) => {
    if (eng.studioId === s.player.id) {
      const activeLicensees = eng.licensees?.length || 0;
      if (activeLicensees > 0) {
        // upfront splits amortized + royalty: e.g. $1M + 5% of games under production royalties
        const weeklyPayment = activeLicensees * (eng.licenseFeeM / 52) + 0.005; // 5M per week
        weeklyEngineLicensingInflowB += weeklyPayment;
      }
    }
    return eng;
  });
  s.gameEngines = engines;

  // E. Game Projects progress & releases ticker
  const activeProjects = (s.gamingProjects || []).map((proj) => {
    let nextPhase = proj.phase;
    let nextWeeksSpent = proj.developmentWeeksSpent;
    let nextBugs = proj.bugs;
    let nextRevenueB = proj.weeklyRevenueB;
    let nextUnitsSold = proj.unitsSold;
    let nextRevHistory = [...proj.weeklyRevenueHistory];
    let nextTotalRevenueB = proj.lifetimeRevenueB;

    const studioHQ = s.gamingStudios?.find((hq) => hq.id === proj.studioId);
    const hasQALab = studioHQ?.rooms.includes('qa_lab');
    const hasDevFloor = studioHQ?.rooms.includes('dev_floor');

    if (proj.phase !== 'Gold' && proj.phase !== 'LiveOps') {
      nextWeeksSpent += 1;
      // bug accretion offset by QA team
      const baseBugs = Math.round(5 + Math.random() * 8);
      const qaCount = studioHQ?.staffPools.qa || 0;
      const screeningCapacity = qaCount * (hasQALab ? 1.5 : 1.0);
      nextBugs = Math.max(0, proj.bugs + baseBugs - Math.floor(screeningCapacity));

      // Phase transitions
      const thresholdConcept = Math.ceil(proj.developmentTotalWeeks * 0.1);
      const thresholdPre = Math.ceil(proj.developmentTotalWeeks * 0.3);
      const thresholdProd = Math.ceil(proj.developmentTotalWeeks * 0.7);

      if (nextWeeksSpent >= proj.developmentTotalWeeks) {
        nextPhase = 'Gold';
      } else if (nextWeeksSpent >= thresholdProd) {
        nextPhase = 'Beta';
      } else if (nextWeeksSpent >= thresholdPre) {
        nextPhase = 'Alpha';
      } else if (nextWeeksSpent >= thresholdConcept) {
        nextPhase = 'Pre-Production';
      }

      if (proj.studioId === s.player.id) {
        // project weekly consumption budget
        weeklyOpexOutflowB += (proj.budgetM / proj.developmentTotalWeeks) * 0.001;
      }
    }

    // Gold State: calculate reviews & first opening units sold!
    if (nextPhase === 'Gold' && proj.phase !== 'Gold') {
      // Review calculation
      const weights = GENRE_FEATURES_WEIGHTS[proj.genre] || { graphics: 0.15, gameplay: 0.3 };
      const focusGraphics = proj.featuresFocus.graphics;
      const focusGameplay = proj.featuresFocus.gameplay;
      const focusStory = proj.featuresFocus.story;
      const focusA = proj.featuresFocus.ai;
      const focusM = proj.featuresFocus.multiplayer;

      // Grade focused match
      let scoreRating = 50 + Math.random() * 15;
      scoreRating += (focusGraphics * (weights.graphics || 0.1)) * 3;
      scoreRating += (focusGameplay * (weights.gameplay || 0.1)) * 4;
      scoreRating += (focusStory * (weights.story || 0.1)) * 3;

      // bug penalty screen
      const bugPenalty = Math.min(35, proj.bugs * 0.4);
      scoreRating = Math.max(10, Math.min(100, Math.round(scoreRating - bugPenalty)));

      // Synergy calculations: check if game adapted from player movie
      let adaptationBonusMultiplier = 1.0;
      if (proj.adaptationMovieId) {
        const mv = s.movies.find((m) => m.id === proj.adaptationMovieId);
        if (mv) {
          adaptationBonusMultiplier = 1.35; // +35% marketing synergy boost
          s.newsLog = [
            {
              week: curWeek,
              year: curYear,
              text: `🎬 MEDIA SYNERGY: Game '${proj.title}' adapted from movie blockbuster '${mv.title}' receives a massive +35% sales and review rating surge!`,
              color: s.player.logoBg
            },
            ...s.newsLog
          ];
        }
      }

      const finalRating = Math.max(25, Math.round(scoreRating * (adaptationBonusMultiplier > 1.0 ? 1.08 : 1.0)));
      proj.criticScore = finalRating;
      proj.userScore = Math.max(15, Math.min(100, finalRating + randInt(-8, 12)));

      // Evaluate initial units sold
      const trendMult = s.gamingTrends?.genreTrend[proj.genre] || 1.05;
      const baseMarketVolume = 3.5;
      const openingSales = (finalRating / 80) * trendMult * baseMarketVolume * adaptationBonusMultiplier * (1.0 + proj.marketingBudgetM * 0.05);
      const weeklyOpeningInB = openingSales * (proj.monetizationModel === 'Premium' ? 0.06 : 0.012); // $60 premium box price split or monetization anchor

      nextPhase = proj.monetizationModel === 'Premium' ? 'Gold' : 'LiveOps';
      nextUnitsSold = +openingSales.toFixed(2);
      nextRevenueB = +weeklyOpeningInB.toFixed(4);
      nextTotalRevenueB += nextRevenueB;
      nextRevHistory.push(nextRevenueB);

      if (proj.studioId === s.player.id) {
        weeklyInflowB += nextRevenueB;
        // Broadcast news release alert
        s.newsLog = [
          {
            week: curWeek,
            year: curYear,
            text: `🚀 GAME RELEASE: '${proj.title}' [${proj.genre}] scores ${finalRating}% Critique Rating! Opening sales hit ${openingSales.toFixed(1)}M unit copies!`,
            color: s.player.logoBg
          },
          ...s.newsLog
        ];
      } else {
        const rivalStudioInfo = s.rivals.find(r => r.id === proj.studioId);
        if (rivalStudioInfo) {
          rivalStudioInfo.cash = (rivalStudioInfo.cash || 0) + (weeklyOpeningInB * 1000); // convert B to M
          s.newsLog = [
            {
              week: curWeek,
              year: curYear,
              text: `🚀 COMPETITOR DEBUT: '${rivalStudioInfo.name}' released '${proj.title}' [${proj.genre}] scoring ${finalRating}% Critique Rating! Opening sales hit ${openingSales.toFixed(1)}M unit copies!`,
              color: rivalStudioInfo.logoBg || '#E84545'
            },
            ...s.newsLog
          ];
        }
      }
    } else if (proj.phase === 'Gold' || proj.phase === 'LiveOps') {
      // Post-launch decay mechanics
      const weeksActive = nextRevHistory.length;
      if (proj.monetizationModel === 'Premium' && weeksActive < 20) {
        // standard sales decay curve
        const scaleFactor = Math.pow(0.72, weeksActive);
        const physicalSale = (proj.criticScore / 90) * scaleFactor * 0.4;
        const currentSalesInB = physicalSale * 0.06;
        nextRevenueB = +currentSalesInB.toFixed(5);
        nextUnitsSold = +(proj.unitsSold + physicalSale).toFixed(2);
        nextTotalRevenueB += nextRevenueB;
        nextRevHistory.push(nextRevenueB);

        if (proj.studioId === s.player.id) {
          weeklyInflowB += nextRevenueB;
        } else {
          const rivalStudioInfo = s.rivals.find(r => r.id === proj.studioId);
          if (rivalStudioInfo) {
            rivalStudioInfo.cash = (rivalStudioInfo.cash || 0) + (nextRevenueB * 1000);
          }
        }
      } else if (proj.monetizationModel !== 'Premium') {
        const scaleFactor = Math.max(0.2, Math.pow(0.92, weeksActive));
        const liveopsBonus = proj.liveopsActive ? 1.4 : 1.0;
        const baseRecurringRevenue = (proj.criticScore / 100) * 0.008 * liveopsBonus * scaleFactor;
        nextRevenueB = +baseRecurringRevenue.toFixed(5);
        nextTotalRevenueB += nextRevenueB;
        nextRevHistory.push(nextRevenueB);

        if (proj.studioId === s.player.id) {
          weeklyInflowB += nextRevenueB;
          if (proj.liveopsActive) {
            weeklyOpexOutflowB += 0.001; // LiveOps maintenance server cost ($1M)
          }
        } else {
          const rivalStudioInfo = s.rivals.find(r => r.id === proj.studioId);
          if (rivalStudioInfo) {
            rivalStudioInfo.cash = (rivalStudioInfo.cash || 0) + (nextRevenueB * 1000);
          }
        }
      }
    }

    return {
      ...proj,
      phase: nextPhase,
      developmentWeeksSpent: nextWeeksSpent,
      bugs: nextBugs,
      unitsSold: nextUnitsSold,
      weeklyRevenueB: nextRevenueB,
      weeklyRevenueHistory: nextRevHistory,
      lifetimeRevenueB: +nextTotalRevenueB.toFixed(4)
    };
  });
  s.gamingProjects = activeProjects;

  // F. Subscription Ecosystem: Game Pass updates
  const passes = (s.gamingPasses || []).map((pass) => {
    if (pass.studioId === s.player.id) {
      const activeTitlesCount = s.gamingProjects?.filter((p) => p.studioId === s.player.id && (p.phase === 'Gold' || p.phase === 'LiveOps')).length || 0;
      const passAttractiveness = (activeTitlesCount * 0.15) + (pass.standardPrice < 15 ? 1.2 : 0.8);
      const netSubscribersGrowth = (passAttractiveness - 1.0) * 0.04; // millions subscribers swing
      const nextSubs = Math.max(0.1, +(pass.subscriberCount + netSubscribersGrowth).toFixed(3));
      const weeklyRevenue = nextSubs * pass.standardPrice * 0.25 * 0.001; // quarterly sub week amortization factor

      weeklyInflowB += weeklyRevenue;

      return {
        ...pass,
        subscriberCount: nextSubs,
        monthlyRevenueB: +(weeklyRevenue * 4).toFixed(4)
      };
    }
    return pass;
  });
  s.gamingPasses = passes;

  // G. Cross-Division IP adaptation: Trigger spontaneous rival game adaptions
  if (s.week % 12 === 0 && Math.random() < 0.35) {
    const popularMovie = s.movies?.find((m) => m.studioId !== s.player.id && m.boxOffice > 400);
    if (popularMovie && s.gamingProjects && s.gamingProjects.length < 15) {
      const rId = popularMovie.studioId;
      const gameTitle = `${popularMovie.title}: Cyber Realm`;
      const rpgProject: GamingProject = {
        id: uid('gproj_'),
        title: gameTitle,
        genre: 'RPG',
        engineId: s.gameEngines?.[0]?.id || 'engine_default',
        studioId: rId,
        phase: 'Concept',
        developmentWeeksSpent: 0,
        developmentTotalWeeks: 12,
        featuresFocus: { graphics: 20, gameplay: 25, story: 25, multiplayer: 10, ai: 10, ui: 5, performance: 5 },
        bugs: 12,
        qualityScore: 65,
        criticScore: 0,
        userScore: 0,
        monetizationModel: 'GaaS',
        budgetM: 30,
        marketingBudgetM: 10,
        unitsSold: 0,
        lifetimeRevenueB: 0,
        weeklyRevenueB: 0,
        weeklyRevenueHistory: [],
        adaptationMovieId: popularMovie.id
      };
      s.gamingProjects = [...s.gamingProjects, rpgProject];
    }
  }

  // H. Annual Gaming Expo awards week 42
  if (s.week === 42) {
    const goldGames = s.gamingProjects?.filter((p) => p.phase === 'Gold' || p.phase === 'LiveOps');
    if (goldGames && goldGames.length > 0) {
      // sort by ratings to declare Golden Game of Year
      const sorted = [...goldGames].sort((a, b) => b.criticScore - a.criticScore);
      const goty = sorted[0];
      const isPlayerWinner = goty.studioId === s.player.id;

      if (isPlayerWinner) {
        s.player = {
          ...s.player,
          awards: s.player.awards + 1,
          cash: s.player.cash + 0.15 // $150M prize
        };
        s.newsLog = [
          {
            week: 42,
            year: curYear,
            text: `🏆 GOTY AWARD WINNER: '${goty.title}' developed by ${s.player.name} won Game of the Year at the Hollywood Gaming Awards! Premium $150M prize claimable!`,
            color: '#FFD700'
          },
          ...s.newsLog
        ];
      } else {
        const rStudio = s.rivals.find((r) => r.id === goty.studioId);
        if (rStudio) {
          rStudio.awards += 1;
          rStudio.cash += 150;
        }
        s.newsLog = [
          {
            week: 42,
            year: curYear,
            text: `🏆 goty: '${goty.title}' produced by rival studio ${rStudio?.name || 'Rivals'} took home Ultimate Game of the Year award.`,
            color: T_yellow_accent
          },
          ...s.newsLog
        ];
      }
    }
  }

  // Update cumulative cash balance of the player
  const playerState = s.player;
  const rawProfitB = weeklyInflowB - (weeklyOpexOutflowB + weeklyHardwareOutflowB);
  const nextCash = Math.max(0, playerState.cash + rawProfitB);

  s.player = {
    ...playerState,
    cash: +nextCash.toFixed(4)
  };

  // Wire gaming inflows & outflows into the WeeklyLedger
  if (s.weeklyLedger) {
    s.weeklyLedger = {
      ...s.weeklyLedger,
      gameSalesInB: weeklyInflowB * 0.75, // direct software
      gamePassSubsInB: weeklyInflowB * 0.2, // subscription shares
      gameEngineLicensingInB: weeklyEngineLicensingInflowB,
      gamingHardwareOpexB: weeklyHardwareOutflowB,
      gamingStudioOpexB: weeklyOpexOutflowB
    };
  }

  // Also apply same updates to pendingRecap if currently simulation mode
  if (s.pendingRecap) {
    const inf = s.pendingRecap.inflows;
    const outf = s.pendingRecap.outflows;

    s.pendingRecap = {
      ...s.pendingRecap,
      inflows: {
        ...inf,
        gameSalesInB: (inf.gameSalesInB || 0) + weeklyInflowB * 0.75,
        gamePassSubsInB: (inf.gamePassSubsInB || 0) + weeklyInflowB * 0.2,
        gameEngineLicensingInB: (inf.gameEngineLicensingInB || 0) + weeklyEngineLicensingInflowB
      },
      outflows: {
        ...outf,
        gamingHardwareOpexB: ((outf as any).gamingHardwareOpexB || 0) + weeklyHardwareOutflowB,
        gamingStudioOpexB: ((outf as any).gamingStudioOpexB || 0) + weeklyOpexOutflowB
      } as any
    };
  }

  return s;
}

// Random utility helper
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const T_yellow_accent = '#FFD700';

// ACTIONS: Engine creation Upfront
export function createEngineAction(state: GameState, args: { name: string; modules: GameEngineModule[]; generation: number }): { state: GameState; error?: string } {
  const s = { ...state };
  const costIndex = args.generation - 1;
  const genSpec = ENGINE_GENERATIONS[costIndex] || ENGINE_GENERATIONS[0];
  const upfrontFeeM = genSpec.costM;

  if (s.player.cash < upfrontFeeM * 0.001) {
    return { state, error: `Inadequate liquid funds! Upfront engine licensing R&D costs ${upfrontFeeM}M ($${(upfrontFeeM * 0.001).toFixed(3)}B).` };
  }

  let renderQuality = 35 + args.generation * 8;
  let performance = 45 + args.generation * 7;
  let networkStability = 25 + (args.modules.includes('Networking') ? 35 : 10);
  let toolingEfficiency = 30 + (args.modules.includes('Tools') ? 35 : 12);

  const newEngine: GameEngine = {
    id: uid('geng_'),
    name: args.name,
    studioId: s.player.id,
    generation: args.generation,
    modules: args.modules,
    renderQuality,
    performance,
    networkStability,
    toolingEfficiency,
    licensingValue: Math.round((renderQuality + performance + networkStability) / 3),
    licenseFeeM: +(args.generation * 2.5).toFixed(1),
    royaltyPercent: 4,
    contractDurationYears: 3,
    isVRAble: args.modules.includes('VR'),
    isCloudNative: args.modules.includes('Cloud'),
    licensees: []
  };

  const updatedPlayer = { ...s.player, cash: +(s.player.cash - upfrontFeeM * 0.001).toFixed(4) };
  s.gameEngines = [newEngine, ...(s.gameEngines || [])];
  s.player = updatedPlayer;

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🛠️ ${s.player.name} deployed the new '${args.name}' game engine with Gen ${args.generation} modules. Ready for studio pipelines!`,
      color: s.player.logoBg
    },
    ...s.newsLog
  ];

  return { state: s };
}

// ACTIONS: HQ and Staff bulk recruitment
export function foundStudioAction(state: GameState, args: { name: string; type: GamingStudioType }): { state: GameState; error?: string } {
  const s = { ...state };
  const upfrontCostM = args.type === 'AAA' ? 60 : args.type === 'Mid-Tier' ? 25 : 8;

  if (s.player.cash < upfrontCostM * 0.001) {
    return { state, error: `Deficit cash barrier. Building a ${args.type} gaming HQ requires $${(upfrontCostM * 0.001).toFixed(3)}B in opex budget.` };
  }

  const initialStaff = args.type === 'AAA' ? { programmers: 15, designers: 10, artists: 10, qa: 5, liveops: 0 }
                       : args.type === 'Mid-Tier' ? { programmers: 8, designers: 5, artists: 5, qa: 2, liveops: 0 }
                       : { programmers: 3, designers: 2, artists: 1, qa: 0, liveops: 0 };

  const newStudio: GamingStudioHQ = {
    id: uid('ghq_'),
    name: args.name,
    studioId: s.player.id,
    type: args.type,
    rooms: ['dev_floor'],
    staffPools: initialStaff,
    salaryBandWeeklyM: 0.04 * (args.type === 'AAA' ? 3 : 1),
    automated: false,
    upgradesFinishedWeeks: {}
  };

  const updatedPlayer = { ...s.player, cash: +(s.player.cash - upfrontCostM * 0.001).toFixed(4) };
  s.gamingStudios = [...(s.gamingStudios || []), newStudio];
  s.player = updatedPlayer;

  return { state: s };
}

// ACTIONS: Start Game Pipeline
export function startProjectAction(state: GameState, args: {
  title: string;
  genre: 'RPG' | 'Action' | 'Shooter' | 'Strategy' | 'Simulation' | 'Sports' | 'Adventure' | 'MMO';
  engineId: string;
  studioId: string;
  monetizationModel: 'Premium' | 'GaaS' | 'F2P' | 'Subscription' | 'AdSupported';
  featuresFocus: { graphics: number; gameplay: number; story: number; multiplayer: number; ai: number; ui: number; performance: number };
  budgetM: number;
  marketingBudgetM: number;
  adaptationMovieId?: string;
  isVRExclusivity?: boolean;
  subgenre?: string;
}): { state: GameState; error?: string } {
  const s = { ...state };

  if (s.player.cash < (args.budgetM + args.marketingBudgetM) * 0.001) {
    return { state, error: `Inadequate launch funds. Launching pipeline requires $${((args.budgetM + args.marketingBudgetM) * 0.001).toFixed(3)}B.` };
  }

  const newProject: GamingProject = {
    id: uid('gproj_'),
    title: args.title,
    genre: args.genre,
    subgenre: args.subgenre,
    engineId: args.engineId,
    studioId: args.studioId,
    phase: 'Concept',
    developmentWeeksSpent: 0,
    developmentTotalWeeks: args.monetizationModel === 'Premium' ? 12 : 24, // Standard design duration scale based on monetization
    featuresFocus: args.featuresFocus,
    bugs: randInt(10, 40),
    qualityScore: 60,
    criticScore: 0,
    userScore: 0,
    monetizationModel: args.monetizationModel,
    budgetM: args.budgetM,
    marketingBudgetM: args.marketingBudgetM,
    unitsSold: 0,
    lifetimeRevenueB: 0,
    weeklyRevenueB: 0,
    weeklyRevenueHistory: [],
    adaptationMovieId: args.adaptationMovieId,
    isVRExclusivity: args.isVRExclusivity
  };

  const updatedPlayer = { ...s.player, cash: +(s.player.cash - (args.budgetM + args.marketingBudgetM) * 0.001).toFixed(4) };
  s.gamingProjects = [...(s.gamingProjects || []), newProject];
  s.player = updatedPlayer;

  return { state: s };
}

// ACTIONS: Console hardware creator
export function designConsoleAction(state: GameState, args: {
  title: string;
  specs: GamingConsole['specs'];
  price: number;
  manufacturingCost: number;
}): { state: GameState; error?: string } {
  const s = { ...state };
  const upfrontRdM = 120; // $120M hardware lab opex

  if (s.player.cash < upfrontRdM * 0.001) {
    return { state, error: `Inadequate funds to bootstrap console lab! Requires $${(upfrontRdM * 0.001).toFixed(3)}B.` };
  }

  const newConsole: GamingConsole = {
    id: uid('gcon_'),
    title: args.title,
    studioId: s.player.id,
    generation: specsToGen(args.specs),
    specs: args.specs,
    rdWeeksLeft: 8, // 8 weeks till consumer launch
    rdTotalWeeks: 8,
    price: args.price,
    manufacturingCost: args.manufacturingCost,
    unitsSold: 0,
    marketShare: 0,
    stock: 0,
    subscriberCount: 0,
    status: 'rd',
    timedExclusivesSignedMovieIds: []
  };

  const updatedPlayer = { ...s.player, cash: +(s.player.cash - upfrontRdM * 0.001).toFixed(4) };
  s.gamingConsoles = [...(s.gamingConsoles || []), newConsole];
  s.player = updatedPlayer;

  return { state: s };
}

function specsToGen(specs: GamingConsole['specs']): number {
  if (specs.cpu === 'Quantum Hybrid') return 6;
  if (specs.cpu === 'Custom Cloud Architecture') return 5;
  if (specs.gpu === 'Hardware Ray-Tracing') return 4;
  if (specs.gpu === 'Voxel-Shaded') return 3;
  return 2;
}

// ACTIONS: Upgrade HQ room suite
export function buildHQRoomAction(state: GameState, studioHQId: string, roomKey: string): { state: GameState; error?: string } {
  const s = { ...state };
  const roomSpec = STUDIO_ROOMS_DETAIL[roomKey];
  if (!roomSpec) return { state, error: 'Unknown room archetype.' };

  const studioHQ = s.gamingStudios?.find((hq) => hq.id === studioHQId);
  if (!studioHQ) return { state, error: 'HQ not found.' };

  if (studioHQ.rooms.includes(roomKey) || studioHQ.upgradesFinishedWeeks?.[roomKey]) {
    return { state, error: 'Room already active or undergoing construction.' };
  }

  if (s.player.cash < roomSpec.bCostM * 0.001) {
    return { state, error: `Insufficient cash to build. Build opex costs $${(roomSpec.bCostM * 0.001).toFixed(3)}B.` };
  }

  // standard 2 weeks builders process
  const finishWeek = s.week + 2 > 48 ? (s.week + 2) - 48 : s.week + 2;
  const finishYear = s.week + 2 > 48 ? s.year + 1 : s.year;

  const nextUpgrades = { ...studioHQ.upgradesFinishedWeeks };
  nextUpgrades[roomKey] = { finishWeek, finishYear };

  const updatedStudios = s.gamingStudios?.map((hq) => {
    if (hq.id === studioHQId) {
      return { ...hq, upgradesFinishedWeeks: nextUpgrades };
    }
    return hq;
  });

  const updatedPlayer = { ...s.player, cash: +(s.player.cash - roomSpec.bCostM * 0.001).toFixed(4) };
  s.gamingStudios = updatedStudios;
  s.player = updatedPlayer;

  return { state: s };
}

// ACTIONS: Bulk recruit hire and layoff staff
export function recruitGamingStaffAction(state: GameState, studioHQId: string, role: string, qtyToAdd: number): { state: GameState; error?: string } {
  const s = { ...state };
  const hq = s.gamingStudios?.find((h) => h.id === studioHQId);
  if (!hq) return { state, error: 'HQ Not Found' };

  const nextStaff = { ...hq.staffPools };
  const targetKey = role as keyof typeof nextStaff;
  const currentQty = nextStaff[targetKey] || 0;
  
  if (currentQty + qtyToAdd < 0) {
    return { state, error: 'Cannot discharge more units than recruited.' };
  }

  nextStaff[targetKey] = currentQty + qtyToAdd;

  const updatedStudios = s.gamingStudios?.map((h) => {
    if (h.id === studioHQId) {
      return { ...h, staffPools: nextStaff };
    }
    return h;
  });

  s.gamingStudios = updatedStudios;
  return { state: s };
}

export function configurePassAction(
  state: GameState,
  price: number,
  name: string,
  basicPrice?: number,
  premiumPrice?: number,
  adSupported?: boolean,
  enabledConsoleIds?: string[],
  catalogProjectIds?: string[]
): { state: GameState; error?: string } {
  const s = { ...state };
  const pass = s.gamingPasses?.find((p) => p.studioId === s.player.id);
  if (!pass) return { state, error: 'Gaming Pass Subscription not active.' };

  const updatedPasses = s.gamingPasses?.map((p) => {
    if (p.id === pass.id) {
      return {
        ...p,
        standardPrice: price,
        name,
        basicPrice: basicPrice !== undefined ? basicPrice : p.basicPrice,
        premiumPrice: premiumPrice !== undefined ? premiumPrice : p.premiumPrice,
        adSupported: adSupported !== undefined ? adSupported : p.adSupported,
        enabledConsoleIds: enabledConsoleIds !== undefined ? enabledConsoleIds : p.enabledConsoleIds,
        catalogProjectIds: catalogProjectIds !== undefined ? catalogProjectIds : p.catalogProjectIds
      };
    }
    return p;
  });

  s.gamingPasses = updatedPasses;
  return { state: s };
}

// Cross division adaptation: Build movie project from successful game title!
export function createMovieFromGameAction(state: GameState, gameProjectId: string, movieTitle: string, userPlot: string, type: any): { state: GameState; error?: string } {
  const s = { ...state };
  const game = s.gamingProjects?.find((p) => p.id === gameProjectId);
  if (!game) return { state, error: 'Source game not found.' };

  // Setup adaptation reference properties to unlock direct adaptation during movie building
  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🎬 DEVELOPMENT BLUEPRINT: ${s.player.name} signed exclusive cinema adaptation rights for hit game '${game.title}'!`,
      color: s.player.logoBg
    },
    ...s.newsLog
  ];

  return { state: s };
}

// -------------------------------------------------------------
// V44 — Customize Gaming Division Expansion Core Actions
// -------------------------------------------------------------

export function renameGamingStudioHQAction(state: GameState, studioHQId: string, newName: string): { state: GameState; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) return { state, error: 'Name cannot be blank.' };
  const s = { ...state };
  s.gamingStudios = (s.gamingStudios || []).map(h => h.id === studioHQId ? { ...h, name: trimmed } : h);
  return { state: s };
}

export function deleteGamingStudioHQAction(state: GameState, studioHQId: string): { state: GameState; error?: string } {
  const s = { ...state };
  const hq = (s.gamingStudios || []).find(h => h.id === studioHQId);
  if (!hq) return { state, error: 'Studio HQ not found.' };
  if (hq.studioId !== s.player.id) return { state, error: 'Studio not owned by you.' };

  const activeProjs = (s.gamingProjects || []).filter(p => p.studioId === hq.id && p.phase !== 'Gold' && p.phase !== 'LiveOps');
  if (activeProjs.length > 0) {
    return { state, error: `Cannot disband HQ while projects are actively being developed here: ${activeProjs.map(p => p.title).join(', ')}` };
  }

  const baseCost = hq.type === 'AAA' ? 60 : hq.type === 'Mid-Tier' ? 25 : 8;
  const salvageB = +(baseCost * 0.25).toFixed(3);
  s.player = { ...s.player, cash: +(s.player.cash + salvageB).toFixed(4) };

  // Filter out the studio
  s.gamingStudios = (s.gamingStudios || []).filter(h => h.id !== studioHQId);
  // Safely sweep associated inactive project pipelines
  s.gamingProjects = (s.gamingProjects || []).filter(p => p.studioId !== hq.id || p.phase === 'Gold' || p.phase === 'LiveOps');

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🏢 DISBANDED HQ: '${hq.name}' [${hq.type}] has been shut down. Staff discharged and $${(salvageB * 1000).toFixed(0)}M opex salvaged!`,
      color: 'red'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function renameGameEngineAction(state: GameState, engineId: string, newName: string): { state: GameState; error?: string } {
  const trimmed = newName.trim();
  if (!trimmed) return { state, error: 'Name cannot be blank.' };
  const s = { ...state };
  s.gameEngines = (s.gameEngines || []).map(e => e.id === engineId ? { ...e, name: trimmed } : e);
  return { state: s };
}

export function deleteGameEngineAction(state: GameState, engineId: string): { state: GameState; error?: string } {
  const s = { ...state };
  const eng = (s.gameEngines || []).find(e => e.id === engineId);
  if (!eng) return { state, error: 'Game Engine not found.' };
  if (eng.studioId !== s.player.id) return { state, error: 'Engine not owned by you.' };

  const activeProjs = (s.gamingProjects || []).filter(p => p.engineId === engineId && p.phase !== 'Gold' && p.phase !== 'LiveOps');
  if (activeProjs.length > 0) {
    return { state, error: `Engine is currently powering active development pipelines: ${activeProjs.map(p => p.title).join(', ')}. Blocked!` };
  }

  s.gameEngines = (s.gameEngines || []).filter(e => e.id !== engineId);
  
  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🛠️ RETIRED ENGINE: '${eng.name}' has been deprecated and removed from active engine registries.`,
      color: 'red'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function renameGamingConsoleAction(state: GameState, consoleId: string, newTitle: string): { state: GameState; error?: string } {
  const trimmed = newTitle.trim();
  if (!trimmed) return { state, error: 'Title cannot be blank.' };
  const s = { ...state };
  s.gamingConsoles = (s.gamingConsoles || []).map(c => c.id === consoleId ? { ...c, title: trimmed } : c);
  return { state: s };
}

export function deleteGamingConsoleAction(state: GameState, consoleId: string): { state: GameState; error?: string } {
  const s = { ...state };
  const con = (s.gamingConsoles || []).find(c => c.id === consoleId);
  if (!con) return { state, error: 'Console hardware not found.' };
  if (con.studioId !== s.player.id) return { state, error: 'Hardware not owned by you.' };

  s.gamingConsoles = (s.gamingConsoles || []).filter(c => c.id !== consoleId);
  s.gamingPasses = (s.gamingPasses || []).map(p => ({
    ...p,
    enabledConsoleIds: p.enabledConsoleIds?.filter(id => id !== consoleId)
  }));

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🎮 HARDWARE RETIRED: ${con.title} has been discontinued. All active store pages suspended.`,
      color: 'red'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function researchNextGenAction(state: GameState): { state: GameState; error?: string } {
  const s = { ...state };
  const currentGen = s.player.unlockedGameGen || 1;
  if (currentGen >= 6) {
    return { state, error: 'You have researched the peak Generation 6 Cloud-Native technology!' };
  }
  const nextGen = currentGen + 1;
  const costsB = nextGen === 2 ? 0.015 : nextGen === 3 ? 0.035 : nextGen === 4 ? 0.085 : nextGen === 5 ? 0.185 : 0.400;

  if (s.player.cash < costsB) {
    return { state, error: `Inadequate opex reserves for progressive computing R&D. Leveling up to Gen ${nextGen} requires $${(costsB * 1000).toFixed(0)}M cash.` };
  }

  s.player = {
    ...s.player,
    cash: +(s.player.cash - costsB).toFixed(4),
    unlockedGameGen: nextGen
  };

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🔬 TECH UNLOCKED: Progressive research lab successfully cracked Game Hardware Generation ${nextGen}! New engine modules and specs available!`,
      color: '#FFD700'
    },
    ...s.newsLog
  ];

  return { state: s };
}
