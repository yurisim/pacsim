import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fieldset',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './fieldset.component.html',
  styleUrls: ['./fieldset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldsetComponent {
  @Input() legend = '';
  @Input() collapsed = false;
  @Input() toggleable = false;
  @Input() disabled = false;

  @Output() toggleMe = new EventEmitter<boolean>();

  onToggle() {
    if (this.disabled || !this.toggleable) return;

    this.collapsed = !this.collapsed;
    this.toggleMe.emit(this.collapsed);
  }
}
