import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fieldset',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fieldset.component.html',
  styleUrls: ['./fieldset.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldsetComponent {
  @Input() legend = '';
  @Input() disabled = false;

}
