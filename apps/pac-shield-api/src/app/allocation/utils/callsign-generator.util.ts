import { AircraftType } from '@prisma/client';

/**
 * Callsign prefix mapping for aircraft types and subtypes
 * - C130: AW (Airlift Wing)
 * - C17: ME (Mobility Express)
 * - C5 Bobcat: BO
 * - C5 Rhino: RH
 */
const CALLSIGN_PREFIXES: Record<string, string> = {
  'C130': 'AW',
  'C17': 'ME',
  'C5_BOBCAT': 'BO',
  'C5_RHINO': 'RH',
  'F16': 'VIP', // Viper
  'F22': 'RPT', // Raptor
};

/**
 * Generate the next available callsign for a given aircraft type/subtype
 * @param type Aircraft type (C130, C17, C5, etc.)
 * @param subtype Aircraft subtype (for C5: 'BOBCAT' or 'RHINO')
 * @param existingCallSigns Array of currently used callsigns for this type/subtype
 * @returns Next available callsign (e.g., 'AW01', 'ME12', 'BO03')
 */
export function generateCallSign(
  type: AircraftType,
  subtype: string | null,
  existingCallSigns: string[]
): string {
  // Determine the prefix
  const key = type === 'C5' && subtype ? `${type}_${subtype}` : type;
  const prefix = CALLSIGN_PREFIXES[key];

  if (!prefix) {
    throw new Error(`No callsign prefix defined for aircraft type: ${type}${subtype ? ` (${subtype})` : ''}`);
  }

  // Extract numbers from existing callsigns with this prefix
  const existingNumbers = existingCallSigns
    .filter(cs => cs.startsWith(prefix))
    .map(cs => {
      const match = cs.match(/^[A-Z]+(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => !isNaN(num));

  // Find the next available number (start from 1)
  let nextNumber = 1;
  if (existingNumbers.length > 0) {
    const maxNumber = Math.max(...existingNumbers);
    nextNumber = maxNumber + 1;
  }

  // Format with zero-padding (e.g., AW01, AW02, ... AW10, AW11)
  return `${prefix}${nextNumber.toString().padStart(2, '0')}`;
}

/**
 * Validate if a callsign matches the expected format for a given aircraft type/subtype
 * @param callSign Callsign to validate
 * @param type Aircraft type
 * @param subtype Aircraft subtype (for C5)
 * @returns True if callsign format is valid
 */
export function validateCallSign(
  callSign: string,
  type: AircraftType,
  subtype: string | null
): boolean {
  const key = type === 'C5' && subtype ? `${type}_${subtype}` : type;
  const expectedPrefix = CALLSIGN_PREFIXES[key];

  if (!expectedPrefix) {
    return false;
  }

  // Check format: prefix followed by 2+ digits
  const regex = new RegExp(`^${expectedPrefix}\\d{2,}$`);
  return regex.test(callSign);
}

/**
 * Parse a callsign to extract its type and subtype
 * @param callSign Callsign to parse
 * @returns Object with type and subtype, or null if invalid
 */
export function parseCallSign(callSign: string): { type: AircraftType; subtype: string | null } | null {
  for (const [key, prefix] of Object.entries(CALLSIGN_PREFIXES)) {
    if (callSign.startsWith(prefix)) {
      if (key.startsWith('C5_')) {
        const subtype = key.split('_')[1];
        return { type: 'C5' as AircraftType, subtype };
      }
      return { type: key as AircraftType, subtype: null };
    }
  }
  return null;
}
