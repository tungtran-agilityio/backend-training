import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  const mockUserService = {
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUsers: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: null,
    password: 'hashedPassword123',
  };

  const mockUserResponse = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  };

  const mockRequest = {
    user: { userId: 'user-123' },
  } as unknown as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'password123',
    };

    it('should successfully create a new user', async () => {
      userService.getUser.mockResolvedValue(null); // No existing user
      userService.createUser.mockResolvedValue(mockUserResponse);

      const result = await controller.createUser(createUserDto);

      expect(userService.getUser).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUserResponse);
    });

    it('should throw ConflictException when user already exists', async () => {
      userService.getUser.mockResolvedValue(mockUser);

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        new ConflictException('User already exists'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should handle service errors during user creation', async () => {
      userService.getUser.mockResolvedValue(null);
      const serviceError = new Error('Database connection failed');
      userService.createUser.mockRejectedValue(serviceError);

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        serviceError,
      );

      expect(userService.getUser).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(userService.createUser).toHaveBeenCalledWith(createUserDto);
    });

    it('should handle service errors during email check', async () => {
      const serviceError = new Error('Database connection failed');
      userService.getUser.mockRejectedValue(serviceError);

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        serviceError,
      );

      expect(userService.getUser).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(userService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    const userId = 'user-123';

    it('should successfully get a user', async () => {
      userService.getUser.mockResolvedValue(mockUser);

      const result = await controller.getUser(userId);

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userService.getUser.mockResolvedValue(null);

      await expect(controller.getUser(userId)).rejects.toThrow(
        new NotFoundException('User not found or inaccessible'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
    });

    it('should handle service errors during user retrieval', async () => {
      const serviceError = new Error('Database connection failed');
      userService.getUser.mockRejectedValue(serviceError);

      await expect(controller.getUser(userId)).rejects.toThrow(serviceError);

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe('updateUser', () => {
    const userId = 'user-123';
    const updateUserDto: UpdateUserDto = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    };

    it('should successfully update own user', async () => {
      const updatedUser = { ...mockUserResponse, ...updateUserDto };
      userService.getUser
        .mockResolvedValueOnce(mockUser) // For existence check
        .mockResolvedValueOnce(null); // For email conflict check
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(
        userId,
        updateUserDto,
        mockRequest,
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.getUser).toHaveBeenCalledWith({
        email: updateUserDto.email,
      });
      expect(userService.updateUser).toHaveBeenCalledWith(
        { id: userId },
        updateUserDto,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should successfully update user without email change', async () => {
      const updateWithoutEmail = {
        firstName: 'Jane',
        lastName: 'Smith',
      } as UpdateUserDto;
      const updatedUser = { ...mockUserResponse, ...updateWithoutEmail };
      userService.getUser.mockResolvedValue(mockUser);
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(
        userId,
        updateWithoutEmail,
        mockRequest,
      );

      expect(userService.getUser).toHaveBeenCalledTimes(1); // Only existence check
      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.updateUser).toHaveBeenCalledWith(
        { id: userId },
        updateWithoutEmail,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userService.getUser.mockResolvedValue(null);

      await expect(
        controller.updateUser(userId, updateUserDto, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('User not found or not owned by requester'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      userService.getUser.mockResolvedValue(deletedUser);

      await expect(
        controller.updateUser(userId, updateUserDto, mockRequest),
      ).rejects.toThrow(
        new NotFoundException('User not found or not owned by requester'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user ID does not match token', async () => {
      const differentUserRequest = {
        user: { userId: 'different-user-id' },
      } as unknown as Request;
      userService.getUser.mockResolvedValue(mockUser);

      await expect(
        controller.updateUser(userId, updateUserDto, differentUserRequest),
      ).rejects.toThrow(
        new NotFoundException('User not found or not owned by requester'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email is already in use by another user', async () => {
      const otherUser = { ...mockUser, id: 'other-user-id' };
      userService.getUser
        .mockResolvedValueOnce(mockUser) // For existence check
        .mockResolvedValueOnce(otherUser); // For email conflict check

      await expect(
        controller.updateUser(userId, updateUserDto, mockRequest),
      ).rejects.toThrow(new ConflictException('Email already in use'));

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.getUser).toHaveBeenCalledWith({
        email: updateUserDto.email,
      });
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('should allow email update to same email (no conflict)', async () => {
      const updatedUser = { ...mockUserResponse, ...updateUserDto };
      userService.getUser
        .mockResolvedValueOnce(mockUser) // For existence check
        .mockResolvedValueOnce(mockUser); // Same user with same email
      userService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(
        userId,
        updateUserDto,
        mockRequest,
      );

      expect(userService.updateUser).toHaveBeenCalledWith(
        { id: userId },
        updateUserDto,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should handle service errors during update', async () => {
      userService.getUser
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      const serviceError = new Error('Database connection failed');
      userService.updateUser.mockRejectedValue(serviceError);

      await expect(
        controller.updateUser(userId, updateUserDto, mockRequest),
      ).rejects.toThrow(serviceError);

      expect(userService.updateUser).toHaveBeenCalledWith(
        { id: userId },
        updateUserDto,
      );
    });
  });

  describe('deleteUser', () => {
    const userId = 'user-123';

    it('should successfully delete own user', async () => {
      userService.getUser.mockResolvedValue(mockUser);
      userService.deleteUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });

      const result = await controller.deleteUser(userId, mockRequest);

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.deleteUser).toHaveBeenCalledWith({ id: userId });
      expect(result).toEqual({ message: 'User deleted successfully' });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userService.getUser.mockResolvedValue(null);

      await expect(controller.deleteUser(userId, mockRequest)).rejects.toThrow(
        new NotFoundException('User not found or not owned by requester'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is already deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      userService.getUser.mockResolvedValue(deletedUser);

      await expect(controller.deleteUser(userId, mockRequest)).rejects.toThrow(
        new NotFoundException('User not found or not owned by requester'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user ID does not match token', async () => {
      const differentUserRequest = {
        user: { userId: 'different-user-id' },
      } as unknown as Request;
      userService.getUser.mockResolvedValue(mockUser);

      await expect(
        controller.deleteUser(userId, differentUserRequest),
      ).rejects.toThrow(
        new NotFoundException('User not found or not owned by requester'),
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.deleteUser).not.toHaveBeenCalled();
    });

    it('should handle service errors during deletion', async () => {
      userService.getUser.mockResolvedValue(mockUser);
      const serviceError = new Error('Database connection failed');
      userService.deleteUser.mockRejectedValue(serviceError);

      await expect(controller.deleteUser(userId, mockRequest)).rejects.toThrow(
        serviceError,
      );

      expect(userService.getUser).toHaveBeenCalledWith({ id: userId });
      expect(userService.deleteUser).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe('controller initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have userService dependency injected', () => {
      expect(userService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete user lifecycle', async () => {
      const createUserDto: CreateUserDto = {
        email: 'lifecycle@example.com',
        firstName: 'Lifecycle',
        lastName: 'User',
        password: 'password123',
      };

      // Create user
      userService.getUser.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(mockUserResponse);

      const createResult = await controller.createUser(createUserDto);
      expect(createResult).toEqual(mockUserResponse);

      // Get user
      userService.getUser.mockResolvedValue(mockUser);
      const getResult = await controller.getUser(mockUser.id);
      expect(getResult).toEqual(mockUser);

      // Update user
      const updateDto = { firstName: 'Updated' } as UpdateUserDto;
      const updatedUser = { ...mockUserResponse, firstName: 'Updated' };
      userService.getUser.mockResolvedValue(mockUser);
      userService.updateUser.mockResolvedValue(updatedUser);

      const updateResult = await controller.updateUser(
        mockUser.id,
        updateDto,
        mockRequest,
      );
      expect(updateResult).toEqual(updatedUser);

      // Delete user
      userService.getUser.mockResolvedValue(mockUser);
      userService.deleteUser.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });

      const deleteResult = await controller.deleteUser(
        mockUser.id,
        mockRequest,
      );
      expect(deleteResult).toEqual({ message: 'User deleted successfully' });
    });

    it('should enforce authorization across endpoints', async () => {
      const unauthorizedRequest = {
        user: { userId: 'unauthorized-user' },
      } as unknown as Request;

      userService.getUser.mockResolvedValue(mockUser);

      // Should not allow updating another user
      await expect(
        controller.updateUser(
          'user-123',
          { firstName: 'Hacker' } as UpdateUserDto,
          unauthorizedRequest,
        ),
      ).rejects.toThrow(NotFoundException);

      // Should not allow deleting another user
      await expect(
        controller.deleteUser('user-123', unauthorizedRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle email conflicts properly', async () => {
      const conflictUserDto: CreateUserDto = {
        email: 'conflict@example.com',
        firstName: 'Conflict',
        lastName: 'User',
        password: 'password123',
      };

      // First user creation should succeed
      userService.getUser.mockResolvedValue(null);
      userService.createUser.mockResolvedValue(mockUserResponse);

      await controller.createUser(conflictUserDto);

      // Second user creation with same email should fail
      userService.getUser.mockResolvedValue(mockUser);

      await expect(controller.createUser(conflictUserDto)).rejects.toThrow(
        ConflictException,
      );

      // Update to existing email should fail
      const otherUser = { ...mockUser, id: 'other-id' };
      userService.getUser
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(otherUser);

      await expect(
        controller.updateUser(
          'user-123',
          { email: 'conflict@example.com' } as UpdateUserDto,
          mockRequest,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
