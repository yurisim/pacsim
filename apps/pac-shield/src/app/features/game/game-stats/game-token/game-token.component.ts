import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

/**
 * Generic token renderer for game assets (aircraft, personnel, equipment, threats).
 * Uses Material 3 tokens and compact visuals. No interactivity yet.
 */
@Component({
  selector: 'app-game-token',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatChipsModule],
  templateUrl: './game-token.component.html',
})
export class GameTokenComponent {
  @Input() asset: any;

  get label(): string {
    return this.asset?.name || this.asset?.type || 'Token';
  }

  get subLabel(): string {
    const loc = this.asset?.location ? `@ ${this.asset.location}` : 'Unplaced';
    const status = this.asset?.status ? ` • ${this.asset.status}` : '';
    return `${loc}${status}`;
  }

  get badge(): string | null {
    if (this.asset?.strength) return `STR ${this.asset.strength}`;
    if (this.asset?.range) return `R ${this.asset.range}`;
    return null;
  }

  get icon(): string {
    const t = (this.asset?.type || '').toLowerCase();
    if (t.includes('f-') || t.includes('fighter')) return 'flight';
    if (t.includes('c-1') || t.includes('c-5') || t.includes('c-17')) return 'local_shipping';
    if (t.includes('person') || t.includes('mra')) return 'diversity_3';
    if (t.includes('equipment')) return 'construction';
    if (t.includes('threat') || t.includes('pla')) return 'warning';
    if (t.includes('sat') || t.includes('gps')) return 'satellite_alt';
    return 'category';
  }
}