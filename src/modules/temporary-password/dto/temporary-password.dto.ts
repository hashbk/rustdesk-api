import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * 临时密码上传请求DTO
 */
export class TemporaryPasswordDto {
  /**
   * 设备ID
   */
  @IsString()
  @IsNotEmpty()
  id: string;

  /**
   * 设备UUID（base64编码）
   */
  @IsString()
  @IsNotEmpty()
  uuid: string;

  /**
   * 临时密码
   */
  @IsString()
  @IsNotEmpty()
  temporary_password: string;

  /**
   * 客户端版本号（数字格式，不处理）
   */
  @IsNumber()
  @IsOptional()
  ver: number;
}
