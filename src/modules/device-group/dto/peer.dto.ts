import { IsString, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 设备查询DTO
 * 用于获取可访问设备列表
 */
export class PeerQueryDto {
  @IsNumber()
  @Min(1)
  @IsInt()
  @Type(() => Number)
  current: number;

  @IsNumber()
  @Min(1)
  @IsInt()
  @Type(() => Number)
  pageSize: number;

  @IsString()
  accessible: string; // 空字符串表示获取所有可访问设备

  @IsString()
  status: string; // '1' 表示只获取在线设备
}

/**
 * 更新设备DTO
 */
export class UpdatePeerDto {
  @IsOptional()
  @IsString()
  deviceGroupGuid?: string; // 设备组GUID

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * 批量设置设备设备组DTO
 */
export class SetPeerDeviceGroupDto {
  @IsString({ each: true })
  peerIds: string[]; // 设备ID列表

  @IsOptional()
  @IsString()
  deviceGroupGuid?: string; // 设备组GUID，为空则清除设备组
}
