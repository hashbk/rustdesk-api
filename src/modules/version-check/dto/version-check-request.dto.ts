import { IsString, IsOptional, MaxLength, IsIn } from 'class-validator';

/**
 * 版本检查请求DTO
 * 对应客户端的 VersionCheckRequest 结构体
 */
export class VersionCheckRequestDto {
  /**
   * 客户端唯一标识
   * 长度≤64字符
   */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  id: string = '';

  /**
   * 操作系统类型
   * 枚举值: windows, macos, linux, android, ios
   */
  @IsString()
  @IsOptional()
  @IsIn(['windows', 'macos', 'linux', 'android', 'ios', ''])
  @MaxLength(20)
  os: string = '';

  /**
   * 操作系统版本
   * 长度≤32字符
   */
  @IsString()
  @IsOptional()
  @MaxLength(32)
  os_version: string = '';

  /**
   * 系统架构
   * 枚举值: x86_64, x86, arm64, armv7
   */
  @IsString()
  @IsOptional()
  @IsIn(['x86_64', 'x86', 'arm64', 'armv7', ''])
  @MaxLength(20)
  arch: string = '';

  /**
   * 客户端类型
   */
  @IsString()
  @IsOptional()
  @MaxLength(50)
  typ: string = '';
}
