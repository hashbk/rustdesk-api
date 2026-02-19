import { IsNumber, IsString, IsOptional, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 分页查询数据传输对象
 * 用于支持列表数据的分页查询
 */
export class PaginationDto {
  /**
   * 当前页码
   * 从1开始计数
   * 默认值: 1
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  current?: number = 1;

  /**
   * 每页数量
   * 控制每页返回的数据条数
   * 默认值: 100
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 100;
}

/**
 * 设备列表查询数据传输对象
 * 继承分页参数，增加地址簿标识参数
 */
export class PeersQueryDto extends PaginationDto {
  /**
   * 地址簿唯一标识符
   * UUID格式，指定要查询的地址簿
   */
  @IsString()
  @IsNotEmpty()
  ab: string;
}
