import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class PeerQueryDto {
  @IsNumber()
  @Min(1)
  current: number;

  @IsNumber()
  @Min(1)
  pageSize: number;

  @IsString()
  accessible: string; // 空字符串表示获取所有可访问设备

  @IsString()
  status: string; // '1' 表示只获取在线设备
}

export class CreatePeerDto {
  @IsString()
  id: string; // 设备ID

  @IsOptional()
  @IsString()
  username?: string; // 系统用户名

  @IsOptional()
  @IsString()
  hostname?: string; // 主机名

  @IsOptional()
  @IsString()
  deviceName?: string; // 设备名称

  @IsOptional()
  @IsString()
  os?: string; // 操作系统

  @IsOptional()
  @IsString()
  ownerUsername?: string; // 所有者用户名

  @IsOptional()
  @IsString()
  ownerName?: string; // 所有者显示名称

  @IsOptional()
  @IsString()
  deviceGroupName?: string; // 设备组名称

  @IsOptional()
  @IsString()
  note?: string; // 备注
}

export class UpdatePeerDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  deviceGroupName?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsNumber()
  status?: number;
}
