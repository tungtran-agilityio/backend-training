import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of PrismaService', () => {
      expect(service.constructor.name).toBe('PrismaService');
      expect(service.onModuleInit).toBeDefined();
    });

    it('should extend PrismaClient functionality', () => {
      // Test that it has PrismaClient methods available
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
      expect(typeof service.$connect).toBe('function');
      expect(typeof service.$disconnect).toBe('function');
    });
  });

  describe('onModuleInit', () => {
    it('should have onModuleInit method', () => {
      expect(service.onModuleInit).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('should call $connect when onModuleInit is called', async () => {
      // Spy on the $connect method
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith();
    });

    it('should handle connection success', async () => {
      // Mock successful connection
      jest.spyOn(service, '$connect').mockResolvedValue();

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should propagate connection errors', async () => {
      // Mock connection failure
      const connectionError = new Error('Database connection failed');
      jest.spyOn(service, '$connect').mockRejectedValue(connectionError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      jest.spyOn(service, '$connect').mockRejectedValue(timeoutError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Connection timeout',
      );
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      jest.spyOn(service, '$connect').mockRejectedValue(authError);

      await expect(service.onModuleInit()).rejects.toThrow(
        'Authentication failed',
      );
    });
  });

  describe('database connection management', () => {
    it('should be able to connect to database', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      await expect(service.$connect()).resolves.not.toThrow();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should be able to disconnect from database', async () => {
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue();

      await expect(service.$disconnect()).resolves.not.toThrow();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle connect errors gracefully', async () => {
      const connectError = new Error('Connect failed');
      jest.spyOn(service, '$connect').mockRejectedValue(connectError);

      await expect(service.$connect()).rejects.toThrow('Connect failed');
    });

    it('should handle disconnect errors gracefully', async () => {
      const disconnectError = new Error('Disconnect failed');
      jest.spyOn(service, '$disconnect').mockRejectedValue(disconnectError);

      await expect(service.$disconnect()).rejects.toThrow('Disconnect failed');
    });
  });

  describe('lifecycle integration', () => {
    it('should handle full connect-disconnect cycle', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
      const disconnectSpy = jest
        .spyOn(service, '$disconnect')
        .mockResolvedValue();

      // Initialize (connect)
      await service.onModuleInit();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Disconnect
      await service.$disconnect();
      expect(disconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple connection attempts', async () => {
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      // Multiple calls to onModuleInit
      await service.onModuleInit();
      await service.onModuleInit();
      await service.onModuleInit();

      expect(connectSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('error scenarios', () => {
    it('should propagate specific database errors', async () => {
      const specificErrors = [
        'P1001: Cannot reach database server',
        'P1002: Database server timeout',
        'P1003: Database does not exist',
        'P1009: Database already exists',
        'P1010: User access denied',
      ];

      for (const errorMessage of specificErrors) {
        const error = new Error(errorMessage);
        jest.spyOn(service, '$connect').mockRejectedValue(error);

        await expect(service.onModuleInit()).rejects.toThrow(errorMessage);

        // Reset spy for next iteration
        jest.restoreAllMocks();
      }
    });

    it('should handle connection retry scenarios', async () => {
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce();

      // First attempt should fail
      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');

      // Second attempt should succeed
      await expect(service.onModuleInit()).resolves.not.toThrow();

      expect(connectSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('PrismaClient inheritance', () => {
    it('should inherit PrismaClient methods', () => {
      // Test that the service has inherited essential PrismaClient methods
      const expectedMethods = ['$connect', '$disconnect'];

      expectedMethods.forEach((method) => {
        expect(service[method]).toBeDefined();
        expect(typeof service[method]).toBe('function');
      });
    });
  });

  describe('service as singleton', () => {
    it('should maintain same instance across multiple gets', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [PrismaService],
      }).compile();

      const service1 = module.get<PrismaService>(PrismaService);
      const service2 = module.get<PrismaService>(PrismaService);

      expect(service1).toBe(service2);
    });
  });

  describe('integration with NestJS lifecycle', () => {
    it('should be compatible with NestJS module system', () => {
      // Test that the service can be properly injected and used
      expect(service).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
    });

    it('should implement OnModuleInit interface correctly', () => {
      // Test that onModuleInit method exists and is callable
      expect(service.onModuleInit).toBeDefined();
      expect(typeof service.onModuleInit).toBe('function');
      expect(service.onModuleInit.length).toBe(0); // Should take no parameters
    });

    it('should be injectable as a provider', () => {
      // Test basic dependency injection functionality
      expect(service.constructor.name).toBe('PrismaService');
      expect(service.onModuleInit).toBeDefined();
    });
  });

  describe('method signatures', () => {
    it('should have correct onModuleInit signature', () => {
      // onModuleInit should be async and take no parameters
      expect(service.onModuleInit).toBeDefined();
      expect(service.onModuleInit.constructor.name).toBe('AsyncFunction');
      expect(service.onModuleInit.length).toBe(0);
    });

    it('should have correct $connect signature', () => {
      expect(service.$connect).toBeDefined();
      expect(typeof service.$connect).toBe('function');
    });

    it('should have correct $disconnect signature', () => {
      expect(service.$disconnect).toBeDefined();
      expect(typeof service.$disconnect).toBe('function');
    });
  });

  describe('integration test scenarios', () => {
    it('should handle service lifecycle properly', async () => {
      // Mock the connection
      const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();

      // Test that initialization works
      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(connectSpy).toHaveBeenCalledTimes(1);

      // Test that the service is ready for use
      expect(service).toBeDefined();
      expect(service.$connect).toBeDefined();
      expect(service.$disconnect).toBeDefined();
    });

    it('should handle error recovery scenarios', async () => {
      let callCount = 0;
      const connectSpy = jest
        .spyOn(service, '$connect')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('First connection failed'));
          }
          return Promise.resolve();
        });

      // First call should fail
      await expect(service.onModuleInit()).rejects.toThrow(
        'First connection failed',
      );

      // Second call should succeed
      await expect(service.onModuleInit()).resolves.not.toThrow();

      expect(connectSpy).toHaveBeenCalledTimes(2);
    });
  });
});
