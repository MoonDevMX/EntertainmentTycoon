import { GameState, GameEngine, GamingStudioHQ, GamingProject, GamingConsole, GamingPass, GamingTrends, GameEngineModule, GamingStudioType, GamingProjectPhase, GamingPublishingDeal, GamingPassTier, VideoStore, VideoClubDeal } from './types';

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

export const GAMING_WELFARE_SPECS = {
  basic: { label: 'Basic Welfare', opexMult: 0.9, staffSpeed: 0.95, bugMult: 1.15, qualityBonus: -3 },
  standard: { label: 'Standard Benefits', opexMult: 1.0, staffSpeed: 1.0, bugMult: 1.0, qualityBonus: 0 },
  luxurious: { label: 'Silicon Valley Perks', opexMult: 1.25, staffSpeed: 1.12, bugMult: 0.82, qualityBonus: 6 },
};

export const GAMING_CRUNCH_SPECS = {
  none: { label: 'Zero Crunch', opexMult: 0.9, staffSpeed: 0.9, bugMult: 0.72, qualityBonus: 4 },
  balanced: { label: 'Balanced Workload', opexMult: 1.0, staffSpeed: 1.0, bugMult: 1.0, qualityBonus: 0 },
  crunch: { label: 'Dev Crunch Mode 🔥', opexMult: 1.15, staffSpeed: 1.25, bugMult: 1.38, qualityBonus: -6 },
};

export const STUDIO_PERK_SPECS = {
  freeSnacks: { label: 'Free Organic Bistro', installCost: 1, weeklyOpex: 0.003, speedBonus: 1.03, bugMult: 0.97, icon: 'food-apple' },
  ergoChairs: { label: 'Ergonomic Herman Miller Setup', installCost: 5, weeklyOpex: 0.001, speedBonus: 1.05, bugMult: 0.93, icon: 'seat-legroom-extra' },
  gym: { label: 'HQ Fitness Gym & Spa', installCost: 12, weeklyOpex: 0.008, speedBonus: 1.10, bugMult: 0.85, icon: 'dumbbell' },
};

export const GAMING_PASS_PRICE_SPECS = {
  value: { label: 'Value Subscription ($6.99)', basic: 4.99, standard: 6.99, premium: 9.99, weeklyOpex: 0.001, attractMult: 1.4 },
  balanced: { label: 'Balanced Subscription ($11.99)', basic: 8.99, standard: 11.99, premium: 14.99, weeklyOpex: 0.003, attractMult: 1.0 },
  premium: { label: 'Premium Subscription ($18.99)', basic: 13.99, standard: 18.99, premium: 24.99, weeklyOpex: 0.007, attractMult: 0.7 },
};

export const GAMING_PASS_SCOPE_SPECS = {
  indie_only: { label: 'Indie & Retro Vault Only', weeklyOpexMult: 0.5, attractMult: 0.8 },
  mixed_catalog: { label: 'Balanced Catalog', weeklyOpexMult: 1.0, attractMult: 1.0 },
  day_one_aaa: { label: 'Day-One Blockbusters', weeklyOpexMult: 2.2, attractMult: 1.6 },
};

export const GAMING_PASS_AD_SPECS = {
  none: { label: 'Ad-Free Pure Content', weeklyOpexMult: 1.1, attractMult: 1.15, adRevenuePerSubYear: 0 },
  lite_sponsored: { label: 'Lite Sponsored Ads', weeklyOpexMult: 1.0, attractMult: 1.0, adRevenuePerSubYear: 1.80 },
  ad_heavy: { label: 'Commercial Ad Network', weeklyOpexMult: 0.8, attractMult: 0.75, adRevenuePerSubYear: 4.50 },
};

