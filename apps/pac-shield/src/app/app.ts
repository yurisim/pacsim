import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { WebSocketService } from './shared/services/websocket.service';
import { AuthService } from './shared/services/auth.service';
import { ThemeService } from './shared/services/theme.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
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

  // Breadcrumb navigation state
  protected currentGameId: string | null = null;
  protected showGameBreadcrumb = false;

  ngOnInit(): void {
    this.ws.connect('lobby');
    
    // Listen for route changes to update breadcrumb
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateBreadcrumb();
    });
    
    // Initial breadcrumb update
    this.updateBreadcrumb();
  }

  private updateBreadcrumb(): void {
    const url = this.router.url;
    
    // Extract gameId from current route
    const gameMatch = url.match(/\/(?:lobby|game)\/([^\/]+)/);
    if (gameMatch) {
      this.currentGameId = gameMatch[1];
      this.showGameBreadcrumb = url.includes('/game/');
    } else {
      this.currentGameId = null;
      this.showGameBreadcrumb = false;
    }
  }

  protected navigateToLobby(): void {
    if (this.currentGameId) {
      this.router.navigate(['/lobby', this.currentGameId]);
    }
  }

  onLogout(): void {
    // Clear JWT + cached player and gracefully reset socket, then reconnect baseline for status
    this.auth.logout();
    this.ws.connect('lobby');
    this.router.navigate(['/']);
  }

  onToggleTheme(): void {
    this.themeService.toggleTheme();
  }
}

