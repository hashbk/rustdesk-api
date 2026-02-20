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
 * 用户响应DTO
 */
export class UserResponseDto {
  name: string;        // 用户名
  email: string;       // 邮箱
  note: string;        // 备注
  status: number;      // 状态: 0=禁用, 1=正常, -1=未验证
  is_admin: boolean;   // 是否管理员
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
 * 删除用户间权限DTO
 */
export class RemoveUserUserPermissionDto {
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
