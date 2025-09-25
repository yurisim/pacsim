import { FormControl } from '@angular/forms';
import { nameFormatValidator } from './name-format.validator';

describe('nameFormatValidator', () => {
  const validator = nameFormatValidator();

  it('should return null for valid lowercase format j.smith', () => {
    const control = new FormControl('j.smith');
    expect(validator(control)).toBeNull();
  });

  it('should return null for valid lowercase format m.thomas', () => {
    const control = new FormControl('m.thomas');
    expect(validator(control)).toBeNull();
  });

  it('should return null for valid lowercase format a.johnson', () => {
    const control = new FormControl('a.johnson');
    expect(validator(control)).toBeNull();
  });

  it('should return null for empty value (let required validator handle)', () => {
    const control = new FormControl('');
    expect(validator(control)).toBeNull();
  });

  it('should return null for null value', () => {
    const control = new FormControl(null);
    expect(validator(control)).toBeNull();
  });

  it('should return null for undefined value', () => {
    const control = new FormControl(undefined);
    expect(validator(control)).toBeNull();
  });

  it('should return null for capitalized first letter (now allowed)', () => {
    const control = new FormControl('J.smith');
    expect(validator(control)).toBeNull();
  });

  it('should return null for capitalized surname (now allowed)', () => {
    const control = new FormControl('j.Smith');
    expect(validator(control)).toBeNull();
  });

  it('should return null for all caps (now allowed)', () => {
    const control = new FormControl('J.SMITH');
    expect(validator(control)).toBeNull();
  });

  it('should return nameFormat error for missing dot', () => {
    const control = new FormControl('jsmith');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for space instead of dot', () => {
    const control = new FormControl('j smith');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for just first initial and dot', () => {
    const control = new FormControl('j.');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for just dot and surname', () => {
    const control = new FormControl('.smith');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for multiple dots', () => {
    const control = new FormControl('j..smith');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for numbers in name', () => {
    const control = new FormControl('j.smith2');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for special characters', () => {
    const control = new FormControl('j.smith!');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for spaces around name', () => {
    const control = new FormControl(' j.smith ');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for full name format', () => {
    const control = new FormControl('john');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for multiple first initials', () => {
    const control = new FormControl('jm.smith');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  it('should return nameFormat error for "Sim" (no dot, mixed case)', () => {
    const control = new FormControl('Sim');
    expect(validator(control)).toEqual({ nameFormat: true });
  });

  // Add tests for mixed case combinations that should now pass
  it('should return null for mixed case first.last format', () => {
    const control = new FormControl('A.wilson');
    expect(validator(control)).toBeNull();
  });

  it('should return null for camelCase surname', () => {
    const control = new FormControl('k.McDonald');
    expect(validator(control)).toBeNull();
  });
});