import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator that enforces "first initial.lastname" format for usernames.
 * Accepts mixed case input since automatic lowercase conversion is applied.
 *
 * Valid examples: j.smith, J.Smith, B.JONES, m.thomas
 * Invalid examples: John, j smith, j., .smith, jsmith
 *
 * @returns ValidatorFn that validates the username format
 */
export function nameFormatValidator(): ValidatorFn {
  const pattern = /^[a-zA-Z]\.[a-zA-Z]+$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString();
    if (!value.trim()) return null; // Let required validator handle empty values
    return pattern.test(value) ? null : { nameFormat: true };
  };
}