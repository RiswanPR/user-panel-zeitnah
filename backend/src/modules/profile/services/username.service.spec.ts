import { Test, TestingModule } from '@nestjs/testing';
import { UsernameService } from './username.service';
import { isReservedUsername } from '../../../common/constants/reserved-usernames';

describe('UsernameService', () => {
  let service: UsernameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsernameService],
    }).compile();

    service = module.get<UsernameService>(UsernameService);
  });

  describe('Sanitization', () => {
    it('should lowercase and trim', () => {
      expect(service.sanitize('  Riswan  ')).toBe('riswan');
    });

    it('should replace spaces and hyphens with underscores and collapse them', () => {
      expect(service.sanitize('Riswan - PR')).toBe('riswan_pr');
      expect(service.sanitize('Riswan___PR')).toBe('riswan_pr');
    });

    it('should strip special characters and symbols', () => {
      expect(service.sanitize('R!sw@n P#R$')).toBe('r_sw_n_p_r');
      expect(service.sanitize('Riswan PR!@#')).toBe('riswan_pr');
    });

    it('should strip leading and trailing underscores', () => {
      expect(service.sanitize('_riswan_')).toBe('riswan');
      expect(service.sanitize('___riswan___')).toBe('riswan');
    });

    it('should enforce 20 character maximum without trailing underscores', () => {
      const longName = 'A'.repeat(30);
      const sanitized = service.sanitize(longName);
      expect(sanitized.length).toBeLessThanOrEqual(20);
      expect(sanitized.endsWith('_')).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate compliant usernames', () => {
      expect(service.validate('riswan').valid).toBe(true);
      expect(service.validate('riswan_pr').valid).toBe(true);
      expect(service.validate('shahil_07').valid).toBe(true);
      expect(service.validate('user123').valid).toBe(true);
    });

    it('should reject usernames shorter than 3 characters', () => {
      const res = service.validate('ab');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('at least 3 characters');
    });

    it('should reject usernames longer than 20 characters', () => {
      const res = service.validate('a'.repeat(21));
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('20 characters or fewer');
    });

    it('should reject usernames with leading or trailing underscores', () => {
      expect(service.validate('_riswan').valid).toBe(false);
      expect(service.validate('riswan_').valid).toBe(false);
    });

    it('should reject usernames with consecutive underscores', () => {
      const res = service.validate('riswan__pr');
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('consecutive underscores');
    });

    it('should reject reserved usernames case-insensitively', () => {
      expect(service.validate('admin').valid).toBe(false);
      expect(service.validate('ADMIN').valid).toBe(false);
      expect(service.validate('profile').valid).toBe(false);
      expect(service.validate('zeitnah').valid).toBe(false);
      expect(service.validate('support').valid).toBe(false);
      expect(service.validate('username').valid).toBe(false);
    });

    it('should correctly identify reserved usernames via helper', () => {
      expect(isReservedUsername('Admin')).toBe(true);
      expect(isReservedUsername('official')).toBe(true);
      expect(isReservedUsername('my_custom_user')).toBe(false);
    });
  });

  describe('Candidate Generation', () => {
    it('should generate ranked candidates from full name', () => {
      const candidates = service.generateCandidates(
        'Riswan PR',
        'riswan@example.com',
      );
      expect(candidates).toContain('riswan');
      expect(candidates).toContain('riswanpr');
      expect(candidates).toContain('riswan_pr');
      expect(candidates).toContain('riswan_p');
      expect(candidates.every((c) => service.validate(c).valid)).toBe(true);
    });

    it('should fall back to email local part when name is missing', () => {
      const candidates = service.generateCandidates(
        '',
        'shahil.ahmed@zeitnah.com',
      );
      expect(candidates).toContain('shahil_ahmed');
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every((c) => service.validate(c).valid)).toBe(true);
    });

    it('should never include reserved usernames in generated candidates', () => {
      const candidates = service.generateCandidates(
        'Admin User',
        'admin@zeitnah.com',
      );
      expect(candidates).not.toContain('admin');
      expect(candidates).not.toContain('user');
      expect(candidates.every((c) => !isReservedUsername(c))).toBe(true);
    });
  });

  describe('Suffix Handling & buildWithSuffix', () => {
    it('should reserve space for numeric suffixes and guarantee <= 20 length', () => {
      const base = 'muhammedthajchorampatta';
      const result = service.buildWithSuffix(base, 1, '_');
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toBe('muhammedthajchoram_1');
      expect(service.validate(result).valid).toBe(true);
    });

    it('should handle multi-digit suffixes without exceeding 20 chars', () => {
      const base = 'muhammedthajchorampatta';
      const result = service.buildWithSuffix(base, 100, '_');
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toBe('muhammedthajchor_100');
      expect(service.validate(result).valid).toBe(true);
    });

    it('should handle base muhammedthajchor with suffix _1', () => {
      const base = 'muhammedthajchor';
      const result = service.buildWithSuffix(base, 1, '_');
      expect(result).toBe('muhammedthajchor_1');
      expect(result.length).toBeLessThanOrEqual(20);
      expect(service.validate(result).valid).toBe(true);
    });

    it('should never produce consecutive underscores or end with underscore', () => {
      const base = 'user_name_';
      const result = service.buildWithSuffix(base, 1, '_');
      expect(result).not.toContain('__');
      expect(result.endsWith('_')).toBe(false);
      expect(service.validate(result).valid).toBe(true);
    });
  });

  describe('Unique Username Generation (generateUniqueUsername)', () => {
    it('should generate normal username when available', async () => {
      const username = await service.generateUniqueUsername({
        name: 'muhammed',
        isTaken: () => false,
      });
      expect(username).toBe('muhammed');
      expect(username.length).toBeLessThanOrEqual(20);
      expect(service.validate(username).valid).toBe(true);
    });

    it('should truncate long username to <= 20 chars without error', async () => {
      const username = await service.generateUniqueUsername({
        name: 'muhammedthajchorampatta',
        isTaken: () => false,
      });
      expect(username.length).toBeLessThanOrEqual(20);
      expect(username).toBe('muhammedthajchorampa');
      expect(service.validate(username).valid).toBe(true);
    });

    it('should resolve collision safely while reserving suffix space and keeping length <= 20', async () => {
      const taken = new Set(['muhammedthajchorampa']);
      const username = await service.generateUniqueUsername({
        name: 'muhammedthajchorampatta',
        isTaken: (cand) => taken.has(cand),
      });
      expect(username.length).toBeLessThanOrEqual(20);
      expect(username).not.toBe('muhammedthajchorampa');
      expect(service.validate(username).valid).toBe(true);
      expect(username).toBe('muhammedthajchoram_1');
    });

    it('should resolve collision if muhammedthajchor exists', async () => {
      const taken = new Set(['muhammedthajchor', 'muhammedthajchoramp']);
      const username = await service.generateUniqueUsername({
        source: 'muhammedthajchor',
        isTaken: (cand) => taken.has(cand),
      });
      expect(username.length).toBeLessThanOrEqual(20);
      expect(username).toBe('muhammedthajchor_1');
      expect(service.validate(username).valid).toBe(true);
    });

    it('should handle very long names (significantly longer than 20 chars)', async () => {
      const veryLongName =
        'Muhammed Thaj Chorampatta Very Long Extraordinary Student Name';
      const username = await service.generateUniqueUsername({
        name: veryLongName,
        isTaken: () => false,
      });
      expect(username.length).toBeLessThanOrEqual(20);
      expect(service.validate(username).valid).toBe(true);
    });

    it('should clean invalid characters (spaces, special chars, uppercase, multiple separators)', async () => {
      const messyInput = '  Muhammed @#$ Thaj __ Chorampatta !?* ';
      const username = await service.generateUniqueUsername({
        name: messyInput,
        isTaken: () => false,
      });
      expect(username.length).toBeLessThanOrEqual(20);
      expect(/^[a-z0-9_]+$/.test(username)).toBe(true);
      expect(username).not.toContain('__');
      expect(username.startsWith('_')).toBe(false);
      expect(username.endsWith('_')).toBe(false);
      expect(service.validate(username).valid).toBe(true);
    });
  });
});