// Initialize default gaming fields if missing
export function seedGamingFields(s: GameState): GameState {
  if (s.gameEngines && s.gamingStudios && s.gamingProjects && s.gamingConsoles && s.gamingPasses && s.gamingTrends && s.gamingPublishers && s.gamingPublishingDeals) {
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

  // 2. Initial Studio HQs (Seed at least 20 Studios!)
  if (!state.gamingStudios) {
    const listHQ: GamingStudioHQ[] = [
      {
        id: uid('ghq_'),
        name: `${state.player.name} Systems`,
        studioId: state.player.id,
        type: 'AAA',
        rooms: ['dev_floor'],
        staffPools: { programmers: 30, designers: 20, artists: 20, qa: 10, liveops: 5 },
        salaryBandWeeklyM: 0.15,
        automated: false,
        upgradesFinishedWeeks: {},
        crunchPolicy: 'balanced',
        welfareLevel: 'standard'
      }
    ];

    // Predefined professional, distinctive names for additional studios
    const STUDIO_NAMES = [
      "Skyline Studios", "Pixel Spark Games", "Titan Forge Games", "Ember Entertainment", "Rogue Byte Studios",
      "Blue Horizon Games", "Frostbite Interactive", "Neon City Devs", "Redwood Digital", "Vortex Interactive",
      "Starlight Labs", "Apex Command", "Infinite Worlds", "Ironclad Devs", "Golden Gate Games", "Aero Interactive",
      "Silverline Games", "Nexus Game Labs", "Giga Gaming", "Zero Day Studios", "Retro Spark Digital", "Cyberpunk Syndicate"
    ];

    const types: GamingStudioType[] = ['AAA', 'Mid-Tier', 'Indie', 'Esports', 'Mobile', 'LiveOps', 'VR'];

    STUDIO_NAMES.forEach((name, i) => {
      // Rotate ownership: Player owns 2 extra studios, Rivals own some, Independent NPCs own the rest
      let ownerId = 'independent';
      if (i < 2) {
        ownerId = state.player.id;
      } else if (i < 10) {
        const rIndex = (i - 2) % (state.rivals.length || 3);
        ownerId = state.rivals[rIndex]?.id || 'rival_random';
      } else {
        ownerId = 'independent';
      }

      listHQ.push({
        id: uid('ghq_'),
        name: name,
        studioId: ownerId,
        type: types[i % types.length],
        rooms: ['dev_floor'],
        staffPools: {
          programmers: 10 + (i % 5) * 5,
          designers: 8 + (i % 4) * 4,
          artists: 8 + (i % 4) * 4,
          qa: 3 + (i % 3) * 2,
          liveops: i % 2 === 0 ? 5 : 0
        },
        salaryBandWeeklyM: 0.05 + (i % 5) * 0.02,
        automated: ownerId !== state.player.id,
        upgradesFinishedWeeks: {},
        crunchPolicy: 'balanced',
        welfareLevel: 'standard'
      });
    });

    state.gamingStudios = listHQ;
  }

  // 3. Initial Projects index
  if (!state.gamingProjects) {
    state.gamingProjects = [];
  }

  // 4. Initial Hardware Consoles: Seed at least 5 Console Makers!
  if (!state.gamingConsoles) {
    const listConsoles: GamingConsole[] = [
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
        unitsSold: 12.4,
        marketShare: 0.20,
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
        marketShare: 0.25,
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
        marketShare: 0.15,
        stock: 0.4,
        subscriberCount: 1.2,
        status: 'active',
        timedExclusivesSignedMovieIds: []
      },
      {
        id: uid('gcon_'),
        title: 'Nebula StreamBox',
        studioId: state.rivals[3]?.id || 'rival_04',
        generation: 5,
        specs: {
          cpu: 'Custom Cloud Architecture',
          gpu: 'Hardware Ray-Tracing',
          ram: 'Unified High Bandwidth',
          storage: 'Direct Streaming',
          backwardCompat: true,
          cloudStreaming: true,
          onlineServices: true
        },
        rdWeeksLeft: 0,
        rdTotalWeeks: 0,
        price: 299,
        manufacturingCost: 210,
        unitsSold: 2.5,
        marketShare: 0.18,
        stock: 0.6,
        subscriberCount: 0.8,
        status: 'active',
        timedExclusivesSignedMovieIds: []
      },
      {
        id: uid('gcon_'),
        title: 'Quantum Switch',
        studioId: state.player.id,
        generation: 4,
        specs: {
          cpu: 'Multi-Core',
          gpu: 'Voxel-Shaded',
          ram: 'GBs',
          storage: 'SSD',
          backwardCompat: true,
          cloudStreaming: false,
          onlineServices: true
        },
        rdWeeksLeft: 0,
        rdTotalWeeks: 0,
        price: 299,
        manufacturingCost: 200,
        unitsSold: 4.1,
        marketShare: 0.22,
        stock: 0.7,
        subscriberCount: 1.5,
        status: 'active',
        timedExclusivesSignedMovieIds: []
      }
    ];

    state.gamingConsoles = listConsoles.filter(c => {
      const genYear = c.generation === 2 ? 1976 : c.generation === 3 ? 1983 : c.generation === 4 ? 1990 : c.generation === 5 ? 1995 : c.generation >= 6 ? 2005 : 1976;
      return state.year >= genYear;
    });
  }

  // 5. Initial Game Pass with fully customizable 5 tiers!
  if (!state.gamingPasses) {
    const createCustomTiers = (namePrefix: string) => [
      { id: uid('gpt_'), name: 'Mobile Play', price: 4.99, subscriberCount: 0.5, adSupported: true, perks: ['Mobile Play', 'Casual Vault', 'SD Streaming'], churnRate: 6, monthlyRevenueB: 0.0001 },
      { id: uid('gpt_'), name: 'Console Core', price: 9.99, subscriberCount: 1.2, adSupported: false, perks: ['HD Playback', 'Cloud Saves', '2 Consoles Linked'], churnRate: 4, monthlyRevenueB: 0.0003 },
      { id: uid('gpt_'), name: 'Ultimate Access', price: 14.99, subscriberCount: 2.1, adSupported: false, perks: ['UHD Playback', 'Day One Indies', 'Cloud Streaming', 'PC/Console Link'], churnRate: 3, monthlyRevenueB: 0.0006 },
      { id: uid('gpt_'), name: 'Day-One Blockbuster', price: 19.99, subscriberCount: 0.8, adSupported: false, perks: ['Day-Day AAA Access', 'DLC Vault Unlocked', 'Special Betas', 'Free Monthly Loot'], churnRate: 2, monthlyRevenueB: 0.0004 },
      { id: uid('gpt_'), name: 'Retro Vault Only', price: 2.99, subscriberCount: 0.3, adSupported: false, perks: ['Retro Vault Access', 'Classics Save-states'], churnRate: 5, monthlyRevenueB: 0.00005 }
    ];

    const listPasses: GamingPass[] = [
      {
        id: uid('gpass_'),
        studioId: state.player.id,
        name: `${state.player.name} Gaming Hub`,
        basicPrice: 9.99,
        standardPrice: 14.99,
        premiumPrice: 19.99,
        subscriberCount: 4.9, // Aggregate
        catalogProjectIds: [],
        thirdPartyCatalogIds: [],
        monthlyRevenueB: 0.002,
        tiers: createCustomTiers('Player')
      }
    ];

    state.rivals.slice(0, 4).forEach((rival, idx) => {
      listPasses.push({
        id: uid('gpass_'),
        studioId: rival.id,
        name: `${rival.name} Game Universe`,
        basicPrice: 8.99,
        standardPrice: 12.99,
        premiumPrice: 17.99,
        subscriberCount: 2.0 + idx * 0.5,
        catalogProjectIds: [],
        thirdPartyCatalogIds: [],
        monthlyRevenueB: 0.001,
        tiers: createCustomTiers(rival.name)
      });
    });

    state.gamingPasses = listPasses;
  }

  // 6. Seed at least 20 Publishers!
  if (!state.gamingPublishers) {
    const PUBLISHER_NAMES = [
      "Sony Interactive", "Microsoft Xbox", "Nintendo Co", "Tencent Games", "Activision Blizzard",
      "Electronic Arts", "Ubisoft Canada", "Take-Two Interactive", "Bandai Namco", "Capcom Publishing",
      "Square Enix Co", "Sega Corp", "Epic Games Publishing", "Annapurna Interactive", "Devolver Digital",
      "Focus Home Publishing", "Embracer Group", "Paradox Interactive", "505 Games Publishing", "THQ Nordics",
      "Team17 Development", "Raw Fury Labs"
    ];

    state.gamingPublishers = PUBLISHER_NAMES.map((name, idx) => {
      // Map some directly to our known rivals and player for high-quality self-publishing crossover integration!
      let tiedOwnerId: string | undefined = undefined;
      let isPlayerOwned = false;

      if (idx === 0) {
        tiedOwnerId = state.player.id;
        isPlayerOwned = true;
      } else {
        const rIdx = idx % (state.rivals.length || 3);
        tiedOwnerId = state.rivals[rIdx]?.id;
      }

      return {
        id: uid('pub_'),
        name: name,
        logoBg: idx % 2 === 0 ? '#10B981' : '#3B82F6',
        cashB: 2.0 + (idx % 7) * 1.5,
        marketShare: +(0.03 + (idx % 10) * 0.015).toFixed(3),
        isSelfPublishingStudioId: tiedOwnerId,
        focusGenre: ['RPG', 'Action', 'Shooter', 'Sports', 'MMO'].slice(0, 1 + (idx % 3)),
        reputation: 60 + (idx % 4) * 8,
        isPlayerOwned
      };
    });
  }

  // 7. Seed active pending deals placeholder
  if (!state.gamingPublishingDeals) {
    state.gamingPublishingDeals = [];
  }

  // 8. Trends engine preset
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

    const basePayload =
      programmers * ROLE_WEEKLY_SALARY.programmers +
      designers * ROLE_WEEKLY_SALARY.designers +
      artists * ROLE_WEEKLY_SALARY.artists +
      qa * ROLE_WEEKLY_SALARY.qa +
      liveops * ROLE_WEEKLY_SALARY.liveops;

    let totalPayload = basePayload;
    if (hq.studioId === s.player.id) {
      // Apply welfare & crunch policy multipliers
      let mult = 1.0;
      const wf = hq.welfareLevel || 'standard';
      if (wf === 'basic') mult *= 0.90;
      else if (wf === 'luxurious') mult *= 1.25;

      const cp = hq.crunchPolicy || 'balanced';
      if (cp === 'none') mult *= 0.90;
      else if (cp === 'crunch') mult *= 1.15;

      totalPayload *= mult;

      // Add active amenities opex
      let amenitiesOpex = 0.0;
      if (hq.amenities?.freeSnacks) amenitiesOpex += 0.003;
      if (hq.amenities?.ergoChairs) amenitiesOpex += 0.001;
      if (hq.amenities?.gym) amenitiesOpex += 0.008;

      totalPayload += amenitiesOpex;

      weeklyOpexOutflowB += Math.min(0.08, totalPayload + 0.005); // include office rent $5M opex
    }

    return {
      ...hq,
      rooms: finishedRooms,
      upgradesFinishedWeeks: nextRules,
      salaryBandWeeklyM: +(totalPayload * 1000).toFixed(2)
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

    if (proj.phase !== 'Gold' && proj.phase !== 'LiveOps' && !proj.onHold) {
      // Speed multiplier
      let devSpeedUnit = 1.0;
      let bugAccretionMult = 1.0;

      if (studioHQ) {
        // Welfare
        const wf = studioHQ.welfareLevel || 'standard';
        if (wf === 'basic') {
          devSpeedUnit *= 0.95;
          bugAccretionMult *= 1.15;
        } else if (wf === 'luxurious') {
          devSpeedUnit *= 1.12;
          bugAccretionMult *= 0.82;
        }

        // Crunch
        const cp = studioHQ.crunchPolicy || 'balanced';
        if (cp === 'none') {
          devSpeedUnit *= 0.90;
          bugAccretionMult *= 0.72;
        } else if (cp === 'crunch') {
          devSpeedUnit *= 1.25;
          bugAccretionMult *= 1.38;
        }

        // Amenities
        if (studioHQ.amenities?.freeSnacks) {
          devSpeedUnit *= 1.03;
          bugAccretionMult *= 0.97;
        }
        if (studioHQ.amenities?.ergoChairs) {
          devSpeedUnit *= 1.05;
          bugAccretionMult *= 0.93;
        }
        if (studioHQ.amenities?.gym) {
          devSpeedUnit *= 1.10;
          bugAccretionMult *= 0.85;
        }

        if (hasDevFloor) {
          devSpeedUnit *= 1.15;
        }
      }

      // Add dev unit speed
      proj.developmentWeeksSpent = +(proj.developmentWeeksSpent + devSpeedUnit).toFixed(3);
      nextWeeksSpent = Math.min(proj.developmentTotalWeeks, Math.floor(proj.developmentWeeksSpent));

      // bug accretion offset by QA team
      const baseBugs = Math.round((5 + Math.random() * 8) * bugAccretionMult);
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

      // Apply studio bonuses based on wellbeing/crunch policy!
      if (studioHQ) {
        const wf = studioHQ.welfareLevel || 'standard';
        if (wf === 'basic') scoreRating -= 3;
        else if (wf === 'luxurious') scoreRating += 6;

        const cp = studioHQ.crunchPolicy || 'balanced';
        if (cp === 'none') scoreRating += 4;
        else if (cp === 'crunch') scoreRating -= 6;
      }

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
    const isPlayer = pass.studioId === s.player.id;
    const publishedGamesCount = s.gamingProjects?.filter(p => p.studioId === pass.studioId && (p.phase === 'Gold' || p.phase === 'LiveOps')).length || 0;

    if (pass.tiers && pass.tiers.length > 0) {
      // Simulate customizable, multi-tier Game Pass!
      pass.tiers = pass.tiers.map((tier) => {
        let attract = 0.6 + (publishedGamesCount * 0.12);

        // Price impact: cheap prices boost subscriptions, high prices lower growth
        if (tier.price < 5) attract *= 1.45;
        else if (tier.price <= 10) attract *= 1.15;
        else if (tier.price <= 15) attract *= 0.95;
        else if (tier.price <= 20) attract *= 0.8;
        else attract *= 0.6;

        // Perks impact
        attract += (tier.perks?.length || 0) * 0.05;

        // Bundle boost! If bundled with a streaming service, synergize!
        if (pass.bundleWithStreamingServiceId) {
          attract *= 1.30; // 30% subscriber growth surge
        }

        // Ad revenue support
        if (tier.adSupported) {
          attract *= 0.90; // minor customer friction
        }

        const netGrowth = (attract - 1.0) * 0.18; // millions change/week
        const nextSubs = Math.max(0.01, +(tier.subscriberCount + netGrowth).toFixed(4));

        // Weekly pricing amortized
        const weeklySubRevM = nextSubs * tier.price * 0.25;
        // Ad revenue Arpu if enabled
        const weeklyAdRevM = tier.adSupported ? nextSecAdArpu(nextSubs) : 0;

        const tierWeeklyRevB = (weeklySubRevM + weeklyAdRevM) * 0.001;

        return {
          ...tier,
          subscriberCount: nextSubs,
          monthlyRevenueB: +(tierWeeklyRevB * 4).toFixed(6)
        };
      });

      // Aggregate totals
      pass.subscriberCount = +(pass.tiers.reduce((tot, t) => tot + t.subscriberCount, 0)).toFixed(2);
      pass.monthlyRevenueB = +(pass.tiers.reduce((tot, t) => tot + t.monthlyRevenueB, 0)).toFixed(5);

      const totalWeeklyRevB = pass.monthlyRevenueB / 4;
      if (isPlayer) {
        weeklyInflowB += totalWeeklyRevB;
      }
    } else {
      // Legacy Fallback (e.g. Simple UI configurations)
      const pl = pass.pricingLevel || 'balanced';
      const sc = pass.libraryScope || 'mixed_catalog';
      const aw = pass.adWavelength || 'lite_sponsored';

      const pSpec = GAMING_PASS_PRICE_SPECS[pl];
      const sSpec = GAMING_PASS_SCOPE_SPECS[sc];
      const aSpec = GAMING_PASS_AD_SPECS[aw];

      // Sync numerical prices
      pass.basicPrice = pSpec.basic;
      pass.standardPrice = pSpec.standard;
      pass.premiumPrice = pSpec.premium;

      let attractiveness = 0.5 + (publishedGamesCount * 0.18);
      attractiveness *= pSpec.attractMult;
      attractiveness *= sSpec.attractMult;
      attractiveness *= aSpec.attractMult;

      if (isPlayer) {
        const subOpexWeeklyB = pSpec.weeklyOpex * sSpec.weeklyOpexMult * aSpec.weeklyOpexMult;
        weeklyOpexOutflowB += subOpexWeeklyB;
      }

      const netSubscribersGrowth = (attractiveness - 1.0) * 0.12;
      const nextSubs = Math.max(0.01, +(pass.subscriberCount + netSubscribersGrowth).toFixed(4));

      const avgSubPrice = (pass.standardPrice * 0.6) + (pass.basicPrice * 0.3) + (pass.premiumPrice * 0.1);
      const weeklySubRevM = nextSubs * avgSubPrice * 0.25;
      const weeklyAdRevM = nextSubs * (aSpec.adRevenuePerSubYear / 52.0);

      const totalWeeklyRevM = weeklySubRevM + weeklyAdRevM;
      const weeklyRevenue = totalWeeklyRevM * 0.001;

      if (isPlayer) {
        weeklyInflowB += weeklyRevenue;
      }

      pass.subscriberCount = nextSubs;
      pass.monthlyRevenueB = +(weeklyRevenue * 4).toFixed(4);
    }

    return pass;
  });
  s.gamingPasses = passes;

  // Helper routine to amortize ad revenue
  function nextSecAdArpu(subs: number): number {
    return subs * (3.60 / 52.0); // $3.60/sub/year equivalent in ad revenue
  }

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

  // G. Advance Player's active hardware research queue
  if (s.player.researchingGameGen && s.player.researchRemainingWeeks !== undefined) {
    if (s.player.researchRemainingWeeks > 1) {
      s.player = {
        ...s.player,
        researchRemainingWeeks: s.player.researchRemainingWeeks - 1
      };
    } else {
      const finishedGen = s.player.researchingGameGen;
      s.player = {
        ...s.player,
        unlockedGameGen: finishedGen,
        researchingGameGen: undefined,
        researchRemainingWeeks: undefined
      };
      s.newsLog = [
        {
          week: curWeek,
          year: curYear,
          text: `🔬 TECH UNLOCKED: Your progressive hardware labs successfully completed R&D on Generation ${finishedGen}! New engine modules and specs are now available in your studio!`,
          color: '#00F5FF'
        },
        ...s.newsLog
      ];
    }
  }

  // G2. Advance Rivals' active hardware research queue, & trigger new rival/publisher research!
  s.rivals = s.rivals.map((rival) => {
    let r = { ...rival };
    if (r.researchingGameGen && r.researchRemainingWeeks !== undefined) {
      if (r.researchRemainingWeeks > 1) {
        r.researchRemainingWeeks = r.researchRemainingWeeks - 1;
      } else {
        const finishedGen = r.researchingGameGen;
        r.unlockedGameGen = finishedGen;
        r.researchingGameGen = undefined;
        r.researchRemainingWeeks = undefined;
        s.newsLog = [
          {
            week: curWeek,
            year: curYear,
            text: `🔬 TECH UNLOCKED: Rival company ${r.name} successfully unlocked Generation ${finishedGen} hardware specifications!`,
            color: r.logoBg || '#A855F7'
          },
          ...s.newsLog
        ];
      }
    } else {
      // 3.5% chance per week for any rival to start researching next level if they have enough cash!
      const currentGen = r.unlockedGameGen || 1;
      if (currentGen < 8 && Math.random() < 0.035) {
        const nextGen = currentGen + 1;
        const GATES: Record<number, { year: number; label: string; cost: number; weeks: number }> = {
          2: { year: 1976, label: 'Gen 2 (Vector/16-bit)', cost: 15, weeks: 6 },
          3: { year: 1983, label: 'Gen 3 (8-bit Classic)', cost: 35, weeks: 8 },
          4: { year: 1990, label: 'Gen 4 (16-bit Handhandled)', cost: 85, weeks: 10 },
          5: { year: 1995, label: 'Gen 5 (3D CD Graphics)', cost: 185, weeks: 12 },
          6: { year: 2005, label: 'Gen 6 (HD HD Console)', cost: 400, weeks: 14 },
          7: { year: 2013, label: 'Gen 7 (Ultra-HD/Streaming)', cost: 700, weeks: 16 },
          8: { year: 2020, label: 'Gen 8 (Neural/VR Computing)', cost: 1200, weeks: 20 }
        };
        const gate = GATES[nextGen];
        if (gate && curYear >= gate.year) {
          const costB = gate.cost * 0.001;
          if (r.cash > costB + 0.1) {
            r.cash = +(r.cash - costB).toFixed(4);
            r.researchingGameGen = nextGen;
            r.researchRemainingWeeks = gate.weeks;
            s.newsLog = [
              {
                week: curWeek,
                year: curYear,
                text: `🔬 TECH DESIGN: ${r.name} has initiated advanced R&D targeting Generation ${nextGen} technologies.`,
                color: r.logoBg || '#A855F7'
              },
              ...s.newsLog
            ];
          }
        }
      }
    }
    return r;
  });

  // G3. AI Rivals design, manufacture & release active gaming consoles!
  s.rivals = s.rivals.map((r) => {
    const currentGen = r.unlockedGameGen || 1;
    // Check if rival already has a console matching current active generation, or in development
    const activeConsoles = (s.gamingConsoles || []).filter(c => c.studioId === r.id && c.generation === currentGen);
    if (activeConsoles.length === 0 && Math.random() < 0.05 && r.cash > 0.15) {
      // Dedicate $120M upfront hardware labs
      const rNew = { ...r, cash: +(r.cash - 0.120).toFixed(4) };

      const titleOptions: Record<number, string[]> = {
        2: ['Retro-Vectrex', 'Micro-Nippon', 'Super-Cartridge 1000'],
        3: ['Classic-Core 8', 'Fami-Entertainment', 'Master-Console III'],
        4: ['Mega-Genesis', 'Super-Mega System', 'Neo-Advance Graphics'],
        5: ['Sony Play-Platform', 'Ultra-64', 'Saturn-Disk Drive'],
        6: ['Nebula Station 2', 'Game-Pyramid', 'Cyberport HD'],
        7: ['Infinity Station Pro', 'Elysium Switch', 'Apex Console One'],
        8: ['Reality Hologram', 'Neural-Drive v8', 'Quantum Play-Portal']
      };

      const consoleTitles = titleOptions[currentGen] || ['Rival Cyberbox', 'Matrix-Box', 'Infinity-Arcade'];
      const finalTitle = `${rNew.name.split(' ')[0]} ${consoleTitles[Math.floor(Math.random() * consoleTitles.length)]}`;

      // Generate Specs matching generation
      const specsMap: Record<number, GamingConsole['specs']> = {
        2: { cpu: '16-bit', gpu: 'Fixed-Pipeline', ram: 'MBs', storage: 'Cartridge', backwardCompat: true, cloudStreaming: false, onlineServices: false },
        3: { cpu: '16-bit', gpu: 'Voxel-Shaded', ram: 'MBs', storage: 'Cartridge', backwardCompat: true, cloudStreaming: false, onlineServices: false },
        4: { cpu: '32-bit', gpu: 'Hardware Ray-Tracing', ram: 'GBs', storage: 'Optical', backwardCompat: true, cloudStreaming: false, onlineServices: true },
        5: { cpu: 'Multi-Core', gpu: 'Hardware Ray-Tracing', ram: 'GBs', storage: 'Optical', backwardCompat: true, cloudStreaming: true, onlineServices: true },
        6: { cpu: 'Custom Cloud Architecture', gpu: 'Haptic Spatial Projection', ram: 'Unified High Bandwidth', storage: 'SSD', backwardCompat: true, cloudStreaming: true, onlineServices: true },
        7: { cpu: 'Quantum Hybrid', gpu: 'Haptic Spatial Projection', ram: 'Unified High Bandwidth', storage: 'SSD', backwardCompat: true, cloudStreaming: true, onlineServices: true },
        8: { cpu: 'Quantum Hybrid', gpu: 'Haptic Spatial Projection', ram: 'Unified High Bandwidth', storage: 'Direct Streaming', backwardCompat: true, cloudStreaming: true, onlineServices: true }
      };

      const finalSpecs = specsMap[currentGen] || specsMap[2];
      const consoleCost = currentGen === 2 ? 149 : currentGen === 3 ? 199 : currentGen === 4 ? 299 : currentGen === 5 ? 399 : currentGen === 6 ? 499 : currentGen === 7 ? 599 : 699;
      const finalPrice = Math.round(consoleCost * 0.95);

      const rivalConsole: GamingConsole = {
        id: uid('gcon_'),
        title: finalTitle,
        studioId: rNew.id,
        generation: currentGen,
        specs: finalSpecs,
        rdWeeksLeft: 8,
        rdTotalWeeks: 8,
        price: finalPrice,
        manufacturingCost: Math.round(finalPrice * 0.65),
        unitsSold: 0,
        stock: 0,
        subscriberCount: 0,
        status: 'rd',
        marketShare: 0,
        timedExclusivesSignedMovieIds: []
      };

      s.gamingConsoles = [...(s.gamingConsoles || []), rivalConsole];
      return rNew;
    }
    return r;
  });

  // G4. AI rivals build/expand their brick-and-mortar video clubs & stock released titles!
  if (curYear < 2006 && Math.random() < 0.04) {
    const activeRivals = s.rivals.filter(r => r.cash > 0.02);
    if (activeRivals.length > 0) {
      const selectedRival = activeRivals[Math.floor(Math.random() * activeRivals.length)];
      const regions = ['US', 'Europe', 'Asia', 'LatAm'] as const;
      const targetRegion = regions[Math.floor(Math.random() * regions.length)];
      
      const sizes = ['kiosk', 'boutique', 'megastore'] as const;
      const chosenSize = selectedRival.cash > 0.06 ? sizes[Math.floor(Math.random() * sizes.length)] : 'kiosk';
      const costM = chosenSize === 'kiosk' ? 2 : chosenSize === 'boutique' ? 8 : 30;
      const costB = costM * 0.001;

      if (selectedRival.cash > costB + 0.01) {
        s.rivals = s.rivals.map(rv => {
          if (rv.id === selectedRival.id) {
            return { ...rv, cash: +(rv.cash - costB).toFixed(4) };
          }
          return rv;
        });

        const suffix = chosenSize === 'kiosk' ? 'Cart' : chosenSize === 'boutique' ? 'Video Club' : 'Rental Megastore';
        const storeName = `${selectedRival.name.split(' ')[0]} ${suffix} [${targetRegion}]`;

        const rentCostUSD = chosenSize === 'kiosk' ? 1.99 : chosenSize === 'boutique' ? 2.99 : 3.99;
        const buyCostUSD = chosenSize === 'kiosk' ? 9.99 : chosenSize === 'boutique' ? 14.99 : 19.99;

        const newStore: VideoStore = {
          id: uid('vst_'),
          name: storeName,
          ownerStudioId: selectedRival.id,
          size: chosenSize,
          region: targetRegion,
          establishedYear: curYear,
          establishedWeek: curWeek,
          status: 'active',
          pricingTier: 'balanced',
          customerBaseM: 0.02,
          weeklyOpexB: chosenSize === 'kiosk' ? 0.00004 : chosenSize === 'boutique' ? 0.00015 : 0.00045,
          weeklyRevenueB: 0,
          rentCostUSD,
          buyCostUSD,
          vhsStockIds: [],
          dvdStockIds: [],
          exclusiveGatedTierIds: []
        };

        s.videoStores = [...(s.videoStores || []), newStore];

        s.newsLog = [
          {
            week: curWeek,
            year: curYear,
            text: `📼 PHYSICAL FRANCHISING: ${selectedRival.name} constructed a new physical ${chosenSize} video club: '${storeName}' in [${targetRegion}]!`,
            color: selectedRival.logoBg || '#A855F7'
          },
          ...s.newsLog
        ];
      }
    }
  }

  // G5. Feed films into AI-owned or public video clubs shelves!
  if (s.videoStores && s.videoStores.length > 0 && Math.random() < 0.25) {
    s.videoStores = s.videoStores.map((st) => {
      const ownerId = st.ownerStudioId || s.player.id;
      // Get released movies of owner
      const myMoviesEx = s.movies.filter(m => m.studioId === ownerId && m.status === 'released');
      if (myMoviesEx.length > 0) {
        const randMov = myMoviesEx[Math.floor(Math.random() * myMoviesEx.length)];
        const format = (curYear >= 1997 && Math.random() < 0.5) ? 'dvd' : 'vhs';
        if (format === 'dvd') {
          const list = Array.from(new Set([...(st.dvdStockIds || []), randMov.id]));
          return { ...st, dvdStockIds: list };
        } else {
          const list = Array.from(new Set([...(st.vhsStockIds || []), randMov.id]));
          return { ...st, vhsStockIds: list };
        }
      }
      return st;
    });
  }

  // H. Tick Player & NPC physical VHS / DVD Retail Outlets and Clubs
  s = tickVideoStores(s);

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
  priceOrLevel: any, // standard price or 'value' | 'balanced' | 'premium'
  nameOrScope?: any,  // brand name or 'indie_only' | 'mixed_catalog' | 'day_one_aaa'
  basicPriceOrAdWave?: any, // basicPrice or 'none' | 'lite_sponsored' | 'ad_heavy'
  premiumPriceFallback?: number,
  adSupportedFallback?: boolean,
  enabledConsoleIds?: string[],
  catalogProjectIds?: string[]
): { state: GameState; error?: string } {
  const s = { ...state };
  const pass = s.gamingPasses?.find((p) => p.studioId === s.player.id);
  if (!pass) return { state, error: 'Gaming Pass Subscription not active.' };

  let pricingLevel = pass.pricingLevel || 'balanced';
  let libraryScope = pass.libraryScope || 'mixed_catalog';
  let adWavelength = pass.adWavelength || 'lite_sponsored';
  let consoles = enabledConsoleIds !== undefined ? enabledConsoleIds : pass.enabledConsoleIds;
  let catalog = catalogProjectIds !== undefined ? catalogProjectIds : pass.catalogProjectIds;

  // Detect signature: if priceOrLevel is a string like 'value' / 'balanced' / 'premium'
  if (typeof priceOrLevel === 'string' && ['value', 'balanced', 'premium'].includes(priceOrLevel)) {
    pricingLevel = priceOrLevel as any;
    if (nameOrScope) libraryScope = nameOrScope;
    if (basicPriceOrAdWave) adWavelength = basicPriceOrAdWave;
  } else {
    // legacy numeric signature fallback
    if (priceOrLevel !== undefined) {
      if (priceOrLevel < 8) pricingLevel = 'value';
      else if (priceOrLevel > 15) pricingLevel = 'premium';
      else pricingLevel = 'balanced';
    }
    if (adSupportedFallback !== undefined) {
      adWavelength = adSupportedFallback ? 'lite_sponsored' : 'none';
    }
  }

  const pSpec = GAMING_PASS_PRICE_SPECS[pricingLevel];

  const updatedPasses = s.gamingPasses?.map((p) => {
    if (p.id === pass.id) {
      return {
        ...p,
        pricingLevel,
        libraryScope,
        adWavelength,
        basicPrice: pSpec.basic,
        standardPrice: pSpec.standard,
        premiumPrice: pSpec.premium,
        enabledConsoleIds: consoles,
        catalogProjectIds: catalog
      };
    }
    return p;
  });

  s.gamingPasses = updatedPasses;
  return { state: s };
}

