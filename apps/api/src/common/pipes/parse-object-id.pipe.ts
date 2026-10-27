import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { isValidObjectId } from 'mongoose';

/** Rejects malformed ids before they reach a query (also blocks operator-injection objects). */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value) || !isValidObjectId(value)) {
      throw new BadRequestException({ code: 'INVALID_ID', message: 'Invalid identifier.' });
    }
    return value;
  }
}
