import { IsString, IsEnum, IsOptional, IsArray, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConnAction, ConnType } from '../entities/connection-audit.entity';

export class ConnectionAuditDto {
  @IsString()
  id: string;

  @IsString()
  uuid: string;

  @IsString()
  @IsOptional()
  connId?: string;

  @IsString()
  @IsOptional()
  sessionId?: string;

  @IsString()
  ip: string;

  @IsEnum(ConnAction)
  action: ConnAction;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  peer?: string[];

  @IsInt()
  @Min(0)
  @Max(4)
  @IsOptional()
  type?: ConnType;
}
