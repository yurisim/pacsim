import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AccountSelectorComponent, AccountSummary } from './account-selector.component';

describe('AccountSelectorComponent', () => {
  let fixture: ComponentFixture<AccountSelectorComponent>;
  let component: AccountSelectorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders input and respects disabled state', () => {
    const input = fixture.debugElement.query(By.css('[data-testid="player-name-input"]')).nativeElement as HTMLInputElement;
    expect(input).toBeTruthy();

    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(input.readOnly).toBe(true);
  });

  it('emits accountChange with object when typing non-empty name', () => {
    const spy = jest.fn();
    component.accountChange.subscribe(spy);

    const input = fixture.debugElement.query(By.css('[data-testid="player-name-input"]')).nativeElement as HTMLInputElement;
    input.value = 'Alice';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalled();
    const emitted: AccountSummary | null = spy.mock.calls[0][0];
    expect(emitted).toEqual({ id: undefined, name: 'Alice' });
  });

  it('emits null when input cleared', () => {
    const spy = jest.fn();
    component.accountChange.subscribe(spy);

    const input = fixture.debugElement.query(By.css('[data-testid="player-name-input"]')).nativeElement as HTMLInputElement;
    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(null);
  });

  it('shows error text when provided', () => {
    fixture.componentRef.setInput('ariaDescribedById', 'err');
    fixture.componentRef.setInput('errorText', 'This field is required.');
    fixture.detectChanges();

    const err = fixture.debugElement.query(By.css('#err'));
    expect(err).toBeTruthy();
    expect(err.nativeElement.textContent).toContain('This field is required.');
  });
});
