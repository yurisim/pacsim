import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ApiService } from '../../shared/services/api.service';
import { AuthService } from '../../shared/services/auth.service';
import { CreateGameDto, Game } from '../../generated';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    ClipboardModule,
    ToastModule,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  private apiService = inject(ApiService);
  private router = inject(Router);
  private clipboard = inject(Clipboard);
  private messageService = inject(MessageService);
  private authService = inject(AuthService);

  isLoading = false;
  roomCode: string | null = null;
  errorMessage: string | null = null;

  createGame(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.roomCode = null;

    const createGameDto: CreateGameDto = { victoryConditionMP: 1000 };

    this.apiService.post<Game>('game/create', createGameDto).subscribe({
      next: (game) => {
        this.roomCode = game.roomCode;
        this.authService.joinGame(game.roomCode).subscribe({
          next: () => {
            const gameId = this.authService.getGameId();
            if (gameId) {
              this.router.navigate(['/lobby', gameId]);
            } else {
              this.errorMessage =
                'Game created, but failed to auto-join. Please join manually.';
              this.isLoading = false;
            }
          },
          error: (joinError) => {
            this.errorMessage =
              joinError.error?.message ||
              'Game created, but failed to auto-join.';
            this.isLoading = false;
          },
        });
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || 'Failed to create a new game.';
        this.isLoading = false;
      },
    });
  }

  copyRoomCode(): void {
    if (this.roomCode) {
      this.clipboard.copy(this.roomCode);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Room code copied to clipboard',
      });
    }
  }

  navigateToJoin(): void {
    this.router.navigate(['/join']);
  }
}
