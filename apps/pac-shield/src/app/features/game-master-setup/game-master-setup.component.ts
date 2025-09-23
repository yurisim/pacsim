import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { InputOtpComponent } from '../../shared/components/input-otp/input-otp.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { nameFormatValidator } from '../join/validators/name-format.validator';
import { mapFieldError } from '../join/utils/error-presenter';

export interface GameMasterInfo {
  username: string;
  pin: string;
}

/**
 * Component: GameMasterSetupComponent
 *
 * Role in pac-shield:
 * - Standalone Angular component that collects the Game Master&#39;s identifying info immediately after a new game is created.
 * - Acts as a small, presentational step in the &quot;Start New Game&quot; flow on the Home screen.
 *
 * Key responsibilities:
 * - Render a Material form for username and a 4-digit PIN (via InputOtpComponent).
 * - Maintain local form state (template-driven) and expose a computed isFormValid.
 * - On submit, emit a single &#39;complete&#39; Output with { lastName, pin } (see GameMasterInfo).
 * - Do not make API calls or navigate; delegates side-effects to the parent container.
 *
 * How it fits into the system:
 * - Hosted by HomeComponent after a game is created. The parent listens to (complete) to:
 *   - Call AuthService.createGameMaster(roomCode, lastName, pin)
 *   - Navigate to the Lobby upon success
 * - Provides a clean boundary between UI input and application orchestration.
 *
 * Notes:
 * - Uses Angular&#39;s signals-style output(...) API; the component is &#39;standalone&#39; and declares its own imports.
 * - A commented onPinComplete shows optional auto-submit UX for future refinement.
 */
@Component({
  selector: 'app-game-master-setup',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    InputOtpComponent,
  ],
  templateUrl: './game-master-setup.component.html',
  styleUrls: ['./game-master-setup.component.scss'],
})
export class GameMasterSetupComponent {
  private fb = inject(FormBuilder);

  complete = output<GameMasterInfo>();
  back = output<void>();

  form: FormGroup = this.fb.group({
    username: ['', [Validators.required, nameFormatValidator()]],
    pin: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]]
  });

  get isFormValid(): boolean {
    return this.form.valid;
  }

  onSubmit(): void {
    if (this.isFormValid) {
      const formValue = this.form.value;
      this.complete.emit({
        username: formValue.username.trim(),
        pin: formValue.pin,
      });
    }
  }

  onBack(): void {
    this.back.emit();
  }

  fieldError(controlName: string): string | null {
    const control = this.form.get(controlName);
    return control ? mapFieldError(control) : null;
  }
}
