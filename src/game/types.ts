export type Role = 'writer' | 'director' | 'actor' | 'actress';
// Cast slot designation inside a Movie. Distinct from Talent.role which is now gender-collapsed.
// A 'lead_actor'/'support_actor' slot is filled by a Talent with role='actor';
// a 'lead_actress'/'support_actress' slot is filled by a Talent with role='actress'.
export type CastRole = 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress';

export type MovieType = 'Action' | 'Drama' | 'Comedy' | 'Horror' | 'Sci-Fi' | 'Romance' | 'Thriller' | 'Animation' | 'Fantasy' | 'Mystery';
export type Genre = MovieType;
export type PlotArc = 'Man in a Hole' | 'Rags to Riches' | 'Icarus' | 'Cinderella' | 'Oedipus' | 'Riches to Rags';
export type Rating = 'G' | 'PG' | 'PG-13' | 'R';
export type Brand = 'Original' | 'Sequel' | 'Prequel' | 'Spinoff' | 'Crossover';
export type MovieStatus = 'production' | 'released';
export type ColorTrait = 'red' | 'blue' | 'yellow' | 'purple' | 'green' | 'orange';
export type Gender = 'male' | 'female';
export type Relationship = 'rival' | 'neutral' | 'friend';
export type DealType = 'actor_favored' | 'middle' | 'studio_favored';
export type ContractKind = 'single' | 'pack3' | 'hold5y';
export type HairStyle = 'short' | 'long' | 'curly' | 'wavy' | 'buzz' | 'bun' | 'bald';
export type FacialHair = 'none' | 'mustache' | 'goatee' | 'beard' | 'stubble';
export type ReleaseStrategy = 'theatrical' | 'streaming' | 'hybrid' | 'tv';
export type TierPeriod = 'monthly' | 'quarterly' | 'biannual' | 'yearly';

export interface SubscriptionTier {
  id: string;
  name: string;        // e.g. "Basic" / "Standard" / "Premium" / "Family"
  period: TierPeriod;
  price: number;       // $/period
  screens: number;     // simultaneous screens
  users: number;       // profiles allowed
  isExclusive: boolean;// when true, ONLY movies in `tierMovieIds[tier.id]` (or `exclusiveMovieIds`) are accessible to this tier; otherwise tier sees full catalog
  // V43 — Ad-supported tier: when on, tier carries ads (extra revenue stream).
  // Typically paired with a discounted `price`. Ad revenue = subs × adArpu/mo.
  adSupported?: boolean;
  adArpuUSD?: number;     // optional override; default $5/sub/month if adSupported && undefined
}

export interface LicensedMovie {
  movieId: string;
  expiresWeek: number;
  expiresYear: number;
  tierIds: string[];   // tiers where this licensed title is available; if empty = all tiers
  feePaid: number;     // upfront license fee paid (in $M)
  yearsLicensed: number; // 1, 3, 5, 10
  exclusivity?: boolean; // negotiated — if true, no other studio could license while active
}

export interface StreamingService {
  id: string;
  studioId: string;
  name: string;
  tiers: SubscriptionTier[];
  subscribers: number;          // total active subs across tiers
  tierSubscribers: Record<string, number>; // tierId → sub count
  monthlyRevenue: number;       // last computed monthly run-rate ($M)
  reputation: number;           // 0..100
  catalogMovieIds: string[];    // movie ids included in this service
  launchedYear: number;
  launchedWeek: number;
  history: { week: number; year: number; subscribers: number; revenue: number }[];
  isExclusive?: boolean;        // service-level: when true, ALL catalog gated to top tier
  exclusiveMovieIds?: string[]; // movies in catalog that are gated to top tier(s) only
  // Per-movie tier access map: movieId → tierIds[] that can stream it. Default (missing) = all tiers.
  movieTierAccess?: Record<string, string[]>;
  // Licensed-in titles (from other studios) with expiration dates
  licensedMovies?: LicensedMovie[];
  // Bulk multi-year licensing deals — auto-license rival's future releases.
  bulkLicenseDeals?: BulkLicenseDeal[];
  // Income from outbound IP royalties (paid quarterly).
  outboundRoyaltyQueue?: { bidId: string; nextPayWeek: number; nextPayYear: number; perPaymentM: number; expiresWeek: number; expiresYear: number }[];
  // V43 — Marketing budget for this streaming service ($M/week).
  marketingBudgetM?: number;
  popularity?: number; // added for automated subscriber growth, splitting, or ratings bump
}

export interface BulkLicenseDeal {
  id: string;
  rivalStudioId: string;
  rivalName: string;
  movieCountTotal: number;
  moviesUsed: number;
  signedWeek: number;
  signedYear: number;
  expiresWeek: number;
  expiresYear: number;
  feePaidM: number;
  // OPTIONAL: if set, deal targets a specific franchise (all current + future films
  // of this franchise from the rival auto-license to player's service for the deal term).
  franchiseId?: string;
  // Films awaiting their windowed transfer to player's service after the rival has released them.
  // Each entry contains the eligibility week/year computed at release time based on releaseStrategy:
  //   - theatrical: +8–12 weeks after rival release
  //   - streaming  (rival-exclusive period): +26–52 weeks
  //   - hybrid: +16–32 weeks
  queuedMovies?: { movieId: string; eligibleWeek: number; eligibleYear: number }[];
}

export interface TalentContract {
  studioId: string;
  remainingMovies: number;     // 1, 2, or 3 movies left
  upfrontPaid: number;         // upfront payment in $M
  boPercent: number;           // box office percentage (0-15%)
  perMovieSalary: number;      // calculated per-movie rate
  signedWeek: number;
  signedYear: number;
}

