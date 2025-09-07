import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MembersListComponent } from '../teams-tab/components/members-list/members-list.component';
import { Team, Player } from '../../../generated';

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
    MatDividerModule,
    MembersListComponent
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
        <app-members-list
          [roleGroups]="roleGroups"
          [color]="teamTypeInfo.color"
          [showGMTools]="showGMTools"
          [dense]="dense"
          (changeRole)="changeRole.emit($event)"
          (moveToTeam)="moveToTeam.emit($event)"
          (removeFromTeam)="removeFromTeam.emit($event)"
          (removeFromGame)="removeFromGame.emit($event)"
        ></app-members-list>

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
