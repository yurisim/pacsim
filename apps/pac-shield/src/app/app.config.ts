import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { gameReducer } from './core/store/game/game.reducer';
import { provideEffects } from '@ngrx/effects';
import { GameEffects } from './core/store/game/game.effects';
import { authInterceptor } from './shared/interceptors/auth.interceptor';
import { ApiLoggingInterceptor } from './shared/interceptors/api-logging.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideStore({ game: gameReducer }),
    provideEffects(GameEffects),
    provideStoreDevtools({ maxAge: 25, logOnly: !isDevMode() }),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: HTTP_INTERCEPTORS, useClass: ApiLoggingInterceptor, multi: true },
  ],
};