export interface TalentSkillBreakdown {
  // Universal stats (all roles)
  starPower: number;        // 0..100 — was "fame" (alias retained at top-level for compat)
  // Director-only
  directing?: number;
  leadership?: number;
  pacing?: number;
  style?: number;
  // Actor/Actress
  acting?: number;
  range?: number;
  presence?: number;
  accents?: number;
  // Writer
  plot?: number;
  dialogue?: number;
  structure?: number;
  originality?: number;
}

export interface Talent {
  id: string;
  name: string;
  role: Role;
  skill: number;           // legacy composite — kept for back-compat; equals overall avg of skills
  fame: number;
  salary: number;
  movies: number;
  reviewAvg: number;
  totalBO: number;
  avatarColor: string;     // skin
  hairColor: string;
  hairStyle: HairStyle;
  facialHair: FacialHair;
  age: number;             // 22-78
  retired: boolean;
  gender: Gender;
  colorTrait: ColorTrait;  // chemistry with other talents sharing the same color
  growthLog: number[];     // recent fame deltas (last 6)
  underContract?: TalentContract;
  // Granular skills (BOS-style). All optional — back-compat for legacy saves.
  skills?: TalentSkillBreakdown;
  genreSkills?: Partial<Record<MovieType, number>>; // per-genre proficiency 0..100
  // Cooldown: talent unavailable for new productions until this week/year (auto-set 3w post-release)
  availableFromWeek?: number;
  availableFromYear?: number;
  // Lock: which in-production movie they're currently committed to (1 active production at a time)
  inProductionMovieId?: string;
}

export interface Franchise {
  id: string;
  name: string;
  studioId: string;
  movieIds: string[];
  popularity: number;
  iconKey: string;
  iconBg: string;
  lastReleasedWeek: number;
  lastReleasedYear: number;
}

export interface Movie {
  id: string;
  title: string;
  type: MovieType;
  genre: Genre;
  plotArc: PlotArc;
  rating: Rating;
  runtime: number;
  brand: Brand;
  franchiseId?: string;
  parentMovieId?: string;
  crossoverFranchiseIds?: string[];
  studioId: string;
  writerId: string;
  directorId: string;
  cast: { talentId: string; role: CastRole; dealType: DealType; contractKind: ContractKind; salary: number; boPercent: number; roleName?: string; roleDescription?: string }[];
  budget: number;
  marketingBudget: number;
  marketingAllocation?: Record<string, number>; // channelKey → $M allocated
  marketingAuto?: boolean;        // V30 — when true, Marketing Manager auto-optimises allocation each release window
  weeksToRelease: number;
  status: MovieStatus;
  criticScore: number;
  boxOffice: number;
  weeklyBO: number[];
  releaseWeek: number;
  releaseYear: number;
  iconKey: string;
  iconBg: string;
  awards: number;
  plot: string;
  reviews?: { source: string; type: 'audience' | 'critic'; score: number; quote: string }[];
  fatiguePenalty: number;   // -% applied at release (0 if none)
  chemistryBonus: number;   // +% applied at release (cast color chemistry)
  colorBonus?: number;      // legacy alias of chemistryBonus (kept for back-compat)
  holidayBonus: number;     // +% applied at release (0 if none)
  releaseStrategy?: ReleaseStrategy; // theatrical (default) | streaming (exclusive) | hybrid (theatre→streaming) | tv (TV exclusive broadcast)
  tvNetworkId?: string;
  streamingWindowWeeks?: number;     // for hybrid: weeks after theatrical release before adding to streaming
  inStreamingServiceIds?: string[];  // services currently carrying this title
  // For streaming-only releases: pre-selected service+tiers chosen at creation. Auto-applied at release.
  streamingTargetServiceId?: string;
  streamingTargetTierIds?: string[];
  // Whether the release date was set by the player (true) or in "hold" status (false → status='production' but weeksToRelease=Infinity).
  onHold?: boolean;
  // Bidding war flag — once a hit rival movie crosses the BO threshold, news event is fired only once.
  biddingWarFired?: boolean;
  // Target release date (the player picks this in create-movie). Auto-fallback to weeksToRelease if absent.
  targetReleaseWeek?: number;
  targetReleaseYear?: number;
  // Set by player in Movie Details → description editor (overrides procedural `plot` when present)
  userDescription?: string;
  // Festival lot reference — if this movie was sold at a festival, tie-back for UI.
  festivalLotId?: string;
  // External IP attached at creation time (uses one of the studio's owned IP licenses).
  externalIPId?: string;
  ipLicenseId?: string;        // OwnedIPLicense.id used when this movie was made
}

export interface Studio {
  id: string;
  name: string;
  logoBg: string;
  logoIcon: string;
  cash: number;
  totalBO: number;
  releases: number;
  awards: number;
  rating: number;
  isPlayer: boolean;
  unlockedGameGen?: number; // Progressive Unlock level for Gaming Division (1..6)
}

export interface AudienceSegment {
  label: string;            // e.g. "Male 18-35"
  share: number;            // 0..1
  preferredColor: ColorTrait;
  preferredGenres: Genre[];
}

