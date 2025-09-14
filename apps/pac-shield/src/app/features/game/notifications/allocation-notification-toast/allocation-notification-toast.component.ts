import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { AllocationNotification } from '../../../../store/allocation/allocation.state';

/**
 * Toast notification component for allocation-related notifications.
 * Displays real-time notifications for aircraft allocation decisions,
 * request status changes, and pool updates.
 */
@Component({
  selector: 'app-allocation-notification-toast',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule
  ],
  template: `
    <mat-card
      class="notification-toast"
      [class.urgent]="notification.priority === 'URGENT'"
      [class.high]="notification.priority === 'HIGH'"
      [class.normal]="notification.priority === 'NORMAL'"
      [class.low]="notification.priority === 'LOW'"
      [class.unread]="!notification.read"
      [@slideIn]="'in'"
    >
      <mat-card-header class="notification-header">
        <div class="notification-icon">
          <mat-icon [color]="getIconColor()">{{ getNotificationIcon() }}</mat-icon>
        </div>
        <div class="notification-title-section">
          <mat-card-title class="notification-title">{{ notification.title }}</mat-card-title>
          <mat-card-subtitle class="notification-meta">
            <span class="timestamp">{{ getFormattedTimestamp() }}</span>
            <mat-chip class="priority-chip" [color]="getPriorityColor()">
              {{ notification.priority }}
            </mat-chip>
          </mat-card-subtitle>
        </div>
        <div class="notification-actions">
          <button
            mat-icon-button
            class="dismiss-btn"
            (click)="onDismiss()"
            [attr.aria-label]="'Dismiss notification'"
          >
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </mat-card-header>

      <mat-card-content class="notification-content">
        <p class="notification-message">{{ notification.message }}</p>

        <div class="notification-details" *ngIf="hasDetails()">
          <div class="detail-item" *ngIf="notification.targetTeamName">
            <strong>Team:</strong> {{ notification.targetTeamName }}
          </div>
          <div class="detail-item" *ngIf="getAircraftDetails()">
            <strong>Aircraft:</strong> {{ getAircraftDetails() }}
          </div>
          <div class="detail-item" *ngIf="getRequestDetails()">
            <strong>Request:</strong> {{ getRequestDetails() }}
          </div>
        </div>
      </mat-card-content>

      <mat-card-actions class="notification-actions-footer" *ngIf="notification.requiresAcknowledgment && !notification.acknowledged">
        <button
          mat-raised-button
          color="primary"
          (click)="onAcknowledge()"
          [disabled]="acknowledging"
        >
          <mat-icon>check</mat-icon>
          {{ acknowledging ? 'Acknowledging...' : 'Acknowledge' }}
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styleUrls: ['./allocation-notification-toast.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    // Add slide-in animation
    // This would be defined in a separate animations file in a real implementation
  ]
})
export class AllocationNotificationToastComponent {
  @Input() notification!: AllocationNotification;
  @Input() acknowledging = false;

  @Output() dismiss = new EventEmitter<string>();
  @Output() acknowledge = new EventEmitter<string>();
  @Output() markRead = new EventEmitter<string>();

  onDismiss(): void {
    this.dismiss.emit(this.notification.id);
  }

  onAcknowledge(): void {
    this.acknowledge.emit(this.notification.id);
  }

  getNotificationIcon(): string {
    switch (this.notification.type) {
      case 'REQUEST_SUBMITTED':
        return 'send';
      case 'REQUEST_REVIEWED':
        return 'rate_review';
      case 'AIRCRAFT_ALLOCATED':
        return 'flight';
      case 'AIRCRAFT_DEALLOCATED':
        return 'flight_land';
      case 'ALLOCATION_CYCLE_STATUS_CHANGED':
        return 'sync';
      case 'AIRCRAFT_POOL_UPDATED':
        return 'inventory';
      default:
        return 'notifications';
    }
  }

  getIconColor(): string {
    switch (this.notification.priority) {
      case 'URGENT':
        return 'warn';
      case 'HIGH':
        return 'accent';
      default:
        return 'primary';
    }
  }

  getPriorityColor(): string {
    switch (this.notification.priority) {
      case 'URGENT':
        return 'warn';
      case 'HIGH':
        return 'accent';
      case 'LOW':
        return '';
      default:
        return 'primary';
    }
  }

  getFormattedTimestamp(): string {
    const date = new Date(this.notification.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  hasDetails(): boolean {
    return !!(
      this.notification.targetTeamName ||
      this.getAircraftDetails() ||
      this.getRequestDetails()
    );
  }

  getAircraftDetails(): string | null {
    const data = this.notification.data;
    if (data?.aircraftCallSign && data?.aircraftType) {
      return `${data.aircraftCallSign} (${data.aircraftType})`;
    } else if (data?.aircraftType && data?.quantityRequested) {
      return `${data.quantityRequested}x ${data.aircraftType}`;
    } else if (data?.aircraftType) {
      return data.aircraftType;
    }
    return null;
  }

  getRequestDetails(): string | null {
    const data = this.notification.data;
    if (data?.status && data?.quantityAllocated !== undefined) {
      return `${data.status} (${data.quantityAllocated} allocated)`;
    } else if (data?.status) {
      return data.status;
    } else if (data?.priority) {
      return `Priority ${data.priority}`;
    }
    return null;
  }
}