export function toggleStudioHQPerkAction(
  state: GameState,
  studioHQId: string,
  perkKey: 'freeSnacks' | 'ergoChairs' | 'gym',
  install: boolean
): { state: GameState; error?: string } {
  const s = { ...state };
  const hq = s.gamingStudios?.find((h) => h.id === studioHQId);
  if (!hq) return { state, error: 'Studio HQ not found.' };

  const already = !!(hq.amenities || {})[perkKey];
  if (install && already) return { state, error: 'Amenity already active.' };
  if (!install && !already) return { state, error: 'Amenity not active.' };

  const spec = STUDIO_PERK_SPECS[perkKey];
  const cost = install ? spec.installCost : 0; // removing is free

  if (install && s.player.cash * 1000 < cost) {
    return { state, error: `Inadequate funds. Need $${cost}M to install ${spec.label}.` };
  }

  // Deduct cash if installing
  if (install) {
    s.player = {
      ...s.player,
      cash: +(s.player.cash - cost / 1000).toFixed(4)
    };
  }

  // Toggle amenity
  s.gamingStudios = s.gamingStudios?.map((h) => {
    if (h.id === studioHQId) {
      return {
        ...h,
        amenities: {
          ...(hq.amenities || {}),
          [perkKey]: install
        }
      };
    }
    return h;
  });

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: install
        ? `🏢 PERK ACQUIRED: Gained the '${spec.label}' benefit package for dev team at a setup cost of $${cost}M!`
        : `🏢 PERK ARCHIVED: Removed '${spec.label}' benefit package.`,
      color: s.player.logoBg
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function setStudioHQPolicyAction(
  state: GameState,
  studioHQId: string,
  welfareLevel: 'basic' | 'standard' | 'luxurious',
  crunchPolicy: 'none' | 'balanced' | 'crunch'
): { state: GameState; error?: string } {
  const s = { ...state };
  s.gamingStudios = s.gamingStudios?.map((h) => {
    if (h.id === studioHQId) {
      return {
        ...h,
        welfareLevel,
        crunchPolicy
      };
    }
    return h;
  });

  const hqName = s.gamingStudios?.find(h => h.id === studioHQId)?.name || 'HQ';
  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `👔 POLICY UPDATE: '${hqName}' shifted employment policies to Welfare [${welfareLevel.toUpperCase()}] and Crunch [${crunchPolicy.toUpperCase()}]. Productivity calibrated!`,
      color: s.player.logoBg
    },
    ...s.newsLog
  ];

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
  let salvageRefundM = 0;
  if (activeProjs.length > 0) {
    activeProjs.forEach(p => {
      salvageRefundM += (p.budgetM || 0) * 0.15;
    });
  }

  const baseCost = hq.type === 'AAA' ? 60 : hq.type === 'Mid-Tier' ? 25 : 8;
  const salvageB = +(baseCost * 0.25 + salvageRefundM * 0.001).toFixed(3);
  s.player = { ...s.player, cash: +(s.player.cash + salvageB).toFixed(4) };

  // Filter out the studio
  s.gamingStudios = (s.gamingStudios || []).filter(h => h.id !== studioHQId);
  // Safely sweep associated inactive project pipelines
  s.gamingProjects = (s.gamingProjects || []).filter(p => p.studioId !== hq.id || p.phase === 'Gold' || p.phase === 'LiveOps');

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🏢 DISBANDED HQ: '${hq.name}' [${hq.type}] shut down. ${activeProjs.length > 0 ? activeProjs.length + ' active projects cancelled. ' : ''}Staff discharged and $${(salvageB * 1000).toFixed(0)}M opex salvaged!`,
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
  
  if (s.player.researchingGameGen) {
    return { state, error: `Your progressive hardware labs are already actively researching Generation ${s.player.researchingGameGen} (${s.player.researchRemainingWeeks} weeks remaining).` };
  }

  const currentGen = s.player.unlockedGameGen || 1;
  if (currentGen >= 8) {
    return { state, error: 'You have researched the peak Generation 8 photorealistic neural-computing technology!' };
  }
  const nextGen = currentGen + 1;

  // Real Historical Era Gates
  const GATES: Record<number, { year: number; label: string; cost: number; weeks: number }> = {
    2: { year: 1976, label: 'Generation 2 (Microprocessor Era & early 2D Arcade environments)', cost: 15, weeks: 6 },
    3: { year: 1983, label: 'Generation 3 (8-bit Classic Home Consoles Era)', cost: 35, weeks: 8 },
    4: { year: 1990, label: 'Generation 4 (16-bit Handhelds & Console Era)', cost: 85, weeks: 10 },
    5: { year: 1995, label: 'Generation 5 (32/64-bit 3D CDs Graphics Era)', cost: 185, weeks: 12 },
    6: { year: 2005, label: 'Generation 6 (High-Definition HD & Online Multiplayer Systems)', cost: 400, weeks: 14 },
    7: { year: 2013, label: 'Generation 7 (Ultra-HD & Hybrid Streaming Environments)', cost: 700, weeks: 16 },
    8: { year: 2020, label: 'Generation 8 (Neural Computing & Standalone Photorealistic Engines)', cost: 1200, weeks: 20 }
  };

  const gate = GATES[nextGen];
  if (!gate) return { state, error: 'Hardware technology specs not found.' };

  if (s.year < gate.year) {
    return { state, error: `Technology Era Barrier! Researching ${gate.label} requires chronology Year ${gate.year} or above. Current Chronology is Year ${s.year}.` };
  }

  const costsB = gate.cost * 0.001;
  if (s.player.cash < costsB) {
    return { state, error: `Inadequate opex reserves for R&D. Leveling up to Gen ${nextGen} requires $${(costsB * 1000).toFixed(0)}M cash up front.` };
  }

  s.player = {
    ...s.player,
    cash: +(s.player.cash - costsB).toFixed(4),
    researchingGameGen: nextGen,
    researchRemainingWeeks: gate.weeks
  };

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🔬 RESEARCH QUEUED: Commenced R&D on ${gate.label}. Cost: $${gate.cost}M. Timeline: ${gate.weeks} weeks from physical specs formulation to hardware silicon launch!`,
      color: '#FFD700'
    },
    ...s.newsLog
  ];

  return { state: s };
}

