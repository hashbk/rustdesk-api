import { IsString, IsInt, Min, Max } from 'class-validator';

export class AlarmAuditDto {
  @IsString()
  id: string;

  @IsString()
  uuid: string;

  @IsInt()
  @Min(0)
  @Max(6)
  typ: number;

  @IsString()
  info: string;
}
