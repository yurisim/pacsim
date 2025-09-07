import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function pinValidator(length = 4): ValidatorFn {
  const digits = /^[0-9]+$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = (control.value ?? '').toString().trim();
    if (!v) return { required: true };
    if (!digits.test(v)) return { digitsOnly: true };
    if (v.length !== length) return { exactLength: { length } };
    return null;
  };
}
