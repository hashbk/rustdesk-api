import { IsString, IsOptional, IsNumber, Min, IsInt } from 'class-validator';
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
 */
export class AddUserUserPermissionDto {
  @IsNumber()
  @IsInt()
  userId: number;         // 授权用户ID

  @IsNumber()
  @IsInt()
  targetUserId: number;   // 目标用户ID
}

/**
 * 批量设置用户权限DTO
 */
export class SetUserPermissionsDto {
  @IsNumber()
  @IsInt()
  targetUserId: number;   // 目标用户ID

  @IsNumber({}, { each: true })
  userIds: number[];      // 授权用户ID列表
}
