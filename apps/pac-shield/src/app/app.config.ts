import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { appRoutes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Material from '@primeuix/themes/material';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { gameReducer } from './core/store/game/game.reducer';
import { provideEffects } from '@ngrx/effects';
import { GameEffects } from './core/store/game/game.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ game: gameReducer }),
    provideEffects(GameEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Material,
        options: {
          darkModeSelector: 'system',
        },
      },
    }),
    provideRouter(appRoutes),
    provideHttpClient(),
    MessageService,
  ],
};
