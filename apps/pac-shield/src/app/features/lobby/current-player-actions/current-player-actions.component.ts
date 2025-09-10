import { Component, Input, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Player } from '../../../generated';

@Component({
  selector: 'app-current-player-actions',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <mat-card class="md-elevation-1 mb-8 w-full max-w-2xl md-sys-bg-surface-container">
      <mat-card-content class="md-padding-lg">
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <button matButton="filled" color="primary" (click)="editProfile.emit()">
            <mat-icon aria-hidden="true">edit</mat-icon>
            <span class="md-typescale-label-large">Edit Profile</span>
          </button>
          @if (currentPlayer && currentPlayer.teamId) {
          <button matButton="outlined" color="warn" (click)="leaveTeam.emit()">
            <mat-icon aria-hidden="true">logout</mat-icon>
            <span class="md-typescale-label-large">Leave Team</span>
          </button>
          }
        </div>

        @if (currentPlayer) {
        <div class="mt-4 md-padding-sm md-sys-bg-surface-variant md-shape-corner-sm text-center">
          <div class="md-typescale-body-medium md-sys-color-on-surface">
            <span class="md-typescale-label-medium md-sys-color-on-surface-variant">Name: </span>
            <span class="font-medium">{{ currentPlayer.name }}</span>
            <span class="mx-2 md-sys-color-outline">•</span>
            <span class="md-typescale-label-medium md-sys-color-on-surface-variant">Role: </span>
            <span class="font-medium">{{ formatRoleDisplay(currentPlayer.role || '') }}</span>
            @if (currentPlayer.team) {
            <span class="mx-2 md-sys-color-outline">•</span>
            <span class="md-typescale-label-medium md-sys-color-on-surface-variant">Team: </span>
            <span class="font-medium md-sys-color-primary">{{ currentPlayer.team.name }}</span>
            }
          </div>
        </div>
        }
      </mat-card-content>
    </mat-card>
  `
})
export class CurrentPlayerActionsComponent {
  @Input() currentPlayer?: Player;
  @Output() editProfile = new EventEmitter<void>();
  @Output() leaveTeam = new EventEmitter<void>();

  formatRoleDisplay(role: string): string {
    return role || 'PLAYER';
  }
}