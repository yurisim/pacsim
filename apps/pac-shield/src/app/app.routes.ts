import { Routes } from '@angular/router';
import { sessionAuthGuard } from './shared/guards/session-auth.guard';

export const appRoutes: Routes = [
  {
    path: 'join',
    loadComponent: () =>
      import('./features/join/shell/join-shell.component').then((m) => m.JoinShellComponent),
  },
  {
    path: 'game/:id',
    canActivate: [sessionAuthGuard],
    loadComponent: () =>
      import('./features/game/game-board.component').then((m) => m.GameBoardComponent),
  },
  {
    path: 'lobby/:gameId',
    canActivate: [sessionAuthGuard],
    loadComponent: () =>
      import('./features/lobby/lobby.component').then((m) => m.LobbyComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
];
