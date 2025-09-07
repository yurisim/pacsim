import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RoomCodeFieldComponent } from './room-code-field.component';

describe('RoomCodeFieldComponent', () => {
  let fixture: ComponentFixture<RoomCodeFieldComponent>;
  let component: RoomCodeFieldComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, RoomCodeFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomCodeFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('propagates value changes via CVA (uppercased)', () => {
    const onChange = jest.fn();
    component.registerOnChange(onChange);

    component.inner.setValue('abC123');
    expect(onChange).toHaveBeenCalledWith('ABC123');
  });

  it('writeValue sets inner control (uppercased)', () => {
    component.writeValue('ab12cd');
    expect(component.inner.value).toBe('AB12CD');
  });

  it('setDisabledState toggles inner control state', () => {
    component.setDisabledState(true);
    expect(component.inner.disabled).toBe(true);

    component.setDisabledState(false);
    expect(component.inner.enabled).toBe(true);
  });

  it('emits complete and calls onTouched when OTP completes', () => {
    const touched = jest.fn();
    component.registerOnTouched(touched);

    const spy = jest.fn();
    component.complete.subscribe(spy);

    component.inner.setValue('ABC123');
    component.onOtpComplete();

    expect(spy).toHaveBeenCalled();
    expect(touched).toHaveBeenCalled();
  });
});
