import { Component, Input, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Game, Player, Team } from '../../../generated';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="p-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <mat-card class="text-center md-elevation-1">
          <mat-card-content class="p-4">
            <div class="md-typescale-display-small md-sys-color-primary font-bold">
              {{ totalPlayers }}
            </div>
            <div class="md-typescale-body-medium md-sys-color-on-surface-variant">
              Total Players
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="text-center md-elevation-1">
          <mat-card-content class="p-4">
            <div class="md-typescale-display-small md-sys-color-secondary font-bold">
              {{ unassignedCount }}
            </div>
            <div class="md-typescale-body-medium md-sys-color-on-surface-variant">
              Unassigned
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="text-center md-elevation-1">
          <mat-card-content class="p-4">
            <div class="md-typescale-display-small md-sys-color-tertiary font-bold">
              {{ teamsMissingCommander }}
            </div>
            <div class="md-typescale-body-medium md-sys-color-on-surface-variant">
              Teams Missing Commander
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Quick Team Summary -->
      <h3 class="md-typescale-headline-small mb-4">Team Summary</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (team of teams; track team.id) {
        <mat-card class="md-elevation-1">
          <mat-card-content class="p-4">
            <div class="flex items-center gap-3 mb-2">
              <mat-icon
                [style.color]="getTeamTypeInfo(team).color"
              >{{getTeamTypeInfo(team).icon}}</mat-icon>
              <div>
                <h4 class="md-typescale-title-medium font-bold m-0">{{ team.name }}</h4>
                <p class="md-typescale-body-small md-sys-color-on-surface-variant m-0">
                  {{ team.players?.length || 0 }} personnel
                </p>
              </div>
            </div>
            @if (currentPlayer) {
            <button
              matButton="outlined"
              size="small"
              (click)="joinTeam.emit(team)"
              [disabled]="isCurrentPlayerOnTeam(team, currentPlayer)"
            >
              {{
                isCurrentPlayerOnTeam(team, currentPlayer)
                  ? 'Current Team'
                  : 'Join Team'
              }}
            </button>
            }
          </mat-card-content>
        </mat-card>
        }
      </div>
    </div>
  `
})
export class OverviewTabComponent {
  @Input() teams: Team[] = [];
  @Input() currentPlayer?: Player;
  @Input() totalPlayers = 0;
  @Input() unassignedCount = 0;
  @Input() teamsMissingCommander = 0;
  @Input() getTeamTypeInfo!: (team: Team) => { icon: string; color: string };

  @Output() joinTeam = new EventEmitter<Team>();

  isCurrentPlayerOnTeam(team: Team, currentPlayer: Player | undefined): boolean {
    return currentPlayer?.teamId === team.id;
  }
}