export interface GameState {
  initialized: boolean;
  week: number;             // 1..48
  year: number;
  player: Studio;
  rivals: Studio[];
  movies: Movie[];
  talents: Talent[];
  franchises: Franchise[];
  audience: AudienceSegment[];
  newsLog: { week: number; year: number; text: string; id?: string; kind?: string; title?: string; detail?: string; color?: string }[];
  // Pairwise studio relationship score, key = relKey(idA, idB), -100 (rival) .. +100 (friend)
  relationships: Record<string, number>;
  // Streaming services launched by studios in the world
  streamingServices: StreamingService[];
  // Stored awards record per ceremony year — used by Awards page + Trends
  awardsLog?: AwardCeremony[];
  // Yearly genre BO totals — used by Trends page
  genreYearlyBO?: Record<number, Partial<Record<Genre, number>>>;
  // Yearly audience preferred genre snapshot — used by Trends page
  audienceYearlySnapshot?: Record<number, { label: string; preferredGenres: Genre[]; preferredColor: ColorTrait }[]>;
  // Pending license offers from AI streaming services (NEW)
  pendingOffers?: LicenseOffer[];
  // NEW: Franchise buy/sell trade offers (both directions). Pull-and-push rounds.
  franchiseOffers?: FranchiseOffer[];
  // NEW: Bulk catalog licensing offers (existing movies, pay once for N titles for M years).
  bulkCatalogOffers?: BulkCatalogOffer[];
  // External IP licensing (inbound: agencies → studios)
  externalLicensors?: ExternalLicensor[];
  externalIPs?: ExternalIP[];
  externalIPOffers?: ExternalIPOffer[];   // pending inbound offers
  ownedIPLicenses?: OwnedIPLicense[];     // accepted IP licenses owned by any studio
  // Outbound IP listings (player → external agencies)
  outboundIPListings?: OutboundIPListing[];
  outboundIPBids?: OutboundIPBid[];
  // Player-only royalty payment schedule from outbound IP deals.
  outboundRoyaltyQueue?: { bidId: string; nextPayWeek: number; nextPayYear: number; perPaymentM: number; expiresWeek: number; expiresYear: number }[];
  // Festivals scheduled / in progress / archived (NEW)
  festivals?: Festival[];
  // Cinema distribution deals per region (player-only tracked; AI implicit) (NEW)
  cinemaDeals?: CinemaDeal[];
  // V30 — Cinema Manager: AI-proposed cinema deals awaiting player approval
  cinemaProposals?: CinemaProposal[];
  // V30 — Cinema release-window calendar items (player schedules movies into specific cinema chains/weeks)
  cinemaCalendar?: CinemaSchedule[];
  // V30 — Player-owned cinemas (built & operated directly; 100% cinema-share)
  ownedCinemas?: OwnedCinema[];
  // V32+V30 — Cinema Supplier Deals: rival studios route ALL their traditional/hybrid releases into the player's owned cinemas (revenue share)
  cinemaSupplierDeals?: CinemaSupplierDeal[];
  // V35 — TV Networks
  tvNetworks?: TVNetwork[];          // catalog of all networks (seeded + player-created)
  tvNetworkDeals?: TVNetworkDeal[];  // active/pending licensing deals
  tvSeries?: TVSeries[];             // TV series the player has created
  // V35 — Channel Packs
  channelPacks?: ChannelPack[];
  // V35 — Inbound channel licensing (player buys rival movies to programme)
  channelContentLicenses?: ChannelContentLicense[];
  // V36 — Cable Providers (recurring carriage fee revenue → player networks)
  cableProviders?: CableProvider[];
  cableCarriageDeals?: CableCarriageDeal[];
  // V39 — Manager proposal queues (auto-suggested by tickers; player approves/rejects)
  tvManagerProposals?: TVManagerProposal[];
  cinemaOwnedManagerProposals?: CinemaOwnedManagerProposal[];
  // V41 — Player's own cable carriage networks (compete with AI cable providers)
  playerCableNetworks?: PlayerCableNetwork[];
  // V43 — Weekly ledger of inflows/outflows by category. Reset at start of each tickWeek; accumulated by
  // each tick function. Persistent across multi-week sims via `pendingRecap` accumulator.
  weeklyLedger?: WeeklyLedger;
  // V43 — Persistent rolling history of weekly summaries (last 200 weeks).
  weekHistory?: WeekHistoryRecord[];
  // V43 — Accumulating recap shown after Simulate (Week or Multiple). Cleared on dismiss.
  pendingRecap?: PendingRecap;
  // Gaming Division Properties
  gameEngines?: GameEngine[];
  gamingStudios?: GamingStudioHQ[];
  gamingProjects?: GamingProject[];
  gamingConsoles?: GamingConsole[];
  gamingPasses?: GamingPass[];
  gamingTrends?: GamingTrends;
}

// V43 — Weekly ledger: every tick function adds inflows/outflows by category.
// Snapshot once per simulated week → folded into weekHistory + pendingRecap.
export interface WeeklyLedger {
  week: number;
  year: number;
  // Inflows ($B)
  cinemaBoxOfficeInB: number;        // theatrical share from rival cinemas (player movies opening week onwards)
  ownedCinemaRevB: number;            // owned cinemas gate/concessions
  streamingSubsInB: number;           // owned streaming sub revenue
  streamingAdsInB: number;            // owned streaming ad revenue
  tvNetworkSubsInB: number;           // owned TV channels sub revenue
  tvNetworkAdsInB: number;            // owned TV channels ad revenue
  cableCarriageInB: number;           // carriage fees received from AI cable providers
  playerCableSubsInB: number;         // player-run cable carriage network net (after carriage costs)
  channelPacksInB: number;            // channel pack revenue
  licensingInB: number;               // bulk catalog / franchise / TV deals / cinema supplier accepted
  ipRoyaltiesInB: number;             // outbound IP royalty receipts
  crossoverInB: number;               // royalties for our franchise used in crossover
  gameSalesInB?: number;              // game raw sales revenue
  gamePassSubsInB?: number;           // Game Pass streaming subscriptions revenue
  gameEngineLicensingInB?: number;    // outbound game engine licensing royalties
  miscInB: number;
  // Outflows ($B)
  cinemaOpexB: number;                // owned-cinema opex (operations + amenities)
  streamingServerB: number;           // server / CDN / catalog costs of owned streaming
  tvBroadcastB: number;               // broadcast infra cost for owned TV channels
  cableCarriageOutB: number;          // carriage fees player pays to other channel owners
  productionCostB: number;            // movies & series greenlit this week
  marketingCostB: number;             // marketing spend on per-entity marketing
  licensingOutB: number;              // license fees paid to rivals
  ipRoyaltiesOutB: number;            // royalties paid to external IP licensors
  crossoverOutB: number;              // license fees paid to rival franchise owners for our crossovers
  gamingHardwareOpexB?: number;       // Console R&D and manufacturing cost
  gamingStudioOpexB?: number;         // Gaming HQs base opex & bulk hiring payroll
  miscOutB: number;
  // Stats
  moviesReleased: number;
  seriesReleased: number;
  nominationsWeek: number;
  awardsWeek: number;
}

