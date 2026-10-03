import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'search' },
  {
    path: 'search',
    title: 'Search · PriceHunt',
    loadComponent: () => import('./search/search.component').then((m) => m.SearchComponent),
  },
  {
    path: 'history',
    title: 'History · PriceHunt',
    loadComponent: () => import('./history/history.component').then((m) => m.HistoryComponent),
  },
  { path: '**', redirectTo: 'search' },
];
