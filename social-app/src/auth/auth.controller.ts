import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';

// Common decorator for server errors that appears in all endpoints
const ApiServerErrorResponse = () =>
  ApiInternalServerErrorResponse({
    description: 'Unexpected server-side failure',
  });

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBadRequestResponse({ description: 'Missing or invalid credentials' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiServerErrorResponse()
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.signIn(
      body.email,
      body.password,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return { user, accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiServerErrorResponse()
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'new-access-token',
      },
    },
  })
  async refresh(@Req() req: Request) {
    const user = this.extractUserFromRequest(req);

    return {
      accessToken: await this.authService.generateAccessToken({
        id: user.userId,
        email: user.email,
      }),
    };
  }

  @Post('logout')
  @ApiOkResponse({ description: 'Logged out successfully' })
  @ApiBadRequestResponse({
    description: 'Refresh token missing or invalid format',
  })
  @ApiServerErrorResponse()
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    this.clearRefreshTokenCookie(res);
    return { message: 'Logged out successfully' };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      path: '/auth/refresh',
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

  private extractUserFromRequest(req: Request): {
    userId: string;
    email: string;
  } {
    return req.user as { userId: string; email: string };
  }
}
