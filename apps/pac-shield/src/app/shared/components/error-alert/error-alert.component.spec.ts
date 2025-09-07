import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ErrorAlertComponent } from './error-alert.component';

describe('ErrorAlertComponent', () => {
  let fixture: ComponentFixture<ErrorAlertComponent>;
  let component: ErrorAlertComponent;

  function create(compact?: Partial<ErrorAlertComponent>) {
    fixture = TestBed.createComponent(ErrorAlertComponent);
    component = fixture.componentInstance;
    if (compact) {
      Object.assign(component, compact);
    }
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorAlertComponent],
    }).compileComponents();
  });

  it('renders string message and optional title', () => {
    create({ variant: 'info', title: 'Heads up', message: 'Informational message' });
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Heads up');
    expect(host.textContent).toContain('Informational message');
  });

  it('renders array message as list items', () => {
    create({ variant: 'warning', message: ['Line 1', 'Line 2'] });

    const items = fixture.debugElement.queryAll(By.css('li'));
    expect(items.length).toBe(2);
    expect(items[0].nativeElement.textContent.trim()).toBe('Line 1');
    expect(items[1].nativeElement.textContent.trim()).toBe('Line 2');
  });

  it('emits dismissed when close button clicked if dismissible', () => {
    create({ variant: 'error', message: 'Error occurred', dismissible: true });

    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));

    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('button.ea-close'));
    expect(btn).toBeTruthy();

    btn.nativeElement.click();
    expect(emitted).toBe(true);
  });

  describe('a11y role and aria-live defaults by variant', () => {
    it.each([
      ['error', 'alert', 'assertive'],
      ['warning', 'alert', 'assertive'],
      ['info', 'status', 'polite'],
      ['success', 'status', 'polite'],
    ] as const)('variant=%s maps to role=%s, aria-live=%s', (variant, role, live) => {
      create({ variant, message: 'msg' });

      const host = fixture.nativeElement as HTMLElement;
      expect(host.getAttribute('role')).toBe(role);
      expect(host.getAttribute('aria-live')).toBe(live);
    });

    it('respects explicit ariaLive override', () => {
      create({ variant: 'error', message: 'msg', ariaLive: 'polite' });
      const host = fixture.nativeElement as HTMLElement;
      // Role defaults to alert for error, but aria-live is overridden to polite
      expect(host.getAttribute('role')).toBe('alert');
      expect(host.getAttribute('aria-live')).toBe('polite');
    });
  });
});
