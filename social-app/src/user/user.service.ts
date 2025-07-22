import { Injectable } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma';
import { HashService } from 'src/common/services/hash.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly hashService: HashService,
  ) {}

  async getUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User | null> {
    return this.prismaService.user.findUnique({
      where: userWhereUniqueInput,
    });
  }

  async getUsers(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prismaService.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async createUser(
    data: Pick<
      Prisma.UserCreateInput,
      'email' | 'firstName' | 'lastName' | 'password'
    >,
  ): Promise<Omit<User, 'password' | 'deletedAt'>> {
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
    data: Pick<Prisma.UserUpdateInput, 'firstName' | 'lastName'>,
  ): Promise<User> {
    return this.prismaService.user.update({
      where: userWhereUniqueInput,
      data,
    });
  }

  async deleteUser(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<User> {
    return this.prismaService.user.delete({
      where: userWhereUniqueInput,
    });
  }
}
