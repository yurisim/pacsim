import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { EMPTY, Observable, map, firstValueFrom } from 'rxjs';
import { WebSocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NotificationService } from '../../shared/services/notification.service';
import { UnassignedPlayersPipe } from '../../shared/pipes/unassigned-players.pipe';
import { PlayerSettingsDialogComponent, PlayerSettings } from './player-settings-dialog/player-settings-dialog.component';


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
    ClipboardModule,
    ReactiveFormsModule,
    UnassignedPlayersPipe,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private clipboard = inject(Clipboard);
  private notification = inject(NotificationService);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  game$: Observable<Game> = EMPTY;
  currentPlayer$: Observable<Player | undefined> = EMPTY;
  playerRoles = Object.values(PlayerRole);

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
    this.notification.success('Room code copied to clipboard');
  }

  openJoinTeamDialog(team: Team): void {
    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.notification.error('Not authenticated. Please rejoin the game.');
      return;
    }

    this.apiService.joinTeam(playerId, team.id!).subscribe({
      next: () => {
        this.notification.success(`Joined ${team.name}`);
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
        this.notification.error(err.error?.message || 'Failed to join team');
      },
    });
  }

  leaveCurrentTeam(): void {
    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.notification.error('Not authenticated. Please rejoin the game.');
      return;
    }

    this.apiService.leaveTeam(playerId).subscribe({
      next: () => {
        this.notification.success('Left current team');
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
        this.notification.error(err.error?.message || 'Failed to leave team');
      },
    });
  }

  async openPlayerSettings(): Promise<void> {
    const current = await firstValueFrom(this.currentPlayer$);
    const dialogRef = this.dialog.open(PlayerSettingsDialogComponent, {
      width: '480px',
      data: {
        currentName: current?.name ?? '',
        currentRole: (current?.role as any) ?? 'PLAYER',
      },
      disableClose: false,
      autoFocus: true,
      restoreFocus: true,
    });

    const result: PlayerSettings | undefined = await firstValueFrom(dialogRef.afterClosed());
    if (result) {
      const playerId = this.authService.getPlayerId();
      if (!playerId) {
        this.notification.error('Not authenticated. Please rejoin the game.');
        return;
      }

      this.apiService.updatePlayerNameAndRole(playerId, result.name, result.role).subscribe({
        next: () => {
          this.notification.success('Your name and role have been updated');
          // Refresh game data
          const gameId = this.route.snapshot.paramMap.get('gameId');
          if (gameId) {
            this.game$ = this.apiService.get<Game>(`game/${gameId}`);
            // Update current player when game data refreshes
            const playerId2 = this.authService.getPlayerId();
            if (playerId2) {
              this.currentPlayer$ = this.game$.pipe(
                map(game => game.players?.find(player => player.id === parseInt(playerId2)) || undefined)
              );
            }
          }
        },
        error: (err) => {
          this.notification.error(err.error?.message || 'Failed to update settings');
        },
      });
    }
  }



  formatRoleDisplay(role: string): string {
    return role || 'PLAYER';
  }

  getTeamTypeInfo(team: Team): { icon: string; severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'; color: string } {
    if (!team.type) {
      return { icon: 'group', severity: 'secondary', color: 'gray' };
    }

    switch (team.type) {
      case 'CAOC':
        return { icon: 'account_tree', severity: 'info', color: 'blue' };
      case 'CSPOC':
        return { icon: 'public', severity: 'contrast', color: 'purple' };
      case 'MOB_KADENA':
        return { icon: 'flag', severity: 'success', color: 'green' };
      case 'MOB_ANDERSEN':
        return { icon: 'explore', severity: 'success', color: 'teal' };
      case 'MOB_YOKOTA':
        return { icon: 'send', severity: 'success', color: 'cyan' };
      case 'MOB_OSAN':
        return { icon: 'shield', severity: 'success', color: 'indigo' };
      case 'MOB_JBPHH':
        return { icon: 'star', severity: 'success', color: 'blue' };
      case 'MEDCOM':
        return { icon: 'favorite', severity: 'danger', color: 'red' };
      case 'GM':
        return { icon: 'settings', severity: 'warn', color: 'orange' };
      default:
        return { icon: 'group', severity: 'secondary', color: 'gray' };
    }
  }

  isMOBTeam(team: Team): boolean {
    return team.type?.startsWith('MOB_') || false;
  }

  isCurrentPlayerOnTeam(team: Team, currentPlayer: Player | undefined): boolean {
    return currentPlayer?.teamId === team.id;
  }

  getMOBTeams(teams: Team[]): Team[] {
    return teams.filter(team => team.type?.startsWith('MOB_'));
  }

  getCommandControlTeams(teams: Team[]): Team[] {
    return teams.filter(team => team.type === 'CAOC' || team.type === 'CSPOC');
  }

  getSupportTeams(teams: Team[]): Team[] {
    return teams.filter(team => team.type === 'MEDCOM' || team.type === 'GM');
  }
}
