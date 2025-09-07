import { FormControl } from '@angular/forms';
import { pinValidator } from './pin.validator';

describe('pinValidator()', () => {
  const validator = pinValidator(4);

  it('returns required when empty', () => {
    const control = new FormControl<string>('');
    expect(validator(control)).toEqual({ required: true });
  });

  it('returns digitsOnly when contains non-numeric', () => {
    const control = new FormControl<string>('12A4');
    expect(validator(control)).toEqual({ digitsOnly: true });
  });

  it('returns exactLength when length is not 4', () => {
    const control = new FormControl<string>('123');
    expect(validator(control)).toEqual({ exactLength: { length: 4 } });
  });

  it('returns null for valid 4-digit pin', () => {
    const control = new FormControl<string>('1234');
    expect(validator(control)).toBeNull();
  });
});
