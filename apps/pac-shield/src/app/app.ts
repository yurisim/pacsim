import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { WebSocketService } from './shared/services/websocket.service';
import { AuthService } from './shared/services/auth.service';

import { ButtonModule } from 'primeng/button';

@Component({
  imports: [RouterModule, ToolbarModule, AsyncPipe, CommonModule, ButtonModule],
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

  ngOnInit(): void {
    this.ws.connect('lobby');
  }

  onLogout(): void {
    // Clear JWT + cached player and gracefully reset socket, then reconnect baseline for status
    this.auth.logout();
    this.ws.connect('lobby');
    this.router.navigate(['/']);
  }
}

