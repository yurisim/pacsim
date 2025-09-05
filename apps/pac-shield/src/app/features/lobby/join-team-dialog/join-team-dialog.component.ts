import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-join-team-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="p-4">
      <div class="flex flex-col gap-4">
        <div>
          <label for="jt-name" class="block text-sm font-medium mb-1">Name</label>
          <input
            id="jt-name"
            type="text"
            formControlName="name"
            placeholder="Enter your name"
            class="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label for="jt-role" class="block text-sm font-medium mb-1">Role</label>
          <select
            id="jt-role"
            formControlName="role"
            class="w-full rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option *ngFor="let r of roles" [value]="r">{{ r }}</option>
          </select>
        </div>

        <div class="flex gap-2">
          <button
            type="submit"
            [disabled]="form.invalid"
            class="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            Join
          </button>
          <button
            type="button"
            (click)="cancel()"
            class="px-4 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  `,
})
export class JoinTeamDialogComponent implements OnInit {
  @Input() roles: string[] = ['PLAYER', 'COMMANDER', 'DEPUTY', 'STRATEGIST', 'GM'];
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
