import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-join-team-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    AutoCompleteModule,
    ButtonModule,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()">
      <div class="flex flex-col gap-4">
        <input pInputText formControlName="name" placeholder="Enter your name" />
        <p-autocomplete
          formControlName="role"
          [suggestions]="filteredRoles"
          (completeMethod)="searchRoles($event)"
          [dropdown]="true"
          appendTo="body"
          placeholder="Select your role"
        ></p-autocomplete>
        <p-button
          label="Join"
          type="submit"
          [disabled]="form.invalid"
        ></p-button>
      </div>
    </form>
  `,
})
export class JoinTeamDialogComponent implements OnInit {
  private ref = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);

  form!: FormGroup;
  roles: string[] = [];
  filteredRoles: string[] = [];

  ngOnInit(): void {
    this.roles = this.config.data.roles;
    this.filteredRoles = [...this.roles];
    this.form = new FormGroup({
      name: new FormControl('', Validators.required),
      role: new FormControl(this.roles[0], Validators.required),
      sessionId: new FormControl(
        sessionStorage.getItem('sessionId') ?? '',
        Validators.required
      ),
    });
  }

  submit(): void {
    this.ref.close(this.form.value);
  }

  searchRoles(event: { query: string }): void {
    const query = event.query.toLowerCase();
    this.filteredRoles = this.roles.filter((role) =>
      role.toLowerCase().includes(query)
    );
  }
}
