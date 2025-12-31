import crypto from 'crypto';
import { normalizeString } from './removeAccents';

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 12)
 * @returns Generated password string
 */
export function generateSecurePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += uppercase[crypto.randomInt(0, uppercase.length)];
  password += lowercase[crypto.randomInt(0, lowercase.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password
    .split('')
    .sort(() => crypto.randomInt(0, 2) - 1)
    .join('');
}

/**
 * Generate password based on user's name
 * Format: lastname+firstname123 (without accents, lowercase)
 * Example: Trần Nhung -> nhungtran123
 * @param firstName - User's first name
 * @param lastName - User's last name
 * @returns Generated password string
 */
export function generatePasswordFromName(firstName: string, lastName: string): string {
  const normalizedLastName = normalizeString(lastName);
  const normalizedFirstName = normalizeString(firstName);
  
  return `${normalizedLastName}${normalizedFirstName}123`;
}
