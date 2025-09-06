import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { InputOtpComponent } from '../../shared/components/input-otp/input-otp.component';

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
    InputOtpComponent,
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

  onPinComplete(pin: string): void {
    this.pin = pin;
    // Auto-submit if last name is also filled
    if (this.lastName.trim() && pin.length === 4) {
      setTimeout(() => {
        this.onSubmit();
      }, 300); // Small delay for better UX
    }
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
