import { generateCallSign, validateCallSign, parseCallSign } from './callsign-generator.util';
import { AircraftType } from '@prisma/client';

describe('CallsignGeneratorUtil', () => {
  describe('generateCallSign', () => {
    it('should generate AW01 for first C130', () => {
      const callsign = generateCallSign(AircraftType.C130, null, []);
      expect(callsign).toBe('AW01');
    });

    it('should generate ME01 for first C17', () => {
      const callsign = generateCallSign(AircraftType.C17, null, []);
      expect(callsign).toBe('ME01');
    });

    it('should generate BO01 for first C5 Bobcat', () => {
      const callsign = generateCallSign(AircraftType.C5, 'BOBCAT', []);
      expect(callsign).toBe('BO01');
    });

    it('should generate RH01 for first C5 Rhino', () => {
      const callsign = generateCallSign(AircraftType.C5, 'RHINO', []);
      expect(callsign).toBe('RH01');
    });

    it('should generate VIP01 for first F16', () => {
      const callsign = generateCallSign(AircraftType.F16, null, []);
      expect(callsign).toBe('VIP01');
    });

    it('should generate RPT01 for first F22', () => {
      const callsign = generateCallSign(AircraftType.F22, null, []);
      expect(callsign).toBe('RPT01');
    });

    it('should generate next sequential callsign', () => {
      const existing = ['AW01', 'AW02', 'AW03'];
      const callsign = generateCallSign(AircraftType.C130, null, existing);
      expect(callsign).toBe('AW04');
    });

    it('should handle non-sequential existing callsigns', () => {
      const existing = ['AW01', 'AW05', 'AW03'];
      const callsign = generateCallSign(AircraftType.C130, null, existing);
      expect(callsign).toBe('AW06'); // Should use max + 1
    });

    it('should zero-pad single digit numbers', () => {
      const existing = ['ME01', 'ME02', 'ME03', 'ME04', 'ME05', 'ME06', 'ME07', 'ME08'];
      const callsign = generateCallSign(AircraftType.C17, null, existing);
      expect(callsign).toBe('ME09');
    });

    it('should handle double digit numbers', () => {
      const existing = ['ME09'];
      const callsign = generateCallSign(AircraftType.C17, null, existing);
      expect(callsign).toBe('ME10');
    });

    it('should ignore callsigns from other aircraft types', () => {
      const existing = ['AW01', 'ME01', 'BO01', 'RH01'];
      const callsign = generateCallSign(AircraftType.C130, null, existing);
      expect(callsign).toBe('AW02'); // Should only count AW01
    });

    it('should differentiate between C5 Bobcat and Rhino', () => {
      const existing = ['BO01', 'BO02', 'RH01'];
      const callsignBobcat = generateCallSign(AircraftType.C5, 'BOBCAT', existing);
      const callsignRhino = generateCallSign(AircraftType.C5, 'RHINO', existing);

      expect(callsignBobcat).toBe('BO03');
      expect(callsignRhino).toBe('RH02');
    });

    it('should throw error for unknown aircraft type', () => {
      expect(() => {
        generateCallSign('UNKNOWN' as AircraftType, null, []);
      }).toThrow();
    });

    it('should throw error for C5 without subtype', () => {
      expect(() => {
        generateCallSign(AircraftType.C5, null, []);
      }).toThrow();
    });
  });

  describe('validateCallSign', () => {
    it('should validate correct C130 callsign', () => {
      expect(validateCallSign('AW01', AircraftType.C130, null)).toBe(true);
      expect(validateCallSign('AW99', AircraftType.C130, null)).toBe(true);
      expect(validateCallSign('AW123', AircraftType.C130, null)).toBe(true);
    });

    it('should validate correct C17 callsign', () => {
      expect(validateCallSign('ME01', AircraftType.C17, null)).toBe(true);
      expect(validateCallSign('ME42', AircraftType.C17, null)).toBe(true);
    });

    it('should validate correct C5 Bobcat callsign', () => {
      expect(validateCallSign('BO01', AircraftType.C5, 'BOBCAT')).toBe(true);
      expect(validateCallSign('BO99', AircraftType.C5, 'BOBCAT')).toBe(true);
    });

    it('should validate correct C5 Rhino callsign', () => {
      expect(validateCallSign('RH01', AircraftType.C5, 'RHINO')).toBe(true);
      expect(validateCallSign('RH42', AircraftType.C5, 'RHINO')).toBe(true);
    });

    it('should reject incorrect prefix', () => {
      expect(validateCallSign('XX01', AircraftType.C130, null)).toBe(false);
      expect(validateCallSign('AW01', AircraftType.C17, null)).toBe(false);
    });

    it('should reject incorrect format', () => {
      expect(validateCallSign('AW1', AircraftType.C130, null)).toBe(false); // Need 2+ digits
      expect(validateCallSign('AWXX', AircraftType.C130, null)).toBe(false);
      expect(validateCallSign('AW', AircraftType.C130, null)).toBe(false);
    });

    it('should reject wrong subtype for C5', () => {
      expect(validateCallSign('BO01', AircraftType.C5, 'RHINO')).toBe(false);
      expect(validateCallSign('RH01', AircraftType.C5, 'BOBCAT')).toBe(false);
    });
  });

  describe('parseCallSign', () => {
    it('should parse C130 callsign', () => {
      const result = parseCallSign('AW42');
      expect(result).toEqual({ type: AircraftType.C130, subtype: null });
    });

    it('should parse C17 callsign', () => {
      const result = parseCallSign('ME15');
      expect(result).toEqual({ type: AircraftType.C17, subtype: null });
    });

    it('should parse C5 Bobcat callsign', () => {
      const result = parseCallSign('BO03');
      expect(result).toEqual({ type: AircraftType.C5, subtype: 'BOBCAT' });
    });

    it('should parse C5 Rhino callsign', () => {
      const result = parseCallSign('RH07');
      expect(result).toEqual({ type: AircraftType.C5, subtype: 'RHINO' });
    });

    it('should parse F16 callsign', () => {
      const result = parseCallSign('VIP12');
      expect(result).toEqual({ type: AircraftType.F16, subtype: null });
    });

    it('should parse F22 callsign', () => {
      const result = parseCallSign('RPT05');
      expect(result).toEqual({ type: AircraftType.F22, subtype: null });
    });

    it('should return null for invalid callsign', () => {
      expect(parseCallSign('XX99')).toBeNull();
      expect(parseCallSign('INVALID')).toBeNull();
      expect(parseCallSign('')).toBeNull();
    });
  });
});