export interface WeekHistoryRecord extends WeeklyLedger {
  cashEndB: number;     // player cash at end of this week
  totalBOEndB: number;  // player total BO at end of this week
}

// V43 — Accumulator across multi-week sim. Sums all week-ledgers between recap modal dismisses.
export interface PendingRecap {
  // Range covered
  startWeek: number;
  startYear: number;
  endWeek: number;
  endYear: number;
  weeks: number;            // count of simulated weeks in this recap
  startCashB: number;
  endCashB: number;
  // Summed inflows/outflows (same categories as ledger)
  inflows: Omit<WeeklyLedger, 'week' | 'year' | 'cinemaOpexB' | 'streamingServerB' | 'tvBroadcastB' | 'cableCarriageOutB' | 'productionCostB' | 'marketingCostB' | 'licensingOutB' | 'ipRoyaltiesOutB' | 'crossoverOutB' | 'miscOutB' | 'moviesReleased' | 'seriesReleased' | 'nominationsWeek' | 'awardsWeek'>;
  outflows: {
    cinemaOpexB: number;
    streamingServerB: number;
    tvBroadcastB: number;
    cableCarriageOutB: number;
    productionCostB: number;
    marketingCostB: number;
    licensingOutB: number;
    ipRoyaltiesOutB: number;
    crossoverOutB: number;
    miscOutB: number;
  };
  moviesReleased: number;
  seriesReleased: number;
  nominationsWeek: number;
  awardsWeek: number;
}

// V41 — Player-run cable carriage business (Dish/Sky-style: license channels and sell tiered subscriptions)
export interface PlayerCableNetwork {
  id: string;
  name: string;
  region: TVNetworkRegion;
  ownerStudioId: string;        // always player
  subscribers: number;          // millions
  reputation: number;           // 0..100, grows with channel quality
  createdWeek: number;
  createdYear: number;
  // Licensed-in channels (rival or player) — pay each network owner per-sub-per-month
  carriedChannelLicenses: {
    channelId: string;
    feePerSubPerMonthUSD: number;
    signedWeek: number;
    signedYear: number;
    years: number;
  }[];
  // Tier definitions (Basic / Standard / Premium etc.)
  tiers: {
    id: string;
    name: string;
    monthlyFeeUSD: number;
    channelIds: string[];         // subset of carried channels
    includedStreamingServiceIds?: string[]; // bundled streaming benefit (own services only) — DEPRECATED, kept for backward-compat
    // V42c — Per-cable-tier streaming bundle: each entry is one service + one of its tiers.
    // Premium cable tier can bundle the streaming service's premium tier; basic cable bundles basic.
    includedStreamingTiers?: { serviceId: string; tierId: string }[];
    includedChannelPackIds?: string[]; // V42b — bundled channel packs as premium tier add-ons (own packs only)
    ppvEnabled?: boolean;
    subscribers: number;
  }[];
  // Lifetime totals
  lifetimeRevenueB: number;
  // V43 — Marketing budget for the cable network ($M/week).
  marketingBudgetM?: number;
}

// V36 — Cable Providers: aggregators that pay player TV Networks a recurring carriage fee
// per subscriber per month. Region-grouped, similar to cinema chains for movies.
export interface CableProvider {
  id: string;
  name: string;
  region: TVNetworkRegion;
  subscribers: number;          // total subscribers (millions)
  reputation: number;           // 0–100 — drives fee leverage
  // Player-friendliness multiplier on negotiated fees (e.g., budget 0.7, premium 1.3)
  tier: 'budget' | 'standard' | 'premium' | 'public';
}

// A recurring carriage deal between a player-owned channel and a cable provider.
// Revenue: feePerSubPerMonthUSD × providerSubscribers (M) → ticked weekly.
export interface CableCarriageDeal {
  id: string;
  providerId: string;
  channelId: string;            // player-owned channel
  feePerSubPerMonthUSD: number; // negotiated carriage fee
  signedWeek: number;
  signedYear: number;
  expiresWeek: number;
  expiresYear: number;
  years: number;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  // Once-off signing bonus the player paid (or received, if negative would be reversed)
  signingBonusM: number;
  // Lifetime totals (for UI)
  lifetimeRevenueB: number;
}

// V35 — Channel Pack: bundle 2+ owned channels for discounted price → subscriber boost
export interface ChannelPack {
  id: string;
  name: string;
  ownerStudioId: string;
  channelIds: string[];   // 2+ owned channels
  monthlyFeeUSD: number;  // base bundle price (typically < sum of individual fees)
  subscribers: number;    // pack-only subs
  createdWeek: number;
  createdYear: number;
  // V39 — Per-cable-tier price overrides. When set, weekly pack revenue uses tier-weighted
  // pricing: revenue = sum over tiers of (tier subs × tier price). If undefined, `monthlyFeeUSD`
  // applies uniformly to all subscribers (legacy behavior).
  pricingByTier?: { budget: number; standard: number; premium: number };
}

// V35 — Channel content license: player channel buys rights to broadcast a rival's movies
export interface ChannelContentLicense {
  id: string;
  channelId: string;     // player's channel
  rivalStudioId: string; // movie owner
  movieIds: string[];
  feeB: number;
  years: number;
  startWeek: number;
  startYear: number;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  counterFeeB?: number;
}

