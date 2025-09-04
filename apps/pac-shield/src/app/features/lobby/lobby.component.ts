import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { EMPTY, Observable, map } from 'rxjs';
import { JoinTeamDialogComponent } from './join-team-dialog/join-team-dialog.component';
import { PlayerSettingsDialogComponent, PlayerSettings } from './player-settings-dialog/player-settings-dialog.component';
import { WebSocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';

enum PlayerRole {
  PLAYER = 'PLAYER',
  COMMANDER = 'COMMANDER',
  DEPUTY = 'DEPUTY',
  STRATEGIST = 'STRATEGIST',
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    ButtonModule,
    ClipboardModule,
    ToastModule,
    DynamicDialogModule,
    InputTextModule,
    AutoCompleteModule,
    ReactiveFormsModule,
    PlayerSettingsDialogComponent,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
  providers: [MessageService, DialogService],
})
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private clipboard = inject(Clipboard);
  private messageService = inject(MessageService);
  private dialogService = inject(DialogService);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);

  game$: Observable<Game> = EMPTY;
  currentPlayer$: Observable<Player | undefined> = EMPTY;
  playerRoles = Object.values(PlayerRole);
  showPlayerSettingsDialog = false;

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.game$ = this.apiService.get<Game>(`game/${gameId}`);

      // Set up current player observable
      const playerId = this.authService.getPlayerId();
      if (playerId) {
        this.currentPlayer$ = this.game$.pipe(
          map(game => game.players?.find(player => player.id === parseInt(playerId)) || undefined)
        );
      }

      this.webSocketService.connect(gameId);
      this.webSocketService.listen('playerJoined').subscribe(() => {
        this.game$ = this.apiService.get<Game>(`game/${gameId}`);
        // Update current player when game data refreshes
        const playerId = this.authService.getPlayerId();
        if (playerId) {
          this.currentPlayer$ = this.game$.pipe(
            map(game => game.players?.find(player => player.id === parseInt(playerId)) || undefined)
          );
        }
      });
    }
  }

  copyRoomCode(roomCode: string): void {
    this.clipboard.copy(roomCode);
    this.messageService.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Room code copied to clipboard',
    });
  }

  openJoinTeamDialog(team: Team): void {
    const ref = this.dialogService.open(JoinTeamDialogComponent, {
      header: `Join ${team.name}`,
      width: '70%',
      data: {
        teamId: team.id,
        roles: this.playerRoles,
      },
    });

    ref.onClose.subscribe((playerData: Omit<Player, 'id' | 'team'>) => {
      if (playerData) {
        this.apiService
          .post<Player>('player', {
            ...playerData,
            team: { connect: { id: team.id } },
          })
          .subscribe(() => {
            // Refresh game data
            this.ngOnInit();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Joined ${team.name} as ${playerData.name}`,
            });
          });
      }
    });
  }

  openPlayerSettings(): void {
    this.showPlayerSettingsDialog = true;
  }

  onPlayerSettingsSave(settings: PlayerSettings): void {
    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Not Authenticated',
        detail: 'Please rejoin the game.',
      });
      return;
    }

    this.apiService.updatePlayerNameAndRole(playerId, settings.name, settings.role).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Settings Updated',
          detail: 'Your name and role have been updated',
        });
        this.showPlayerSettingsDialog = false;
        // Refresh game data
        const gameId = this.route.snapshot.paramMap.get('gameId');
        if (gameId) {
          this.game$ = this.apiService.get<Game>(`game/${gameId}`);
          // Update current player when game data refreshes
          const playerId = this.authService.getPlayerId();
          if (playerId) {
            this.currentPlayer$ = this.game$.pipe(
              map(game => game.players?.find(player => player.id === parseInt(playerId)) || undefined)
            );
          }
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err.error?.message || 'Failed to update settings',
        });
      },
    });
  }

  onPlayerSettingsCancel(): void {
    console.log('🚫 Lobby onPlayerSettingsCancel called');
    this.showPlayerSettingsDialog = false;
    console.log('🚫 showPlayerSettingsDialog set to false');
  }

  formatRoleDisplay(role: string): string {
    return role || 'PLAYER';
  }
}
