import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { HashService } from 'src/common/services/hash.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  UserData,
  SafeUserData,
  MinimalUserData,
  GetUsersParams,
  CreateUserInput,
  UpdateUserInput,
} from './interfaces/user-response.interfaces';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async getUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<UserData | null> {
    return this.prismaService.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async getUsers(params: GetUsersParams): Promise<UserData[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prismaService.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(data: CreateUserInput): Promise<SafeUserData> {
    const hashedPassword = await this.hashService.hash(data.password);
    return this.prismaService.user.create({
      data: {
        ...data,
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
  }

  async updateUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
    data: UpdateUserInput,
  ): Promise<SafeUserData> {
    return this.prismaService.user.update({
      where: userWhereUniqueInput,
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<MinimalUserData> {
    return this.prismaService.user.update({
      where: userWhereUniqueInput,
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
  }
}
