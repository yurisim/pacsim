import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-join-team-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Join Team</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" class="p-4 md-sys-bg-surface-container md-shape-corner-lg md-elevation-2">
      <div class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Name</mat-label>
          <input matInput id="jt-name" type="text" formControlName="name" placeholder="Enter your name" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Role</mat-label>
          <mat-select id="jt-role" formControlName="role">
            <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="flex gap-2 justify-end">
          <button mat-stroked-button type="button" (click)="cancel()" class="interactive-surface">
            Cancel
          </button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid" class="interactive-surface">
            Join
          </button>
        </div>
      </div>
    </form>
  `,
})
export class JoinTeamDialogComponent implements OnInit {
  @Input() roles: string[] = ['PLAYER', 'COMMANDER', 'DEPUTY', 'LNO', 'GM'];
  @Output() submitJoin = new EventEmitter<{ name: string; role: string; sessionId: string }>();

  private dialogRef = inject(MatDialogRef<JoinTeamDialogComponent, { name: string; role: string; sessionId: string }>, { optional: true });
  form!: FormGroup;

  ngOnInit(): void {
    const sessionId = sessionStorage.getItem('sessionId') ?? '';

    this.form = new FormGroup({
      name: new FormControl('', Validators.required),
      role: new FormControl(this.roles[0] ?? 'PLAYER', Validators.required),
      sessionId: new FormControl(sessionId, Validators.required),
    });
  }

  submit(): void {
    if (this.form.valid) {
      const value = this.form.value as { name: string; role: string; sessionId: string };
      if (this.dialogRef) {
        this.dialogRef.close(value);
      } else {
        this.submitJoin.emit(value);
      }
    }
  }

  cancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    }
  }
}
