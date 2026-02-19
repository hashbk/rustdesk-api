import { IsString, IsNumber, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

/**
 * 添加标签的数据传输对象
 */
export class AddTagDto {
  /**
   * 标签名称
   * 用于显示和区分不同的标签
   * 在同一地址簿内标签名不能重复
   */
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * 标签颜色
   * 十六进制颜色值，用于前端显示
   * 例如: 0xFF5733 表示红色
   * 默认值: 0
   */
  @IsOptional()
  @IsNumber()
  color?: number;
}

/**
 * 更新标签的数据传输对象
 */
export class UpdateTagDto {
  /**
   * 标签唯一标识符
   * UUID格式，用于定位要更新的标签
   */
  @IsString()
  @IsNotEmpty()
  guid: string;

  /**
   * 标签名称
   * 用于显示和区分不同的标签
   * 在同一地址簿内标签名不能重复
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * 标签颜色
   * 十六进制颜色值，用于前端显示
   * 例如: 0xFF5733 表示红色
   */
  @IsOptional()
  @IsNumber()
  color?: number;
}

/**
 * 重命名标签的数据传输对象
 */
export class RenameTagDto {
  /**
   * 标签唯一标识符
   * UUID格式，用于定位要重命名的标签
   */
  @IsString()
  @IsNotEmpty()
  guid: string;

  /**
   * 新标签名称
   * 重命名后的标签名，在同一地址簿内不能与现有标签名重复
   */
  @IsString()
  @IsNotEmpty()
  newName: string;
}

/**
 * 删除标签的数据传输对象
 */
export class DeleteTagsDto {
  /**
   * 要删除的标签GUID列表
   * UUID格式的标签唯一标识符数组
   * 删除标签时会同时解除该标签与所有设备的关联关系
   */
  @IsArray()
  @IsString({ each: true })
  guids: string[];
}
