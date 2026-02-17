import { IsNumber, IsString, IsOptional, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  current?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 100;
}

export class PeersQueryDto extends PaginationDto {
  @IsString()
  @IsNotEmpty()
  ab: string;
}