// Cinema Supplier Deal — long-running blanket distribution agreement where a rival studio
// agrees to project ALL its traditional/hybrid theatrical releases into the player's owned-cinema
// network (in addition to their own chain partners). The player keeps cinema-side revenue; the
// studio gets reach/marketing exposure and a small kickback per release.
export interface CinemaSupplierDeal {
  id: string;
  rivalStudioId: string;             // the studio sending us its movies
  signedWeek: number; signedYear: number;
  expiresWeek: number; expiresYear: number;
  upfrontFeeM: number;               // $M paid by player (or rival) at signing
  upfrontPaidByPlayer: boolean;      // true → player paid rival for exclusive supply; false → rival paid player for distribution
  revShareToPlayer: number;          // 0.0–1.0 share of cinema-side gross routed to player (default 0.85 for owned cinemas)
  perReleaseKickbackM: number;       // extra $M paid to player every time a new film auto-routes in
  includeTraditional: boolean;       // route ‘traditional’ release-style films
  includeHybrid: boolean;             // route ‘hybrid’ release-style films
  // Lifetime stats
  routedReleasesCount: number;
  lifetimeRevenueToPlayerB: number;
}

// V30 — Player-built cinema sizes (screens, costs, opex)
export type OwnedCinemaSize = 'small' | 'medium' | 'large' | 'mega';

export interface OwnedCinema {
  id: string;
  name: string;
  displayName?: string;            // V30 — user-renamed (overrides generated name)
  region: CinemaRegion;
  size: OwnedCinemaSize;
  screens: number;
  buildCost: number;       // $M paid at build
  weeklyOpex: number;      // $M deducted weekly (base — amenities add on top)
  builtWeek: number;
  builtYear: number;
  // V30 — Premium amenities (each adds opex, boosts revenue)
  amenities?: {
    imax?: boolean;            // +$0.4M/wk, +25% revenue
    recliners?: boolean;       // +$0.2M/wk, +12% revenue
    premiumConcessions?: boolean; // +$0.1M/wk, +8% revenue
  };
  // V30 — Lifetime stats for P&L display
  lifetimeRevenueB?: number;
  lifetimeOpexB?: number;
  // V35 — Pricing/concessions/merch customization (multiplicative on revenue, additive on opex)
  ticketPriceLevel?: 'value' | 'standard' | 'premium';   // default 'standard'
  foodLevel?: 'none' | 'basic' | 'premium' | 'gourmet';  // default 'basic'
  merchLevel?: 'none' | 'basic' | 'premium';             // default 'none'
  // Currently playing player movie (auto-assigned at release if scheduled).
  currentMovieId?: string;
  currentRunWeeks?: number;
  // Future or current scheduled runs of player movies in THIS cinema.
  scheduledReleases?: { id: string; movieId: string; fromWeek: number; fromYear: number; weeksToShow: number }[];
  // V43 — Marketing budget for this cinema ($M/week).
  marketingBudgetM?: number;
}

// V30 — Cinema Manager proposal (negotiated by AI agent on player's behalf)
export interface CinemaProposal {
  id: string;
  chainId: string;
  region: CinemaRegion;
  years: number;
  openShare: number;
  lateShare: number;
  guaranteedTheaters: number;
  rationale: string;
  createdWeek: number;
  createdYear: number;
}

// V39 — Manager proposals (suggestions awaiting player approval).
// Generated by tick functions; each carries enough data to apply via existing sim actions.
export type ManagerProposalDirection = 'inbound' | 'outbound';

// TV Network Manager proposal — covers cable carriage (inbound = provider→player channel),
// channel content licensing (inbound = buy rival content for our channel),
// and outbound license-to-rival (player movie → rival channel).
export type TVManagerProposalKind =
  | 'cable_carriage'           // outbound: player offers a channel to a cable provider for $X/sub/mo
  | 'channel_content_license'  // inbound: player channel buys N released movies from a rival
  | 'license_movies_to_rival'  // outbound: player offers a movie pack to a rival's TV network
  ;

export interface TVManagerProposal {
  id: string;
  kind: TVManagerProposalKind;
  direction: ManagerProposalDirection;
  // Refs (only those relevant for the kind are populated)
  channelId?: string;          // player-owned channel
  providerId?: string;         // cable provider
  rivalStudioId?: string;      // for content_license inbound / license_movies_to_rival outbound
  rivalNetworkId?: string;     // for license_movies_to_rival outbound
  movieIds?: string[];
  // Terms
  feePerSubPerMonthUSD?: number; // cable_carriage
  feeB?: number;                 // content_license / license_to_rival
  years: number;
  rationale: string;
  createdWeek: number;
  createdYear: number;
}

// Cinema Owner Manager proposal — owned-cinema supplier deals (inbound = rival pays to route their
// releases into our cinemas) and outbound (we offer route slots to a rival studio).
export type CinemaOwnedManagerKind =
  | 'supplier_deal_inbound'    // rival routes ALL their releases into our cinemas (we get share)
  | 'supplier_deal_outbound'   // we offer slots to rival in our cinemas in exchange for guaranteed fees
  ;

export interface CinemaOwnedManagerProposal {
  id: string;
  kind: CinemaOwnedManagerKind;
  direction: ManagerProposalDirection;
  rivalStudioId: string;
  years: number;
  feeM: number;                  // upfront $M
  includeTraditional: boolean;
  includeHybrid: boolean;
  revShareToPlayer: number;      // 0–1
  rationale: string;
  createdWeek: number;
  createdYear: number;
}

// V30 — Cinema schedule item (which cinema chains will carry which player movie at release)
export interface CinemaSchedule {
  id: string;
  movieId: string;
  chainIds: string[];
  scheduledWeek: number;
  scheduledYear: number;
  createdWeek: number;
  createdYear: number;
}

// Shared negotiation primitive: every trade offer has a round counter so we can
// cap back-and-forth push-and-pull (default 3 rounds each side).
export interface BaseTradeOffer {
  id: string;
  fromStudioId: string;   // party that initiated the offer
  toStudioId: string;     // counterparty
  round: number;          // 0 = initial, +1 each counter
  maxRounds: number;      // default 3
  lastActor: 'from' | 'to';
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdWeek: number;
  createdYear: number;
  message?: string;
  history: { actor: 'from' | 'to'; priceB: number; week: number; year: number }[];
}

