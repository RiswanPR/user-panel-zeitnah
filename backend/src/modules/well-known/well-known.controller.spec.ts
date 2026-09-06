import { Test, TestingModule } from '@nestjs/testing';
import { WellKnownController } from './well-known.controller';

describe('WellKnownController', () => {
  let controller: WellKnownController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WellKnownController],
    }).compile();

    controller = module.get<WellKnownController>(WellKnownController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAssetLinks', () => {
    it('should return valid Android Asset Links array', () => {
      const result = controller.getAssetLinks();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].target.package_name).toBe('com.zeitnahacademy.app');
      expect(result[0].relation).toContain('delegate_permission/common.handle_all_urls');
      expect(result[0].target.sha256_cert_fingerprints).toBeDefined();
    });
  });

  describe('getAppleAppSiteAssociation', () => {
    it('should return valid Apple App Site Association object', () => {
      const result = controller.getAppleAppSiteAssociation();
      expect(result.applinks).toBeDefined();
      expect(result.applinks.details[0].appIDs[0]).toContain('com.zeitnahacademy.app');
      expect(result.applinks.details[0].components).toHaveLength(4);
    });
  });
});
