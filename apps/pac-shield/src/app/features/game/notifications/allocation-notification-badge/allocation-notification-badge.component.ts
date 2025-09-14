import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Badge component for displaying unread allocation notification counts.
 * Shows a notification bell icon with a badge indicating the number of unread notifications.
 */
@Component({
  selector: 'app-allocation-notification-badge',
  standalone: true,
  imports: [
    CommonModule,
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <button
      mat-icon-button
      class="notification-badge-button"
      [class.has-urgent]="hasUrgentNotifications"
      [class.has-unread]="unreadCount > 0"
      [matTooltip]="getTooltipText()"
      [matTooltipPosition]="tooltipPosition"
      [matBadge]="unreadCount > 0 ? unreadCount : null"
      [matBadgeColor]="getBadgeColor()"
      [matBadgeSize]="getBadgeSize()"
      [matBadgeHidden]="unreadCount === 0"
      [attr.aria-label]="getAriaLabel()"
    >
      <mat-icon [class.urgent-pulse]="hasUrgentNotifications">
        {{ getNotificationIcon() }}
      </mat-icon>
    </button>
  `,
  styleUrls: ['./allocation-notification-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AllocationNotificationBadgeComponent {
  @Input() unreadCount = 0;
  @Input() hasUrgentNotifications = false;
  @Input() hasUnacknowledgedNotifications = false;
  @Input() tooltipPosition: 'above' | 'below' | 'left' | 'right' = 'below';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() showZeroCount = false;

  getNotificationIcon(): string {
    if (this.unreadCount > 0) {
      return this.hasUrgentNotifications ? 'notifications_active' : 'notifications';
    }
    return 'notifications_none';
  }

  getBadgeColor(): 'primary' | 'accent' | 'warn' {
    if (this.hasUrgentNotifications) {
      return 'warn';
    }
    if (this.hasUnacknowledgedNotifications) {
      return 'accent';
    }
    return 'primary';
  }

  getBadgeSize(): 'small' | 'medium' | 'large' {
    switch (this.size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default:
        return 'medium';
    }
  }

  getTooltipText(): string {
    if (this.unreadCount === 0) {
      return 'No new allocation notifications';
    }

    const baseText = this.unreadCount === 1
      ? '1 unread allocation notification'
      : `${this.unreadCount} unread allocation notifications`;

    if (this.hasUrgentNotifications) {
      return `${baseText} (including urgent)`;
    }

    if (this.hasUnacknowledgedNotifications) {
      return `${baseText} (action required)`;
    }

    return baseText;
  }

  getAriaLabel(): string {
    if (this.unreadCount === 0) {
      return 'Allocation notifications, no unread messages';
    }

    let label = `Allocation notifications, ${this.unreadCount} unread`;

    if (this.hasUrgentNotifications) {
      label += ', urgent notifications present';
    }

    if (this.hasUnacknowledgedNotifications) {
      label += ', acknowledgment required';
    }

    return label;
  }
}
