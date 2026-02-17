import { IsString, IsInt, Min, Max, IsObject } from 'class-validator';

export class AlarmAuditDto {
  @IsString()
  id: string;

  @IsString()
  uuid: string;

  @IsInt()
  @Min(0)
  @Max(6)
  typ: number;

  @IsObject()
  info: Record<string, any>;
}
