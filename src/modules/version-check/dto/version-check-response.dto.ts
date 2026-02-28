import { IsString, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

/**
 * 版本检查响应DTO
 * 对应客户端的 VersionCheckResponse 结构体
 */
export class VersionCheckResponseDto {
  /**
   * 下载链接
   * 需为合法URL，长度≤512字符
   */
  @IsString()
  @IsOptional()
  @MaxLength(512)
  download_url: string = '';

  /**
   * 版本号
   * 遵循语义化版本规范，长度≤32字符
   */
  @IsString()
  @IsOptional()
  @MaxLength(32)
  version: string = '';

  /**
   * 构建时间（秒级Unix时间戳）
   * 非负整数，0表示无构建时间
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  build_date: number = 0;
}
