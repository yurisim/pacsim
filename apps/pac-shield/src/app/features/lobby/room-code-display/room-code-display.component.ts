import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Clipboard } from '@angular/cdk/clipboard';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-room-code-display',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <section class="flex flex-col items-center mb-8">
      <h2 class="text-2xl mb-4" style="color: var(--mat-sys-on-surface)">
        Room Code
      </h2>
      <div
        class="flex items-center gap-4 p-6 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
        style="
          background-color: color-mix(
            in srgb,
            var(--mat-sys-primary-container) 50%,
            transparent
          );
        "
        (click)="copyRoomCode()"
        (keydown.enter)="copyRoomCode()"
        tabindex="0"
        role="button"
        [attr.aria-label]="'Copy room code ' + roomCode"
      >
        <p
          class="text-6xl font-mono tracking-widest select-none"
          style="color: var(--mat-sys-primary)"
        >
          {{ roomCode }}
        </p>
        <mat-icon
          style="color: var(--mat-sys-on-surface-variant)"
          aria-hidden="true"
        >content_copy</mat-icon>
      </div>
      <p class="text-sm mt-2" style="color: var(--mat-sys-on-surface-variant)">
        Click to copy to clipboard
      </p>
    </section>
  `
})
export class RoomCodeDisplayComponent {
  @Input() roomCode = '';

  private clipboard = inject(Clipboard);
  private notification = inject(NotificationService);

  copyRoomCode(): void {
    this.clipboard.copy(this.roomCode);
    this.notification.success('Room code copied to clipboard');
  }
}
