import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface GameMasterInfo {
  lastName: string;
  pin: string;
}

@Component({
  selector: 'app-game-master-setup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './game-master-setup.component.html',
  styleUrls: ['./game-master-setup.component.scss'],
})
export class GameMasterSetupComponent {
  complete = output<GameMasterInfo>();

  lastName = '';
  pin = '';

  get isFormValid(): boolean {
    return this.lastName.trim().length > 0 && this.pin.length === 4;
  }

  onSubmit(): void {
    if (this.isFormValid) {
      this.complete.emit({
        lastName: this.lastName.trim(),
        pin: this.pin,
      });
    }
  }
}