// -------------------------------------------------------------
// V45 — VHS & DVD PHYSICAL RENTAL STORES & OLD-SCHOOL CLUBS SYS
// -------------------------------------------------------------

export function buildVideoStoreAction(state: GameState, args: {
  name: string;
  size: 'kiosk' | 'boutique' | 'megastore';
  region: 'US' | 'Europe' | 'Asia' | 'LatAm';
}): { state: GameState; error?: string } {
  const s = { ...state };
  const name = args.name.trim();
  if (!name) return { state, error: 'Video store requires a name.' };

  const costM = args.size === 'kiosk' ? 2 : args.size === 'boutique' ? 8 : 30;
  const costB = costM * 0.001;

  if (s.player.cash < costB) {
    return { state, error: `Deficit cash barrier. Building a ${args.size} physical video outlet requires $${costM}M cash.` };
  }

  // Pre-configured rentals standard prices
  const rentCostUSD = args.size === 'kiosk' ? 1.99 : args.size === 'boutique' ? 2.99 : 3.99;
  const buyCostUSD = args.size === 'kiosk' ? 9.99 : args.size === 'boutique' ? 14.99 : 19.99;

  const newStore: VideoStore = {
    id: uid('vst_'),
    name,
    size: args.size,
    region: args.region,
    establishedYear: s.year,
    establishedWeek: s.week,
    status: 'active',
    pricingTier: 'balanced',
    customerBaseM: 0.02, // starts with a handful of enthusiastic neighborhood members
    weeklyOpexB: args.size === 'kiosk' ? 0.00004 : args.size === 'boutique' ? 0.00015 : 0.00045,
    weeklyRevenueB: 0,
    rentCostUSD,
    buyCostUSD,
    vhsStockIds: [],
    dvdStockIds: [],
    exclusiveGatedTierIds: []
  };

  s.player = { ...s.player, cash: +(s.player.cash - costB).toFixed(4) };
  s.videoStores = [...(s.videoStores || []), newStore];

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `📼 PHYSICAL RETREATING: Built a new ${args.size} Video Club: '${name}' in [${args.region}] ($${costM}M opex). Ready for VHS tape and movie stocking!`,
      color: '#A855F7'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function configureVideoStorePricingAction(state: GameState, args: {
  storeId: string;
  pricingTier: 'budget' | 'balanced' | 'premium';
  rentCost: number;
  buyCost: number;
  exclusiveGatedTiers?: string[];
}): { state: GameState; error?: string } {
  const s = { ...state };
  s.videoStores = (s.videoStores || []).map((st) => {
    if (st.id === args.storeId) {
      return {
        ...st,
        pricingTier: args.pricingTier,
        rentCostUSD: Math.max(0.5, Math.min(20, args.rentCost)),
        buyCostUSD: Math.max(1, Math.min(100, args.buyCost)),
        exclusiveGatedTierIds: args.exclusiveGatedTiers || []
      };
    }
    return st;
  });

  return { state: s };
}

export function toggleVideoStoreStatusAction(state: GameState, storeId: string): { state: GameState; error?: string } {
  const s = { ...state };
  s.videoStores = (s.videoStores || []).map((st) => {
    if (st.id === storeId) {
      const nextStatus = st.status === 'active' ? 'closed' : 'active';
      return { ...st, status: nextStatus };
    }
    return st;
  });
  return { state: s };
}

export function stockMovieInVideoStoreAction(state: GameState, args: {
  storeId: string;
  movieId: string;
  format: 'vhs' | 'dvd';
}): { state: GameState; error?: string } {
  const s = { ...state };
  const store = (s.videoStores || []).find(st => st.id === args.storeId);
  if (!store) return { state, error: 'Video outlet not found.' };

  const movie = s.movies.find(m => m.id === args.movieId);
  if (!movie) return { state, error: 'Movie metadata not found.' };

  if (args.format === 'dvd' && s.year < 1997) {
    return { state, error: 'Format Locked! DVD media was not invented or commercially available before Year 1997. Stock as vintage VHS instead!' };
  }

  s.videoStores = (s.videoStores || []).map((st) => {
    if (st.id === args.storeId) {
      if (args.format === 'vhs') {
        const set = new Set([...(st.vhsStockIds || []), args.movieId]);
        return { ...st, vhsStockIds: Array.from(set) };
      } else {
        const set = new Set([...(st.dvdStockIds || []), args.movieId]);
        return { ...st, dvdStockIds: Array.from(set) };
      }
    }
    return st;
  });

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `📦 STOCK UPDATE: Shipped tape batches of "${movie.title}" on ${args.format.toUpperCase()} format to ${store.name}! General public rentals started.`,
      color: '#A855F7'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function proposeVideoClubDealAction(state: GameState, args: {
  dealType: 'inbound_vhs' | 'outbound_vhs' | 'inbound_dvd' | 'outbound_dvd';
  receiverId: string;
  movieId?: string;
  upfrontFeeB: number;
  royaltyPercent: number;
  years: number;
}): { state: GameState; error?: string } {
  const s = { ...state };
  if (args.years < 1 || args.years > 10) return { state, error: 'Physical distribution contracts are valid for 1-10 years.' };
  
  const movie = s.movies.find(m => m.id === args.movieId);
  if (!movie && args.movieId) return { state, error: 'Movie not found.' };

  const dealId = uid('vdeal_');
  const dTerm: VideoClubDeal = {
    id: dealId,
    dealType: args.dealType,
    proposerId: s.player.id,
    receiverId: args.receiverId,
    movieId: args.movieId,
    upfrontFeeB: args.upfrontFeeB,
    royaltyPercent: Math.max(1, Math.min(50, args.royaltyPercent)),
    years: args.years,
    signedWeek: s.week,
    signedYear: s.year,
    expiresWeek: s.week,
    expiresYear: s.year + args.years,
    status: 'accepted', // Outbound deal proposed by player is instantly processed or auto-accepted if reasonable
    termsText: `Outbound local DVD/VHS distribution license for "${movie?.title || 'Catalog'}" with 15% physical opex split.`
  };

  s.videoClubDeals = [...(s.videoClubDeals || []), dTerm];

  // If inbound licensing, player receives the upfront fee! If outbound, player pays upfront
  if (args.dealType === 'inbound_vhs' || args.dealType === 'inbound_dvd') {
    s.player = { ...s.player, cash: +(s.player.cash + args.upfrontFeeB).toFixed(4) };
    const receiver = s.rivals.find(r => r.id === args.receiverId);
    if (receiver) {
      receiver.cash = +(receiver.cash - args.upfrontFeeB).toFixed(4);
    }
  } else {
    if (s.player.cash < args.upfrontFeeB) return { state, error: `Inadequate opex reserves of $${(args.upfrontFeeB*1000).toFixed(1)}M cash to buy rival movie distribution rights.` };
    s.player = { ...s.player, cash: +(s.player.cash - args.upfrontFeeB).toFixed(4) };
    const receiver = s.rivals.find(r => r.id === args.receiverId);
    if (receiver) {
      receiver.cash = +(receiver.cash + args.upfrontFeeB).toFixed(4);
    }
  }

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `📜 CONTRACT SIGNED: ${args.dealType === 'inbound_vhs' || args.dealType === 'inbound_dvd' ? 'Licensed OUT' : 'Licensed IN'} "${movie?.title}" for ${args.years} years of physical home media shelves distribution. Upfront: $${(args.upfrontFeeB*1000).toFixed(1)}M.`,
      color: '#A855F7'
    },
    ...s.newsLog
  ];

  return { state: s };
}

