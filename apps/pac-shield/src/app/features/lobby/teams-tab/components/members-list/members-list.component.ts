import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { Player, Team } from '../../../../../generated';

export interface RoleGroup {
  role: string;
  players: Player[];
}

@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatMenuModule, MatDividerModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (roleGroup of roleGroups; track roleGroup.role) {
      @if (roleGroup.players.length > 0) {
        <div class="mb-3">
          <h5 class="md-typescale-label-medium md-sys-color-primary font-medium mb-2">
            {{ roleGroup.role }} ({{ roleGroup.players.length }})
          </h5>
          <div class="space-y-2">
            @for (player of roleGroup.players; track player.id) {
              <div
                class="flex items-center justify-between p-2 md-sys-bg-surface-variant md-shape-corner-sm"
                [class.py-1]="dense"
                data-testid="members-list-row"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    [class.w-6]="dense"
                    [class.h-6]="dense"
                    [style.background-color]="color"
                    aria-hidden="true"
                  >
                    {{ player.name.charAt(0).toUpperCase() }}
                  </div>
                  <span class="font-medium" [class.text-sm]="dense">
                    {{ player.name }}
                  </span>
                </div>

                @if (showGMTools) {
                  <button
                    mat-icon-button
                    size="small"
                    [matMenuTriggerFor]="memberPlayerMenu"
                    [matMenuTriggerData]="{player: player}"
                    aria-label="Open player actions"
                  >
                    <mat-icon>more_vert</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
    }

    <!-- Player Context Menu Template isolated within list -->
    <mat-menu #memberPlayerMenu="matMenu">
      <ng-template matMenuContent let-player="player">
        <h6 class="px-4 py-2 font-medium md-sys-color-primary m-0">{{ player.name }}</h6>
        <mat-divider></mat-divider>

        <button mat-menu-item [matMenuTriggerFor]="roleSubmenu" [matMenuTriggerData]="{player: player}">
          <mat-icon>person</mat-icon>
          <span>Change Role</span>
        </button>

        <button mat-menu-item [matMenuTriggerFor]="teamSubmenu" [matMenuTriggerData]="{player: player, teams: allTeams}">
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
export class MembersListComponent {
  @Input() roleGroups: RoleGroup[] = [];
  @Input() color = 'var(--mat-sys-primary)'; // derived from teamTypeInfo.color by parent
  @Input() showGMTools = false;
  @Input() dense = false;
  @Input() allTeams: Team[] = [];
  @Input() playerRoles: string[] = ['GM', 'COMMANDER', 'DEPUTY', 'LNO', 'PLAYER'];
  @Input() getTeamTypeInfo!: (team: Team) => { icon: string; color: string };

  @Output() changeRole = new EventEmitter<{player: Player, role: string}>();
  @Output() moveToTeam = new EventEmitter<{player: Player, team: Team}>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();
}
