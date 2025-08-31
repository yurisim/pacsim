import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'join',
    loadComponent: () =>
      import('./features/join/join.component').then((m) => m.JoinComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () =>
      import('./features/game/game-board.component').then((m) => m.GameBoardComponent),
  },
  {
    path: 'lobby/:gameId',
    loadComponent: () =>
      import('./features/lobby/lobby.component').then((m) => m.LobbyComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
];