// Tick Video outlets: subscribers, revenues, opex, and royalty routing
export function tickVideoStores(state: GameState): GameState {
  const s = { ...state };
  const curWeek = s.week;
  const curYear = s.year;

  let totalPhysicalOpexB = 0;
  let totalPhysicalRevenueB = 0;
  let reports: string[] = [];

  const sizeLabels = { kiosk: 'Kiosk', boutique: 'Club Store', megastore: 'Mega-Mart' };

  s.videoStores = (s.videoStores || []).map((st) => {
    if (st.status === 'closed') {
      // closed outlets still have 20% security overhead cost
      const standbyCost = st.size === 'kiosk' ? 0.00001 : st.size === 'boutique' ? 0.00003 : 0.00009;
      totalPhysicalOpexB += standbyCost;
      return { ...st, weeklyOpexB: standbyCost, weeklyRevenueB: 0 };
    }

    const maxCapM = st.size === 'kiosk' ? 0.08 : st.size === 'boutique' ? 0.35 : 1.5;
    const standardPricingUSD = st.pricingTier === 'budget' ? 4.95 : st.pricingTier === 'balanced' ? 9.95 : 19.95;
    const weeklySubCostUSD = standardPricingUSD / 4.0;

    // Catalog Appeal: how many movies did they stock?
    const moviesCount = (st.vhsStockIds || []).length + (st.dvdStockIds || []).length;
    let appealBonus = 0.1; // Baseline local appeal

    // Stocking bonus: +1.5% appeal per physical tape, up to +40%
    appealBonus += Math.min(0.40, moviesCount * 0.015);

    // DVD format check: Stocking DVDs in DVD-age (1997-2005) yields massive +20% bonus appeal!
    const dvdsStocked = (st.dvdStockIds || []).length;
    if (curYear >= 1997 && dvdsStocked > 0) {
      appealBonus += 0.20;
    }

    // Gated custom exclusive membership levels
    if (st.exclusiveGatedTierIds && st.exclusiveGatedTierIds.length > 0) {
      appealBonus += 0.05; // gives a prestige brand feel
    }

    // Historical chronologically-driven growth/decay dynamics
    let deltaBase = 0;
    if (curYear < 1997) {
      // The Golden VHS Age: Steady brick-and-mortar membership acquisition
      deltaBase = 0.015 + appealBonus * 0.03;
    } else if (curYear >= 1997 && curYear <= 2005) {
      // The High-Density DVD Peak Era: Max growth for modern boutiques
      deltaBase = 0.02 + appealBonus * 0.05;
    } else {
      // Year 2006+: Digital disruption and high-speed broadband takes hold!
      // Physical tape rental collapses by 3% to 7% per year, regardless of catalog!
      deltaBase = -0.04 - (0.02 * (st.pricingTier === 'premium' ? 1.5 : 1.0));
    }

    // Adjust membership base
    let nextSubsM = Math.max(0.005, st.customerBaseM * (1 + deltaBase));
    nextSubsM = Math.min(maxCapM, nextSubsM);

    // Financial calculations
    const opex = st.size === 'kiosk' ? 0.00004 : st.size === 'boutique' ? 0.00015 : 0.00045;
    
    // Revenue: memberships standard fees + standard rental/sales fees
    const expectedRentalsPerMemberWeekly = st.pricingTier === 'premium' ? 0.70 : st.pricingTier === 'balanced' ? 0.50 : 0.35;
    const membershipFees = nextSubsM * weeklySubCostUSD;
    const transactionRentals = nextSubsM * expectedRentalsPerMemberWeekly * st.rentCostUSD;

    const netWeeklyRevM = membershipFees + transactionRentals;
    const weeklyRevB = +(netWeeklyRevM * 0.001).toFixed(6);

    totalPhysicalOpexB += opex;
    totalPhysicalRevenueB += weeklyRevB;

    return {
      ...st,
      customerBaseM: +nextSubsM.toFixed(4),
      weeklyRevenueB: weeklyRevB,
      weeklyOpexB: opex
    };
  });

  // Pay out royalties & apply values to player vs rival cash accounts
  let playerRevenueB = 0;
  let playerOpexB = 0;

  s.videoStores.forEach((st) => {
    const ownerId = st.ownerStudioId || s.player.id;
    const netProfitB = (st.weeklyRevenueB || 0) - (st.weeklyOpexB || 0);

    if (ownerId === s.player.id) {
      playerRevenueB += st.weeklyRevenueB || 0;
      playerOpexB += st.weeklyOpexB || 0;
    } else {
      // Find the rival
      s.rivals = s.rivals.map((rv) => {
        if (rv.id === ownerId) {
          return {
            ...rv,
            cash: +(rv.cash + netProfitB).toFixed(6)
          };
        }
        return rv;
      });
    }
  });

  s.player = {
    ...s.player,
    cash: +(s.player.cash + playerRevenueB - playerOpexB).toFixed(4)
  };

  // Log in ledger (player video store revenue and opex)
  if (s.weeklyLedger) {
    s.weeklyLedger.vstoreRevB = +(playerRevenueB).toFixed(5);
    s.weeklyLedger.vstoreOpexB = +(playerOpexB).toFixed(5);
  }

  const playerStoresCount = s.videoStores.filter(st => (st.ownerStudioId || s.player.id) === s.player.id).length;
  if (playerStoresCount > 0 && curWeek === 1) {
    s.newsLog = [
      {
        week: curWeek,
        year: curYear,
        text: `📰 VIDEO CLUBS REPORT: Your ${playerStoresCount} retail stores earned $${(playerRevenueB * 1000).toFixed(2)}M in rental/club fees against $${(playerOpexB * 1000).toFixed(2)}M in brick-and-mortar opex.`,
        color: '#A855F7'
      },
      ...s.newsLog
    ];
  }

  return s;
}

