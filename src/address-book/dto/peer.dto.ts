import { IsString, IsOptional, IsNotEmpty, IsArray } from 'class-validator';

/**
 * 添加设备到地址簿的数据传输对象
 */
export class AddPeerDto {
  /**
   * 设备ID
   * RustDesk客户端的唯一标识，通常为数字格式
   * 用于关联 sysinfos 表获取设备详细信息（如用户名、主机名、操作系统等）
   */
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  /**
   * 连接哈希值
   * 用于验证连接的安全哈希值
   */
  @IsOptional()
  @IsString()
  hash?: string;

  /**
   * 连接密码
   * 设备的连接密码
   */
  @IsOptional()
  @IsString()
  password?: string;

  /**
   * 设备别名
   * 用户自定义的设备显示名称
   */
  @IsOptional()
  @IsString()
  alias?: string;

  /**
   * 备注信息
   * 设备的详细说明或备注
   */
  @IsOptional()
  @IsString()
  note?: string;

  /**
   * 标签GUID列表
   * 设备关联的标签唯一标识符数组
   * 用于建立设备与标签的多对多关系
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagGuids?: string[];
}

/**
 * 更新设备信息的数据传输对象
 */
export class UpdatePeerDto {
  /**
   * 设备条目唯一标识符
   * UUID格式，用于定位要更新的设备记录
   */
  @IsString()
  @IsNotEmpty()
  guid: string;

  /**
   * 连接哈希值
   * 用于验证连接的安全哈希值
   */
  @IsOptional()
  @IsString()
  hash?: string;

  /**
   * 连接密码
   * 设备的连接密码
   */
  @IsOptional()
  @IsString()
  password?: string;

  /**
   * 设备别名
   * 用户自定义的设备显示名称
   */
  @IsOptional()
  @IsString()
  alias?: string;

  /**
   * 备注信息
   * 设备的详细说明或备注
   */
  @IsOptional()
  @IsString()
  note?: string;

  /**
   * 标签GUID列表
   * 设备关联的标签唯一标识符数组
   * 更新时会替换原有的标签关联关系
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagGuids?: string[];
}

/**
 * 删除设备的数据传输对象
 */
export class DeletePeersDto {
  /**
   * 要删除的设备GUID列表
   * UUID格式的设备条目唯一标识符数组
   */
  @IsArray()
  @IsString({ each: true })
  guids: string[];
}
