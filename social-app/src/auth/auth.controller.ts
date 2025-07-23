import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { LoginDto } from './dtos/login.dto';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBadRequestResponse({ description: 'Missing or invalid credentials' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server-side failure',
  })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.signIn(
      body.email,
      body.password,
    );
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      path: '/auth/refresh',
    });
    return { user, accessToken };
  }

  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server-side failure',
  })
  @ApiOkResponse({
    schema: {
      example: {
        accessToken: 'new-access-token',
      },
    },
  })
  async refresh(@Req() req: Request) {
    // req.user is set by RefreshTokenStrategy
    const user = req.user as { userId: string; email: string };
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
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server-side failure',
  })
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    return { message: 'Logged out successfully' };
  }
}
