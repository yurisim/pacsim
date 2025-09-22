import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
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
 * Operational category definition for FOS task organization
 */
interface OperationalCategory {
  title: string;
  icon: string;
  description: string;
  tasks: string[];
}

/**
 * FOS Task Board Component - CLAUDE.md Compliant
 *
 * A standalone presentational component that renders the 16 FOS tasks in a card-based layout
 * using Material 3 design system and Tailwind CSS utilities.
 *
 * Features:
 * - Material 3 design tokens for theming
 * - Responsive card-based layout
 * - Dark/light mode support
 * - New Angular control flow syntax
 * - Proper accessibility support
 *
 * Behavior:
 * - If fosId present: load /fos/:id/tasks. Allow toggle when canEdit.
 * - Else: Show read-only message prompting activation.
 */
@Component({
  selector: 'app-fos-task-board',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
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

  // Operational categories with their tasks - organized by military operational phases
  readonly operationalCategories: readonly OperationalCategory[] = [
    {
      title: 'Establish',
      icon: 'construction',
      description: 'Base establishment and initial setup tasks',
      tasks: ['1 Bed Down', '2 Power', '3 C2', '4 Contracts']
    },
    {
      title: 'Defend',
      icon: 'security',
      description: 'Security and defense preparations',
      tasks: ['5 Ramp Sec', '6 Perimeter Sec', '7 Missile Def', '8 Hardening']
    },
    {
      title: 'Operate',
      icon: 'flight_takeoff',
      description: 'Operational capabilities and missions',
      tasks: ['9 Airfield Ops', '10 Mobility', '11 ICT', '12 SFO']
    },
    {
      title: 'Maintain',
      icon: 'handyman',
      description: 'Maintenance and sustainment operations',
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

  /**
   * Check if a specific task is completed
   * @param label The task label to check
   * @returns True if the task is completed
   */
  isCompleted(label: string): boolean {
    return !!this.data[label]?.completed;
  }

  /**
   * Check if the current user can toggle task completion
   * @returns True if the user can edit tasks
   */
  canToggle(): boolean {
    return !!this.fosId && this.canEdit;
  }

  /**
   * Toggle task completion status
   * @param label The task label to toggle
   */
  toggle(label: string): void {
    if (!this.canToggle() || !this.fosId) return;

    const newVal = !this.isCompleted(label);
    this.isLoading = true;
    this.errorMsg = null;

    this.tasks.updateTask(this.fosId, label, newVal).subscribe({
      next: (updated) => {
        this.hydrate(updated);
        this.isLoading = false;
        this.snack.open(
          `Task "${label}" ${newVal ? 'completed' : 'marked as pending'}`,
          'Close',
          {
            duration: 2000,
            panelClass: 'snack-success'
          }
        );
      },
      error: (err) => {
        console.error('Task update failed:', err);
        this.errorMsg = `Failed to update task "${label}". Please try again.`;
        this.isLoading = false;
        this.snack.open(
          'Task update failed. Please try again.',
          'Close',
          {
            duration: 3000,
            panelClass: 'snack-error'
          }
        );
      },
    });
  }

  /**
   * TrackBy function for operational categories - optimizes *ngFor performance
   * @param index The index of the category
   * @param category The category object
   * @returns Unique identifier for the category
   */
  trackByCategory(index: number, category: OperationalCategory): string {
    return category.title;
  }

  /**
   * TrackBy function for tasks - optimizes *ngFor performance
   * @param index The index of the task
   * @param task The task string
   * @returns Unique identifier for the task
   */
  trackByTask(index: number, task: string): string {
    return task;
  }

  /**
   * Get the completion percentage for a category
   * @param category The operational category
   * @returns Completion percentage (0-100)
   */
  getCategoryCompletion(category: OperationalCategory): number {
    const completed = category.tasks.filter(task => this.isCompleted(task)).length;
    return Math.round((completed / category.tasks.length) * 100);
  }

  /**
   * Get the total completion count across all tasks
   * @returns Object with completed and total counts
   */
  getTotalCompletion(): { completed: number; total: number; percentage: number } {
    const completed = this.allTasks.filter(task => this.isCompleted(task)).length;
    const total = this.allTasks.length;
    const percentage = Math.round((completed / total) * 100);
    return { completed, total, percentage };
  }

  /**
   * Get detailed tooltip information for each specific task
   * @param task The task name
   * @returns Detailed tooltip text explaining the task's importance and benefits
   */
  getTaskTooltip(task: string): string {
    const tooltips: Record<string, string> = {
      '1 Bed Down': 'AT #1: This task establishes essential living facilities for deployed personnel. Its completion is required for the Establish category and is a prerequisite for launching fighter sorties. Crucially, if adequate Bed Down and Sanitation is not established within 4 turns of personnel arriving (or less time, depending on personnel count), the team gains 5 Demoralization Points (DPs), followed by 10 DPs for each consecutive day of deficiency. It is a one-time task.',

      '2 Power': 'AT #2: This task establishes necessary power generation capabilities. Its completion is required for the Establish category and is a prerequisite for launching fighter sorties. It is also a key prerequisite for establishing Bed Down & Sanitation (AT #1), Command & Control (AT #3), and Camouflage & Base Hardening (AT #8). This task can be contracted to the host nation after completing AT #4.',

      '3 C2': 'AT #3: This task ensures the ability to understand, integrate, delegate, and execute tactical mission command. Its completion is required for the Establish category and is a prerequisite for launching fighter sorties. Completion of this task automatically enables C2 at the FOS in the OPS Execution Spreadsheet. Without C2, the airfield\'s data is not visible to the Combined Air Operations Center (CAOC), hiding critical information such as ramp improvements or kinetic strike damage.',

      '4 Contracts': 'AT #4: This task establishes the capability to leverage Host Nation support for logistics and operations. Its completion is required to begin contracting tasks to the host nation. Once complete, you may contract either Power (AT #2) or Logistics Support (AT #16) out to the host nation, though only one task can be contracted per turn.',

      '5 Ramp Sec': 'AT #5: This task secures the ramp area. It is a prerequisite for Mobility Support (AT #10).',

      '6 Perimeter Sec': 'AT #6: This task establishes perimeter defense for the airbase. It is a prerequisite for Missile Defense (AT #7) and Airfield Operations (AT #9).',

      '7 Missile Def': 'AT #7: This task bolsters the airfield\'s defensive capabilities by deploying missile defense systems. Completion of this task automatically applies the appropriate dice roll modifier for missile defense during adjudication of enemy strikes.',

      '8 Hardening': 'AT #8: This task bolsters the airfield\'s defensive capabilities by hardening base infrastructure. When completed in conjunction with Base Recovery (AT #15), the FOS may continue to sustain damage without being fully destroyed even after enduring four consecutive strikes. This status must be manually updated in the Airfield Data tab to apply the appropriate dice roll modifier.',

      '9 Airfield Ops': 'AT #9: This task establishes core operational functions, including Air Traffic Control (ATC) and Crash Fire Rescue (CFR) capabilities. Its completion is required for the Operate category and is a prerequisite for launching fighter sorties. It is also a prerequisite for Integrated Combat Turns (AT #11) and Base Recovery (AT #15).',

      '10 Mobility Support': 'AT #10: This task ensures adequate support is available to receive and handle cargo. Its completion is required for the Operate category and is a prerequisite for launching fighter sorties. It ensures sufficient support, such as a forklift, is available to download palletized cargo.',

      '11 Integrated Combat Turn (5 MP\'s)': 'AT #11: This task establishes the necessary capabilities for rapidly re-arming and re-fueling combat aircraft. Its completion is required for the Operate category and is a prerequisite for launching fighter sorties. Each fighter sortie launched requires the expenditure of munitions (bomb/missile).',

      '12 Specialized Refueling (5 MP\'s)': 'AT #12: This task provides specialized fuel support to sustain air operations. Its completion is required for the Operate category and is a prerequisite for launching fighter sorties. Each fighter sortie launched requires the expenditure of a fuel token.',

      '13 Host Nation Relationships': 'AT #13: This task represents the relationships established with host nations. Teams gain two Resource Points (RPs) per turn for resourcing this task. Achieving three RPs allows the team to obtain one required resource chit (food, water, tents, or fuel).',

      '14 Health & Welfare': 'AT #14: This task ensures the well-being of deployed personnel. Inadequate Health and Welfare (defined as this task not being complete) results in 5 Demoralization Points (DPs) per gameplay day. It is a prerequisite for Integrated Combat Turns (AT #11).',

      '15 Recovery': 'AT #15: This task provides capabilities for repairing the airfield. Completion automatically enables runway and parking ramp repair capabilities. A deployed Base Recovery Team is required to repair damage from successful kinetic strikes. This task is also required for expanding the parking ramp, which increases the Maximum on Ground (MOG) from one C-130 and two Fighters to two C-17s and seven Fighters.',

      '16 Logistics Support': 'AT #16: This task ensures ongoing logistics sustainment for the airbase. This task is required as a prerequisite for Specialized Fueling Operations (AT #12). This task can be contracted to the host nation after completing AT #4.'
    };

    return tooltips[task] || 'No additional information available for this task.';
  }
}
