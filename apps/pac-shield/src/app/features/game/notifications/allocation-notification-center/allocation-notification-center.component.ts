import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AllocationNotification } from '../../../../store/allocation/allocation.state';
import * as AllocationActions from '../../../../store/allocation/allocation.actions';
import * as AllocationSelectors from '../../../../store/allocation/allocation.selectors';

/**
 * Notification center component for viewing and managing allocation notifications.
 * Displays notification history, allows acknowledgment, and provides filtering options.
 */
@Component({
  selector: 'app-allocation-notification-center',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatListModule,
    MatDividerModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="notification-center">
      <div class="notification-center-header">
        <h2 mat-dialog-title>
          <mat-icon>notifications</mat-icon>
          Allocation Notifications
        </h2>
        <div class="header-actions">
          <button
            mat-icon-button
            [matTooltip]="'Mark all as read'"
            (click)="markAllAsRead()"
            [disabled]="(unreadNotifications$ | async)?.length === 0"
          >
            <mat-icon>mark_email_read</mat-icon>
          </button>
          <button
            mat-icon-button
            [matTooltip]="'Clear all notifications'"
            (click)="clearAllNotifications()"
            [disabled]="(allNotifications$ | async)?.length === 0"
          >
            <mat-icon>clear_all</mat-icon>
          </button>
          <button mat-icon-button mat-dialog-close>
            <mat-icon>close</mat-icon>
          </button>
        </div>
      </div>

      <div class="notification-center-content">
        <mat-tab-group>
          <!-- All Notifications Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span [matBadge]="(unreadNotifications$ | async)?.length || 0"
                    [matBadgeHidden]="(unreadNotifications$ | async)?.length === 0"
                    matBadgeColor="primary"
                    matBadgeSize="small">
                All
              </span>
            </ng-template>
            <div class="tab-content">
              <div class="notification-list" *ngIf="(allNotifications$ | async) as notifications; else noNotifications">
                <mat-list>
                  <mat-list-item
                    *ngFor="let notification of notifications; trackBy: trackByNotificationId"
                    class="notification-item"
                    [class.unread]="!notification.read"
                    [class.urgent]="notification.priority === 'URGENT'"
                    [class.requires-ack]="notification.requiresAcknowledgment && !notification.acknowledged"
                  >
                    <div class="notification-content">
                      <div class="notification-main">
                        <div class="notification-icon">
                          <mat-icon [color]="getIconColor(notification)">
                            {{ getNotificationIcon(notification) }}
                          </mat-icon>
                        </div>
                        <div class="notification-details">
                          <div class="notification-title">{{ notification.title }}</div>
                          <div class="notification-message">{{ notification.message }}</div>
                          <div class="notification-meta">
                            <span class="timestamp">{{ getFormattedTimestamp(notification.timestamp) }}</span>
                            <mat-chip class="priority-chip" [color]="getPriorityColor(notification)">
                              {{ notification.priority }}
                            </mat-chip>
                            <mat-chip *ngIf="notification.targetTeamName" class="team-chip">
                              {{ notification.targetTeamName }}
                            </mat-chip>
                          </div>
                        </div>
                      </div>
                      <div class="notification-actions">
                        <button
                          mat-icon-button
                          [matTooltip]="notification.read ? 'Mark as unread' : 'Mark as read'"
                          (click)="toggleReadStatus(notification)"
                        >
                          <mat-icon>{{ notification.read ? 'mark_email_unread' : 'mark_email_read' }}</mat-icon>
                        </button>
                        <button
                          *ngIf="notification.requiresAcknowledgment && !notification.acknowledged"
                          mat-icon-button
                          color="primary"
                          [matTooltip]="'Acknowledge'"
                          (click)="acknowledgeNotification(notification)"
                          [disabled]="processingNotification$ | async"
                        >
                          <mat-icon>check_circle</mat-icon>
                        </button>
                        <button
                          mat-icon-button
                          [matTooltip]="'Dismiss'"
                          (click)="dismissNotification(notification)"
                        >
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    </div>
                    <mat-divider></mat-divider>
                  </mat-list-item>
                </mat-list>
              </div>
            </div>
          </mat-tab>

          <!-- Unread Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span [matBadge]="(unreadNotifications$ | async)?.length || 0"
                    [matBadgeHidden]="(unreadNotifications$ | async)?.length === 0"
                    matBadgeColor="accent"
                    matBadgeSize="small">
                Unread
              </span>
            </ng-template>
            <div class="tab-content">
              <div class="notification-list" *ngIf="(unreadNotifications$ | async) as notifications">
                <div *ngIf="notifications.length === 0" class="empty-state">
                  <mat-icon class="empty-icon">mark_email_read</mat-icon>
                  <p>No unread notifications</p>
                </div>
                <mat-list *ngIf="notifications.length > 0">
                  <mat-list-item
                    *ngFor="let notification of notifications; trackBy: trackByNotificationId"
                    class="notification-item unread"
                    [class.urgent]="notification.priority === 'URGENT'"
                    [class.requires-ack]="notification.requiresAcknowledgment && !notification.acknowledged"
                  >
                    <div class="notification-content">
                      <div class="notification-main">
                        <div class="notification-icon">
                          <mat-icon [color]="getIconColor(notification)">
                            {{ getNotificationIcon(notification) }}
                          </mat-icon>
                        </div>
                        <div class="notification-details">
                          <div class="notification-title">{{ notification.title }}</div>
                          <div class="notification-message">{{ notification.message }}</div>
                          <div class="notification-meta">
                            <span class="timestamp">{{ getFormattedTimestamp(notification.timestamp) }}</span>
                            <mat-chip class="priority-chip" [color]="getPriorityColor(notification)">
                              {{ notification.priority }}
                            </mat-chip>
                          </div>
                        </div>
                      </div>
                      <div class="notification-actions">
                        <button
                          mat-icon-button
                          [matTooltip]="'Mark as read'"
                          (click)="markAsRead(notification)"
                        >
                          <mat-icon>mark_email_read</mat-icon>
                        </button>
                        <button
                          *ngIf="notification.requiresAcknowledgment && !notification.acknowledged"
                          mat-icon-button
                          color="primary"
                          [matTooltip]="'Acknowledge'"
                          (click)="acknowledgeNotification(notification)"
                          [disabled]="processingNotification$ | async"
                        >
                          <mat-icon>check_circle</mat-icon>
                        </button>
                      </div>
                    </div>
                    <mat-divider></mat-divider>
                  </mat-list-item>
                </mat-list>
              </div>
            </div>
          </mat-tab>

          <!-- Requires Action Tab -->
          <mat-tab>
            <ng-template mat-tab-label>
              <span [matBadge]="(unacknowledgedNotifications$ | async)?.length || 0"
                    [matBadgeHidden]="(unacknowledgedNotifications$ | async)?.length === 0"
                    matBadgeColor="warn"
                    matBadgeSize="small">
                Action Required
              </span>
            </ng-template>
            <div class="tab-content">
              <div class="notification-list" *ngIf="(unacknowledgedNotifications$ | async) as notifications">
                <div *ngIf="notifications.length === 0" class="empty-state">
                  <mat-icon class="empty-icon">task_alt</mat-icon>
                  <p>No actions required</p>
                </div>
                <mat-list *ngIf="notifications.length > 0">
                  <mat-list-item
                    *ngFor="let notification of notifications; trackBy: trackByNotificationId"
                    class="notification-item requires-ack"
                  >
                    <div class="notification-content">
                      <div class="notification-main">
                        <div class="notification-icon">
                          <mat-icon color="warn">{{ getNotificationIcon(notification) }}</mat-icon>
                        </div>
                        <div class="notification-details">
                          <div class="notification-title">{{ notification.title }}</div>
                          <div class="notification-message">{{ notification.message }}</div>
                          <div class="notification-meta">
                            <span class="timestamp">{{ getFormattedTimestamp(notification.timestamp) }}</span>
                            <mat-chip class="priority-chip" color="warn">
                              {{ notification.priority }}
                            </mat-chip>
                          </div>
                        </div>
                      </div>
                      <div class="notification-actions">
                        <button
                          mat-raised-button
                          color="primary"
                          (click)="acknowledgeNotification(notification)"
                          [disabled]="processingNotification$ | async"
                        >
                          <mat-icon>check</mat-icon>
                          Acknowledge
                        </button>
                      </div>
                    </div>
                    <mat-divider></mat-divider>
                  </mat-list-item>
                </mat-list>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>

        <!-- Empty state template -->
        <ng-template #noNotifications>
          <div class="empty-state">
            <mat-icon class="empty-icon">notifications_none</mat-icon>
            <p>No allocation notifications yet</p>
            <small>You'll see real-time updates about aircraft allocation decisions here.</small>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styleUrls: ['./allocation-notification-center.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllocationNotificationCenterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  allNotifications$!: Observable<AllocationNotification[]>;
  unreadNotifications$!: Observable<AllocationNotification[]>;
  unacknowledgedNotifications$!: Observable<AllocationNotification[]>;
  processingNotification$!: Observable<boolean>;

  constructor(
    private store: Store,
    private dialogRef: MatDialogRef<AllocationNotificationCenterComponent>
  ) {}

  ngOnInit(): void {
    // Initialize observables
    this.allNotifications$ = this.store.select(AllocationSelectors.selectAllNotifications);
    this.unreadNotifications$ = this.store.select(AllocationSelectors.selectUnreadNotifications);
    this.unacknowledgedNotifications$ = this.store.select(AllocationSelectors.selectUnacknowledgedNotifications);
    this.processingNotification$ = this.store.select(AllocationSelectors.selectProcessingNotification);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByNotificationId(index: number, notification: AllocationNotification): string {
    return notification.id;
  }

  getNotificationIcon(notification: AllocationNotification): string {
    switch (notification.type) {
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

  getIconColor(notification: AllocationNotification): string {
    if (notification.priority === 'URGENT') return 'warn';
    if (notification.priority === 'HIGH') return 'accent';
    return 'primary';
  }

  getPriorityColor(notification: AllocationNotification): string {
    switch (notification.priority) {
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

  getFormattedTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
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

  markAsRead(notification: AllocationNotification): void {
    if (!notification.read) {
      this.store.dispatch(AllocationActions.markNotificationAsRead({
        notificationId: notification.id
      }));
    }
  }

  toggleReadStatus(notification: AllocationNotification): void {
    this.store.dispatch(AllocationActions.markNotificationAsRead({
      notificationId: notification.id
    }));
  }

  acknowledgeNotification(notification: AllocationNotification): void {
    this.store.dispatch(AllocationActions.acknowledgeNotification({
      notificationId: notification.id,
      gameId: notification.gameId,
      teamId: notification.targetTeamId || 0
    }));
  }

  dismissNotification(notification: AllocationNotification): void {
    this.store.dispatch(AllocationActions.dismissNotification({
      notificationId: notification.id
    }));
  }

  markAllAsRead(): void {
    this.store.dispatch(AllocationActions.markAllNotificationsAsRead());
  }

  clearAllNotifications(): void {
    this.store.dispatch(AllocationActions.clearAllNotifications());
  }
}
