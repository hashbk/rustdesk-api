import { IsString, IsBoolean, IsArray, IsOptional, IsNumber, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Release 资产文件信息
 */
export class ReleaseAssetDto {
  /**
   * 文件名
   */
  @IsString()
  name: string;

  /**
   * 文件大小（字节）
   */
  @IsNumber()
  size: number;

  /**
   * 文件类型（MIME类型）
   */
  @IsString()
  content_type: string;

  /**
   * 文件内容（Base64编码）
   */
  @IsString()
  data: string;
}

/**
 * Release 元数据
 */
export class ReleaseMetadataDto {
  /**
   * 时间戳
   */
  @IsString()
  @IsOptional()
  timestamp?: string;

  /**
   * 来源
   */
  @IsString()
  @IsOptional()
  source?: string;

  /**
   * 平台
   */
  @IsString()
  @IsOptional()
  platform?: string;
}

/**
 * Release 同步请求 DTO
 * 符合 GitHub Action Release Sync 工具的标准接口规范
 */
export class ReleaseSyncRequestDto {
  /**
   * 标签名（如 v1.0.0）
   */
  @IsString()
  tag: string;

  /**
   * Release 名称
   */
  @IsString()
  name: string;

  /**
   * Release 描述
   */
  @IsString()
  @IsOptional()
  body?: string;

  /**
   * 是否为草稿
   */
  @IsBoolean()
  @IsOptional()
  draft?: boolean;

  /**
   * 是否为预发布版本
   */
  @IsBoolean()
  @IsOptional()
  prerelease?: boolean;

  /**
   * 资产文件列表
   */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReleaseAssetDto)
  assets: ReleaseAssetDto[];

  /**
   * 元数据
   */
  @IsObject()
  @IsOptional()
  metadata?: ReleaseMetadataDto;
}
