import { AbstractControl, ValidationErrors } from '@angular/forms';

type ErrorMap = Record<string, (err: any) => string>;

const defaultErrorMap: ErrorMap = {
  required: () => 'This field is required.',
  minlength: (e: { requiredLength: number }) => `Minimum length is ${e?.requiredLength}.`,
  maxlength: (e: { requiredLength: number }) => `Maximum length is ${e?.requiredLength}.`,
  pattern: () => 'Value has an invalid format.',
  roomInvalid: () => 'Invalid room code.',
  roomCheckFailed: () => 'Error validating room code.',
  nameTaken: () => 'This name is already taken. Please choose another one.',
  availabilityError: () => 'Error checking name availability.',
  invalidPin: () => 'The PIN you entered is incorrect. Please try again.',
  digitsOnly: () => 'Only digits are allowed.',
  exactLength: (e: { length: number }) => `Must be exactly ${e?.length} characters.`,
};

export function mapFieldError(control: AbstractControl, customMap?: Partial<ErrorMap>): string | null {
  if (!control || !control.errors) return null;
  const errors: ValidationErrors = control.errors;
  const map: ErrorMap = { ...defaultErrorMap, ...(customMap || {}) } as ErrorMap;

  for (const key of Object.keys(errors)) {
    const factory = map[key];
    if (factory) {
      return factory(errors[key]);
    }
  }
  // Fallback to the first error key if no mapping provided
  const firstKey = Object.keys(errors)[0];
  const raw = errors[firstKey];
  return typeof raw === 'string' ? raw : 'Invalid value.';
}

export function mapFormErrors(errors: ValidationErrors | null | undefined, customMap?: Partial<ErrorMap>): string[] {
  if (!errors) return [];
  const map: ErrorMap = { ...defaultErrorMap, ...(customMap || {}) } as ErrorMap;
  return Object.keys(errors).map((key) => {
    const factory = map[key];
    return factory ? factory((errors as any)[key]) : `${key} error`;
  });
}
