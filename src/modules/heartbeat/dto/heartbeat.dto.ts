import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

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
}