export type FranchiseOfferKind = 'buy' | 'sell';
export interface FranchiseOffer extends BaseTradeOffer {
  kind: FranchiseOfferKind;    // 'buy' = fromStudioId wants to buy franchise from toStudioId; 'sell' = fromStudioId wants to sell franchise to toStudioId
  franchiseId: string;
  priceB: number;              // current offered price in $B
}

export interface BulkCatalogOffer extends BaseTradeOffer {
  movieIds: string[];          // the specific catalog titles bundled (empty for future-releases / franchise-bulk deals)
  priceB: number;              // lump-sum fee in $B
  years: number;               // license term length
  serviceId?: string;          // destination streaming service (for player-outgoing and for AI-to-player offers: player's service)
  exclusivity?: boolean;       // when accepted, strips movies from any other streaming service catalog
  // NEW — kind discriminator so the same negotiation pipeline serves multiple deal types:
  //   'catalog'         → license a hand-picked set of existing rival films (default — back-compat)
  //   'future_releases' → bulk-license the rival's NEXT N movie releases over `years` (movieCountTotal carried in `futureMovieCount`)
  //   'franchise_bulk'  → license a whole rival franchise (current films + future releases) for `years`
  dealKind?: 'catalog' | 'future_releases' | 'franchise_bulk';
  franchiseId?: string;        // present when dealKind === 'franchise_bulk'
  futureMovieCount?: number;   // present when dealKind === 'future_releases'
  // V30 — Optional: tier hierarchy chosen at signing — applies to every film auto-added under this deal.
  tierIds?: string[];
}

// ---------------- EXTERNAL IP LICENSING ----------------
export type IPCategory = 'book' | 'video_game' | 'toy' | 'sports' | 'comic' | 'music' | 'streaming';

export interface ExternalLicensor {
  id: string;
  name: string;            // "Mythos Publishing", "Apex Games"
  category: IPCategory;
  reputation: number;      // 0..100 — drives IP popularity baseline & price
}

export interface ExternalIP {
  id: string;
  name: string;            // "The Crimson Mage", "Galaxy Riders"
  licensorId: string;
  category: IPCategory;
  popularity: number;      // 0..100 — boost magnitude for movies built on this IP
  // Studio that holds the (currently active) exclusive license for this IP, if any.
  exclusiveLicenseeStudioId?: string;
}

export interface ExternalIPOffer extends BaseTradeOffer {
  ipId: string;
  feeM: number;            // upfront license fee in $M
  boPercent: number;       // 0..15 — share of player movie BO that goes to licensor
  merchPercent: number;    // 0..30 — share of merchandising revenue (estimated cut)
  years: number;           // 1..10 term length
  packs: number;           // # of films allowed under this license (1..10)
  exclusivity: boolean;    // when true, no other studio can license this IP for the term
  sublicensable: boolean;  // when true, licensee may sublicense to rivals (out of scope this iteration)
  // Player is always the toStudioId for inbound (licensor → studio); fromStudioId stores the licensor.
  // This object is identified as IP-related vs franchise/streaming via being in state.externalIPOffers.
}

export interface OwnedIPLicense {
  id: string;
  ipId: string;
  studioId: string;        // licensee
  feePaidM: number;
  boPercent: number;
  merchPercent: number;
  signedWeek: number;
  signedYear: number;
  expiresWeek: number;
  expiresYear: number;
  packs: number;
  packsUsed: number;
  exclusivity: boolean;
  sublicensable: boolean;
}

// ---------------- OUTBOUND IP LICENSING ----------------
// Player offers their own franchise/movie for spin-off products (games, books, toys, etc.).
export interface OutboundIPListing {
  id: string;
  studioId: string;        // owner (player)
  sourceFranchiseId?: string;
  sourceMovieId?: string;
  category: IPCategory;    // type of spin-off product being offered
  status: 'open' | 'closed';
  createdWeek: number;
  createdYear: number;
  // V25.1 — listing terms set by player
  exclusivity?: boolean;     // exclusive grant — increases fees but only ONE buyer
  sublicensable?: boolean;   // licensee may sublicense — slightly lowers fees but speeds bids
}

export interface OutboundIPBid {
  id: string;
  listingId: string;
  licensorId: string;      // external company making the bid
  feeM: number;
  royaltyPercent: number;  // ongoing royalty paid quarterly to studio
  years: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdWeek: number;
  createdYear: number;
}

// ---------------- FESTIVALS ----------------
export type FestivalSeason = 'Winter' | 'Spring' | 'Summer' | 'Fall';
export type FestivalStatus = 'upcoming' | 'active' | 'concluded';

export interface FestivalLot {
  id: string;
  // The AI-produced indie movie being auctioned. Stored fully (detached clone) so it survives studio ownership changes.
  movieId: string;
  // Reserve / opening bid in $M
  startingBidM: number;
  // Current highest bid in $M, and who bid it (studioId)
  currentBidM: number;
  currentBidderStudioId: string | null;
  // Bidding history (for UI)
  bidLog: { studioId: string; amountM: number; week: number; year: number }[];
  // Once sold, becomes true and transfers ownership; false until then.
  sold: boolean;
  // Winning studio (null if unsold)
  winnerStudioId?: string;
  finalPriceM?: number;
}

export interface Festival {
  id: string;
  name: string;             // "Cannes-Style", "Sundance-Style", etc
  season: FestivalSeason;
  region: 'Europe' | 'North America' | 'Asia' | 'Latin America';
  week: number;             // calendar week when festival opens
  year: number;
  status: FestivalStatus;
  lots: FestivalLot[];
  closedAt?: { week: number; year: number };
}

