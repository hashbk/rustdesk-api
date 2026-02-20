import { IsString, IsOptional, IsNumber, Min, IsInt, IsUUID } from 'class-validator';
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
 * 创建设备组DTO
 */
export class CreateDeviceGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * 更新设备组DTO
 */
export class UpdateDeviceGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * 设备组响应DTO
 */
export class DeviceGroupResponseDto {
  name: string;
}

/**
 * 添加用户设备组权限DTO
 */
export class AddDeviceGroupUserPermissionDto {
  @IsUUID()
  deviceGroupGuid: string;

  @IsNumber()
  @IsInt()
  userId: number;
}

/**
 * 删除用户设备组权限DTO
 */
export class RemoveDeviceGroupUserPermissionDto {
  @IsUUID()
  deviceGroupGuid: string;

  @IsNumber()
  @IsInt()
  userId: number;
}

/**
 * 批量设置设备组用户权限DTO
 */
export class SetDeviceGroupUsersDto {
  @IsUUID()
  deviceGroupGuid: string;

  @IsNumber({}, { each: true })
  userIds: number[];
}
