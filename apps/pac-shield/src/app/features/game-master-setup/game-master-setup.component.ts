import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputOtpModule } from 'primeng/inputotp';

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
    ButtonModule,
    CardModule,
    InputTextModule,
    InputOtpModule,
  ],
  templateUrl: './game-master-setup.component.html',
  styleUrls: ['./game-master-setup.component.scss'],
})
export class GameMasterSetupComponent {
  onComplete = output<GameMasterInfo>();
  
  lastName = '';
  pin = '';

  get isFormValid(): boolean {
    return this.lastName.trim().length > 0 && this.pin.length === 4;
  }

  onSubmit(): void {
    if (this.isFormValid) {
      this.onComplete.emit({
        lastName: this.lastName.trim(),
        pin: this.pin,
      });
    }
  }
}