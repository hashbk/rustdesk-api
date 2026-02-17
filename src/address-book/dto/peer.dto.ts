import { IsString, IsOptional, IsArray, IsBoolean, IsNotEmpty } from 'class-validator';

export class AddPeerDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  forceAlwaysRelay?: string;

  @IsOptional()
  @IsString()
  rdpPort?: string;

  @IsOptional()
  @IsString()
  rdpUsername?: string;

  @IsOptional()
  @IsString()
  loginName?: string;

  @IsOptional()
  @IsString()
  device_group_name?: string;

  @IsOptional()
  @IsBoolean()
  same_server?: boolean;
}

export class UpdatePeerDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  hash?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  forceAlwaysRelay?: string;

  @IsOptional()
  @IsString()
  rdpPort?: string;

  @IsOptional()
  @IsString()
  rdpUsername?: string;

  @IsOptional()
  @IsString()
  loginName?: string;

  @IsOptional()
  @IsString()
  device_group_name?: string;

  @IsOptional()
  @IsBoolean()
  same_server?: boolean;
}

export class DeletePeersDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
