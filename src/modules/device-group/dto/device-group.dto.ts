import { IsString, IsOptional, IsNumber, Min, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 设备组查询DTO
 * 用于获取可访问设备组列表
 */
export class DeviceGroupQueryDto {
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
}

/**
 * 添加用户设备组权限DTO
 * 注意：请求字段名保持 userId，内部映射到 userGuid
 */
export class AddDeviceGroupUserPermissionDto {
  @IsString()
  deviceGroupGuid: string;

  @IsString()
  userId: string;  // 请求字段名保持 userId，实际存储为 userGuid
}

/**
 * 批量设置设备组用户权限DTO
 * 注意：请求字段名保持 userIds，内部映射到 userGuids
 */
export class SetDeviceGroupUsersDto {
  @IsString()
  deviceGroupGuid: string;

  @IsArray()
  @IsString({ each: true })
  userIds: string[];  // 请求字段名保持 userIds，实际存储为 userGuids
}
