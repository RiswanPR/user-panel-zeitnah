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
      const candidates = service.generateCandidates('Riswan PR', 'riswan@example.com');
      expect(candidates).toContain('riswan');
      expect(candidates).toContain('riswanpr');
      expect(candidates).toContain('riswan_pr');
      expect(candidates).toContain('riswan_p');
      expect(candidates.every((c) => service.validate(c).valid)).toBe(true);
    });

    it('should fall back to email local part when name is missing', () => {
      const candidates = service.generateCandidates('', 'shahil.ahmed@zeitnah.com');
      expect(candidates).toContain('shahil_ahmed');
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every((c) => service.validate(c).valid)).toBe(true);
    });

    it('should never include reserved usernames in generated candidates', () => {
      const candidates = service.generateCandidates('Admin User', 'admin@zeitnah.com');
      expect(candidates).not.toContain('admin');
      expect(candidates).not.toContain('user');
      expect(candidates.every((c) => !isReservedUsername(c))).toBe(true);
    });
  });
});
