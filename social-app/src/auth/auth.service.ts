import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { HashService } from 'src/common/services/hash.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.userService.getUser({ email });

    if (user && (await this.hashService.verify(user.password, password))) {
      // Remove password from user object
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...userData } = user;

      // Generate tokens
      const accessToken = await this.generateAccessToken(userData);
      const refreshToken = await this.generateRefreshToken(userData);
      return { user: userData, accessToken, refreshToken };
    }

    throw new BadRequestException('Missing or invalid credentials');
  }

  async generateAccessToken(user: Omit<User, 'password'>) {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );
  }

  async generateRefreshToken(user: Omit<User, 'password'>) {
    return this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn: '7d' },
    );
  }
}
