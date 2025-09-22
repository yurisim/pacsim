import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FieldsetComponent } from './fieldset.component';

/**
 * Test suite for FieldsetComponent rendering and bindings.
 *
 * This test suite covers:
 * - Component creation (smoke test)
 * - Template projection/binding of the legend input
 *
 * @group Shared Component Tests
 */
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

  /**
   * Smoke test verifying the component instantiates without error.
   * @test
   */
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * Verifies that the legend input is rendered in the template as testable text.
   * @test
   */
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
