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
import { GameMasterSetupComponent, GameMasterInfo } from '../game-master-setup/game-master-setup.component';

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
    GameMasterSetupComponent,
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
  showGameMasterSetup = false;
  createdGame: Game | null = null;

  createGame(): void {
    // Do not disconnect the socket here; guard no longer runs on root so we can keep the status "Connected".
    this.isLoading = true;
    this.errorMessage = null;
    this.roomCode = null;

    const createGameDto: CreateGameDto = { victoryConditionMP: 1000 };

    this.apiService.post<Game>('game/create', createGameDto).subscribe({
      next: (game) => {
        this.createdGame = game;
        this.roomCode = game.roomCode;
        this.showGameMasterSetup = true;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err.error?.message || 'Failed to create a new game.';
        this.isLoading = false;
      },
    });
  }

  onGameMasterSetupComplete(gameMasterInfo: GameMasterInfo): void {
    if (!this.createdGame) return;

    this.isLoading = true;
    this.authService.createGameMaster(
      this.createdGame.roomCode, 
      gameMasterInfo.lastName,
      gameMasterInfo.pin
    ).subscribe({
      next: () => {
        const gameId = this.authService.getGameId();
        if (gameId) {
          this.router.navigate(['/lobby', gameId]);
        } else {
          this.errorMessage =
            'Game created, but failed to register as game master. Please join manually.';
          this.isLoading = false;
          this.showGameMasterSetup = false;
        }
      },
      error: (joinError) => {
        this.errorMessage =
          joinError.error?.message ||
          'Game created, but failed to register as game master.';
        this.isLoading = false;
        this.showGameMasterSetup = false;
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
