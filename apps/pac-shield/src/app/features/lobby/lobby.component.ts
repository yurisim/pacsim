import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { EMPTY, Observable, map, firstValueFrom } from 'rxjs';
import { WebSocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../shared/services/notification.service';
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
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatDialogModule,
    MatIconModule,
    MatTabsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSidenavModule,
    MatMenuModule,
    MatTooltipModule,
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

  // UI State
  activeTabIndex = 0; // 0=Overview,1=Teams,2=Unassigned,3=Players
  showFilters = false;
  gmToolsOpened = false;

  // Filters
  searchTerm = '';
  filterTeamType: 'ALL' | 'MOB' | 'CAOC' | 'CSPOC' | 'MEDCOM' | 'GM' = 'ALL';
  filterRole: 'ALL' | 'PLAYER' | 'COMMANDER' | 'DEPUTY' | 'STRATEGIST' | 'GM' = 'ALL';
  filterUnassignedOnly = false;
  hideEmptyTeams = true;
  dense = true; // density toggle

  // Fixed role order for grouping
  readonly roleOrder: string[] = ['GM', 'COMMANDER', 'DEPUTY', 'STRATEGIST', 'PLAYER'];

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
      // Refresh on server signals that roster changed or a player joined
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
      this.webSocketService.listen('playerListUpdate').subscribe(() => {
        this.game$ = this.apiService.get<Game>(`game/${gameId}`);
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

  // Icon/color metadata for teams (kept minimal for template binding)
  getTeamTypeInfo(team: Team): { icon: string; color: string } {
    switch (team.type) {
      case 'CAOC': return { icon: 'account_tree', color: 'var(--mat-sys-primary)' };
      case 'CSPOC': return { icon: 'public', color: 'var(--mat-sys-tertiary)' };
      case 'MOB_KADENA': return { icon: 'flag', color: 'var(--mat-sys-secondary)' };
      case 'MOB_ANDERSEN': return { icon: 'explore', color: 'var(--mat-sys-secondary)' };
      case 'MOB_YOKOTA': return { icon: 'send', color: 'var(--mat-sys-secondary)' };
      case 'MOB_OSAN': return { icon: 'shield', color: 'var(--mat-sys-secondary)' };
      case 'MOB_JBPHH': return { icon: 'star', color: 'var(--mat-sys-secondary)' };
      case 'MEDCOM': return { icon: 'favorite', color: 'var(--mat-sys-error)' };
      case 'GM': return { icon: 'settings', color: 'var(--mat-sys-primary)' };
      default: return { icon: 'group', color: 'var(--mat-sys-outline)' };
    }
  }

  isMOBTeam(team: Team): boolean {
    return team.type?.startsWith('MOB_') || false;
  }

  isCurrentPlayerOnTeam(team: Team, currentPlayer: Player | undefined): boolean {
    return currentPlayer?.teamId === team.id;
  }

  // Existing helpers retained; additional filter-aware variants below.
  getMOBTeams(teams: Team[]): Team[] {
    const list = teams.filter(team => team.type?.startsWith('MOB_'));
    return this.hideEmptyTeams ? list.filter(t => (t.players?.length || 0) > 0) : list;
  }

  getCommandControlTeams(teams: Team[]): Team[] {
    const list = teams.filter(team => team.type === 'CAOC' || team.type === 'CSPOC');
    return this.hideEmptyTeams ? list.filter(t => (t.players?.length || 0) > 0) : list;
  }

  getSupportTeams(teams: Team[]): Team[] {
    const list = teams.filter(team => team.type === 'MEDCOM' || team.type === 'GM');
    return this.hideEmptyTeams ? list.filter(t => (t.players?.length || 0) > 0) : list;
  }

  // KPI helpers
  totalPlayers(game: Game | undefined): number {
    return game?.players?.length || 0;
  }
  unassignedCount(game: Game | undefined): number {
    return (game?.players || []).filter(p => !p.teamId).length;
  }
  teamsMissingCommander(game: Game | undefined): number {
    return (game?.teams || []).filter(t => !(t.players || []).some(p => (p.role || '').toUpperCase() === 'COMMANDER')).length;
  }

  // Filters
  private matchesSearch(name: string): boolean {
    if (!this.searchTerm?.trim()) return true;
    return name.toLowerCase().includes(this.searchTerm.trim().toLowerCase());
  }

  private matchesRole(role: string | null | undefined): boolean {
    if (this.filterRole === 'ALL') return true;
    return (role || '').toUpperCase() === this.filterRole;
  }

  private matchesTeamType(team: Team | undefined): boolean {
    if (this.filterTeamType === 'ALL') return true;
    if (!team?.type) return false;
    if (this.filterTeamType === 'MOB') return team.type.startsWith('MOB_');
    return team.type === this.filterTeamType;
  }

  filteredPlayers(game: Game | undefined): Player[] {
    const players = (game?.players || []);
    return players.filter(p => {
      const team = (game?.teams || []).find(t => t.id === p.teamId);
      const unassignedOk = this.filterUnassignedOnly ? !p.teamId : true;
      return this.matchesSearch(p.name) && this.matchesRole(p.role) && this.matchesTeamType(team) && unassignedOk;
    });
  }

  filteredUnassigned(game: Game | undefined): Player[] {
    return this.filteredPlayers(game).filter(p => !p.teamId);
  }

  // Group roster by role for a team, ordered by roleOrder
  groupPlayersByRole(team: Team | undefined): { role: string; players: Player[] }[] {
    const players = (team?.players || []).filter(p =>
      this.matchesSearch(p.name) && this.matchesRole(p.role) && (!this.filterUnassignedOnly)
    );
    const roleMap = new Map<string, Player[]>();
    for (const p of players) {
      const r = (p.role || 'PLAYER').toUpperCase();
      if (!roleMap.has(r)) roleMap.set(r, []);
      roleMap.get(r)!.push(p);
    }
    const result: { role: string; players: Player[] }[] = [];
    for (const r of this.roleOrder) {
      if (roleMap.has(r)) result.push({ role: r, players: roleMap.get(r)! });
    }
    // Include any unexpected roles at the end
    for (const [r, plist] of roleMap.entries()) {
      if (!this.roleOrder.includes(r)) result.push({ role: r, players: plist });
    }
    return result;
  }

  // GM Functions
  isCurrentPlayerGM(game: Game | undefined): boolean {
    const playerId = this.authService.getPlayerId();
    if (!playerId || !game?.players) return false;
    const currentPlayer = game.players.find(p => p.id === parseInt(playerId));
    return (currentPlayer?.role || '').toUpperCase() === 'GM';
  }

  lockTeam(teamId: number): void {
    this.apiService.lockTeam(teamId).subscribe({
      next: () => {
        this.notification.success('Team locked');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to lock team');
      },
    });
  }

  unlockTeam(teamId: number): void {
    this.apiService.unlockTeam(teamId).subscribe({
      next: () => {
        this.notification.success('Team unlocked');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to unlock team');
      },
    });
  }

  assignOneUnassigned(teamId: number): void {
    this.apiService.assignOneUnassigned(teamId).subscribe({
      next: () => {
        this.notification.success('Assigned one unassigned player');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to assign player');
      },
    });
  }

  updatePlayerRole(playerId: number, role: string): void {
    this.apiService.updatePlayerRole(playerId.toString(), role).subscribe({
      next: () => {
        this.notification.success('Player role updated');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to update player role');
      },
    });
  }

  removePlayerFromGame(playerId: number): void {
    this.apiService.deletePlayer(playerId.toString()).subscribe({
      next: () => {
        this.notification.success('Player removed from game');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to remove player');
      },
    });
  }

  movePlayerToTeam(playerId: number, teamId: number): void {
    this.apiService.joinTeam(playerId.toString(), teamId).subscribe({
      next: () => {
        this.notification.success('Player moved to team');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to move player');
      },
    });
  }

  removePlayerFromTeam(playerId: number): void {
    this.apiService.leaveTeam(playerId.toString()).subscribe({
      next: () => {
        this.notification.success('Player removed from team');
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to remove player from team');
      },
    });
  }
}
