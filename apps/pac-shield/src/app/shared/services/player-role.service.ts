import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { map, distinctUntilChanged, shareReplay, take } from 'rxjs/operators';
import { AppState } from '../../core/store/app.state';
import { selectGame } from '../../core/store/game/game.selectors';
import { AuthService } from './auth.service';
import { Game } from '../../generated';
import { PlayerRole } from '../../generated/enums';
import { Player as GeneratedPlayer } from '../../generated/player/player.entity';

/**
 * Service that manages player roles and permissions in a centralized way.
 *
 * This service:
 * - Derives the current player's role from game state
 * - Provides reactive streams for role changes
 * - Centralizes permission logic for UI components
 * - Eliminates the need for prop drilling of currentPlayerRole
 */
@Injectable({
  providedIn: 'root'
})
export class PlayerRoleService {
  private store = inject(Store<AppState>);
  private authService = inject(AuthService);

  /**
   * Observable stream of the current player's role.
   * Emits the role string ('GM', 'COMMANDER', etc.) or null if no role.
   */
  currentRole$ = this.store.select(selectGame).pipe(
    map(game => this.derivePlayerRole(game)),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Observable stream indicating if the current player can manage FOS.
   * True for Game Masters and MOB Commanders.
   */
  canManageFos$ = this.currentRole$.pipe(
    map(role => role === 'GM' || role === 'COMMANDER'),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Observable stream indicating if the current player is a Game Master.
   */
  isGameMaster$ = this.currentRole$.pipe(
    map(role => role === 'GM'),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Observable stream indicating if the current player is a MOB Commander.
   */
  isMobCommander$ = this.currentRole$.pipe(
    map(role => role === 'COMMANDER'),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Observable stream of the current player's team ID.
   */
  currentTeamId$ = this.store.select(selectGame).pipe(
    map(game => this.derivePlayerTeamId(game)),
    distinctUntilChanged(),
    shareReplay(1)
  );

  /**
   * Synchronously get the current player's role.
   * Useful for guards and immediate checks.
   *
   * @returns The current PlayerRole or null
   */
  getCurrentRole(): PlayerRole | null {
    let currentRole: PlayerRole | null = null;
    this.currentRole$.pipe(take(1)).subscribe(role => currentRole = role);
    return currentRole;
  }

  /**
   * Synchronously check if the current player can manage FOS.
   *
   * @returns True if player can manage FOS, false otherwise
   */
  canCurrentPlayerManageFos(): boolean {
    const role = this.getCurrentRole();
    return role === 'GM' || role === 'COMMANDER';
  }

  /**
   * Synchronously check if the current player is a Game Master.
   *
   * @returns True if player is GM, false otherwise
   */
  isCurrentPlayerGameMaster(): boolean {
    return this.getCurrentRole() === 'GM';
  }

  /**
   * Synchronously check if the current player is a MOB Commander.
   *
   * @returns True if player is MOB Commander, false otherwise
   */
  isCurrentPlayerMobCommander(): boolean {
    return this.getCurrentRole() === 'COMMANDER';
  }

  /**
   * Derive the player's role from the current game state.
   *
   * @param game Current game object from the store
   * @returns PlayerRole or null if no role found
   */
  private derivePlayerRole(game: Game | null): PlayerRole | null {
    const authPlayer = this.authService.getPlayer();
    if (!authPlayer?.sessionId || !game?.players) return null;

    // Find the player in the game's player list by sessionId (since authPlayer has sessionId)
    const gamePlayer = game.players.find(p => p.sessionId === authPlayer.sessionId) as GeneratedPlayer | undefined;
    if (!gamePlayer) return null;

    // Return the player's role directly from the player object
    return gamePlayer.role || null;
  }

  /**
   * Derive the player's team ID from the current game state.
   *
   * @param game Current game object from the store
   * @returns Team ID or null if no team found
   */
  private derivePlayerTeamId(game: Game | null): number | null {
    const authPlayer = this.authService.getPlayer();
    if (!authPlayer?.sessionId || !game?.players) return null;

    // Find the player in the game's player list by sessionId
    const gamePlayer = game.players.find(p => p.sessionId === authPlayer.sessionId) as GeneratedPlayer | undefined;
    return gamePlayer?.teamId || null;
  }
}