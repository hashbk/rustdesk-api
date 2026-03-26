import { PipeTransform, Injectable, ArgumentMetadata, ValidationPipe, ExecutionContext } from '@nestjs/common';

@Injectable()
export class SkipValidationPipe implements PipeTransform {
  constructor(private validationPipe: ValidationPipe) {}

  transform(value: any, metadata: ArgumentMetadata) {
    return this.validationPipe.transform(value, metadata);
  }
}
