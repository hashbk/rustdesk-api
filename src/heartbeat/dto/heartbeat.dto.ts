import { IsString, IsNumber, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class HeartbeatDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  uuid: string;

  @IsNumber()
  @IsNotEmpty()
  ver: number;

  @IsNumber()
  @IsNotEmpty()
  modified_at: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  conns?: number[];
}
