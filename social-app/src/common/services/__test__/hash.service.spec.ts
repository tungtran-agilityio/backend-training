import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HashService } from '../hash.service';
import * as argon2 from 'argon2';

// Mock the argon2 module
jest.mock('argon2');

describe('HashService', () => {
  let service: HashService;
  let configService: jest.Mocked<ConfigService>;
  let mockArgon2: jest.Mocked<typeof argon2>;

  const mockConfig = {
    PASSWORD_PEPPER: 'test-pepper-secret',
    HASH_MEMORY_COST: 65536,
    HASH_TIME_COST: 3,
    HASH_PARALLELISM: 4,
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HashService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HashService>(HashService);
    configService = module.get(ConfigService);
    mockArgon2 = argon2 as jest.Mocked<typeof argon2>;

    // Setup default config returns
    configService.get.mockImplementation((key: string) => {
      return mockConfig[key as keyof typeof mockConfig];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hash', () => {
    const rawPassword = 'mySecretPassword123';
    const expectedHash = '$argon2id$v=19$m=65536,t=3,p=4$hashedResult';

    it('should successfully hash a password with pepper and configuration', async () => {
      mockArgon2.hash.mockResolvedValue(expectedHash);

      const result = await service.hash(rawPassword);

      expect(configService.get).toHaveBeenCalledWith('PASSWORD_PEPPER');
      expect(configService.get).toHaveBeenCalledWith('HASH_MEMORY_COST');
      expect(configService.get).toHaveBeenCalledWith('HASH_TIME_COST');
      expect(configService.get).toHaveBeenCalledWith('HASH_PARALLELISM');

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        rawPassword + mockConfig.PASSWORD_PEPPER,
        {
          type: argon2.argon2id,
          memoryCost: mockConfig.HASH_MEMORY_COST,
          timeCost: mockConfig.HASH_TIME_COST,
          parallelism: mockConfig.HASH_PARALLELISM,
        },
      );

      expect(result).toBe(expectedHash);
    });

    it('should handle empty password', async () => {
      const emptyPassword = '';
      mockArgon2.hash.mockResolvedValue(expectedHash);

      const result = await service.hash(emptyPassword);

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        emptyPassword + mockConfig.PASSWORD_PEPPER,
        expect.any(Object),
      );
      expect(result).toBe(expectedHash);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = 'pássw@rd!#$%^&*()';
      mockArgon2.hash.mockResolvedValue(expectedHash);

      const result = await service.hash(specialPassword);

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        specialPassword + mockConfig.PASSWORD_PEPPER,
        expect.any(Object),
      );
      expect(result).toBe(expectedHash);
    });

    it('should use correct argon2 configuration', async () => {
      mockArgon2.hash.mockResolvedValue(expectedHash);

      await service.hash(rawPassword);

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: argon2.argon2id,
          memoryCost: 65536,
          timeCost: 3,
          parallelism: 4,
        }),
      );
    });

    it('should handle missing configuration gracefully', async () => {
      configService.get.mockReturnValue(undefined);
      mockArgon2.hash.mockResolvedValue(expectedHash);

      const result = await service.hash(rawPassword);

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        rawPassword + undefined, // pepper is undefined
        {
          type: argon2.argon2id,
          memoryCost: undefined,
          timeCost: undefined,
          parallelism: undefined,
        },
      );
      expect(result).toBe(expectedHash);
    });

    it('should handle argon2 hashing errors', async () => {
      const hashError = new Error('Argon2 hashing failed');
      mockArgon2.hash.mockRejectedValue(hashError);

      await expect(service.hash(rawPassword)).rejects.toThrow(hashError);

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        rawPassword + mockConfig.PASSWORD_PEPPER,
        expect.any(Object),
      );
    });

    it('should handle configuration service errors', async () => {
      const configError = new Error('Config service unavailable');
      configService.get.mockImplementation(() => {
        throw configError;
      });

      await expect(service.hash(rawPassword)).rejects.toThrow(configError);
    });

    it('should work with different configuration values', async () => {
      const differentConfig = {
        PASSWORD_PEPPER: 'different-pepper',
        HASH_MEMORY_COST: 32768,
        HASH_TIME_COST: 2,
        HASH_PARALLELISM: 2,
      };

      configService.get.mockImplementation((key: string) => {
        return differentConfig[key as keyof typeof differentConfig];
      });

      mockArgon2.hash.mockResolvedValue(expectedHash);

      await service.hash(rawPassword);

      expect(mockArgon2.hash).toHaveBeenCalledWith(
        rawPassword + differentConfig.PASSWORD_PEPPER,
        {
          type: argon2.argon2id,
          memoryCost: differentConfig.HASH_MEMORY_COST,
          timeCost: differentConfig.HASH_TIME_COST,
          parallelism: differentConfig.HASH_PARALLELISM,
        },
      );
    });
  });

  describe('verify', () => {
    const rawPassword = 'mySecretPassword123';
    const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hashedResult';

    it('should successfully verify a correct password', async () => {
      mockArgon2.verify.mockResolvedValue(true);

      const result = await service.verify(hashedPassword, rawPassword);

      expect(configService.get).toHaveBeenCalledWith('PASSWORD_PEPPER');
      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        rawPassword + mockConfig.PASSWORD_PEPPER,
      );
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const wrongPassword = 'wrongPassword';
      mockArgon2.verify.mockResolvedValue(false);

      const result = await service.verify(hashedPassword, wrongPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        wrongPassword + mockConfig.PASSWORD_PEPPER,
      );
      expect(result).toBe(false);
    });

    it('should handle empty password verification', async () => {
      const emptyPassword = '';
      mockArgon2.verify.mockResolvedValue(false);

      const result = await service.verify(hashedPassword, emptyPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        emptyPassword + mockConfig.PASSWORD_PEPPER,
      );
      expect(result).toBe(false);
    });

    it('should handle empty hash verification', async () => {
      const emptyHash = '';
      mockArgon2.verify.mockResolvedValue(false);

      const result = await service.verify(emptyHash, rawPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        emptyHash,
        rawPassword + mockConfig.PASSWORD_PEPPER,
      );
      expect(result).toBe(false);
    });

    it('should handle special characters in password verification', async () => {
      const specialPassword = 'pássw@rd!#$%^&*()';
      mockArgon2.verify.mockResolvedValue(true);

      const result = await service.verify(hashedPassword, specialPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        specialPassword + mockConfig.PASSWORD_PEPPER,
      );
      expect(result).toBe(true);
    });

    it('should add pepper to password during verification', async () => {
      mockArgon2.verify.mockResolvedValue(true);

      await service.verify(hashedPassword, rawPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        rawPassword + mockConfig.PASSWORD_PEPPER,
      );
    });

    it('should handle missing pepper configuration', async () => {
      configService.get.mockReturnValue(undefined);
      mockArgon2.verify.mockResolvedValue(false);

      const result = await service.verify(hashedPassword, rawPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        rawPassword + undefined, // pepper is undefined
      );
      expect(result).toBe(false);
    });

    it('should handle argon2 verification errors', async () => {
      const verifyError = new Error('Argon2 verification failed');
      mockArgon2.verify.mockRejectedValue(verifyError);

      await expect(service.verify(hashedPassword, rawPassword)).rejects.toThrow(
        verifyError,
      );

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        rawPassword + mockConfig.PASSWORD_PEPPER,
      );
    });

    it('should handle configuration service errors during verification', async () => {
      const configError = new Error('Config service unavailable');
      configService.get.mockImplementation(() => {
        throw configError;
      });

      await expect(service.verify(hashedPassword, rawPassword)).rejects.toThrow(
        configError,
      );
    });

    it('should work with different pepper values', async () => {
      const differentPepper = 'different-secret-pepper';
      configService.get.mockReturnValue(differentPepper);
      mockArgon2.verify.mockResolvedValue(true);

      const result = await service.verify(hashedPassword, rawPassword);

      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedPassword,
        rawPassword + differentPepper,
      );
      expect(result).toBe(true);
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have configService dependency injected', () => {
      expect(configService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should hash and verify password successfully', async () => {
      const password = 'testPassword123';
      const hashedResult = '$argon2id$v=19$m=65536,t=3,p=4$testHash';

      // Mock hash operation
      mockArgon2.hash.mockResolvedValue(hashedResult);
      const hash = await service.hash(password);
      expect(hash).toBe(hashedResult);

      // Mock verify operation
      mockArgon2.verify.mockResolvedValue(true);
      const isValid = await service.verify(hash, password);
      expect(isValid).toBe(true);

      // Verify both operations used the same peppered password
      expect(mockArgon2.hash).toHaveBeenCalledWith(
        password + mockConfig.PASSWORD_PEPPER,
        expect.any(Object),
      );
      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedResult,
        password + mockConfig.PASSWORD_PEPPER,
      );
    });

    it('should fail verification with wrong password', async () => {
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hashedResult = '$argon2id$v=19$m=65536,t=3,p=4$testHash';

      // Hash correct password
      mockArgon2.hash.mockResolvedValue(hashedResult);
      const hash = await service.hash(correctPassword);

      // Verify with wrong password should fail
      mockArgon2.verify.mockResolvedValue(false);
      const isValid = await service.verify(hash, wrongPassword);

      expect(isValid).toBe(false);
      expect(mockArgon2.verify).toHaveBeenCalledWith(
        hashedResult,
        wrongPassword + mockConfig.PASSWORD_PEPPER,
      );
    });

    it('should handle configuration consistency across operations', async () => {
      const password = 'consistencyTest';

      // First operation - hash
      await service.hash(password);

      // Second operation - verify
      mockArgon2.verify.mockResolvedValue(true);
      await service.verify('someHash', password);

      // Both operations should have called configService.get for pepper
      expect(configService.get).toHaveBeenCalledWith('PASSWORD_PEPPER');
      expect(configService.get).toHaveBeenCalledTimes(5); // 4 for hash + 1 for verify pepper
    });

    it('should maintain security with consistent pepper usage', async () => {
      const password = 'securityTest';
      const pepper = mockConfig.PASSWORD_PEPPER;

      // Hash operation
      mockArgon2.hash.mockResolvedValue('hashedValue');
      await service.hash(password);

      // Verify operation
      mockArgon2.verify.mockResolvedValue(true);
      await service.verify('hashedValue', password);

      // Both should use the same peppered input
      const expectedPepperedPassword = password + pepper;
      expect(mockArgon2.hash).toHaveBeenCalledWith(
        expectedPepperedPassword,
        expect.any(Object),
      );
      expect(mockArgon2.verify).toHaveBeenCalledWith(
        'hashedValue',
        expectedPepperedPassword,
      );
    });
  });
});