// -------------------------------------------------------------
// V44 — MULTI-TIER CUSTOMIZABLE GAME PASS, PUBLISHERS, DEALS & SYNERGY
// -------------------------------------------------------------

export function proposeGamingDealAction(state: GameState, args: {
  dealType: 'publishing_inbound' | 'publishing_outbound' | 'crossover_license' | 'franchise_trade' | 'gamepass_bulk_catalog';
  proposerStudioId: string;
  receiverStudioId: string;
  gameId?: string;
  franchiseId?: string;
  years?: number;
  upfrontFeeB: number;
  royaltyPercent?: number;
  exclusiveConsoleId?: string;
  termsText: string;
}): { state: GameState; error?: string; deal?: GamingPublishingDeal } {
  const s = { ...state };
  if (args.proposerStudioId === s.player.id && s.player.cash < args.upfrontFeeB) {
    return { state, error: `Inadequate funds to cover upfront signing fee of $${(args.upfrontFeeB * 1000).toFixed(0)}M` };
  }

  const dealId = uid('gdeal_');
  const deal: GamingPublishingDeal = {
    id: dealId,
    dealType: args.dealType,
    proposerStudioId: args.proposerStudioId,
    receiverStudioId: args.receiverStudioId,
    status: 'pending',
    franchiseId: args.franchiseId,
    gameId: args.gameId,
    years: args.years || 3,
    upfrontFeeB: args.upfrontFeeB,
    royaltyPercent: args.royaltyPercent || 5,
    exclusiveConsoleId: args.exclusiveConsoleId,
    termsText: args.termsText
  };

  s.gamingPublishingDeals = [...(s.gamingPublishingDeals || []), deal];
  
  if (args.proposerStudioId === s.player.id) {
    // Proposer is player, AI will evaluate deal instantly with positive chance!
    const score = 40 + randInt(0, 45); // Relationship + randomness
    if (score > 55) {
      deal.status = 'accepted';
      // Apply transaction instantly!
      s.player = { ...s.player, cash: +(s.player.cash - args.upfrontFeeB).toFixed(4) };
      if (args.dealType === 'franchise_trade' && args.franchiseId) {
        s.franchises = (s.franchises || []).map(f => f.id === args.franchiseId ? { ...f, ownerId: s.player.id } : f);
      } else if (args.dealType === 'gamepass_bulk_catalog' && args.gameId) {
        s.gamingPasses = (s.gamingPasses || []).map(p => {
          if (p.studioId === s.player.id) {
            return { ...p, thirdPartyCatalogIds: [...new Set([...p.thirdPartyCatalogIds, args.gameId!])] };
          }
          return p;
        });
      }
      s.newsLog = [
        { week: s.week, year: s.year, text: `🤝 CONTRACT SIGNED: Opponent accepted your deal regarding "${args.termsText}"!`, color: '#10B981' },
         ...s.newsLog
      ];
    } else {
      deal.status = 'rejected';
      s.newsLog = [
        { week: s.week, year: s.year, text: `❌ DEAL DECLINED: Rival rejected your proposed contract regarding "${args.termsText}".`, color: 'red' },
         ...s.newsLog
      ];
    }
  }

  return { state: s, deal };
}

