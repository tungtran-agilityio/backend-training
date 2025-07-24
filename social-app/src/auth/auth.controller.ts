import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiBadRequestResponse, ApiOkResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import {
  ApiServerErrorResponse,
  ApiUnauthorizedErrorResponse,
} from 'src/common/decorators/api-common.decorators';
import { ControllerUtils } from 'src/common/utils/controller.utils';
import {
  LoginResponse,
  RefreshTokenResponse,
  LogoutResponse,
} from './interfaces/auth-response.interfaces';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBadRequestResponse({ description: 'Missing or invalid credentials' })
  @ApiUnauthorizedErrorResponse()
  @ApiServerErrorResponse()
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const { user, accessToken, refreshToken } = await this.authService.signIn(
      body.email,
      body.password,
    );

    this.setRefreshTokenCookie(res, refreshToken);

    return { user, accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiUnauthorizedErrorResponse()
  @ApiServerErrorResponse()
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'new-access-token',
      },
    },
  })
  async refresh(@Req() req: Request): Promise<RefreshTokenResponse> {
    const user = ControllerUtils.extractUserWithEmailFromRequest(req);

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
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): LogoutResponse {
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
}
