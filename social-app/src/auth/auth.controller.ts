import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { LoginDto } from './dtos/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
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
  async refresh(@Req() req: Request) {
    // req.user is set by RefreshTokenStrategy
    const user = req.user as { userId: string; email: string };
    return {
      accessToken: await this.authService.generateAccessToken({
        id: user.userId,
        email: user.email,
        firstName: '',
        lastName: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      }),
    };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
    return { message: 'Logged out successfully' };
  }
}
