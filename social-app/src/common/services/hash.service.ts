import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

@Injectable()
export class HashService {
  constructor(private readonly configService: ConfigService) {}

  async hash(raw: string): Promise<string> {
    const pepper = this.configService.get<string>('PASSWORD_PEPPER');
    const memoryCost = this.configService.get<number>('HASH_MEMORY_COST');
    const timeCost = this.configService.get<number>('HASH_TIME_COST');
    const parallelism = this.configService.get<number>('HASH_PARALLELISM');

    return await argon2.hash(raw + pepper, {
      type: argon2.argon2id,
      memoryCost,
      timeCost,
      parallelism,
    });
  }

  async verify(hash: string, raw: string): Promise<boolean> {
    const pepper = this.configService.get<string>('PASSWORD_PEPPER');
    return argon2.verify(hash, raw + pepper);
  }
}
