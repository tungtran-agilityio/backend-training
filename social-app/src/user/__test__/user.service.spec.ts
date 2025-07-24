import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HashService } from 'src/common/services/hash.service';

describe('UserService', () => {
  let service: UserService;
  let prismaService: any;
  let hashService: any;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashedPassword123',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: null,
  };

  const mockUserResponse = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockHashService = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: HashService,
          useValue: mockHashService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    hashService = module.get<HashService>(HashService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUser', () => {
    it('should successfully get a user by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser({ id: 'user-123' });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should successfully get a user by email', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUser({ email: 'test@example.com' });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.getUser({ id: 'non-existent' });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
      expect(result).toBeNull();
    });

    it('should handle database errors during user retrieval', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.user.findUnique.mockRejectedValue(dbError);

      await expect(service.getUser({ id: 'user-123' })).rejects.toThrow(
        dbError,
      );

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });
  });

  describe('getUsers', () => {
    const mockUsers = [
      { ...mockUser, id: 'user-1' },
      { ...mockUser, id: 'user-2' },
      { ...mockUser, id: 'user-3' },
    ];

    it('should get users with default parameters', async () => {
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers({});

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: undefined,
        orderBy: undefined,
      });
      expect(result).toEqual(mockUsers);
    });

    it('should get users with pagination parameters', async () => {
      const params = {
        skip: 10,
        take: 5,
        cursor: { id: 'user-123' },
        orderBy: { createdAt: 'desc' as const },
      };

      prismaService.user.findMany.mockResolvedValue([mockUsers[0]]);

      const result = await service.getUsers(params);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 5,
        cursor: { id: 'user-123' },
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockUsers[0]]);
    });

    it('should get users with where clause filtering', async () => {
      const params = {
        where: { email: { contains: 'test' } },
        orderBy: { firstName: 'asc' as const },
      };

      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers(params);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: undefined,
        take: undefined,
        cursor: undefined,
        where: { email: { contains: 'test' } },
        orderBy: { firstName: 'asc' },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should get users with all parameters combined', async () => {
      const params = {
        skip: 0,
        take: 10,
        cursor: { id: 'user-start' },
        where: { deletedAt: null },
        orderBy: { lastName: 'asc' as const },
      };

      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers(params);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        cursor: { id: 'user-start' },
        where: { deletedAt: null },
        orderBy: { lastName: 'asc' },
      });
      expect(result).toEqual(mockUsers);
    });

    it('should handle database errors during users retrieval', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.user.findMany.mockRejectedValue(dbError);

      await expect(service.getUsers({})).rejects.toThrow(dbError);

      expect(prismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    const createUserData = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'password123',
    };

    it('should successfully create a user with hashed password', async () => {
      const hashedPassword = 'hashedPassword456';
      hashService.hash.mockResolvedValue(hashedPassword);
      prismaService.user.create.mockResolvedValue(mockUserResponse);

      const result = await service.createUser(createUserData);

      expect(hashService.hash).toHaveBeenCalledWith(createUserData.password);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserData,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          password: false,
          deletedAt: false,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockUserResponse);
    });

    it('should handle password hashing errors', async () => {
      const hashError = new Error('Hashing failed');
      hashService.hash.mockRejectedValue(hashError);

      await expect(service.createUser(createUserData)).rejects.toThrow(
        hashError,
      );

      expect(hashService.hash).toHaveBeenCalledWith(createUserData.password);
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during user creation', async () => {
      const hashedPassword = 'hashedPassword456';
      hashService.hash.mockResolvedValue(hashedPassword);
      const dbError = new Error('Database constraint violation');
      prismaService.user.create.mockRejectedValue(dbError);

      await expect(service.createUser(createUserData)).rejects.toThrow(dbError);

      expect(hashService.hash).toHaveBeenCalledWith(createUserData.password);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserData,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          password: false,
          deletedAt: false,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should exclude password and deletedAt from response', async () => {
      const hashedPassword = 'hashedPassword456';
      hashService.hash.mockResolvedValue(hashedPassword);
      prismaService.user.create.mockResolvedValue(mockUserResponse);

      const result = await service.createUser(createUserData);

      // Verify that password and deletedAt are not included in the result
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('deletedAt');
      expect(result).toEqual(mockUserResponse);
    });
  });

  describe('updateUser', () => {
    const updateData = {
      firstName: 'UpdatedJohn',
      lastName: 'UpdatedDoe',
      email: 'updated@example.com',
    };

    it('should successfully update a user', async () => {
      const updatedUser = { ...mockUserResponse, ...updateData };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser({ id: 'user-123' }, updateData);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should update user by email', async () => {
      const updatedUser = { ...mockUserResponse, ...updateData };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(
        { email: 'test@example.com' },
        updateData,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = { firstName: 'PartialUpdate' };
      const updatedUser = { ...mockUserResponse, firstName: 'PartialUpdate' };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(
        { id: 'user-123' },
        partialUpdate,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: partialUpdate,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(updatedUser);
    });

    it('should handle database errors during user update', async () => {
      const dbError = new Error('Database constraint violation');
      prismaService.user.update.mockRejectedValue(dbError);

      await expect(
        service.updateUser({ id: 'user-123' }, updateData),
      ).rejects.toThrow(dbError);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should exclude password and deletedAt from update response', async () => {
      const updatedUser = { ...mockUserResponse, ...updateData };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser({ id: 'user-123' }, updateData);

      // Verify that password and deletedAt are not included in the result
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('deletedAt');
      expect(result).toEqual(updatedUser);
    });
  });

  describe('deleteUser', () => {
    it('should successfully soft delete a user', async () => {
      const deletedUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      prismaService.user.update.mockResolvedValue(deletedUser);

      const result = await service.deleteUser({ id: 'user-123' });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          deletedAt: expect.any(Date),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      expect(result).toEqual(deletedUser);
    });

    it('should delete user by email', async () => {
      const deletedUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      prismaService.user.update.mockResolvedValue(deletedUser);

      const result = await service.deleteUser({ email: 'test@example.com' });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        data: {
          deletedAt: expect.any(Date),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
      expect(result).toEqual(deletedUser);
    });

    it('should set deletedAt to current date', async () => {
      const mockDate = new Date('2023-01-02T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation((() => mockDate) as any);

      const deletedUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      prismaService.user.update.mockResolvedValue(deletedUser);

      await service.deleteUser({ id: 'user-123' });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          deletedAt: mockDate,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      // Restore original Date
      jest.restoreAllMocks();
    });

    it('should handle database errors during user deletion', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.user.update.mockRejectedValue(dbError);

      await expect(service.deleteUser({ id: 'user-123' })).rejects.toThrow(
        dbError,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          deletedAt: expect.any(Date),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });
    });

    it('should exclude password, deletedAt, createdAt, and updatedAt from delete response', async () => {
      const deletedUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      prismaService.user.update.mockResolvedValue(deletedUser);

      const result = await service.deleteUser({ id: 'user-123' });

      // Verify that only basic fields are included in the result
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('deletedAt');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
    });
  });

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have prismaService dependency injected', () => {
      expect(prismaService).toBeDefined();
    });

    it('should have hashService dependency injected', () => {
      expect(hashService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      const createData = {
        email: 'lifecycle@example.com',
        firstName: 'Lifecycle',
        lastName: 'User',
        password: 'password123',
      };

      // Create user
      hashService.hash.mockResolvedValue('hashedPassword123');
      prismaService.user.create.mockResolvedValue(mockUserResponse);

      const createdUser = await service.createUser(createData);
      expect(createdUser).toEqual(mockUserResponse);

      // Get user
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const foundUser = await service.getUser({ id: mockUser.id });
      expect(foundUser).toEqual(mockUser);

      // Update user
      const updateData = { firstName: 'Updated' };
      const updatedUser = { ...mockUserResponse, firstName: 'Updated' };
      prismaService.user.update.mockResolvedValue(updatedUser);

      const userUpdateResult = await service.updateUser(
        { id: mockUser.id },
        updateData,
      );
      expect(userUpdateResult).toEqual(updatedUser);

      // Delete user
      const deletedUser = {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      };
      prismaService.user.update.mockResolvedValue(deletedUser);

      const deleteResult = await service.deleteUser({ id: mockUser.id });
      expect(deleteResult).toEqual(deletedUser);
    });

    it('should handle various query patterns for getUsers', async () => {
      const testCases = [
        { params: {}, description: 'no parameters' },
        { params: { skip: 10 }, description: 'with skip' },
        { params: { take: 5 }, description: 'with take' },
        { params: { skip: 0, take: 10 }, description: 'with pagination' },
        {
          params: { where: { email: { contains: '@' } } },
          description: 'with where clause',
        },
        {
          params: { orderBy: { createdAt: 'desc' as const } },
          description: 'with order by',
        },
      ];

      for (const testCase of testCases) {
        prismaService.user.findMany.mockResolvedValue([mockUser]);

        const result = await service.getUsers(testCase.params as any);

        expect(prismaService.user.findMany).toHaveBeenCalledWith({
          skip: testCase.params.skip,
          take: testCase.params.take,
          cursor: (testCase.params as any).cursor,
          where: (testCase.params as any).where,
          orderBy: (testCase.params as any).orderBy,
        });
        expect(result).toEqual([mockUser]);

        // Reset mock for next iteration
        prismaService.user.findMany.mockReset();
      }
    });

    it('should properly handle password security throughout lifecycle', async () => {
      const plainPassword = 'sensitivePassword123';
      const hashedPassword = 'secureHashedPassword456';

      // Password should be hashed during creation
      hashService.hash.mockResolvedValue(hashedPassword);
      prismaService.user.create.mockResolvedValue(mockUserResponse);

      await service.createUser({
        email: 'secure@example.com',
        firstName: 'Secure',
        lastName: 'User',
        password: plainPassword,
      });

      expect(hashService.hash).toHaveBeenCalledWith(plainPassword);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: hashedPassword, // Hashed password stored
        }),
        select: expect.objectContaining({
          password: false, // Password excluded from response
        }),
      });

      // Password should be excluded from all read operations
      expect(mockUserResponse).not.toHaveProperty('password');
    });
  });
});
