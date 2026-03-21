import {
  IsString,
  IsOptional,
  IsInt,
  IsNotEmpty,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 地址簿规则分页查询参数
 * 用于查询地址簿规则列表
 */
export class RuleQueryDto {
  /**
   * 地址簿 GUID
   * 指定要查询规则的地址簿
   */
  @IsString()
  @IsNotEmpty()
  ab: string;

  /**
   * 每页数量
   * 默认值：30
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 30;

  /**
   * 当前页码
   * 默认值：1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  current?: number = 1;
}

/**
 * 创建规则请求体
 * 用于添加新的地址簿规则
 */
export class CreateRuleDto {
  /**
   * 地址簿 GUID
   * 指定规则所属的地址簿
   */
  @IsString()
  @IsNotEmpty()
  guid: string;

  /**
   * 规则目标用户
   * rule-type = "user" 时必需
   * 与 group 互斥
   */
  @IsOptional()
  @ValidateIf((o) => o.ruleType !== 'group' && o.ruleType !== 'everyone')
  @IsString()
  @IsNotEmpty()
  user?: string;

  /**
   * 规则目标用户组
   * rule-type = "group" 时必需
   * 与 user 互斥
   */
  @IsOptional()
  @ValidateIf((o) => o.ruleType !== 'user' && o.ruleType !== 'everyone')
  @IsString()
  @IsNotEmpty()
  group?: string;

  /**
   * 权限级别
   * 1 - 只读权限 (ro)
   * 2 - 读写权限 (rw)
   * 3 - 完全控制 (full)
   * 默认值：1
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3)
  rule?: number = 1;
}

/**
 * 更新规则请求体
 * 用于修改现有规则
 */
export class UpdateRuleDto {
  /**
   * 规则 GUID
   * 指定要更新的规则
   */
  @IsString()
  @IsNotEmpty()
  guid: string;

  /**
   * 新的权限级别
   * 1 - 只读权限 (ro)
   * 2 - 读写权限 (rw)
   * 3 - 完全控制 (full)
   */
  @IsInt()
  @Min(1)
  @Max(3)
  rule: number;
}
