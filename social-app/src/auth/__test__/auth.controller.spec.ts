import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto } from '../dtos/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    signIn: jest.fn(),
    generateAccessToken: jest.fn(),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as jest.Mocked<Response>;

  const mockRequest = {
    user: null,
  } as unknown as jest.Mocked<Request>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      deletedAt: null,
    };

    const mockAuthResult = {
      user: mockUser,
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
    };

    it('should successfully login and set refresh token cookie', async () => {
      authService.signIn.mockResolvedValue(mockAuthResult);

      const result = await controller.login(loginDto, mockResponse);

      expect(authService.signIn).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockAuthResult.refreshToken,
        {
          httpOnly: true,
          path: '/auth/refresh',
        },
      );
      expect(result).toEqual({
        user: mockUser,
        accessToken: mockAuthResult.accessToken,
      });
    });

    it('should handle authentication failure', async () => {
      const authError = new BadRequestException(
        'Missing or invalid credentials',
      );
      authService.signIn.mockRejectedValue(authError);

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(
        authError,
      );

      expect(authService.signIn).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should handle empty email', async () => {
      const invalidDto = { email: '', password: 'password123' };
      const authError = new BadRequestException(
        'Missing or invalid credentials',
      );
      authService.signIn.mockRejectedValue(authError);

      await expect(controller.login(invalidDto, mockResponse)).rejects.toThrow(
        authError,
      );

      expect(authService.signIn).toHaveBeenCalledWith('', 'password123');
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should handle empty password', async () => {
      const invalidDto = { email: 'test@example.com', password: '' };
      const authError = new BadRequestException(
        'Missing or invalid credentials',
      );
      authService.signIn.mockRejectedValue(authError);

      await expect(controller.login(invalidDto, mockResponse)).rejects.toThrow(
        authError,
      );

      expect(authService.signIn).toHaveBeenCalledWith('test@example.com', '');
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should handle service throwing unexpected error', async () => {
      const unexpectedError = new Error('Database connection failed');
      authService.signIn.mockRejectedValue(unexpectedError);

      await expect(controller.login(loginDto, mockResponse)).rejects.toThrow(
        unexpectedError,
      );

      expect(authService.signIn).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });

    it('should handle malformed login data', async () => {
      // Explicitly test with invalid data types that might come from malformed requests
      const malformedDto = {
        email: null as unknown as string,
        password: undefined as unknown as string,
      };
      const authError = new BadRequestException(
        'Missing or invalid credentials',
      );
      authService.signIn.mockRejectedValue(authError);

      await expect(
        controller.login(malformedDto, mockResponse),
      ).rejects.toThrow(authError);

      expect(authService.signIn).toHaveBeenCalledWith(null, undefined);
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    const mockUserPayload = {
      userId: 'user-123',
      email: 'test@example.com',
    };

    const mockRequestWithUser = {
      user: mockUserPayload,
    } as unknown as Request;

    it('should successfully refresh token', async () => {
      const newAccessToken = 'new-access-token-789';
      authService.generateAccessToken.mockResolvedValue(newAccessToken);

      const result = await controller.refresh(mockRequestWithUser);

      expect(authService.generateAccessToken).toHaveBeenCalledWith({
        id: mockUserPayload.userId,
        email: mockUserPayload.email,
      });
      expect(result).toEqual({
        accessToken: newAccessToken,
      });
    });

    it('should handle token generation failure', async () => {
      const tokenError = new Error('JWT signing failed');
      authService.generateAccessToken.mockRejectedValue(tokenError);

      await expect(controller.refresh(mockRequestWithUser)).rejects.toThrow(
        tokenError,
      );

      expect(authService.generateAccessToken).toHaveBeenCalledWith({
        id: mockUserPayload.userId,
        email: mockUserPayload.email,
      });
    });

    it('should handle missing user in request', async () => {
      const requestWithoutUser = { user: undefined } as unknown as Request;

      // This would typically be caught by the RefreshTokenGuard before reaching the controller
      // But testing the controller behavior if somehow it gets through
      await expect(controller.refresh(requestWithoutUser)).rejects.toThrow();
    });

    it('should handle malformed user data', async () => {
      const requestWithMalformedUser = {
        user: { userId: null, email: undefined },
      } as unknown as Request;

      const tokenError = new Error('Invalid user data');
      authService.generateAccessToken.mockRejectedValue(tokenError);

      await expect(
        controller.refresh(requestWithMalformedUser),
      ).rejects.toThrow(tokenError);

      expect(authService.generateAccessToken).toHaveBeenCalledWith({
        id: null,
        email: undefined,
      });
    });

    it('should handle user with empty strings', async () => {
      const requestWithEmptyUser = {
        user: { userId: '', email: '' },
      } as unknown as Request;

      const newAccessToken = 'new-access-token-789';
      authService.generateAccessToken.mockResolvedValue(newAccessToken);

      const result = await controller.refresh(requestWithEmptyUser);

      expect(authService.generateAccessToken).toHaveBeenCalledWith({
        id: '',
        email: '',
      });
      expect(result).toEqual({
        accessToken: newAccessToken,
      });
    });

    it('should handle user with extra properties', async () => {
      const requestWithExtraProps = {
        user: {
          userId: 'user-123',
          email: 'test@example.com',
          role: 'admin',
          permissions: ['read', 'write'],
        },
      } as unknown as Request;

      const newAccessToken = 'new-access-token-789';
      authService.generateAccessToken.mockResolvedValue(newAccessToken);

      const result = await controller.refresh(requestWithExtraProps);

      expect(authService.generateAccessToken).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
      });
      expect(result).toEqual({
        accessToken: newAccessToken,
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout and clear refresh token cookie', () => {
      const result = controller.logout(mockRequest, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth/refresh',
      });
      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should logout even if no refresh token was present', () => {
      const result = controller.logout(mockRequest, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth/refresh',
      });
      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should handle response object errors gracefully', () => {
      const mockResponseWithError = {
        clearCookie: jest.fn().mockImplementation(() => {
          throw new Error('Cookie clear failed');
        }),
      } as unknown as jest.Mocked<Response>;

      expect(() =>
        controller.logout(mockRequest, mockResponseWithError),
      ).toThrow('Cookie clear failed');

      expect(mockResponseWithError.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        {
          path: '/auth/refresh',
        },
      );
    });

    it('should handle null request object', () => {
      const nullRequest = null as unknown as Request;

      const result = controller.logout(nullRequest, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth/refresh',
      });
      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });

    it('should handle undefined request object', () => {
      const undefinedRequest = undefined as unknown as Request;

      const result = controller.logout(undefinedRequest, mockResponse);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth/refresh',
      });
      expect(result).toEqual({
        message: 'Logged out successfully',
      });
    });
  });

  describe('controller initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have authService dependency injected', () => {
      expect(authService).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete login-refresh-logout flow', async () => {
      // Login
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAuthResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          deletedAt: null,
        },
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
      };

      authService.signIn.mockResolvedValue(mockAuthResult);

      const loginResult = await controller.login(loginDto, mockResponse);

      expect(loginResult).toEqual({
        user: mockAuthResult.user,
        accessToken: mockAuthResult.accessToken,
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        mockAuthResult.refreshToken,
        {
          httpOnly: true,
          path: '/auth/refresh',
        },
      );

      // Refresh
      const mockRequestWithUser = {
        user: { userId: 'user-123', email: 'test@example.com' },
      } as unknown as Request;

      const newAccessToken = 'new-access-token-789';
      authService.generateAccessToken.mockResolvedValue(newAccessToken);

      const refreshResult = await controller.refresh(mockRequestWithUser);

      expect(refreshResult).toEqual({
        accessToken: newAccessToken,
      });

      // Logout
      const logoutResult = controller.logout(mockRequest, mockResponse);

      expect(logoutResult).toEqual({
        message: 'Logged out successfully',
      });
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', {
        path: '/auth/refresh',
      });
    });
  });
});
