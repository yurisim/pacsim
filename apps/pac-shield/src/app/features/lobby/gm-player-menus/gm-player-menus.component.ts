import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Player, Team } from '../../../generated';

@Component({
  selector: 'app-gm-player-menus',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <!-- Main Player Context Menu -->
    <mat-menu #gmPlayerMenu="matMenu">
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
  `,
  exportAs: 'gmPlayerMenus'
})
export class GmPlayerMenusComponent {
  @Input() playerRoles: string[] = ['GM', 'COMMANDER', 'DEPUTY', 'LNO', 'PLAYER'];
  @Input() getTeamTypeInfo!: (team: Team) => { icon: string; color: string };

  @Output() changeRole = new EventEmitter<{player: Player, role: string}>();
  @Output() moveToTeam = new EventEmitter<{player: Player, team: Team}>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();
}
