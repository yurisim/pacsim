import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator that enforces "first initial.lastname" format in lowercase for usernames.
 *
 * Valid examples: j.smith, b.jones, m.thomas
 * Invalid examples: John, j smith, J.Smith, j., .smith, jsmith
 *
 * @returns ValidatorFn that validates the username format
 */
export function nameFormatValidator(): ValidatorFn {
  const pattern = /^[a-z]\.[a-z]+$/;
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString();
    if (!value.trim()) return null; // Let required validator handle empty values
    return pattern.test(value) ? null : { nameFormat: true };
  };
}