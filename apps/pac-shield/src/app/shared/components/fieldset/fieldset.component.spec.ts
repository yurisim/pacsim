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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display legend text', () => {
    component.legend = 'Test Legend';
    fixture.detectChanges();
    
    const legendText = fixture.nativeElement.querySelector('.mat-fieldset-legend-text');
    expect(legendText.textContent.trim()).toBe('Test Legend');
  });

  it('should toggle content when toggleable', () => {
    component.toggleable = true;
    component.collapsed = false;
    
    spyOn(component.toggle, 'emit');
    
    component.onToggle();
    
    expect(component.collapsed).toBe(true);
    expect(component.toggle.emit).toHaveBeenCalledWith(true);
  });

  it('should not toggle when disabled', () => {
    component.toggleable = true;
    component.disabled = true;
    component.collapsed = false;
    
    spyOn(component.toggle, 'emit');
    
    component.onToggle();
    
    expect(component.collapsed).toBe(false);
    expect(component.toggle.emit).not.toHaveBeenCalled();
  });

  it('should not toggle when not toggleable', () => {
    component.toggleable = false;
    component.collapsed = false;
    
    spyOn(component.toggle, 'emit');
    
    component.onToggle();
    
    expect(component.collapsed).toBe(false);
    expect(component.toggle.emit).not.toHaveBeenCalled();
  });
});