export function processGamingDealResponseAction(state: GameState, args: {
  dealId: string;
  response: 'accepted' | 'rejected' | 'countered';
  counterFeeB?: number;
}): { state: GameState; error?: string } {
  const s = { ...state };
  const idx = (s.gamingPublishingDeals || []).findIndex(d => d.id === args.dealId);
  if (idx < 0) return { state, error: 'Deal not found.' };

  const deal = s.gamingPublishingDeals![idx];
  deal.status = args.response;

  if (args.response === 'countered') {
    deal.counterFeeB = args.counterFeeB;
  } else if (args.response === 'accepted') {
    const costB = deal.counterFeeB !== undefined ? deal.counterFeeB : deal.upfrontFeeB;
    if (deal.receiverStudioId === s.player.id && s.player.cash < costB) {
      return { state, error: 'You have insufficient funds to accept this deal.' };
    }

    if (deal.receiverStudioId === s.player.id) {
      s.player = { ...s.player, cash: +(s.player.cash - costB).toFixed(4) };
    } else if (deal.proposerStudioId === s.player.id) {
      s.player = { ...s.player, cash: +(s.player.cash + costB).toFixed(4) };
    }

    if (deal.dealType === 'franchise_trade' && deal.franchiseId) {
      s.franchises = (s.franchises || []).map(f => f.id === deal.franchiseId ? { ...f, ownerId: deal.proposerStudioId } : f);
    } else if (deal.dealType === 'gamepass_bulk_catalog' && deal.gameId) {
      s.gamingPasses = (s.gamingPasses || []).map(p => {
        if (p.studioId === deal.proposerStudioId) {
          return { ...p, thirdPartyCatalogIds: [...new Set([...p.thirdPartyCatalogIds, deal.gameId!])] };
        }
        return p;
      });
    }

    s.newsLog = [
      {
        week: s.week,
        year: s.year,
        text: `🤝 COUNTER-SIGNED COMPLETED: Both parties executed contract regarding "${deal.termsText}"!`,
        color: '#10B981'
      },
      ...s.newsLog
    ];
  }

  s.gamingPublishingDeals![idx] = deal;
  return { state: s };
}

export function createORUpdateGamingPassTierAction(state: GameState, args: {
  passId: string;
  tierId?: string;
  name: string;
  price: number;
  adSupported: boolean;
  perks: string[];
}): { state: GameState; error?: string } {
  const s = { ...state };
  const passes = [...(s.gamingPasses || [])];
  const passIdx = passes.findIndex(p => p.id === args.passId);
  if (passIdx < 0) return { state, error: 'Gaming Pass subscription not found.' };

  const pass = { ...passes[passIdx] };
  const tiers = [...(pass.tiers || [])];

  if (args.tierId) {
    // Edit existing
    pass.tiers = tiers.map(t => t.id === args.tierId ? {
      ...t,
      name: args.name,
      price: args.price,
      adSupported: args.adSupported,
      perks: args.perks
    } : t);
  } else {
    // Create new (limit 5 tiers)
    if (tiers.length >= 5) {
      return { state, error: 'Maximum limit of 5 customization tiers reached.' };
    }
    const newTier: GamingPassTier = {
      id: uid('gpt_'),
      name: args.name,
      price: args.price,
      subscriberCount: 0.2 + +(Math.random() * 0.3).toFixed(2), // seeds 200k - 500k initial subs
      adSupported: args.adSupported,
      perks: args.perks,
      churnRate: args.adSupported ? 5 : 3,
      monthlyRevenueB: +(args.price * 0.3 * 1e-4).toFixed(6)
    };
    pass.tiers = [...tiers, newTier];
  }

  // Re-aggregate aggregate metrics
  pass.subscriberCount = +(pass.tiers.reduce((tot, t) => tot + t.subscriberCount, 0)).toFixed(2);
  pass.monthlyRevenueB = +(pass.tiers.reduce((tot, t) => tot + t.monthlyRevenueB, 0)).toFixed(5);

  passes[passIdx] = pass;
  s.gamingPasses = passes;
  return { state: s };
}

export function deleteGamingPassTierAction(state: GameState, args: {
  passId: string;
  tierId: string;
}): { state: GameState; error?: string } {
  const s = { ...state };
  const passes = [...(s.gamingPasses || [])];
  const passIdx = passes.findIndex(p => p.id === args.passId);
  if (passIdx < 0) return { state, error: 'Gaming Pass subscription not found.' };

  const pass = { ...passes[passIdx] };
  const tiers = [...(pass.tiers || [])];

  pass.tiers = tiers.filter(t => t.id !== args.tierId);
  pass.subscriberCount = +(pass.tiers.reduce((tot, t) => tot + t.subscriberCount, 0)).toFixed(2);
  pass.monthlyRevenueB = +(pass.tiers.reduce((tot, t) => tot + t.monthlyRevenueB, 0)).toFixed(5);

  if (pass.tiers.length === 0) {
    pass.bundleWithStreamingServiceId = undefined;
    pass.bundleDiscountPercent = 0;
  }

  passes[passIdx] = pass;
  s.gamingPasses = passes;
  return { state: s };
}

