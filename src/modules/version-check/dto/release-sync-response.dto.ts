import { IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * Release 同步响应 DTO
 * 符合 GitHub Action Release Sync 工具的标准接口规范
 */
export class ReleaseSyncResponseDto {
  /**
   * 是否成功
   */
  @IsBoolean()
  success: boolean;

  /**
   * Release ID
   */
  @IsString()
  @IsOptional()
  release_id?: string;

  /**
   * Release URL
   */
  @IsString()
  @IsOptional()
  release_url?: string;

  /**
   * 消息
   */
  @IsString()
  @IsOptional()
  message?: string;

  /**
   * 错误信息（失败时返回）
   */
  @IsString()
  @IsOptional()
  error?: string;
}
