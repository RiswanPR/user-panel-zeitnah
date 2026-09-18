import { Injectable } from '@nestjs/common';
import { isReservedUsername } from '../../../common/constants/reserved-usernames';

export interface UsernameValidationResult {
  valid: boolean;
  reason?: string;
}

@Injectable()
export class UsernameService {
  /**
   * Sanitizes any raw input into a valid username candidate:
   * - Lowercases and trims whitespace
   * - Converts accents/diacritics
   * - Replaces spaces, hyphens, and invalid symbols with underscore
   * - Collapses consecutive underscores
   * - Trims leading and trailing underscores
   * - Restricts length between 3 and 20 characters
   */
  sanitize(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (sanitized.length > 20) {
      sanitized = sanitized.slice(0, 20).replace(/_+$/, '');
    }

    return sanitized;
  }

  /**
   * Validates whether a username satisfies all strict rules.
   */
  validate(username: string): UsernameValidationResult {
    if (!username || typeof username !== 'string') {
      return { valid: false, reason: 'Username is required.' };
    }

    const trimmed = username.toLowerCase().trim();

    if (trimmed.length < 3) {
      return { valid: false, reason: 'Username must be at least 3 characters.' };
    }

    if (trimmed.length > 20) {
      return { valid: false, reason: 'Username must be 20 characters or fewer.' };
    }

    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      return {
        valid: false,
        reason: 'Only lowercase letters, numbers, and underscores are allowed.',
      };
    }

    if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
      return {
        valid: false,
        reason: 'Username cannot start or end with an underscore.',
      };
    }

    if (trimmed.includes('__')) {
      return {
        valid: false,
        reason: 'Username cannot contain consecutive underscores.',
      };
    }

    if (isReservedUsername(trimmed)) {
      return {
        valid: false,
        reason: 'This username is reserved and cannot be claimed.',
      };
    }

    return { valid: true };
  }

  /**
   * Generates an array of ranked, readable username candidates from a user's name and email.
   * Preferred order:
   * 1. First name (e.g. "riswan")
   * 2. Full combined name (e.g. "riswanpr", "riswan_pr")
   * 3. First name + last initial (e.g. "riswan_p")
   * 4. Name with curated numeric suffixes (01, 07, 1, 2)
   * 5. Email local part (e.g. "riswan_dev")
   * 6. Clean numeric fallbacks (e.g. "riswan4821")
   */
  generateCandidates(name?: string, email?: string): string[] {
    const candidates: string[] = [];
    const seen = new Set<string>();

    const addCandidate = (cand: string) => {
      const sanitized = this.sanitize(cand);
      const validation = this.validate(sanitized);
      if (validation.valid && !seen.has(sanitized)) {
        seen.add(sanitized);
        candidates.push(sanitized);
      }
    };

    // 1. Process Name Parts
    const rawName = (name || '').trim();
    if (rawName) {
      const parts = rawName
        .split(/\s+/)
        .map((p) => this.sanitize(p))
        .filter(Boolean);

      if (parts.length >= 1) {
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

        // Step 1: First name if at least 3 chars
        if (firstName.length >= 3) {
          addCandidate(firstName);
        }

        // Step 2: First + last combined
        if (lastName) {
          addCandidate(`${firstName}${lastName}`);
          addCandidate(`${firstName}_${lastName}`);
          addCandidate(`${firstName}_${lastName[0]}`);
          addCandidate(`${firstName}${lastName[0]}`);
        }

        // Step 3: Curated suffixes
        const base = firstName.length >= 3 ? firstName : `${firstName}${lastName || 'user'}`;
        const prefixes = ['01', '07', '1', '2', '99', '24', '25', '26'];
        for (const num of prefixes) {
          addCandidate(`${base}${num}`);
          addCandidate(`${base}_${num}`);
        }
      }
    }

    // 2. Process Email Local-part
    if (email && typeof email === 'string') {
      const localPart = email.split('@')[0] || '';
      const sanitizedEmailPart = this.sanitize(localPart);
      if (sanitizedEmailPart) {
        addCandidate(sanitizedEmailPart);
        addCandidate(`${sanitizedEmailPart}1`);
        addCandidate(`${sanitizedEmailPart}_1`);
      }
    }

    // 3. Guaranteed fallbacks using 4-digit numbers
    const fallbackBase = this.sanitize(name || '') || this.sanitize((email || '').split('@')[0]) || 'zeitnah';
    const effectiveBase = fallbackBase.length >= 3 ? fallbackBase.slice(0, 14) : 'zeitnah';

    for (let i = 0; i < 25; i++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      addCandidate(`${effectiveBase}${randomSuffix}`);
    }

    return candidates;
  }
}
