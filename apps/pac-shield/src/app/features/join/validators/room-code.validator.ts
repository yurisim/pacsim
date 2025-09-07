import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function roomCodeValidator(length = 6): ValidatorFn {
  const alnum = /^[A-Za-z0-9]+$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const v: string = (control.value ?? '').toString().trim();
    if (!v) return { required: true };
    if (v.length !== length) return { exactLength: { length } };
    if (!alnum.test(v)) return { pattern: true };
    return null;
  };
}
