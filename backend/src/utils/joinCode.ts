import crypto from 'crypto';

// High-entropy character set excluding easily confused characters (0, O, I, 1, L)
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a unique, non-sequential, human-friendly join code.
 * Example: MM-7K9X2P
 * Entropy: 31^6 ≈ 887 million combinations per 6-char block
 */
export function generateJoinCode(prefix = 'MM'): string {
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `${prefix}-${code}`;
}

/**
 * Normalizes input join code for consistent database matching.
 */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase();
}
