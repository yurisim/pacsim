import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../shared/services/api.service';
import { Game, Player, Team } from '../../generated';
import { EMPTY, Observable, map, firstValueFrom } from 'rxjs';
import { WebSocketService } from '../../shared/services/websocket.service';
import { AuthService } from '../../shared/services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../shared/services/notification.service';
import { PlayerSettingsDialogComponent, PlayerSettings } from './player-settings-dialog/player-settings-dialog.component';
import { RoomCodeDisplayComponent } from './room-code-display/room-code-display.component';
import { CurrentPlayerActionsComponent } from './current-player-actions/current-player-actions.component';
import { OverviewTabComponent } from './overview-tab/overview-tab.component';
import { TeamsTabComponent } from './teams-tab/teams-tab.component';
import { UnassignedTabComponent } from './unassigned-tab/unassigned-tab.component';
import { AllPlayersTabComponent } from './all-players-tab/all-players-tab.component';
import { GmPlayerMenusComponent } from './gm-player-menus/gm-player-menus.component';
import { FilterOptions } from './filter-bar/filter-bar.component';
import { RoleGroup } from './team-card/team-card.component';


enum PlayerRole {
  PLAYER = 'PLAYER',
  COMMANDER = 'COMMANDER',
  DEPUTY = 'DEPUTY',
  LNO = 'LNO',
}



