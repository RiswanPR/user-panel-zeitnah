import { ConfigService } from '@nestjs/config';

describe('Database Configuration & MONGO_DB_NAME Integration', () => {
  // Test factory implementation directly matching app.module.ts
  const createMongooseConfig = (configService: ConfigService) => {
    const uri = configService.get<string>('MONGO_URL') || process.env.MONGO_URL;
    const rawDbName =
      configService.get<string>('MONGO_DB_NAME') || process.env.MONGO_DB_NAME;
    const dbName =
      typeof rawDbName === 'string' && rawDbName.trim().length > 0
        ? rawDbName.trim()
        : undefined;
    return {
      uri,
      ...(dbName ? { dbName } : {}),
    };
  };

  it('explicitly selects configured MONGO_DB_NAME regardless of URI pathname', () => {
    const configService = new ConfigService({
      MONGO_URL: 'mongodb://localhost:27017/zeitnah-lms',
      MONGO_DB_NAME: 'lms-platform',
    });
    const config = createMongooseConfig(configService);
    expect(config.uri).toBe('mongodb://localhost:27017/zeitnah-lms');
    expect(config.dbName).toBe('lms-platform');
  });

  it('omits dbName when MONGO_DB_NAME is undefined, preserving URI-based database selection', () => {
    const configService = new ConfigService({
      MONGO_URL: 'mongodb://localhost:27017/zeitnah-lms',
    });
    const config = createMongooseConfig(configService);
    expect(config.uri).toBe('mongodb://localhost:27017/zeitnah-lms');
    expect(config.dbName).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(config, 'dbName')).toBe(false);
  });

  it('omits dbName when MONGO_DB_NAME is an empty string', () => {
    const configService = new ConfigService({
      MONGO_URL: 'mongodb://localhost:27017/zeitnah-lms',
      MONGO_DB_NAME: '',
    });
    const config = createMongooseConfig(configService);
    expect(config.dbName).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(config, 'dbName')).toBe(false);
  });

  it('omits dbName when MONGO_DB_NAME is whitespace only', () => {
    const configService = new ConfigService({
      MONGO_URL: 'mongodb://localhost:27017/zeitnah-lms',
      MONGO_DB_NAME: '   ',
    });
    const config = createMongooseConfig(configService);
    expect(config.dbName).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(config, 'dbName')).toBe(false);
  });

  it('trims leading/trailing whitespace when MONGO_DB_NAME has extra spaces', () => {
    const configService = new ConfigService({
      MONGO_URL: 'mongodb://localhost:27017/zeitnah-lms',
      MONGO_DB_NAME: '  lms-platform  ',
    });
    const config = createMongooseConfig(configService);
    expect(config.dbName).toBe('lms-platform');
  });

  it('does not log or leak credentials when building configuration', () => {
    const logSpy = jest.spyOn(console, 'log');
    const warnSpy = jest.spyOn(console, 'warn');
    const errorSpy = jest.spyOn(console, 'error');

    const configService = new ConfigService({
      MONGO_URL:
        'mongodb://user:super_secret_password@cluster0.mongodb.net:27017/zeitnah-lms',
      MONGO_DB_NAME: 'lms-platform',
    });
    const config = createMongooseConfig(configService);
    expect(config.dbName).toBe('lms-platform');

    // Verify nothing printed secrets
    expect(logSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('super_secret_password'),
    );
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('super_secret_password'),
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('super_secret_password'),
    );

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
