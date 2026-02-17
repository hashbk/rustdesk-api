import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsNumber } from 'class-validator';
import { ConnType } from '../entities/connection-audit.entity';

export class ConnectionAuditDto {
  @IsString()
  id: string;

  @IsString()
  uuid: string;

  // 支持前端发送的 conn_id（下划线格式）
  @IsNumber()
  conn_id: number;

  // 支持前端发送的 session_id（下划线格式）
  @IsNumber()
  session_id: number;

  // ip 字段在 action 为 close 时可能不发送
  @IsString()
  @IsOptional()
  ip?: string;

  @IsString()
  @IsOptional()
  action?: string;

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
