import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) { }

  transform(value: unknown): any {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        throw new BadRequestException(
          error.errors.map((error) => error.message).join(', '),
        );
      }

      throw new BadRequestException('Validation failed');
    }
  }
}
