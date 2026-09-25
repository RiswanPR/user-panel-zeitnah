import { Injectable } from '@nestjs/common';
import { isReservedUsername } from '../../../common/constants/reserved-usernames';

export interface UsernameValidationResult {
  valid: boolean;
  reason?: string;
}

export interface GenerateUsernameOptions {
  name?: string;
  email?: string;
  source?: string;
  isTaken: (candidate: string) => Promise<boolean> | boolean;
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
      return {
        valid: false,
        reason: 'Username must be at least 3 characters.',
      };
    }

    if (trimmed.length > 20) {
      return {
        valid: false,
        reason: 'Username must be 20 characters or fewer.',
      };
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
   * Appends a suffix to a base string while strictly guaranteeing the total length
   * does not exceed 20 characters and all normalization/validation rules are respected.
   * Space is reserved from the base string for the suffix (and separator).
   */
  buildWithSuffix(
    base: string,
    suffix: string | number,
    separator = '_',
  ): string {
    const suffixStr = String(suffix);
    const fullSuffix = separator ? `${separator}${suffixStr}` : suffixStr;
    const maxBaseLen = Math.max(1, 20 - fullSuffix.length);

    let cleanBase = this.sanitize(base);
    if (cleanBase.length > maxBaseLen) {
      cleanBase = cleanBase.slice(0, maxBaseLen).replace(/_+$/, '');
    }

    if (!cleanBase) {
      cleanBase =
        'user'.slice(0, Math.max(1, maxBaseLen)).replace(/_+$/, '') || 'u';
    }

    const result = `${cleanBase}${fullSuffix}`;
    if (result.length < 3) {
      return this.sanitize(`${cleanBase}_${suffixStr}`.padEnd(3, '0'));
    }

    return result;
  }

  /**
   * Combines first and second name parts while ensuring the result does not exceed 20 chars.
   */
  buildCombined(first: string, second: string, separator = ''): string {
    const cleanFirst = this.sanitize(first);
    const cleanSecond = this.sanitize(second);
    if (!cleanFirst) return cleanSecond;
    if (!cleanSecond) return cleanFirst;

    const fullStr = separator
      ? `${cleanFirst}${separator}${cleanSecond}`
      : `${cleanFirst}${cleanSecond}`;
    if (fullStr.length <= 20) {
      return fullStr;
    }

    if (separator) {
      const maxSecondLen = 20 - cleanFirst.length - separator.length;
      if (maxSecondLen >= 1) {
        const truncatedSecond = cleanSecond
          .slice(0, maxSecondLen)
          .replace(/_+$/, '');
        return `${cleanFirst}${separator}${truncatedSecond}`;
      }
      const half = 9;
      const firstPart = cleanFirst.slice(0, half).replace(/_+$/, '');
      const secondPart = cleanSecond
        .slice(0, 20 - firstPart.length - separator.length)
        .replace(/_+$/, '');
      return `${firstPart}${separator}${secondPart}`;
    }

    return fullStr.slice(0, 20).replace(/_+$/, '');
  }

  /**
   * Generates an array of ranked, readable username candidates from a user's name, email, and optional source.
   * Guaranteed that every generated candidate has length <= 20 and satisfies schema validation.
   */
  generateCandidates(name?: string, email?: string, source?: string): string[] {
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

    // 0. Process source candidate if provided (e.g. existing username being normalized/repaired)
    if (source && typeof source === 'string') {
      const sanitizedSource = this.sanitize(source);
      if (sanitizedSource && sanitizedSource.length >= 3) {
        addCandidate(sanitizedSource);
        addCandidate(this.buildWithSuffix(sanitizedSource, '1', '_'));
        addCandidate(this.buildWithSuffix(sanitizedSource, '2', '_'));
      }
    }

    // 1. Process Name Parts
    const rawName = (name || '').trim();
    if (rawName) {
      const sanitizedName = this.sanitize(rawName);
      if (sanitizedName && sanitizedName.length >= 3) {
        addCandidate(sanitizedName);
      }

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
          addCandidate(this.buildCombined(firstName, lastName, ''));
          addCandidate(this.buildCombined(firstName, lastName, '_'));
          addCandidate(this.buildCombined(firstName, lastName[0], '_'));
          addCandidate(this.buildCombined(firstName, lastName[0], ''));
        }

        // Step 3: Curated suffixes reserving space
        const base =
          firstName.length >= 3 ? firstName : sanitizedName || 'user';
        const prefixes = ['1', '2', '01', '07', '99', '24', '25', '26'];
        for (const num of prefixes) {
          addCandidate(this.buildWithSuffix(base, num, '_'));
          addCandidate(this.buildWithSuffix(base, num, ''));
        }
      }
    }

    // 2. Process Email Local-part
    if (email && typeof email === 'string') {
      const localPart = email.split('@')[0] || '';
      const sanitizedEmailPart = this.sanitize(localPart);
      if (sanitizedEmailPart && sanitizedEmailPart.length >= 3) {
        addCandidate(sanitizedEmailPart);
        addCandidate(this.buildWithSuffix(sanitizedEmailPart, '1', ''));
        addCandidate(this.buildWithSuffix(sanitizedEmailPart, '1', '_'));
      }
    }

    // 3. Guaranteed fallbacks using numeric suffixes
    const fallbackBase =
      (source ? this.sanitize(source) : '') ||
      this.sanitize(name || '') ||
      this.sanitize((email || '').split('@')[0]) ||
      'zeitnah';
    const effectiveBase = fallbackBase.length >= 3 ? fallbackBase : 'zeitnah';

    for (let i = 0; i < 25; i++) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      addCandidate(this.buildWithSuffix(effectiveBase, randomSuffix, ''));
    }

    return candidates;
  }

  /**
   * Generates a guaranteed valid, <= 20 character, unique username by checking
   * candidates against the provided isTaken callback.
   * If initial candidates collide, systematically generates numbered suffixes
   * while reserving suffix space to ensure <= 20 length.
   */
  async generateUniqueUsername(
    options: GenerateUsernameOptions,
  ): Promise<string> {
    const { name, email, source, isTaken } = options;

    const candidates = this.generateCandidates(name, email, source);
    for (const cand of candidates) {
      if (!isReservedUsername(cand) && this.validate(cand).valid) {
        const taken = await isTaken(cand);
        if (!taken) {
          return cand;
        }
      }
    }

    // Systematic collision resolution
    const baseSource =
      (source ? this.sanitize(source) : '') ||
      this.sanitize(name || '') ||
      this.sanitize((email || '').split('@')[0]) ||
      'user';

    const cleanBase = baseSource.length >= 3 ? baseSource : 'user';

    // Try sequential suffixes _1, _2, ... reserving space for suffix
    for (let counter = 1; counter <= 1000; counter++) {
      const cand = this.buildWithSuffix(cleanBase, counter, '_');
      if (!isReservedUsername(cand) && this.validate(cand).valid) {
        const taken = await isTaken(cand);
        if (!taken) {
          return cand;
        }
      }
    }

    // If 1..1000 all taken, try random 5-digit suffixes
    for (let attempt = 0; attempt < 50; attempt++) {
      const rand = Math.floor(10000 + Math.random() * 90000);
      const cand = this.buildWithSuffix(cleanBase, rand, '_');
      if (!isReservedUsername(cand) && this.validate(cand).valid) {
        const taken = await isTaken(cand);
        if (!taken) {
          return cand;
        }
      }
    }

    throw new Error(
      'Failed to generate a unique username within allowed character limit.',
    );
  }
}
