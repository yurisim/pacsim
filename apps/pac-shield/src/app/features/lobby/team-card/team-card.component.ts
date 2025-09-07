import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { Team, Player, Game } from '../../../generated';

export interface RoleGroup {
  role: string;
  players: Player[];
}

@Component({
  selector: 'app-team-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-card class="md-elevation-1">
      <mat-card-header class="pb-2">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-white"
              [style.background-color]="teamTypeInfo.color"
            >
              <mat-icon [fontIcon]="teamTypeInfo.icon" class="text-lg"></mat-icon>
            </div>
            <div>
              <h4 class="md-typescale-title-medium font-bold m-0">
                {{ team.name }}
                @if (team.locked) {
                <mat-icon
                  fontIcon="lock"
                  class="text-sm ml-1 md-sys-color-error"
                  matTooltip="Team locked"
                ></mat-icon>
                }
              </h4>
              <p class="md-typescale-body-small md-sys-color-on-surface-variant m-0">
                {{ team.players?.length || 0 }} personnel
              </p>
            </div>
          </div>

          <!-- GM Tools -->
          @if (showGMTools) {
          <div class="flex gap-2">
            <button
              mat-icon-button
              (click)="assignOneUnassigned.emit()"
              matTooltip="Assign one unassigned player"
              [disabled]="unassignedCount === 0"
            >
              <mat-icon fontIcon="person_add"></mat-icon>
            </button>
            <button
              mat-icon-button
              (click)="toggleLock.emit()"
              [matTooltip]="team.locked ? 'Unlock team' : 'Lock team'"
            >
              <mat-icon [fontIcon]="team.locked ? 'lock_open' : 'lock'"></mat-icon>
            </button>
          </div>
          }
        </div>
      </mat-card-header>

      <mat-card-content [class.dense]="dense">
        <!-- Role-grouped roster -->
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
            >
              <div class="flex items-center gap-2">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  [class.w-6]="dense"
                  [class.h-6]="dense"
                  [style.background-color]="teamTypeInfo.color"
                >
                  {{ player.name.charAt(0).toUpperCase() }}
                </div>
                <span class="font-medium" [class.text-sm]="dense">
                  {{ player.name }}
                </span>
              </div>

              <!-- GM Player Menu -->
              @if (showGMTools) {
              <button
                mat-icon-button
                size="small"
                [matMenuTriggerFor]="playerMenu"
                [matMenuTriggerData]="{player: player, teams: allTeams}"
              >
                <mat-icon fontIcon="more_vert"></mat-icon>
              </button>
              }
            </div>
            }
          </div>
        </div>
        }
        }

        <!-- Join Button -->
        @if (currentPlayer && !showGMTools) {
        <button
          matButton="outlined"
          (click)="joinTeam.emit()"
          [disabled]="isCurrentPlayerOnTeam || team.locked"
          class="w-full mt-4"
        >
          <mat-icon
            [fontIcon]="
              isCurrentPlayerOnTeam
                ? 'check_circle'
                : team.locked
                ? 'lock'
                : 'add'
            "
            class="mr-2"
          ></mat-icon>
          {{
            isCurrentPlayerOnTeam
              ? 'Current Team'
              : team.locked
              ? 'Team Locked'
              : 'Join Team'
          }}
        </button>
        }
      </mat-card-content>
    </mat-card>

    <!-- Player Context Menu Template -->
    <mat-menu #playerMenu="matMenu">
      <ng-template matMenuContent let-player="player" let-teams="teams">
        <h6 class="px-4 py-2 font-medium md-sys-color-primary m-0">{{ player.name }}</h6>
        <mat-divider></mat-divider>

        <button mat-menu-item (click)="changeRole.emit(player)">
          <mat-icon fontIcon="person"></mat-icon>
          <span>Change Role</span>
        </button>

        <button mat-menu-item (click)="moveToTeam.emit(player)">
          <mat-icon fontIcon="group"></mat-icon>
          <span>Move to Team</span>
        </button>

        @if (player.teamId) {
        <button mat-menu-item (click)="removeFromTeam.emit(player)">
          <mat-icon fontIcon="logout"></mat-icon>
          <span>Remove from Team</span>
        </button>
        }

        <mat-divider></mat-divider>
        <button mat-menu-item (click)="removeFromGame.emit(player)" class="md-sys-color-error">
          <mat-icon fontIcon="delete" class="md-sys-color-error"></mat-icon>
          <span>Remove from Game</span>
        </button>
      </ng-template>
    </mat-menu>
  `
})
export class TeamCardComponent {
  @Input() team!: Team;
  @Input() roleGroups: RoleGroup[] = [];
  @Input() teamTypeInfo!: { icon: string; color: string };
  @Input() currentPlayer?: Player;
  @Input() allTeams: Team[] = [];
  @Input() showGMTools = false;
  @Input() dense = false;
  @Input() unassignedCount = 0;

  @Output() joinTeam = new EventEmitter<void>();
  @Output() assignOneUnassigned = new EventEmitter<void>();
  @Output() toggleLock = new EventEmitter<void>();
  @Output() changeRole = new EventEmitter<Player>();
  @Output() moveToTeam = new EventEmitter<Player>();
  @Output() removeFromTeam = new EventEmitter<Player>();
  @Output() removeFromGame = new EventEmitter<Player>();

  get isCurrentPlayerOnTeam(): boolean {
    return this.currentPlayer?.teamId === this.team.id;
  }
}