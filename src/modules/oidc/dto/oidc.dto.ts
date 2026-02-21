import { IsString, IsObject, IsOptional } from 'class-validator';

/**
 * 设备信息
 */
export class DeviceInfoDto {
  @IsString()
  os: string;    // 操作系统：Linux, Windows, Android...

  @IsString()
  type: string;  // 类型：browser 或 client

  @IsString()
  name: string;  // 设备名称或浏览器信息
}

/**
 * OIDC 授权请求
 */
export class OidcAuthRequestDto {
  @IsString()
  op: string;  // OIDC 提供商标识，如 oidc/google

  @IsString()
  id: string;  // 设备ID

  @IsString()
  uuid: string;  // 设备UUID

  @IsObject()
  deviceInfo: DeviceInfoDto;  // 设备信息
}

/**
 * OIDC 授权取消请求
 */
export class OidcCancelDto {
  @IsString()
  code: string;  // 授权码
}

/**
 * OIDC 提供商配置
 */
export class OidcProviderDto {
  @IsString()
  name: string;

  @IsString()
  issuer: string;

  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  authorizationEndpoint?: string;

  @IsOptional()
  @IsString()
  tokenEndpoint?: string;

  @IsOptional()
  @IsString()
  userinfoEndpoint?: string;

  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  priority?: number;
}