export function discontinueGamingPassServiceAction(state: GameState, args: {
  passId: string;
}): { state: GameState; error?: string } {
  const s = { ...state };
  const passes = [...(s.gamingPasses || [])];
  const passIdx = passes.findIndex(p => p.id === args.passId);
  if (passIdx < 0) return { state, error: 'Gaming Pass subscription not found.' };

  const pass = { ...passes[passIdx] };
  pass.tiers = [];
  pass.subscriberCount = 0;
  pass.monthlyRevenueB = 0;
  pass.bundleWithStreamingServiceId = undefined;
  pass.bundleDiscountPercent = 0;

  passes[passIdx] = pass;
  s.gamingPasses = passes;

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🛑 SERVICE TERMINATED: You have completely discontinued your "${pass.name}" subscription service, clearing all active subscriber tiers.`,
      color: '#EF4444'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function seedGamingPassTiersAction(state: GameState, args: {
  passId: string;
}): { state: GameState; error?: string } {
  const s = { ...state };
  const passes = [...(s.gamingPasses || [])];
  const passIdx = passes.findIndex(p => p.id === args.passId);
  if (passIdx < 0) return { state, error: 'Gaming Pass subscription not found.' };

  const pass = { ...passes[passIdx] };
  pass.tiers = [
    { id: '', name: 'Indie Starter', price: 4.99, subscriberCount: 0.15, adSupported: true, perks: ['Offline gameplay support'], churnRate: 5, monthlyRevenueB: 0.000035 },
    { id: '', name: 'Pro Core', price: 9.99, subscriberCount: 0.25, adSupported: false, perks: ['Day-One First Party Releases', 'Day-One AAA Releases'], churnRate: 3, monthlyRevenueB: 0.000115 },
    { id: '', name: 'Infinite Cloud', price: 14.99, subscriberCount: 0.35, adSupported: false, perks: ['Day-One First Party Releases', 'Day-One AAA Releases', 'Cloud Streaming', 'Exclusive beta access'], churnRate: 2, monthlyRevenueB: 0.000215 }
  ].map(t => ({ ...t, id: uid('gpt_') }));

  pass.subscriberCount = +(pass.tiers.reduce((tot, t) => tot + t.subscriberCount, 0)).toFixed(2);
  pass.monthlyRevenueB = +(pass.tiers.reduce((tot, t) => tot + t.monthlyRevenueB, 0)).toFixed(5);

  passes[passIdx] = pass;
  s.gamingPasses = passes;
  return { state: s };
}

export function bulkBuildVideoStoresAction(state: GameState, args: {
  buildPlan: Record<string, number>;
}): { state: GameState; error?: string } {
  const s = { ...state };
  let totalCostB = 0;
  const newStores: VideoStore[] = [];

  const costMap = { kiosk: 2, boutique: 8, megastore: 30 };
  const rentCostUSDMap = { kiosk: 1.99, boutique: 2.99, megastore: 3.99 };
  const buyCostUSDMap = { kiosk: 9.99, boutique: 14.99, megastore: 19.99 };
  const opexMap = { kiosk: 0.00004, boutique: 0.00015, megastore: 0.00045 };

  for (const [key, qty] of Object.entries(args.buildPlan)) {
    if (qty <= 0) continue;
    const [region, size] = key.split('|') as ['US' | 'Europe' | 'Asia' | 'LatAm', 'kiosk' | 'boutique' | 'megastore'];
    const unitCostM = costMap[size] || 0;
    const unitCostB = unitCostM * 0.001;
    totalCostB += unitCostB * qty;

    const existingCount = (s.videoStores || []).filter(st => st.region === region && st.size === size && (st.ownerStudioId || s.player.id) === s.player.id).length;

    for (let i = 0; i < qty; i++) {
      const idx = existingCount + i + 1;
      const sizeLabel = size.charAt(0).toUpperCase() + size.slice(1);
      const name = `${region} ${sizeLabel} Club #${idx}`;

      newStores.push({
        id: uid('vst_'),
        name,
        size,
        region,
        establishedYear: s.year,
        establishedWeek: s.week,
        status: 'active',
        pricingTier: 'balanced',
        customerBaseM: 0.02,
        weeklyOpexB: opexMap[size],
        weeklyRevenueB: 0,
        rentCostUSD: rentCostUSDMap[size],
        buyCostUSD: buyCostUSDMap[size],
        vhsStockIds: [],
        dvdStockIds: [],
        exclusiveGatedTierIds: []
      });
    }
  }

  if (newStores.length === 0) {
    return { state, error: 'Select at least one video club quantity to build.' };
  }

  if (s.player.cash < totalCostB) {
    return { state, error: `Inadequate liquidity. Bulk building these ${newStores.length} video clubs requires $${(totalCostB * 1000).toFixed(2)}M cash.` };
  }

  s.player = { ...s.player, cash: +(s.player.cash - totalCostB).toFixed(4) };
  s.videoStores = [...(s.videoStores || []), ...newStores];

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: ` Enterprise Franchising: Bulk-built ${newStores.length} Old-School Video Clubs across worldwide regions! Total investment: $${(totalCostB * 1000).toFixed(0)}M.`,
      color: '#A855F7'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function bulkConfigureVideoStorePricingAction(state: GameState, args: {
  pricingTier: 'budget' | 'balanced' | 'premium';
  rentCost: number;
  buyCost: number;
  regions?: ('US' | 'Europe' | 'Asia' | 'LatAm')[];
  sizes?: ('kiosk' | 'boutique' | 'megastore')[];
}): { state: GameState; error?: string } {
  const s = { ...state };
  let matchCount = 0;

  s.videoStores = (s.videoStores || []).map((st) => {
    const isPlayer = (st.ownerStudioId || s.player.id) === s.player.id;
    if (!isPlayer) return st;

    if (args.regions && !args.regions.includes(st.region)) return st;
    if (args.sizes && !args.sizes.includes(st.size)) return st;

    matchCount++;
    return {
      ...st,
      pricingTier: args.pricingTier,
      rentCostUSD: Math.max(0.5, Math.min(20, args.rentCost)),
      buyCostUSD: Math.max(1, Math.min(100, args.buyCost))
    };
  });

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🏷️ Bulk Pricing Updated: Configured ${matchCount} video clubs to standard "${args.pricingTier}" pricing (${args.rentCost} rent / ${args.buyCost} buy!).`,
      color: '#A855F7'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function bulkStockMoviesInVideoStoresAction(state: GameState, args: {
  movieIds: string[];
  format: 'vhs' | 'dvd';
  regions?: ('US' | 'Europe' | 'Asia' | 'LatAm')[];
  sizes?: ('kiosk' | 'boutique' | 'megastore')[];
}): { state: GameState; error?: string } {
  const s = { ...state };
  if (!args.movieIds || args.movieIds.length === 0) return { state, error: 'No films selected to stock.' };

  if (args.format === 'dvd' && s.year < 1997) {
    return { state, error: 'Format Locked! DVD media was not commercially available before Year 1997.' };
  }

  let updateCount = 0;
  let tapeCount = 0;

  s.videoStores = (s.videoStores || []).map((st) => {
    const isPlayer = (st.ownerStudioId || s.player.id) === s.player.id;
    if (!isPlayer) return st;

    if (args.regions && !args.regions.includes(st.region)) return st;
    if (args.sizes && !args.sizes.includes(st.size)) return st;

    updateCount++;

    if (args.format === 'vhs') {
      const existing = st.vhsStockIds || [];
      const newIds = args.movieIds.filter(mId => !existing.includes(mId));
      tapeCount += newIds.length;
      return { ...st, vhsStockIds: Array.from(new Set([...existing, ...args.movieIds])) };
    } else {
      const existing = st.dvdStockIds || [];
      const newIds = args.movieIds.filter(mId => !existing.includes(mId));
      tapeCount += newIds.length;
      return { ...st, dvdStockIds: Array.from(new Set([...existing, ...args.movieIds])) };
    }
  });

  const titles = args.movieIds.map(mId => s.movies.find(m => m.id === mId)?.title || 'Unknown').join(', ');
  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `📼 Bulk Stocking Completed: Stocked ${tapeCount} video units (${titles}) in ${updateCount} retail outlets simultaneously!`,
      color: '#A855F7'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function bundlePassWithStreamingAction(state: GameState, args: {
  passId: string;
  streamingServiceId: string | null;
  discountPercent: number;
}): { state: GameState; error?: string } {
  const s = { ...state };
  const passIdx = (s.gamingPasses || []).findIndex(p => p.id === args.passId);
  if (passIdx < 0) return { state, error: 'Gaming Pass subscription not found.' };

  const pass = s.gamingPasses![passIdx];
  pass.bundleWithStreamingServiceId = args.streamingServiceId || undefined;
  pass.bundleDiscountPercent = args.discountPercent;

  s.gamingPasses![passIdx] = pass;

  if (args.streamingServiceId) {
    const svc = s.streamingServices?.find(ss => ss.id === args.streamingServiceId);
    s.newsLog = [
      {
        week: s.week,
        year: s.year,
        text: `🔗 CROSS-DIVISION SYNERGY: Bundled Game Pass with "${svc?.name || 'Streaming Service'}" offering an exclusive ${args.discountPercent}% subscriber bundle discount!`,
        color: '#22D3EE'
      },
      ...s.newsLog
    ];
  }

  return { state: s };
}

export function createGamingPassAction(state: GameState, args: {
  name: string;
}): { state: GameState; error?: string } {
  const s = { ...state };
  if (!args.name.trim()) return { state, error: 'Subscription name required.' };
  
  const launchCostB = 0.050; // $50M Startup
  if (s.player.cash < launchCostB) {
    return { state, error: `Inadequate funds. Need $50.0M cash to launch an additional gaming subscription (have $${(s.player.cash * 1000).toFixed(1)}M).` };
  }

  const newPass: GamingPass = {
    id: uid('gpass_'),
    studioId: s.player.id,
    name: args.name.trim(),
    basicPrice: 9.99,
    standardPrice: 14.99,
    premiumPrice: 19.99,
    subscriberCount: 0.1,
    catalogProjectIds: [],
    thirdPartyCatalogIds: [],
    monthlyRevenueB: 0.00005,
    tiers: [
      { id: uid('gpt_'), name: 'Indie Starter', price: 4.99, subscriberCount: 0.05, adSupported: true, perks: ['Offline gameplay support'], churnRate: 5, monthlyRevenueB: 0.000015 },
      { id: uid('gpt_'), name: 'Pro Core', price: 9.99, subscriberCount: 0.05, adSupported: false, perks: ['Day-One First Party Releases', 'Day-One AAA Releases'], churnRate: 3, monthlyRevenueB: 0.000035 }
    ]
  };

  s.player = { ...s.player, cash: +(s.player.cash - launchCostB).toFixed(4) };
  s.gamingPasses = [...(s.gamingPasses || []), newPass];
  
  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `🎮 NEW GAMING SUBSCRIPTION LAUNCHED: "${args.name.trim()}" is now live! Handled multi-tier core subscription catalogs.`,
      color: '#EC4899'
    },
    ...s.newsLog
  ];

  return { state: s };
}

export function renameGamingPassAction(state: GameState, args: {
  passId: string;
  name: string;
}): { state: GameState; error?: string } {
  const s = { ...state };
  if (!args.name.trim()) return { state, error: 'Subscription name required.' };
  
  const passes = [...(s.gamingPasses || [])];
  const idx = passes.findIndex(p => p.id === args.passId);
  if (idx < 0) return { state, error: 'Gaming Pass subscription not found.' };

  const oldName = passes[idx].name;
  const pass = { ...passes[idx], name: args.name.trim() };
  passes[idx] = pass;
  s.gamingPasses = passes;

  s.newsLog = [
    {
      week: s.week,
      year: s.year,
      text: `✏️ Subscription service "${oldName}" was renamed to "${pass.name}".`,
      color: '#EAB308'
    },
    ...s.newsLog
  ];

  return { state: s };
}
