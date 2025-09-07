import { FormControl } from '@angular/forms';
import { roomCodeValidator } from './room-code.validator';

describe('roomCodeValidator()', () => {
  const validator = roomCodeValidator(6);

  it('returns required when empty', () => {
    const control = new FormControl<string>('');
    expect(validator(control)).toEqual({ required: true });
  });

  it('returns exactLength when length is not 6', () => {
    const control = new FormControl<string>('ABCD');
    expect(validator(control)).toEqual({ exactLength: { length: 6 } });
  });

  it('returns pattern when contains non-alphanumeric', () => {
    const control = new FormControl<string>('ABC$12');
    expect(validator(control)).toEqual({ pattern: true });
  });

  it('returns null for valid 6-char alphanumeric', () => {
    const control = new FormControl<string>('ABC123');
    expect(validator(control)).toBeNull();
  });
});