// ---------------- CINEMA DEALS ----------------
export type CinemaRegion = 'North America' | 'Europe' | 'Latin America' | 'Asia' | 'Oceania' | 'Africa';
export interface CinemaChain {
  id: string;
  name: string;
  region: CinemaRegion;
  theaters: number;         // total screens under this chain
  reputation: number;       // 0..100 — higher = tougher to negotiate, more BO access
}

export interface CinemaDeal {
  id: string;
  chainId: string;
  studioId: string;
  region: CinemaRegion;
  years: number;            // 5..10
  signedWeek: number;
  signedYear: number;
  expiresWeek: number;
  expiresYear: number;
  // Studio share in opening weeks (0.60..0.80) — decays over a movie's run
  openingStudioShare: number;
  // Studio share in late weeks (0.30..0.50)
  lateStudioShare: number;
  // Theater count guaranteed for releases
  guaranteedTheaters: number;
}

export interface AwardNomination {
  movieId: string;
  talentId?: string; // for cast/crew categories
  score: number;     // sort score
}

export interface AwardCategory {
  key: 'best_picture' | 'best_director' | 'best_writer' | 'best_leading_actor' | 'best_supporting_actor';
  label: string;
  nominees: AwardNomination[]; // up to 5
  winnerIdx: number;           // index 0..4
}

export interface AwardCeremony {
  year: number;
  poolKey: 'ricardos' | 'bigpic' | 'indie' | 'guild';
  poolLabel: string;
  categories: AwardCategory[];
}

// Pending license offer from an AI streaming service to license a PLAYER movie
export interface LicenseOffer {
  id: string;
  movieId: string;
  serviceId: string;       // the AI streaming service making the offer
  feeM: number;            // offered fee in $M
  years: number;           // 1, 3, 5, 10
  reasoning: string;       // scripted dialogue
  createdWeek: number;
  createdYear: number;
  expiresWeek: number;     // offer auto-expires after a few weeks
  expiresYear: number;
  round: number;           // 1 = initial offer, 2 = AI counter after player counter
  playerCounterFeeM?: number;
}

// V35 — TV Networks: regional channels that license movies/series; affect streaming audience split.
export type TVChannelKind = 'public' | 'cable' | 'premium';
export type TVNetworkRegion = 'North America' | 'Europe' | 'Latin America' | 'Asia' | 'Oceania' | 'Africa';

export interface TVNetwork {
  id: string;
  name: string;
  displayName?: string;      // V36 — user-renamed (overrides name in UI)
  region: TVNetworkRegion;
  kind: TVChannelKind;       // public, cable, premium
  subscribers: number;       // approx subscribers (millions)
  reputation: number;        // 0-100 (drives bid quality)
  ownerStudioId?: string;    // undefined = neutral AI network; equals player.id if user created
  genreFocus?: string[];     // optional genre tags
  // V35 — player-owned channel operations
  monthlyFeeUSD?: number;            // subscription fee (per sub/month) — only for owned channels
  programmingMovieIds?: string[];    // player movies/IPs being broadcast on this channel
  // V41 — TV series broadcast slots on this channel (in addition to or instead of movies)
  programmingSeriesIds?: string[];
  programmingTVSeriesIds?: string[]; // V36 — TV series being broadcast on this channel
  cableDistributionDeals?: number;   // 0..4 cable operator distribution boosts (+15% subs each)
  // V36 — Soft-delete: when true, channel is decommissioned; revenue stops; can be permanently purged.
  closed?: boolean;
  // V43 — Ad programming ratio (0..1): share of weekly airtime devoted to ads vs programming.
  // Higher = more ad revenue but slight audience attrition. Public channels default higher.
  adProgrammingRatio?: number;
  // V43 — Marketing budget for this channel (entity-level marketing). $M / week.
  marketingBudgetM?: number;
}

// A deal between a studio/movie owner and a TV network for licensed content.
export interface TVNetworkDeal {
  id: string;
  networkId: string;
  studioId: string;          // owner of the licensed IP
  movieIds: string[];        // movies licensed (TV series support coming later)
  feeB: number;              // upfront license fee paid to studio
  years: number;             // term length
  startWeek: number;
  startYear: number;
  status: 'pending' | 'active' | 'expired';
  exclusivity?: boolean;
  // Once active: weekly franchise-popularity boost for the studio, weekly streaming-popularity hit for everyone (audience split)
}

// V35 — TV Series (per-season aggregate). Stub for now; full system in next iteration.
export type TVReleaseStrategy = 'tv' | 'streaming' | 'hybrid';
// V36 — When hybrid, which side premieres first?
export type HybridPriority = 'tv_first' | 'streaming_first';
export interface TVSeries {
  id: string;
  title: string;
  studioId: string;
  franchiseId?: string;
  brand?: 'sequel' | 'prequel' | 'spinoff' | 'original';
  status: 'in_production' | 'released' | 'cancelled';
  releaseYear: number;
  releaseWeek: number;
  releaseStrategy: TVReleaseStrategy;
  // V36 — Hybrid priority: which side launches first
  hybridPriority?: HybridPriority;
  // streaming target (for 'streaming' or 'hybrid')
  streamingTargetServiceId?: string;
  streamingTargetTierIds?: string[];
  streamingWindowWeeks?: number;     // 0 day-and-date, 4, 8, 12
  // tv target (for 'tv' or 'hybrid')
  tvNetworkId?: string;
  seasons: { number: number; episodes: number; budgetM: number; avgScore?: number; renewed?: boolean; releaseWeek?: number; releaseYear?: number }[];
  // Production tracking (current season being produced)
  productionSeason?: number;       // 1-based; undefined once fully released
  productionWeeksLeft?: number;    // weeks until current season releases
  productionTotalWeeks?: number;   // V36 — total production weeks for current season (drives progress bar)
  // V36 — Cast & Crew (subset of CastRole/DealType used in movies for parity)
  writerId?: string;
  directorId?: string;
  cast?: { talentId: string; role: 'lead_actor' | 'lead_actress' | 'support_actor' | 'support_actress'; salary: number }[];
  // V43 — Marketing budget for this series ($M/week, applied while in production + first 12wk after release).
  marketingBudgetM?: number;
}

