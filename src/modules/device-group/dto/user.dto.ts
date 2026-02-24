import { IsString, IsOptional, IsNumber, Min, IsInt, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 用户查询DTO
 * 用于获取可访问用户列表
 */
export class UserQueryDto {
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
  accessible: string; // 空字符串表示获取可访问的用户

  @IsString()
  status: string; // '1' 表示只获取正常状态的用户
}

/**
 * 添加用户间权限DTO
 * 注意：请求字段名保持 userId/targetUserId，内部映射到 userGuid/targetUserGuid
 */
export class AddUserUserPermissionDto {
  @IsString()
  userId: string;         // 授权用户ID（请求字段名保持不变）

  @IsString()
  targetUserId: string;   // 目标用户ID（请求字段名保持不变）
}

/**
 * 批量设置用户权限DTO
 * 注意：请求字段名保持 targetUserId/userIds，内部映射到 targetUserGuid/userGuids
 */
export class SetUserPermissionsDto {
  @IsString()
  targetUserId: string;   // 目标用户ID（请求字段名保持不变）

  @IsArray()
  @IsString({ each: true })
  userIds: string[];      // 授权用户ID列表（请求字段名保持不变）
}
