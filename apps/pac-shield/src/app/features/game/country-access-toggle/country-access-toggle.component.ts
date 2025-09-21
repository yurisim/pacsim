import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-country-access-toggle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './country-access-toggle.component.html',
  styleUrls: ['./country-access-toggle.component.scss']
})
export class CountryAccessToggleComponent {
  @Output() toggleVisibility = new EventEmitter<boolean>();

  // Signal for toggle state
  isVisible = signal(false);

  onToggle(): void {
    const newState = !this.isVisible();
    this.isVisible.set(newState);
    this.toggleVisibility.emit(newState);
  }
}