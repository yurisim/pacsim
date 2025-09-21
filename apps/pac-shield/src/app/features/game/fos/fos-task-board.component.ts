import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorAlertComponent } from '../../../shared/components/error-alert/error-alert.component';
import { FosTasksService, FosTaskItem } from './fos-tasks.service';

/**
 * Standalone presentational component that renders the 16 FOS tasks.
 * Behavior:
 * - If fosId present: load /fos/:id/tasks. Allow toggle when canEdit.
 * - Else: Show read-only message prompting activation.
 */
@Component({
  selector: 'app-fos-task-board',
  standalone: true,
  imports: [
    CommonModule,
    MatDividerModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    ErrorAlertComponent,
  ],
  templateUrl: './fos-task-board.component.html',
  styleUrl: './fos-task-board.component.scss',
})
export class FosTaskBoardComponent implements OnChanges {
  @Input() fosId?: string | null;
  @Input() fosDisplayNumber!: number | null;
  @Input() gameId!: number | null; // reserved for future use
  @Input() canEdit = false;

  private tasks = inject(FosTasksService);
  private snack = inject(MatSnackBar);

  isLoading = false;
  errorMsg: string | null = null;

  // Canonical task labels (16) organized by operational categories
  readonly allTasks: string[] = [
    '1 Bed Down', '2 Power', '3 C2', '4 Contracts',
    '5 Ramp Sec', '6 Perimeter Sec', '7 Missile Def', '8 Hardening',
    '9 Airfield Ops', '10 Mobility', '11 ICT', '12 SFO',
    '13 Host Nation', '14 Health & Welfare', '15 Base Recovery', '16 Logistics'
  ];

  // Operational categories with their tasks
  readonly operationalCategories = [
    {
      title: 'Establish',
      color: 'md-sys-color-secondary',
      bgColor: 'md-sys-bg-secondary-container',
      icon: 'construction',
      tasks: ['1 Bed Down', '2 Power', '3 C2', '4 Contracts']
    },
    {
      title: 'Defend',
      color: 'md-sys-color-secondary',
      bgColor: 'md-sys-bg-secondary-container',
      icon: 'security',
      tasks: ['5 Ramp Sec', '6 Perimeter Sec', '7 Missile Def', '8 Hardening']
    },
    {
      title: 'Operate',
      color: 'md-sys-color-secondary',
      bgColor: 'md-sys-bg-secondary-container',
      icon: 'flight_takeoff',
      tasks: ['9 Airfield Ops', '10 Mobility', '11 ICT', '12 SFO']
    },
    {
      title: 'Maintain',
      color: 'md-sys-color-secondary',
      bgColor: 'md-sys-bg-secondary-container',
      icon: 'handyman',
      tasks: ['13 Host Nation', '14 Health & Welfare', '15 Base Recovery', '16 Logistics']
    }
  ];

  data: Record<string, FosTaskItem> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fosId']) {
      this.load();
    }
  }

  private load(): void {
    this.errorMsg = null;
    if (!this.fosId) {
      // Pre-activation: show read-only prompt; no load
      this.data = {};
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.tasks.getTasks(this.fosId).subscribe({
      next: (items) => {
        this.hydrate(items);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Tasks load failed:', err);
        this.errorMsg = 'Failed to load tasks';
        this.isLoading = false;
      },
    });
  }

  private hydrate(items: FosTaskItem[]): void {
    const map: Record<string, FosTaskItem> = {};
    for (const t of this.allTasks) {
      map[t] = { task: t, completed: false };
    }
    for (const it of items || []) {
      if (it?.task) {
        map[it.task] = it;
      }
    }
    this.data = map;
  }

  isCompleted(label: string): boolean {
    return !!this.data[label]?.completed;
  }

  canToggle(): boolean {
    return !!this.fosId && this.canEdit;
  }

  toggle(label: string): void {
    if (!this.canToggle() || !this.fosId) return;
    const newVal = !this.isCompleted(label);
    this.isLoading = true;
    this.tasks.updateTask(this.fosId, label, newVal).subscribe({
      next: (updated) => {
        this.hydrate(updated);
        this.isLoading = false;
        this.snack.open('Task updated', 'Close', { duration: 1500 });
      },
      error: (err) => {
        console.error('Task update failed:', err);
        this.errorMsg = 'Failed to update task';
        this.isLoading = false;
      },
    });
  }

  // Add these methods to your component class for better performance
  trackByCategory(index: number, category: any): string {
    return category.title;
  }

  trackByTask(index: number, task: string): string {
    return task;
  }
}