// =====================================================================
// GAMING DIVISION SUB-SYSTEM STRUCTURES
// =====================================================================

export type GameEngineModule = 'Graphics' | 'Physics' | 'AI' | 'Sound' | 'Networking' | 'UI' | 'Tools' | 'Cloud' | 'VR';

export interface GameEngine {
  id: string;
  name: string;
  studioId: string;
  generation: number; // 1=2D, 2=3D, 3=PhysX, 4=RayTracing, 5=VR, 6=CloudNative
  modules: GameEngineModule[];
  renderQuality: number; // 0..100
  performance: number; // 0..100
  networkStability: number; // 0..100
  toolingEfficiency: number; // 0..100
  licensingValue: number; // 0..100
  licenseFeeM: number; // $M upfront
  royaltyPercent: number; // e.g., 5%
  contractDurationYears: number; // 1, 2, 3, 5
  isVRAble: boolean;
  isCloudNative: boolean;
  licensees?: string[]; // studioIds currently licensing this engine
}

export type GamingStudioType = 'Indie' | 'Mobile' | 'Mid-Tier' | 'AAA' | 'Esports' | 'VR' | 'LiveOps';

export interface GamingStudioHQ {
  id: string;
  name: string;
  studioId: string; // owner
  type: GamingStudioType;
  rooms: string[]; // e.g. ["dev_floor", "qa_lab", "motion_capture", "sound_stage", "liveops_center"]
  staffPools: {
    programmers: number;
    designers: number;
    artists: number;
    qa: number;
    liveops: number;
  };
  salaryBandWeeklyM: number; // Weekly payroll cost in $M
  automated: boolean;
  automationRules?: {
    autoSequel?: boolean;
    franchiseFocus?: boolean;
    monetizationFocus?: 'Premium' | 'GaaS' | 'F2P';
    releaseCadence?: 'rapid' | 'normal' | 'polished';
  };
  upgradesFinishedWeeks?: Record<string, { finishWeek: number; finishYear: number }>; // room_key -> finish date
}

export type GamingProjectPhase = 'Concept' | 'Pre-Production' | 'Production' | 'Alpha' | 'Beta' | 'Gold' | 'LiveOps';

export interface GamingProject {
  id: string;
  title: string;
  genre: 'RPG' | 'Action' | 'Shooter' | 'Strategy' | 'Simulation' | 'Sports' | 'Adventure' | 'MMO';
  subgenre?: string;
  engineId: string;
  studioId: string;
  phase: GamingProjectPhase;
  developmentWeeksSpent: number;
  developmentTotalWeeks: number;
  featuresFocus: {
    graphics: number;
    gameplay: number;
    story: number;
    multiplayer: number;
    ai: number;
    ui: number;
    performance: number;
  };
  bugs: number;
  qualityScore: number; // 0..100 avg focus matching
  criticScore: number; // 0..100
  userScore: number; // 0..100
  monetizationModel: 'Premium' | 'GaaS' | 'F2P' | 'Subscription' | 'AdSupported';
  releaseWeek?: number;
  releaseYear?: number;
  budgetM: number;
  marketingBudgetM: number;
  unitsSold: number; // millions
  lifetimeRevenueB: number; // billions
  weeklyRevenueB: number; // current week revenue B
  weeklyRevenueHistory: number[];
  adaptationMovieId?: string; // synergy mapping
  isVRExclusivity?: boolean;
  isCloudOnly?: boolean;
  liveopsActive?: boolean;
  dlcsCount?: number;
}

export interface GamingConsole {
  id: string;
  title: string;
  studioId: string;
  generation: number;
  specs: {
    cpu: '8-bit' | '16-bit' | '32-bit' | 'Multi-Core' | 'Custom Cloud Architecture' | 'Quantum Hybrid';
    gpu: 'Rasterized' | 'Fixed-Pipeline' | 'Voxel-Shaded' | 'Hardware Ray-Tracing' | 'Haptic Spatial Projection';
    ram: 'KBs' | 'MBs' | 'GBs' | 'Unified High Bandwidth';
    storage: 'Cartridge' | 'Optical' | 'SSD' | 'Direct Streaming';
    backwardCompat: boolean;
    cloudStreaming: boolean;
    onlineServices: boolean;
  };
  rdWeeksLeft: number;
  rdTotalWeeks: number;
  price: number; // selling price to user (e.g. $299 to $699)
  manufacturingCost: number; // internal cost to build
  unitsSold: number; // millions
  marketShare: number; // proportion
  stock: number; // millions of physical units
  subscriberCount: number; // online subscribers (millions)
  status: 'rd' | 'active' | 'retired';
  timedExclusivesSignedMovieIds?: string[];
}

export interface GamingPass {
  id: string;
  studioId: string;
  name: string;
  basicPrice: number; // $/mo
  standardPrice: number;
  premiumPrice: number;
  subscriberCount: number; // millions
  catalogProjectIds: string[]; // only games published by studio
  thirdPartyCatalogIds: string[]; // games licensed from other studios
  monthlyRevenueB: number;
  churnRate?: number;
  adSupported?: boolean;
  enabledConsoleIds?: string[];
}

export interface GamingTrends {
  genreTrend: Record<'RPG' | 'Action' | 'Shooter' | 'Strategy' | 'Simulation' | 'Sports' | 'Adventure' | 'MMO', number>; // 0.5 to 2.0 multiplier
  marketingTolerance: number; // multiplier for marketing spend
  microtransactionBacklash: number; // sentiment index 0=safe, 100=disaster
}


