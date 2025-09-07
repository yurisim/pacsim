import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
} from '@angular/core';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';
type LiveRole = 'alert' | 'status';
type LivePoliteness = 'assertive' | 'polite';

@Component({
  selector: 'app-error-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-alert.component.html',
  styleUrls: ['./error-alert.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'computedRole',
    '[attr.aria-live]': 'computedAriaLive',
    '[attr.data-testid]': 'dataTestId || null',

    // Base spacing/shape/typography to match Join Shell usage
    'class': 'ea-root md-typescale-body-small md-padding-sm md-shape-corner-sm mt-3',

    // Error variant tokens to preserve existing look in Join Shell
    '[class.md-sys-color-on-error-container]': "variant === 'error'",
    '[class.md-sys-bg-error-container]': "variant === 'error'",
  },
})
export class ErrorAlertComponent {
  @Input() variant: AlertVariant = 'info';
  @Input() title?: string;
  @Input() message?: string | string[];
  @Input() icon?: string | TemplateRef<unknown>;
  @Input() dismissible = false;
  @Input() role?: LiveRole;
  @Input() ariaLive?: LivePoliteness;
  @Input() dataTestId?: string;

  @Output() dismissed = new EventEmitter<void>();

  // Accessible defaults per variant
  private readonly defaultIcons: Record<AlertVariant, string> = {
    error: '⛔',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅',
  };

  get computedRole(): LiveRole {
    if (this.role) return this.role;
    return this.variant === 'error' || this.variant === 'warning' ? 'alert' : 'status';
  }

  get computedAriaLive(): LivePoliteness {
    if (this.ariaLive) return this.ariaLive;
    return this.variant === 'error' || this.variant === 'warning' ? 'assertive' : 'polite';
  }

  get isMessageArray(): boolean {
    return Array.isArray(this.message);
  }

  get arrayMessage(): string[] {
    return Array.isArray(this.message) ? (this.message as string[]) : [];
  }

  get computedIconText(): string | null {
    if (this.icon && typeof this.icon === 'string') return this.icon;
    if (this.icon instanceof TemplateRef) return null;
    return this.defaultIcons[this.variant];
  }

  get iconTemplate(): TemplateRef<unknown> | null {
    return this.icon instanceof TemplateRef ? (this.icon as TemplateRef<unknown>) : null;
  }

  onDismiss(): void {
    this.dismissed.emit();
  }
}
