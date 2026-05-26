/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GameProvider } from './game/state';
import { MovieDraftProvider } from './game/draft';
import { usePathname } from './mocks/expo-router';

// Screen Imports
import IndexScreen from '../app/index';
import SetupScreen from '../app/setup';
import DashboardScreen from '../app/dashboard';
import MoviesScreen from '../app/movies';
import CreateMovieScreen from '../app/create-movie';
import CurrentMoviesScreen from '../app/current-movies';
import StreamingScreen from '../app/streaming';
import StreamingDetailScreen from '../app/streaming/[id]';
import StreamingLaunchScreen from '../app/streaming/launch';
import CinemasScreen from '../app/cinemas';
import TvNetworksScreen from '../app/tv-networks';
import SeriesScreen from '../app/series';
import SeriesDetailScreen from '../app/series/[id]';
import MovieDetailScreen from '../app/movie/[id]';
import FranchiseDetailScreen from '../app/franchise/[id]';
import FranchisesScreen from '../app/franchises';
import MarketingIndexScreen from '../app/marketing/index';
import MarketingDetailScreen from '../app/marketing/[movieId]';
import TalentScreen from '../app/talent';
import TalentDetailScreen from '../app/talent/[id]';
import NegotiateScreen from '../app/negotiate/[talentId]';
import FinancialsScreen from '../app/financials';
import StudioStatsScreen from '../app/studio-stats';
import RivalsScreen from '../app/rivals';
import OffersScreen from '../app/offers';
import ExternalIpScreen from '../app/external-ip';
import FestivalsScreen from '../app/festivals';
import TrendsScreen from '../app/trends';
import StudioDetailScreen from '../app/studio/[id]';
import AwardsScreen from '../app/awards';
import CalendarScreen from '../app/calendar';
import GamingDashboardScreen from '../app/gaming';

function MainRouter() {
  const currentPath = usePathname();

  // Route resolver mapping virtual paths to react screens
  const [basePath] = currentPath.split('?');
  const parts = basePath.split('/').filter(Boolean);
  const main = parts[0] || '';
  const sub = parts[1] || '';

  let ScreenComponent: React.ComponentType<any> = IndexScreen;

  switch (main) {
    case 'setup':
      ScreenComponent = SetupScreen;
      break;
    case 'dashboard':
      ScreenComponent = DashboardScreen;
      break;
    case 'movies':
      ScreenComponent = MoviesScreen;
      break;
    case 'create-movie':
    case 'create-series':
      ScreenComponent = CreateMovieScreen;
      break;
    case 'current-movies':
      ScreenComponent = CurrentMoviesScreen;
      break;
    case 'cinemas':
      ScreenComponent = CinemasScreen;
      break;
    case 'tv-networks':
      ScreenComponent = TvNetworksScreen;
      break;
    case 'series':
      ScreenComponent = sub ? SeriesDetailScreen : SeriesScreen;
      break;
    case 'movie':
      ScreenComponent = sub ? MovieDetailScreen : IndexScreen;
      break;
    case 'franchise':
      ScreenComponent = sub ? FranchiseDetailScreen : IndexScreen;
      break;
    case 'franchises':
      ScreenComponent = FranchisesScreen;
      break;
    case 'marketing':
      ScreenComponent = sub ? MarketingDetailScreen : MarketingIndexScreen;
      break;
    case 'talent':
      // Detail screen vs search roster
      ScreenComponent = sub ? TalentDetailScreen : TalentScreen;
      break;
    case 'negotiate':
      ScreenComponent = sub ? NegotiateScreen : IndexScreen;
      break;
    case 'streaming':
      if (sub === 'launch') {
        ScreenComponent = StreamingLaunchScreen;
      } else if (sub) {
        ScreenComponent = StreamingDetailScreen;
      } else {
        ScreenComponent = StreamingScreen;
      }
      break;
    case 'studio':
      ScreenComponent = sub ? StudioDetailScreen : IndexScreen;
      break;
    case 'studio-stats':
      ScreenComponent = StudioStatsScreen;
      break;
    case 'financials':
      ScreenComponent = FinancialsScreen;
      break;
    case 'rivals':
      ScreenComponent = RivalsScreen;
      break;
    case 'offers':
      ScreenComponent = OffersScreen;
      break;
    case 'external-ip':
      ScreenComponent = ExternalIpScreen;
      break;
    case 'festivals':
      ScreenComponent = FestivalsScreen;
      break;
    case 'trends':
      ScreenComponent = TrendsScreen;
      break;
    case 'gaming':
      ScreenComponent = GamingDashboardScreen;
      break;
    case 'awards':
      ScreenComponent = AwardsScreen;
      break;
    case 'calendar':
      ScreenComponent = CalendarScreen;
      break;
    default:
      ScreenComponent = IndexScreen;
  }

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ScreenComponent />
    </div>
  );
}

import { GlobalAlert } from './ui/ui-alert';

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <MovieDraftProvider>
          <div style={{ width: '100vw', height: '100vh', backgroundColor: '#02020e', overflow: 'auto', color: 'white' }}>
            <MainRouter />
            <GlobalAlert />
          </div>
        </MovieDraftProvider>
      </GameProvider>
    </SafeAreaProvider>
  );
}
