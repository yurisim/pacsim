import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Player, Team } from '../../../generated';

@Component({
  selector: 'app-player-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <!-- Simple card variant for unassigned players -->
    @if (variant === 'simple') {
    <mat-card class="md-elevation-1 interactive-surface text-center md-sys-bg-surface-container">
      <mat-card-content class="md-padding-md">
        <div class="flex items-center justify-between mb-3">
          <div class="w-12 h-12 mx-auto md-sys-bg-secondary-container md-shape-corner-full flex items-center justify-center">
            <span class="md-typescale-title-medium md-sys-color-on-secondary-container font-medium">
              {{ player.name.charAt(0).toUpperCase() }}
            </span>
          </div>

          <!-- GM Player Menu -->
          @if (showGMMenu) {
          <button
            mat-icon-button
            [matMenuTriggerFor]="playerMenu"
            [matMenuTriggerData]="{player: player, teams: allTeams}"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
          }
        </div>
        <div class="md-typescale-body-large md-sys-color-on-surface font-medium">
          {{ player.name }}
        </div>
        <div class="md-typescale-body-small md-sys-color-on-surface-variant">
          {{ formatRoleDisplay(player.role) }}
        </div>
      </mat-card-content>
    </mat-card>
    }

    <!-- List variant for all players view -->
    @if (variant === 'list') {
    <mat-card class="md-elevation-1">
      <mat-card-content class="p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
              style="background-color: var(--mat-sys-primary)"
            >
              {{ player.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h4 class="md-typescale-title-medium font-bold m-0">{{ player.name }}</h4>
              <div class="flex items-center gap-2 text-sm md-sys-color-on-surface-variant">
                <span>{{ formatRoleDisplay(player.role) }}</span>
                @if (player.team) {
                <span class="mx-1">•</span>
                <span class="md-sys-color-primary">{{ player.team.name }}</span>
                } @else {
                <span class="mx-1">•</span>
                <span class="md-sys-color-error">Unassigned</span>
                }
              </div>
            </div>
          </div>

          <!-- GM Player Menu -->
          @if (showGMMenu) {
          <button
            mat-icon-button
            [matMenuTriggerFor]="playerMenu"
            [matMenuTriggerData]="{player: player, teams: allTeams}"
          >
            <mat-icon>more_vert</mat-icon>
          </button>
          }
        </div>
      </mat-card-content>
    </mat-card>
    }

    <!-- Player Context Menu Template -->
    <mat-menu #playerMenu="matMenu">
      <ng-template matMenuContent let-player="player" let-teams="teams">
        <div class="px-4 py-2 font-medium md-sys-color-primary m-0">{{ player.name }}</div>
        <mat-divider></mat-divider>

        <button mat-menu-item [matMenuTriggerFor]="roleSubmenu" [matMenuTriggerData]="{player: player}">
          <mat-icon>person</mat-icon>
          <span>Change Role</span>
        </button>

        <button mat-menu-item [matMenuTriggerFor]="teamSubmenu" [matMenuTriggerData]="{player: player, teams: teams}">
          <mat-icon>group</mat-icon>
          <span>Move to Team</span>
        </button>

        @if (player.teamId) {
        <button mat-menu-item (click)="removeFromTeam.emit(player)">
          <mat-icon>logout</mat-icon>
          <span>Remove from Team</span>
        </button>
        }

        <mat-divider></mat-divider>
        <button mat-menu-item (click)="removeFromGame.emit(player)" class="md-sys-color-error">
          <mat-icon class="md-sys-color-error">delete</mat-icon>
          <span>Remove from Game</span>
        </button>
      </ng-template>
    </mat-menu>

    <!-- Role Selection Submenu -->
    <mat-menu #roleSubmenu="matMenu">
      <ng-template matMenuContent let-player="player">
        @for (role of playerRoles; track role) {
        <button mat-menu-item (click)="changeRole.emit({player: player, role: role})">
          {{ role }}
        </button>
        }
      </ng-template>
    </mat-menu>

    <!-- Team Selection Submenu -->
    <mat-menu #teamSubmenu="matMenu">
      <ng-template matMenuContent let-player="player" let-teams="teams">
        @for (team of teams; track team.id) {
        <button mat-menu-item (click)="moveToTeam.emit({player: player, team: team})" [disabled]="team.locked">
          <mat-icon>{{getTeamTypeInfo(team).icon}}</mat-icon>
          {{ team.name }}
          @if (team.locked) {
          <mat-icon>lock</mat-icon>
          }
        </button>
        }
      </ng-template>
    </mat-menu>
  `
})
export class PlayerCardComponent {
  @Input() player!: Player;
  @Input() variant: 'simple' | 'list' = 'simple';
  @Input() showGMMenu = false;
  @Input() allTeams: Team[] = [];
  @Input() playerRoles: string[] = ['GM', 'COMMANDER', 'DEPUTY', 'LNO', 'PLAYER'];
  @Input() getTeamTypeInfo!: (team: Team) => { icon: string; color: string };

  @Output() changeRole = new EventEmitter<{player: Player, role: string}>();
  @Output() moveToTeam = new EventEmitter<{player: Player, team: Team}>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();

  formatRoleDisplay(role: string | null | undefined): string {
    return role || 'PLAYER';
  }
}
