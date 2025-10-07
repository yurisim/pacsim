import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { WebSocketService } from './shared/services/websocket.service';
import { AuthService } from './shared/services/auth.service';
import { ThemeService } from './shared/services/theme.service';
import { NotificationService } from './shared/services/notification.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { ThemeToggleComponent } from './core/theme-toggle/theme-toggle.component';

@Component({
  imports: [
    RouterModule,
    MatToolbarModule,
    AsyncPipe,
    CommonModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatBadgeModule,
    ThemeToggleComponent
  ],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  standalone: true,
})
export class App implements OnInit {
  protected title = 'OPERATION: PACIFIC SHIELD';
  protected ws = inject(WebSocketService);
  protected auth = inject(AuthService);
  protected router = inject(Router);
  protected route = inject(ActivatedRoute);
  protected themeService = inject(ThemeService);
  protected notificationService = inject(NotificationService);

  // Navigation state
  protected currentGameId: string | null = null;

  ngOnInit(): void {
    this.ws.connect('lobby');

    // Listen for route changes to update navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateNavigation();
      this.updateNotifications();
    });

    // Initial navigation update
    this.updateNavigation();
    this.updateNotifications();
  }

  private updateNavigation(): void {
    const url = this.router.url;

    // Extract gameId from current route
    const gameMatch = url.match(/\/(?:lobby|game)\/([^\\/]+)/);
    if (gameMatch) {
      this.currentGameId = gameMatch[1];
    } else {
      this.currentGameId = null;
    }
  }

  private updateNotifications(): void {
    const gameId = this.auth.getGameId();
    if (gameId) {
      // Connect to notifications when in a game
      this.notificationService.connectToGame(Number(gameId));
    } else {
      // Disconnect when not in a game
      this.notificationService.disconnectFromGame();
    }
  }

  protected navigateToLobby(): void {
    if (this.currentGameId) {
      this.router.navigate(['/lobby', this.currentGameId]);
    }
  }

  protected navigateToMap(): void {
    if (this.currentGameId) {
      this.router.navigate(['/game', this.currentGameId]);
    }
  }

  onLogout(): void {
    // Clear JWT + cached player and gracefully reset socket, then reconnect baseline for status
    this.auth.logout();
    this.notificationService.disconnectFromGame();
    this.ws.connect('lobby');
    this.router.navigate(['/']);
  }

  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

