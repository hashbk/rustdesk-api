import { IsString, IsInt, IsBoolean, IsArray, ValidateNested, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { FileAuditType } from '../entities/file-audit.entity';

export class FileInfoDto {
  @IsString()
  ip: string;

  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  num: number;

  @IsArray()
  files: Array<[string, number]>;
}

export class FileAuditDto {
  @IsString()
  id: string;

  @IsString()
  uuid: string;

  @IsString()
  peer_id: string;

  @IsInt()
  @Min(0)
  @Max(1)
  type: FileAuditType;

  @IsString()
  @IsOptional()
  path?: string;

  @IsBoolean()
  is_file: boolean;

  @ValidateNested()
  @Type(() => FileInfoDto)
  info: FileInfoDto;
}
