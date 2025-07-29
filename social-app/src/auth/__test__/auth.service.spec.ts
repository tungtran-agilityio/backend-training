import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../auth.service';
import { UserService } from 'src/user/user.service';
import { HashService } from 'src/common/services/hash.service';
import { User } from 'generated/prisma';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let hashService: jest.Mocked<HashService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser: User = {
    id: 'user-uuid-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed-password',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: null,
  };

  const mockDeletedUser: User = {
    ...mockUser,
    deletedAt: new Date('2023-06-01'),
  };

  beforeEach(async () => {
    const mockUserService = {
      getUser: jest.fn(),
    };

    const mockHashService = {
      verify: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: HashService, useValue: mockHashService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    hashService = module.get(HashService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const email = 'test@example.com';
    const password = 'password123';

    describe('successful authentication', () => {
      it('should return user data and tokens for valid credentials', async () => {
        const expectedAccessToken = 'access-token-123';
        const expectedRefreshToken = 'refresh-token-456';

        userService.getUser.mockResolvedValue(mockUser);
        hashService.verify.mockResolvedValue(true);
        jwtService.signAsync
          .mockResolvedValueOnce(expectedAccessToken)
          .mockResolvedValueOnce(expectedRefreshToken);

        const result = await service.signIn(email, password);

        expect(userService.getUser).toHaveBeenCalledWith({ email });
        expect(hashService.verify).toHaveBeenCalledWith(
          mockUser.password,
          password,
        );
        expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
        expect(jwtService.signAsync).toHaveBeenNthCalledWith(
          1,
          { sub: mockUser.id, email: mockUser.email },
          { expiresIn: '15m' },
        );
        expect(jwtService.signAsync).toHaveBeenNthCalledWith(
          2,
          { sub: mockUser.id, email: mockUser.email },
          { expiresIn: '7d' },
        );

        expect(result).toEqual({
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            deletedAt: mockUser.deletedAt,
          },
          accessToken: expectedAccessToken,
          refreshToken: expectedRefreshToken,
        });

        // Ensure password is not in the returned user object
        expect(result.user).not.toHaveProperty('password');
      });
    });

    describe('authentication failures', () => {
      it('should throw BadRequestException when user is not found', async () => {
        userService.getUser.mockResolvedValue(null);

        await expect(service.signIn(email, password)).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(userService.getUser).toHaveBeenCalledWith({ email });
        expect(hashService.verify).not.toHaveBeenCalled();
        expect(jwtService.signAsync).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when user is deleted', async () => {
        userService.getUser.mockResolvedValue(mockDeletedUser);

        await expect(service.signIn(email, password)).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(userService.getUser).toHaveBeenCalledWith({ email });
        expect(hashService.verify).not.toHaveBeenCalled();
        expect(jwtService.signAsync).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when password is incorrect', async () => {
        userService.getUser.mockResolvedValue(mockUser);
        hashService.verify.mockResolvedValue(false);

        await expect(service.signIn(email, password)).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(userService.getUser).toHaveBeenCalledWith({ email });
        expect(hashService.verify).toHaveBeenCalledWith(
          mockUser.password,
          password,
        );
        expect(jwtService.signAsync).not.toHaveBeenCalled();
      });

      it('should throw BadRequestException when hash verification throws an error', async () => {
        userService.getUser.mockResolvedValue(mockUser);
        hashService.verify.mockRejectedValue(
          new Error('Hash verification failed'),
        );

        await expect(service.signIn(email, password)).rejects.toThrow();

        expect(userService.getUser).toHaveBeenCalledWith({ email });
        expect(hashService.verify).toHaveBeenCalledWith(
          mockUser.password,
          password,
        );
        expect(jwtService.signAsync).not.toHaveBeenCalled();
      });

      it('should handle userService.getUser throwing an error', async () => {
        userService.getUser.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(service.signIn(email, password)).rejects.toThrow(
          'Database connection failed',
        );

        expect(userService.getUser).toHaveBeenCalledWith({ email });
        expect(hashService.verify).not.toHaveBeenCalled();
        expect(jwtService.signAsync).not.toHaveBeenCalled();
      });
    });

    describe('edge cases with input validation', () => {
      it('should handle empty email', async () => {
        userService.getUser.mockResolvedValue(null);

        await expect(service.signIn('', password)).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(userService.getUser).toHaveBeenCalledWith({ email: '' });
      });

      it('should handle empty password', async () => {
        userService.getUser.mockResolvedValue(mockUser);
        hashService.verify.mockResolvedValue(false);

        await expect(service.signIn(email, '')).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(hashService.verify).toHaveBeenCalledWith(mockUser.password, '');
      });

      it('should handle null email', async () => {
        userService.getUser.mockResolvedValue(null);

        await expect(
          service.signIn(null as unknown as string, password),
        ).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(userService.getUser).toHaveBeenCalledWith({ email: null });
      });

      it('should handle null password', async () => {
        userService.getUser.mockResolvedValue(mockUser);
        hashService.verify.mockResolvedValue(false);

        await expect(
          service.signIn(email, null as unknown as string),
        ).rejects.toThrow(
          new BadRequestException('Missing or invalid credentials'),
        );

        expect(hashService.verify).toHaveBeenCalledWith(
          mockUser.password,
          null,
        );
      });
    });
  });

  describe('generateAccessToken', () => {
    const userPayload = { id: 'user-123', email: 'test@example.com' };

    it('should generate access token with correct payload and expiry', async () => {
      const expectedToken = 'access-token-123';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(userPayload);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userPayload.id, email: userPayload.email },
        { expiresIn: '15m' },
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle JWT service throwing an error', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

      await expect(service.generateAccessToken(userPayload)).rejects.toThrow(
        'JWT signing failed',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userPayload.id, email: userPayload.email },
        { expiresIn: '15m' },
      );
    });

    it('should handle user with missing id', async () => {
      const invalidUser = {
        id: undefined,
        email: 'test@example.com',
      } as unknown as User;
      const expectedToken = 'access-token-123';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(invalidUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: undefined, email: invalidUser.email },
        { expiresIn: '15m' },
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle user with missing email', async () => {
      const invalidUser = {
        id: 'user-123',
        email: undefined,
      } as unknown as User;
      const expectedToken = 'access-token-123';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(invalidUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: invalidUser.id, email: undefined },
        { expiresIn: '15m' },
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle empty strings for id and email', async () => {
      const invalidUser = { id: '', email: '' };
      const expectedToken = 'access-token-123';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateAccessToken(invalidUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: '', email: '' },
        { expiresIn: '15m' },
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('generateRefreshToken', () => {
    const userPayload = { id: 'user-123', email: 'test@example.com' };

    it('should generate refresh token with correct payload and expiry', async () => {
      const expectedToken = 'refresh-token-456';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateRefreshToken(userPayload);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userPayload.id, email: userPayload.email },
        { expiresIn: '7d' },
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle JWT service throwing an error', async () => {
      jwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

      await expect(service.generateRefreshToken(userPayload)).rejects.toThrow(
        'JWT signing failed',
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: userPayload.id, email: userPayload.email },
        { expiresIn: '7d' },
      );
    });

    it('should handle user with missing id', async () => {
      const invalidUser = {
        id: undefined,
        email: 'test@example.com',
      } as unknown as User;
      const expectedToken = 'refresh-token-456';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateRefreshToken(invalidUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: undefined, email: invalidUser.email },
        { expiresIn: '7d' },
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle user with missing email', async () => {
      const invalidUser = {
        id: 'user-123',
        email: undefined,
      } as unknown as User;
      const expectedToken = 'refresh-token-456';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateRefreshToken(invalidUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: invalidUser.id, email: undefined },
        { expiresIn: '7d' },
      );
      expect(result).toBe(expectedToken);
    });

    it('should handle empty strings for id and email', async () => {
      const invalidUser = { id: '', email: '' };
      const expectedToken = 'refresh-token-456';
      jwtService.signAsync.mockResolvedValue(expectedToken);

      const result = await service.generateRefreshToken(invalidUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: '', email: '' },
        { expiresIn: '7d' },
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('integration scenarios', () => {
    it('should handle token generation failure after successful authentication', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      userService.getUser.mockResolvedValue(mockUser);
      hashService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockRejectedValue(
        new Error('Token generation failed'),
      );

      await expect(service.signIn(email, password)).rejects.toThrow(
        'Token generation failed',
      );

      expect(userService.getUser).toHaveBeenCalledWith({ email });
      expect(hashService.verify).toHaveBeenCalledWith(
        mockUser.password,
        password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' },
      );
    });

    it('should handle access token success but refresh token failure', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const accessToken = 'access-token-123';

      userService.getUser.mockResolvedValue(mockUser);
      hashService.verify.mockResolvedValue(true);
      jwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockRejectedValueOnce(new Error('Refresh token generation failed'));

      await expect(service.signIn(email, password)).rejects.toThrow(
        'Refresh token generation failed',
      );

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
