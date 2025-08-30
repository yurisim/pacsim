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
      import('./features/game/game-board/game-board.component').then((m) => m.GameBoardComponent),
  },
  {
    path: '',
    redirectTo: 'join',
    pathMatch: 'full',
  },
];
