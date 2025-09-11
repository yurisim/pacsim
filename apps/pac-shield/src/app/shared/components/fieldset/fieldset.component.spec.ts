import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FieldsetComponent } from './fieldset.component';

describe('FieldsetComponent', () => {
  let component: FieldsetComponent;
  let fixture: ComponentFixture<FieldsetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldsetComponent, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(FieldsetComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the legend in the template', () => {
    const testLegend = 'Test Legend';
    component.legend = testLegend;
    fixture.detectChanges();
    const legendElement = fixture.nativeElement.querySelector(
      '[data-testid="legend-text"]'
    );
    expect(legendElement.textContent.trim()).toBe(testLegend);
  });
});