@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatDialogModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    RoomCodeDisplayComponent,
    CurrentPlayerActionsComponent,
    OverviewTabComponent,
    TeamsTabComponent,
    UnassignedTabComponent,
    AllPlayersTabComponent,
    GmPlayerMenusComponent,
  ],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss'],
})
export class LobbyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private apiService = inject(ApiService);
  private notification = inject(NotificationService);
  private webSocketService = inject(WebSocketService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  game$: Observable<Game> = EMPTY;
  currentPlayer$: Observable<Player | undefined> = EMPTY;
  playerRoles = Object.values(PlayerRole);

  // UI State
  activeTabIndex = 0; // 0=Overview,1=Teams,2=Unassigned,3=Players

  // Filters - centralized filter state
  filters: FilterOptions = {
    searchTerm: '',
    filterTeamType: 'ALL',
    filterRole: 'ALL',
    filterUnassignedOnly: false,
    hideEmptyTeams: true,
    dense: true
  };

  // Fixed role order for grouping
  readonly roleOrder: string[] = ['GM', 'COMMANDER', 'DEPUTY', 'LNO', 'PLAYER'];

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

      // Connect WebSocket and join the game room using roomCode
      this.webSocketService.connect(gameId);
      this.game$.subscribe(game => {
        if (game?.roomCode) {
          this.webSocketService.joinGameRoom(game.roomCode);
        }
      });

      // Refresh on server signals that roster changed or a player joined
      const refreshGameData = () => {
        this.game$ = this.apiService.get<Game>(`game/${gameId}`);
        const playerId = this.authService.getPlayerId();
        if (playerId) {
          this.currentPlayer$ = this.game$.pipe(
            map(game => game.players?.find(player => player.id === parseInt(playerId)) || undefined)
          );
        }
      };

      this.webSocketService.listen('playerJoined').subscribe(refreshGameData);
      this.webSocketService.listen('playerListUpdate').subscribe(refreshGameData);
    }
  }

  // Filter handlers
  onFiltersChange(filters: FilterOptions): void {
    this.filters = { ...filters };
  }

  // Navigation
  navigateToMap(): void {
    const gameId = this.route.snapshot.paramMap.get('gameId');
    if (gameId) {
      this.router.navigate(['/game', gameId]);
    }
  }

  /**
   * Allows the current player to join a specific team.
   * Validates authentication and calls the API to assign the player to the team.
   * Shows success/error notifications and relies on WebSocket for real-time updates.
   * @param team - The team object to join
   */
  openJoinTeamDialog(team: Team): void {
    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.notification.error('Not authenticated. Please rejoin the game.');
      return;
    }

    this.apiService.joinTeam(playerId, team.id!).subscribe({
      next: () => {
        this.notification.success(`Joined ${team.name}`);
        // WebSocket event will refresh game data automatically
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to join team');
      },
    });
  }

  /**
   * Removes the current player from their assigned team.
   * Validates authentication and calls the API to remove team assignment.
   * Shows success/error notifications and relies on WebSocket for real-time updates.
   */
  leaveCurrentTeam(): void {
    const playerId = this.authService.getPlayerId();
    if (!playerId) {
      this.notification.error('Not authenticated. Please rejoin the game.');
      return;
    }

    this.apiService.leaveTeam(playerId).subscribe({
      next: () => {
        this.notification.success('Left current team');
        // WebSocket event will refresh game data automatically
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to leave team');
      },
    });
  }

  /**
   * Opens the player settings dialog for editing name and role.
   * Retrieves current player data, shows dialog, and processes changes.
   * Updates the player via API and shows notifications. Relies on WebSocket for real-time updates.
   * @returns Promise that resolves when the dialog interaction is complete
   */
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
          // WebSocket event will refresh game data automatically
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

  // Team categorization helpers
  getMOBTeams(teams: Team[]): Team[] {
    const list = teams.filter(team => team.type?.startsWith('MOB_'));
    return this.filters.hideEmptyTeams ? list.filter(t => (t.players?.length || 0) > 0) : list;
  }

  getCommandControlTeams(teams: Team[]): Team[] {
    const list = teams.filter(team => team.type === 'CAOC' || team.type === 'CSPOC');
    return this.filters.hideEmptyTeams ? list.filter(t => (t.players?.length || 0) > 0) : list;
  }

  getSupportTeams(teams: Team[]): Team[] {
    const list = teams.filter(team => team.type === 'MEDCOM' || team.type === 'GM');
    return this.filters.hideEmptyTeams ? list.filter(t => (t.players?.length || 0) > 0) : list;
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

  // Computed properties for sub-components
  filteredPlayers(game: Game | undefined): Player[] {
    const players = (game?.players || []);
    return players.filter(p => {
      const team = (game?.teams || []).find(t => t.id === p.teamId);
      const searchOk = !this.filters.searchTerm?.trim() || p.name.toLowerCase().includes(this.filters.searchTerm.trim().toLowerCase());
      const roleOk = this.filters.filterRole === 'ALL' || (p.role || '').toUpperCase() === this.filters.filterRole;
      const teamTypeOk = this.filters.filterTeamType === 'ALL' || this.matchesTeamType(team);
      const unassignedOk = !this.filters.filterUnassignedOnly || !p.teamId;
      return searchOk && roleOk && teamTypeOk && unassignedOk;
    });
  }

  filteredUnassigned(game: Game | undefined): Player[] {
    return this.filteredPlayers(game).filter(p => !p.teamId);
  }

  private matchesTeamType(team: Team | undefined): boolean {
    if (this.filters.filterTeamType === 'ALL') return true;
    if (!team?.type) return false;
    if (this.filters.filterTeamType === 'MOB') return team.type.startsWith('MOB_');
    return team.type === this.filters.filterTeamType;
  }

  // Group roster by role for a team, ordered by roleOrder
  groupPlayersByRole = (team: Team | undefined): RoleGroup[] => {
    const players = (team?.players || []).filter(p => {
      const searchOk = !this.filters.searchTerm?.trim() || p.name.toLowerCase().includes(this.filters.searchTerm.trim().toLowerCase());
      const roleOk = this.filters.filterRole === 'ALL' || (p.role || '').toUpperCase() === this.filters.filterRole;
      return searchOk && roleOk && !this.filters.filterUnassignedOnly;
    });
    const roleMap = new Map<string, Player[]>();
    for (const p of players) {
      const r = (p.role || 'PLAYER').toUpperCase();
      if (!roleMap.has(r)) roleMap.set(r, []);
      roleMap.get(r)!.push(p);
    }
    const result: RoleGroup[] = [];
    for (const r of this.roleOrder) {
      if (roleMap.has(r)) result.push({ role: r, players: roleMap.get(r)! });
    }
    // Include any unexpected roles at the end
    for (const [r, plist] of roleMap.entries()) {
      if (!this.roleOrder.includes(r)) result.push({ role: r, players: plist });
    }
    return result;
  };

  // GM Functions
  isCurrentPlayerGM(game: Game | undefined): boolean {
    const playerId = this.authService.getPlayerId();
    if (!playerId || !game?.players) return false;
    const currentPlayer = game.players.find(p => p.id === parseInt(playerId));
    return (currentPlayer?.role || '').toUpperCase() === 'GM';
  }


  assignOneUnassigned(teamId: number): void {
    this.apiService.assignOneUnassigned(teamId).subscribe({
      next: () => {
        this.notification.success('Assigned one unassigned player');
        // WebSocket event will refresh game data automatically
      },
      error: (err) => {
        this.notification.error(err.error?.message || 'Failed to assign player');
      },
    });
  }

  // GM Action Handlers - for structured events from GM menus
  onChangeRole(event: { player: Player, role: string }): void {
    this.apiService.updatePlayerRole(event.player.id!.toString(), event.role).subscribe({
      next: () => {
        this.notification.success('Player role updated');
        // WebSocket event will refresh game data automatically
      },
      error: (err) => this.notification.error(err.error?.message || 'Failed to update player role')
    });
  }

  onMoveToTeam(event: { player: Player, team: Team }): void {
    this.apiService.joinTeam(event.player.id!.toString(), event.team.id!).subscribe({
      next: () => {
        this.notification.success('Player moved to team');
        // WebSocket event will refresh game data automatically
      },
      error: (err) => this.notification.error(err.error?.message || 'Failed to move player')
    });
  }

  onRemoveFromTeam(player: Player): void {
    this.apiService.leaveTeam(player.id!.toString()).subscribe({
      next: () => {
        this.notification.success('Player removed from team');
        // WebSocket event will refresh game data automatically
      },
      error: (err) => this.notification.error(err.error?.message || 'Failed to remove player from team')
    });
  }

  onRemoveFromGame(player: Player): void {
    this.apiService.deletePlayer(player.id!.toString()).subscribe({
      next: () => {
        this.notification.success('Player removed from game');
        // WebSocket event will refresh game data automatically
      },
      error: (err) => this.notification.error(err.error?.message || 'Failed to remove player')
    });
  }

  onToggleTeamLock(team: Team): void {
    const action = team.locked ? this.apiService.unlockTeam(team.id!) : this.apiService.lockTeam(team.id!);
    action.subscribe({
      next: () => {
        this.notification.success(`Team ${team.locked ? 'unlocked' : 'locked'}`);
        // WebSocket event will refresh game data automatically
      },
      error: (err) => this.notification.error(err.error?.message || `Failed to ${team.locked ? 'unlock' : 'lock'} team`)
    });
  }
}
