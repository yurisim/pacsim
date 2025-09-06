import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
  protected themeService = inject(ThemeService);

  ngOnInit(): void {
    this.ws.connect('lobby');
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

